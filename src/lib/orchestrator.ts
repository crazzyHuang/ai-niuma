import { LLMMessage, LLMStreamChunk } from '@/types/llm';
import llmService from './llm-service';
import LLMConfigManager from './llm-config';
import { AgentConfigManager } from './agent-config-manager';
import prisma from './db';

/**
 * AI对话编排器
 * 负责协调多个AI智能体的对话流程
 */
export class Orchestrator {
  // 取消标志映射 - 用于控制编排过程
  private static cancelFlags = new Map<string, boolean>();

  /**
   * 取消指定对话的编排过程
   */
  static cancelOrchestration(conversationId: string) {
    console.log(`🛑 取消编排: ${conversationId}`);
    this.cancelFlags.set(conversationId, true);
  }

  /**
   * 检查编排是否被取消
   */
  private static isCancelled(conversationId: string): boolean {
    return this.cancelFlags.get(conversationId) === true;
  }

  /**
   * 清理取消标志
   */
  private static clearCancelFlag(conversationId: string) {
    this.cancelFlags.delete(conversationId);
  }

  /**
   * 运行对话编排 (流式版本，用于SSE)
   */
  static async runOrchestration(
    conversationId: string,
    userMessageContent: string,
    onEvent: (event: any) => void
  ): Promise<void> {
    try {
      // 获取对话信息
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // 获取流程配置
      let steps: string[] = [];
      
      if (AgentConfigManager.isSingleProviderMode()) {
        // 单一厂家模式：从配置文件获取流程
        const flowConfig = AgentConfigManager.getFlowConfig(conversation.mode);
        if (!flowConfig) {
          throw new Error(`Flow config not found for mode: ${conversation.mode}`);
        }
        steps = flowConfig.steps;
      } else {
        // 多厂家模式：从数据库获取流程
        const flow = await prisma.flow.findUnique({
          where: { mode: conversation.mode },
        });

        if (!flow || !Array.isArray(flow.steps)) {
          throw new Error('Flow not found or invalid');
        }
        steps = (flow.steps as any[]).map(step => step.roleTag);
      }

      let previousSummary = userMessageContent;

      // 执行每个步骤
      for (const roleTag of steps) {
        // 检查是否被取消
        if (this.isCancelled(conversationId)) {
          console.log(`🛑 编排被取消，停止执行: ${roleTag}`);
          onEvent({ type: 'orchestration_cancelled', reason: '用户取消' });
          return;
        }

        console.log(`🎭 开始执行Agent: ${roleTag}`);

        try {
          // 1. 发送步骤开始事件
          console.log(`📢 发送步骤开始事件: ${roleTag}`);
          onEvent({ type: 'step_started', step: roleTag });

          // 2. 发送AI消息开始事件
          console.log(`📢 发送AI消息开始事件: ${roleTag}`);
          onEvent({ type: 'ai_message_started', agent: roleTag, step: roleTag });

          // 3. 获取智能体配置
          const { agent, llmConfig } = AgentConfigManager.getAgentConfig(roleTag);
          console.log(`⚙️ Agent配置 [${roleTag}]:`, {
            name: agent.name,
            temperature: agent.temperature,
            provider: llmConfig.provider,
            model: llmConfig.model
          });

          // 4. 构建消息历史
          const messages: LLMMessage[] = [
            {
              role: 'system',
              content: agent.systemPrompt,
            },
            {
              role: 'user',
              content: previousSummary,
            },
          ];

          // 5. 调用LLM服务进行流式对话
          console.log(`🚀 开始LLM调用 [${roleTag}]`);
          let fullResponse = '';
          let chunkCount = 0;

          const response = await llmService.streamChat(
            llmConfig,
            messages,
            (chunk: LLMStreamChunk) => {
              if (!chunk.isComplete && chunk.content) {
                chunkCount++;
                fullResponse += chunk.content;
                console.log(`📝 [${roleTag}] 块 #${chunkCount}: "${chunk.content}"`);
                onEvent({ type: 'ai_chunk', text: chunk.content });
              }
            }
          );

          console.log(`✅ LLM调用完成 [${roleTag}], 总块数: ${chunkCount}, 内容长度: ${response.content.length}`);

          // 6. 保存AI消息到数据库
          const aiMessage = await prisma.message.create({
            data: {
              convId: conversationId,
              role: 'ai',
              agentId: roleTag,
              step: roleTag,
              content: response.content,
              tokens: response.usage.totalTokens,
              costCents: this.calculateCost(response),
            },
          });

          // 7. 发送消息完成事件
          onEvent({ 
            type: 'ai_message_completed', 
            messageId: aiMessage.id,
            usage: response.usage,
          });

          // 8. 更新摘要用于下一步
          previousSummary = response.content;

        } catch (stepError) {
          console.error(`Error in step ${roleTag}:`, stepError);
          
          // 发送步骤失败事件
          onEvent({ 
            type: 'step_failed', 
            step: roleTag, 
            error: stepError instanceof Error ? stepError.message : 'Unknown error',
          });
          
          // 决定是否继续执行后续步骤
          // 这里可以根据业务需求决定是否中断整个流程
          // 目前选择继续执行
        }
      }

      // 发送编排完成事件
      onEvent({ type: 'orchestration_completed' });

    } catch (error) {
      console.error('Orchestration error:', error);
      onEvent({ 
        type: 'orchestration_failed', 
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      // 清理取消标志
      this.clearCancelFlag(conversationId);
    }
  }

  /**
   * 运行聊天编排 (非流式版本，微信群聊模式)
   * 返回所有AI消息，一次性显示
   */
  static async runChatOrchestration(
    conversationId: string,
    userMessageContent: string
  ): Promise<any[]> {
    try {
      console.log('🎭 开始非流式编排:', { conversationId, content: userMessageContent.slice(0, 50) });

      // 获取对话信息
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        throw new Error('对话不存在');
      }

      // 获取流程配置
      let steps: string[];
      
      // 检查是否是单一提供商模式
      const useSingleProvider = process.env.USE_SINGLE_PROVIDER === 'true';
      
      if (useSingleProvider) {
        const agentFlows = AgentConfigManager.getFlows();
        const flow = agentFlows.find(f => f.mode === conversation.mode);
        steps = flow ? flow.steps : ['EMPATHY', 'PRACTICAL'];
        console.log('📋 使用单一提供商模式，步骤:', steps);
      } else {
        const flow = await prisma.flow.findUnique({
          where: { mode: conversation.mode },
        });
        
        if (!flow || !Array.isArray(flow.steps)) {
          throw new Error('流程配置不存在');
        }
        
        steps = (flow.steps as any[]).map(step => step.roleTag);
        console.log('📋 使用多提供商模式，步骤:', steps);
      }

      let previousSummary = userMessageContent;
      const aiMessages: any[] = [];

      // 执行每个步骤
      for (const roleTag of steps) {
        console.log(`🎭 执行Agent: ${roleTag}`);

        try {
          // 获取智能体配置
          const { agent, llmConfig } = AgentConfigManager.getAgentConfig(roleTag);
          console.log(`⚙️ Agent配置 [${roleTag}]:`, {
            name: agent.name,
            temperature: agent.temperature,
            provider: llmConfig.provider,
            model: llmConfig.model
          });

          // 构建消息历史
          const messages: LLMMessage[] = [
            {
              role: 'system',
              content: agent.systemPrompt,
            },
            {
              role: 'user',
              content: previousSummary,
            },
          ];

          // 调用LLM服务 (非流式)
          console.log(`🚀 开始LLM调用 [${roleTag}] (非流式)`);
          const response = await llmService.chat(llmConfig, messages);
          
          console.log(`✅ LLM调用完成 [${roleTag}], 内容长度: ${response.content.length}`);

          // 计算成本
          const cost = this.calculateCost(response.usage, llmConfig.provider, response.model);
          
          // 保存AI消息到数据库
          const aiMessage = await prisma.message.create({
            data: {
              convId: conversationId,
              role: 'ai',
              content: response.content,
              agentId: roleTag,
              step: roleTag,
              tokens: response.usage?.totalTokens || 0,
              costCents: Math.round(cost * 100), // 转换为分
            },
          });

          console.log(`💾 AI消息已保存 [${roleTag}]:`, aiMessage.id);

          // 添加到结果数组
          aiMessages.push(aiMessage);

          // 更新摘要用于下一个Agent
          previousSummary = response.content;

        } catch (error) {
          console.error(`❌ Agent ${roleTag} 执行失败:`, error);
          
          // 创建错误消息
          const errorMessage = await prisma.message.create({
            data: {
              convId: conversationId,
              role: 'ai',
              content: `抱歉，${roleTag} 智能体处理时出现错误: ${error instanceof Error ? error.message : '未知错误'}`,
              agentId: roleTag,
              step: roleTag,
              tokens: 0,
              costCents: 0,
            },
          });

          aiMessages.push(errorMessage);
          // 继续执行下一个Agent
        }
      }

      console.log('✅ 非流式编排完成，生成', aiMessages.length, '条AI消息');
      return aiMessages;

    } catch (error) {
      console.error('非流式编排错误:', error);
      throw error;
    }
  }

  /**
   * 计算成本（美元）
   */
  private static calculateCost(usage: any, provider: string, model: string): number {
    // 如果没有使用量信息，返回0
    if (!usage) {
      console.warn('⚠️ 没有使用量信息，成本设为0');
      return 0;
    }

    // 安全地获取token数量
    const promptTokens = usage.promptTokens || usage.prompt_tokens || 0;
    const completionTokens = usage.completionTokens || usage.completion_tokens || 0;
    
    console.log('💰 计算成本:', { provider, model, promptTokens, completionTokens });

    // 这里可以根据不同提供商和模型设置不同价格
    // 暂时使用统一的示例价格
    const inputPricePerK = 0.0005; // $0.0005 per 1K tokens
    const outputPricePerK = 0.0015; // $0.0015 per 1K tokens
    
    const inputCost = (promptTokens / 1000) * inputPricePerK;
    const outputCost = (completionTokens / 1000) * outputPricePerK;
    const totalCost = inputCost + outputCost;
    
    console.log('💰 成本详情:', { 
      inputCost: inputCost.toFixed(6), 
      outputCost: outputCost.toFixed(6), 
      totalCost: totalCost.toFixed(6) 
    });
    
    return totalCost; // 返回美元金额
  }

  /**
   * 获取对话历史
   */
  static async getConversationHistory(conversationId: string, limit: number = 10): Promise<LLMMessage[]> {
    const messages = await prisma.message.findMany({
      where: { convId: conversationId },
      orderBy: { createdAt: 'asc' },
      take: limit,
    });

    return messages.map(msg => ({
      role: msg.role as 'system' | 'user' | 'assistant',
      content: msg.content,
    }));
  }

  /**
   * 验证编排器配置
   */
  static async validateConfiguration(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 检查LLM配置
    const llmValidation = LLMConfigManager.validateConfiguration();
    if (!llmValidation.isValid) {
      errors.push(...llmValidation.errors);
    }

    // 检查数据库中的智能体配置
    try {
      const agents = await prisma.agent.findMany({
        where: { enabled: true },
      });

      if (agents.length === 0) {
        errors.push('No enabled agents found in database');
      }

      // 检查流程配置
      const flows = await prisma.flow.findMany({
        where: { enabled: true },
      });

      if (flows.length === 0) {
        errors.push('No enabled flows found in database');
      }

    } catch (dbError) {
      errors.push('Database connection error');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default Orchestrator;