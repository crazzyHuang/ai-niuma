import { LLMMessage, LLMStreamChunk } from '@/types/llm';
import llmService from './llm-service';
import LLMConfigManager from './llm-config';
import { AgentConfigManager } from './agent-config-manager';
import FlexibleChatManager from './flexible-chat-manager';
import aiEmotionAnalyzer from './ai-emotion-analyzer';
import diagnosticService from './diagnostic-service';
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

      // 构建群聊上下文，让每个agent都能看到完整对话
      let groupChatContext = `用户: ${userMessageContent}\n\n`;

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
          const { agent, llmConfig } = await AgentConfigManager.getAgentConfig(roleTag);
          console.log(`⚙️ Agent配置 [${roleTag}]:`, {
            name: agent.name,
            temperature: agent.temperature,
            provider: llmConfig.provider,
            model: llmConfig.model
          });

          // 4. 构建消息历史 - 使用完整群聊上下文
          const messages: LLMMessage[] = [
            {
              role: 'system',
              content: agent.prompt,
            },
            {
              role: 'user',
              content: `【群聊记录】\n${groupChatContext}\n现在轮到你回复了，请保持自然的朋友语气，简短回应即可。`,
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
              costCents: this.calculateCost(response, llmConfig.provider, response.model),
            },
          });

          // 7. 发送消息完成事件
          onEvent({ 
            type: 'ai_message_completed', 
            messageId: aiMessage.id,
            usage: response.usage,
          });

          // 8. 更新群聊上下文用于下一步
          groupChatContext += `${agent.name}: ${response.content}\n\n`;

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
   * 运行群聊互动模式 - AI们自然对话，像真实朋友圈一样
   */
  static async runGroupChatMode(
    conversationId: string,
    userMessageContent: string,
    onEvent: (event: any) => void
  ): Promise<void> {
    try {
      console.log(`🎉 开始群聊互动模式: ${conversationId}`);
      
      // 获取对话信息
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          group: {
            include: {
              members: {
                include: {
                  agent: true
                }
              }
            }
          }
        }
      });

      if (!conversation || !conversation.group) {
        throw new Error('Group conversation not found');
      }

      // 获取群里的所有AI
      const availableAgents = conversation.group.members.map(m => m.agent);
      console.log(`👥 群聊成员: ${availableAgents.map(a => a.name).join(', ')}`);

      // 构建群聊上下文
      let groupChatHistory = `用户: ${userMessageContent}\n\n`;
      onEvent({ type: 'group_chat_started', totalAgents: availableAgents.length });

      // 多轮互动 (2-4轮)
      const totalRounds = Math.floor(Math.random() * 3) + 2; // 2-4轮
      console.log(`🎯 计划进行 ${totalRounds} 轮互动`);

      for (let round = 1; round <= totalRounds; round++) {
        console.log(`\n🔄 第 ${round} 轮互动开始`);
        
        // 检查是否被取消
        if (this.isCancelled(conversationId)) {
          console.log(`🛑 群聊被取消，停止执行`);
          onEvent({ type: 'group_chat_cancelled' });
          return;
        }

        // 决定这轮有哪些AI要说话
        const activeAgents = this.selectActiveAgentsForRound(availableAgents, round, userMessageContent);
        console.log(`🎭 第 ${round} 轮活跃AI: ${activeAgents.map(a => a.name).join(', ')}`);

        if (activeAgents.length === 0) {
          console.log(`⏭️ 第 ${round} 轮无AI活跃，跳过`);
          continue;
        }

        // 让选中的AI们并发或顺序发言
        const roundPromises = activeAgents.map(async (agent, index) => {
          // 随机延迟，模拟真实打字时间
          const delay = Math.random() * 2000 + 500; // 0.5-2.5秒
          await new Promise(resolve => setTimeout(resolve, delay));

          return this.executeAgentResponse(
            agent, 
            conversationId, 
            groupChatHistory, 
            round, 
            index,
            onEvent
          );
        });

        // 等待这轮所有AI完成
        const roundResponses = await Promise.all(roundPromises);
        
        // 更新群聊历史
        roundResponses.forEach(response => {
          if (response) {
            groupChatHistory += `${response.agentName}: ${response.content}\n\n`;
          }
        });

        // 轮次间暂停
        if (round < totalRounds) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      onEvent({ type: 'group_chat_completed' });
      console.log(`🎊 群聊互动模式完成!`);

    } catch (error) {
      console.error('Group chat error:', error);
      onEvent({ 
        type: 'group_chat_failed', 
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      this.clearCancelFlag(conversationId);
    }
  }

  /**
   * 选择本轮活跃的AI
   */
  private static selectActiveAgentsForRound(
    allAgents: any[], 
    round: number, 
    userMessage: string
  ): any[] {
    const activeAgents = [];

    for (const agent of allAgents) {
      let probability = 0.7; // 基础概率70%

      // 第一轮概率更高
      if (round === 1) {
        probability = 0.9;
      } else {
        probability = 0.5; // 后续轮次概率降低
      }

      // 根据AI性格调整概率
      if (agent.roleTag === 'EMPATHY') {
        probability += 0.2; // 共情AI更爱说话
      } else if (agent.roleTag === 'CREATIVE') {
        probability += 0.1; // 创意AI比较活跃
      } else if (agent.roleTag === 'ANALYST') {
        probability -= 0.1; // 分析AI相对沉稳
      }

      // 关键词匹配增加概率
      if (this.isMessageRelevantToAgent(userMessage, agent.roleTag)) {
        probability += 0.3;
      }

      // 随机决定
      if (Math.random() < probability) {
        activeAgents.push(agent);
      }
    }

    // 确保第一轮至少有一个AI回复
    if (round === 1 && activeAgents.length === 0) {
      const randomAgent = allAgents[Math.floor(Math.random() * allAgents.length)];
      activeAgents.push(randomAgent);
    }

    return activeAgents;
  }

  /**
   * 判断消息是否与AI角色相关
   */
  private static isMessageRelevantToAgent(message: string, roleTag: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    const keywords = {
      'EMPATHY': ['难过', '伤心', '开心', '高兴', '担心', '紧张', '感觉'],
      'PRACTICAL': ['怎么做', '如何', '方法', '步骤', '解决', '建议'],
      'CREATIVE': ['创意', '想法', '设计', '艺术', '音乐', '写作'],
      'ANALYST': ['分析', '数据', '统计', '研究', '原因', '为什么'],
      'FOLLOWUP': ['后续', '接下来', '然后', '计划']
    };

    const agentKeywords = keywords[roleTag as keyof typeof keywords] || [];
    return agentKeywords.some(keyword => lowerMessage.includes(keyword));
  }

  /**
   * 执行单个AI的回复
   */
  private static async executeAgentResponse(
    agent: any,
    conversationId: string,
    groupChatHistory: string,
    round: number,
    orderInRound: number,
    onEvent: (event: any) => void
  ): Promise<{ agentName: string; content: string } | null> {
    try {
      console.log(`🤖 ${agent.name} 开始思考回复...`);
      
      // 发送开始事件
      onEvent({ 
        type: 'agent_start', 
        agent: agent.name, 
        round,
        orderInRound 
      });

      // 获取AI配置
      const { agent: agentConfig, llmConfig } = await AgentConfigManager.getAgentConfig(agent.roleTag);
      
      // 构建更自然的群聊提示词
      const systemPrompt = `${agentConfig.systemPrompt}

【群聊互动规则】
- 这是一个朋友群聊，用户刚说了话，现在轮到你自然地回应
- 你的回复应该：简短自然(30-80字)、有个性、可以引用其他人说的话
- 可以用表情符号，可以开玩笑，像真实朋友一样聊天
- 第${round}轮对话中，你是第${orderInRound + 1}个发言的
- 如果前面有人说了，你可以附和、补充或者有不同观点`;

      const messages: LLMMessage[] = [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: `【群聊记录】\n${groupChatHistory}\n请你自然地参与对话：`,
        },
      ];

      // 流式调用LLM
      let fullResponse = '';
      const response = await llmService.streamChat(
        llmConfig,
        messages,
        (chunk: LLMStreamChunk) => {
          if (!chunk.isComplete && chunk.content) {
            fullResponse += chunk.content;
            onEvent({ 
              type: 'chunk', 
              agent: agent.name,
              content: chunk.content 
            });
          }
        }
      );

      // 保存到数据库
      const aiMessage = await prisma.message.create({
        data: {
          convId: conversationId,
          role: 'ai',
          agentId: agent.roleTag,
          step: agent.name,
          content: response.content,
          tokens: response.usage.totalTokens,
          costCents: this.calculateCost(response, llmConfig.provider, response.model),
        },
      });

      // 发送完成事件
      onEvent({ 
        type: 'agent_complete', 
        agent: agent.name,
        content: response.content,
        messageId: aiMessage.id 
      });

      console.log(`✅ ${agent.name} 回复完成: "${response.content}"`);
      return { agentName: agent.name, content: response.content };

    } catch (error) {
      console.error(`❌ ${agent.name} 回复失败:`, error);
      onEvent({ 
        type: 'agent_error', 
        agent: agent.name, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
      return null;
    }
  }

  /**
   * 运行流式编排 (微信群聊模式，支持实时显示)
   * 支持灵活聊天模式 vs 固定模式
   */
  static async runStreamOrchestration(
    conversationId: string,
    userMessageContent: string,
    onEvent: (event: any) => void
  ): Promise<void> {
    // 🔍 开始诊断追踪
    const diagnosticId = await diagnosticService.startConversationDiagnostic(
      conversationId,
      userMessageContent
    );

    try {
      console.log('🎭 开始流式编排:', { conversationId, content: userMessageContent.slice(0, 50) });

      // 获取对话信息
      const conversation = await prisma.conversation.findUnique({
        where: { id: conversationId },
      });

      if (!conversation) {
        throw new Error('对话不存在');
      }

      // 注意：用户消息已在API路由中保存，这里不需要重复保存

      // 获取对话历史
      const conversationHistory = `用户: ${userMessageContent}\n\n`;

      // 🧠 分析阶段 - 情感和意图分析
      const analysisStartTime = Date.now();
      let aiAnalysis = null;
      let sceneAnalysis = null;
      
      try {
        // 并行执行AI分析和场景分析（如果有可用Agent）
        const analysisPromises = [];
        
        // AI情感分析
        analysisPromises.push(
          aiEmotionAnalyzer.analyzeMessage(userMessageContent)
            .then(result => {
              aiAnalysis = result;
              console.log('🤖 AI分析完成:', result.metadata.overallConfidence.toFixed(2));
            })
            .catch(error => {
              console.warn('⚠️ AI分析失败:', error);
            })
        );

        await Promise.allSettled(analysisPromises);

        const analysisTime = Date.now() - analysisStartTime;

        // 记录分析阶段数据
        diagnosticService.recordAnalysisPhase(
          diagnosticId,
          aiAnalysis,
          sceneAnalysis,
          { mode: conversation.mode, useFlexibleMode: conversation.mode === 'natural' || conversation.mode === 'smart' },
          analysisTime
        );

        console.log(`📊 分析阶段完成，用时: ${analysisTime}ms`);
      } catch (analysisError) {
        console.warn('⚠️ 分析阶段出错:', analysisError);
      }

      // 检查是否使用灵活聊天模式
      const useFlexibleMode = conversation.mode === 'natural' || conversation.mode === 'smart';
      
      if (useFlexibleMode) {
        console.log('🌟 使用灵活聊天模式');
        const executionStartTime = Date.now();
        
        try {
          await FlexibleChatManager.runFlexibleChat(
            conversationId,
            userMessageContent,
            conversationHistory,
            onEvent
          );

          // 记录执行完成
          const executionTime = Date.now() - executionStartTime;
          diagnosticService.recordExecutionPhase(
            diagnosticId,
            ['flexible-chat-manager'],
            'flexible',
            [{
              phaseName: 'flexible-chat',
              executionMode: 'adaptive',
              agents: [{
                agentId: 'flexible-chat-manager',
                success: true,
                executionTime,
                result: { mode: 'flexible' }
              }],
              totalTime: executionTime
            }],
            executionTime
          );
        } catch (flexibleError) {
          const executionTime = Date.now() - executionStartTime;
          diagnosticService.recordExecutionPhase(
            diagnosticId,
            ['flexible-chat-manager'],
            'flexible',
            [{
              phaseName: 'flexible-chat',
              executionMode: 'adaptive',
              agents: [{
                agentId: 'flexible-chat-manager',
                success: false,
                executionTime,
                error: flexibleError instanceof Error ? flexibleError.message : 'Unknown error'
              }],
              totalTime: executionTime
            }],
            executionTime
          );
          throw flexibleError;
        }
      } else {
        console.log('📋 使用传统固定模式');
        await this.runTraditionalChatWithDiagnostics(
          diagnosticId,
          conversationId,
          userMessageContent,
          conversationHistory,
          onEvent,
          conversation.mode
        );
      }

      // 🏁 完成诊断
      await diagnosticService.finishConversationDiagnostic(diagnosticId);

    } catch (error) {
      console.error('流式编排错误:', error);
      
      // 记录错误并完成诊断
      await diagnosticService.finishConversationDiagnostic(diagnosticId);
      
      onEvent({
        type: 'orchestration_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * 传统固定模式聊天 - 增强版，带诊断追踪
   */
  private static async runTraditionalChatWithDiagnostics(
    diagnosticId: string,
    conversationId: string,
    userMessageContent: string,
    conversationHistory: string,
    onEvent: (event: any) => void,
    mode: string
  ): Promise<void> {
    const executionStartTime = Date.now();

    // 获取流程配置
    const steps: string[] = this.selectAgentsDynamically(mode, userMessageContent);
    console.log('📋 传统模式选择智能体:', steps);

    let conversationContext = conversationHistory;
    const phaseResults: any[] = [];
    const selectedAgents = [...steps];

    // 执行每个步骤
    for (const roleTag of steps) {
      console.log(`🎭 执行传统Agent: ${roleTag}`);
      const agentStartTime = Date.now();

      try {
        // 1. 发送步骤开始事件
        onEvent({ type: 'step_started', step: roleTag });

        // 2. 获取智能体配置
        const { agent, llmConfig } = await AgentConfigManager.getAgentConfig(roleTag);
        console.log(`⚙️ Agent配置 [${roleTag}]:`, {
          name: agent.name,
          temperature: agent.temperature,
          provider: llmConfig.provider,
          model: llmConfig.model
        });

        // 3. 构建消息历史
        const messages: LLMMessage[] = [
          {
            role: 'system',
            content: agent.systemPrompt,
          },
          {
            role: 'user',
            content: `【群聊记录】\n${conversationContext}\n现在轮到你回复了，请保持自然的朋友语气，简短回应即可。`,
          },
        ];

        // 4. 调用LLM服务进行流式对话
        console.log(`🚀 开始LLM调用 [${roleTag}] (流式)`);

        const response = await llmService.streamChat(
          llmConfig,
          messages,
          (chunk: LLMStreamChunk) => {
            if (!chunk.isComplete && chunk.content) {
              onEvent({
                type: 'ai_chunk',
                text: chunk.content,
                agent: roleTag
              });
            }
          }
        );

        const agentExecutionTime = Date.now() - agentStartTime;
        console.log(`✅ LLM调用完成 [${roleTag}], 内容长度: ${response.content.length}`);

        // 5. 保存AI消息到数据库
        const aiMessage = await prisma.message.create({
          data: {
            convId: conversationId,
            role: 'ai',
            agentId: roleTag,
            step: roleTag,
            content: response.content,
            tokens: response.usage.totalTokens,
            costCents: this.calculateCost(response, llmConfig.provider, response.model),
          },
        });

        // 6. 发送消息完成事件
        onEvent({
          type: 'ai_message_completed',
          messageId: aiMessage.id,
          usage: response.usage,
          agent: roleTag,
          content: response.content,
        });

        // 7. 更新对话上下文，供下一个agent使用
        conversationContext += `${agent.name}: ${response.content}\n\n`;

        // 8. 记录Agent执行结果
        phaseResults.push({
          phaseName: roleTag,
          executionMode: 'sequential',
          agents: [{
            agentId: roleTag,
            success: true,
            executionTime: agentExecutionTime,
            result: {
              content: response.content,
              usage: response.usage
            }
          }],
          totalTime: agentExecutionTime
        });

      } catch (stepError) {
        const agentExecutionTime = Date.now() - agentStartTime;
        console.error(`Error in step ${roleTag}:`, stepError);

        // 发送步骤失败事件
        onEvent({
          type: 'step_failed',
          step: roleTag,
          error: stepError instanceof Error ? stepError.message : 'Unknown error',
        });

        // 创建错误消息
        const errorMessage = await prisma.message.create({
          data: {
            convId: conversationId,
            role: 'ai',
            content: `抱歉，${roleTag} 处理时出现错误`,
            agentId: roleTag,
            step: roleTag,
            tokens: 0,
            costCents: 0,
          },
        });

        // 记录失败的Agent执行结果
        phaseResults.push({
          phaseName: roleTag,
          executionMode: 'sequential',
          agents: [{
            agentId: roleTag,
            success: false,
            executionTime: agentExecutionTime,
            error: stepError instanceof Error ? stepError.message : 'Unknown error'
          }],
          totalTime: agentExecutionTime
        });

        // 继续执行下一个Agent
        conversationContext += `系统消息: ${roleTag} 处理时出现错误\n\n`;
      }
    }

    // 记录执行阶段数据
    const totalExecutionTime = Date.now() - executionStartTime;
    diagnosticService.recordExecutionPhase(
      diagnosticId,
      selectedAgents,
      'traditional-sequential',
      phaseResults,
      totalExecutionTime
    );

    // 记录聚合阶段（传统模式没有复杂聚合，使用简单聚合）
    diagnosticService.recordAggregationPhase(
      diagnosticId,
      'sequential-simple',
      0.8, // 简单质量分数
      phaseResults.filter(r => r.agents[0].success).map(r => ({
        agentName: r.phaseName,
        content: r.agents[0].result?.content || '处理完成',
        timestamp: new Date(),
        confidence: 0.8
      })),
      0 // 聚合时间很短
    );

    // 发送编排完成事件
    onEvent({ type: 'orchestration_completed' });
  }

  /**
   * 传统固定模式聊天 - 原始方法保持兼容性
   */
  private static async runTraditionalChat(
    conversationId: string,
    userMessageContent: string,
    conversationHistory: string,
    onEvent: (event: any) => void,
    mode: string
  ): Promise<void> {
    // 获取流程配置
    const steps: string[] = this.selectAgentsDynamically(mode, userMessageContent);
    console.log('📋 传统模式选择智能体:', steps);

    let conversationContext = conversationHistory;

    // 执行每个步骤
    for (const roleTag of steps) {
      console.log(`🎭 执行传统Agent: ${roleTag}`);

      try {
        // 1. 发送步骤开始事件
        onEvent({ type: 'step_started', step: roleTag });

        // 2. 获取智能体配置
        const { agent, llmConfig } = await AgentConfigManager.getAgentConfig(roleTag);
        console.log(`⚙️ Agent配置 [${roleTag}]:`, {
          name: agent.name,
          temperature: agent.temperature,
          provider: llmConfig.provider,
          model: llmConfig.model
        });

        // 3. 构建消息历史
        const messages: LLMMessage[] = [
          {
            role: 'system',
            content: agent.systemPrompt,
          },
          {
            role: 'user',
            content: `【群聊记录】\n${conversationContext}\n现在轮到你回复了，请保持自然的朋友语气，简短回应即可。`,
          },
        ];

        // 4. 调用LLM服务进行流式对话
        console.log(`🚀 开始LLM调用 [${roleTag}] (流式)`);

        const response = await llmService.streamChat(
          llmConfig,
          messages,
          (chunk: LLMStreamChunk) => {
            if (!chunk.isComplete && chunk.content) {
              onEvent({
                type: 'ai_chunk',
                text: chunk.content,
                agent: roleTag
              });
            }
          }
        );

        console.log(`✅ LLM调用完成 [${roleTag}], 内容长度: ${response.content.length}`);

        // 5. 保存AI消息到数据库
        const aiMessage = await prisma.message.create({
          data: {
            convId: conversationId,
            role: 'ai',
            agentId: roleTag,
            step: roleTag,
            content: response.content,
            tokens: response.usage.totalTokens,
            costCents: this.calculateCost(response, llmConfig.provider, response.model),
          },
        });

        // 6. 发送消息完成事件
        onEvent({
          type: 'ai_message_completed',
          messageId: aiMessage.id,
          usage: response.usage,
          agent: roleTag,
          content: response.content,
        });

        // 7. 更新对话上下文，供下一个agent使用
        conversationContext += `${agent.name}: ${response.content}\n\n`;

      } catch (stepError) {
        console.error(`Error in step ${roleTag}:`, stepError);

        // 发送步骤失败事件
        onEvent({
          type: 'step_failed',
          step: roleTag,
          error: stepError instanceof Error ? stepError.message : 'Unknown error',
        });

        // 创建错误消息
        const errorMessage = await prisma.message.create({
          data: {
            convId: conversationId,
            role: 'ai',
            content: `抱歉，${roleTag} 处理时出现错误`,
            agentId: roleTag,
            step: roleTag,
            tokens: 0,
            costCents: 0,
          },
        });

        // 继续执行下一个Agent
        conversationContext += `系统消息: ${roleTag} 处理时出现错误\n\n`;
      }
    }

    // 发送编排完成事件
    onEvent({ type: 'orchestration_completed' });
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
      let steps: string[] = this.selectAgentsDynamically(conversation.mode, userMessageContent);
      console.log('📋 智能选择智能体:', steps);

      // 构建群聊上下文，让每个agent都能看到完整对话
      let groupChatContext = `用户: ${userMessageContent}\n\n`;
      const aiMessages: any[] = [];

      // 执行每个步骤
      for (const roleTag of steps) {
        console.log(`🎭 执行Agent: ${roleTag}`);

        try {
          // 获取智能体配置
          const { agent, llmConfig } = await AgentConfigManager.getAgentConfig(roleTag);
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
              content: agent.prompt,
            },
            {
              role: 'user',
              content: `【群聊记录】\n${groupChatContext}\n现在轮到你回复了，请保持自然的朋友语气，简短回应即可。`,
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

          // 更新群聊上下文用于下一个Agent
          groupChatContext += `${agent.name}: ${response.content}\n\n`;

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
   * 智能选择智能体（根据用户情绪和问题类型）- 使用AI分析
   */
  private static selectAgentsDynamically(mode: string, userMessage: string): string[] {
    // 使用AI分析用户情绪和话题（异步调用，但这里需要同步结果）
    // 为了保持方法的同步性，这里先用快速分析，后续可以考虑异步重构
    let emotion: 'positive' | 'negative' | 'neutral' = 'neutral';
    let topic = 'general';

    // 启动后台AI分析（不等待结果，用于改进缓存）
    this.performBackgroundAnalysis(userMessage).catch(error => {
      console.warn('后台AI分析失败:', error);
    });

    // 使用混合快速分析
    try {
      emotion = this.analyzeEmotionHybrid(userMessage);
      topic = this.analyzeTopicHybrid(userMessage);
    } catch (error) {
      console.warn('混合分析失败，使用硬编码分析:', error);
      emotion = this.analyzeEmotion(userMessage);
      topic = this.analyzeTopic(userMessage);
    }

    console.log('🎯 用户分析 (混合AI+硬编码):', { emotion, topic, mode });

    // 检查是否是单一提供商模式
    const useSingleProvider = process.env.USE_SINGLE_PROVIDER === 'true';

    if (useSingleProvider) {
      const agentFlows = AgentConfigManager.getAllFlows();
      const flow = agentFlows.find((f: any) => f.mode === mode);

      if (flow) {
        let steps = [...flow.steps];

        // 如果是natural模式，随机打乱顺序
        if (flow.randomOrder) {
          steps = this.shuffleArray(steps);
        }

        // 如果是smart模式，根据情绪和话题动态调整
        if (flow.dynamic) {
          steps = this.optimizeForEmotionAndTopic(steps, emotion, topic);
        }

        return steps;
      }
    }

    // 默认回退策略
    return this.getDefaultAgentSequence(emotion, topic);
  }

  /**
   * 后台AI分析 - 用于改进缓存和学习
   */
  private static async performBackgroundAnalysis(message: string): Promise<void> {
    try {
      // 异步执行完整AI分析，结果会被缓存供后续使用
      const analysisResult = await aiEmotionAnalyzer.analyzeMessage(message);
      console.log(`🧠 [后台分析] 完成分析: 情感=${analysisResult.emotion.primaryEmotion}, 置信度=${analysisResult.metadata.overallConfidence.toFixed(2)}`);
    } catch (error) {
      // 静默失败，不影响主流程
      console.warn('🔇 后台AI分析失败（静默）:', error);
    }
  }

  /**
   * 混合情感分析 - AI优先，硬编码回退
   */
  private static analyzeEmotionHybrid(message: string): 'positive' | 'negative' | 'neutral' {
    try {
      // 由于quickEmotionAnalysis是异步的，这里主要依赖硬编码分析
      // 但会启动后台AI分析来改进缓存
      return this.analyzeEmotion(message);
    } catch (error) {
      return this.analyzeEmotion(message);
    }
  }

  /**
   * 混合话题分析 - AI优先，硬编码回退
   */
  private static analyzeTopicHybrid(message: string): 'emotional' | 'practical' | 'creative' | 'general' {
    try {
      // 这里简化处理，主要使用硬编码作为快速分析
      // 后续可以扩展aiEmotionAnalyzer来支持同步的快速话题分析
      return this.analyzeTopic(message);
    } catch (error) {
      return this.analyzeTopic(message);
    }
  }

  /**
   * 分析用户情绪 (硬编码回退方法)
   */
  private static analyzeEmotion(message: string): 'positive' | 'negative' | 'neutral' {
    const negativeWords = ['不开心', '难过', '烦', '累', '压力', '焦虑', '生气', '失望', '伤心', '担心', '紧张', '沮丧'];
    const positiveWords = ['开心', '高兴', '快乐', '兴奋', '满意', '棒', '好', '赞', '爱', '喜欢', '惊喜', '感谢'];

    const lowerMessage = message.toLowerCase();

    let positiveCount = 0;
    let negativeCount = 0;

    for (const word of positiveWords) {
      if (lowerMessage.includes(word)) positiveCount++;
    }

    for (const word of negativeWords) {
      if (lowerMessage.includes(word)) negativeCount++;
    }

    // 增强判断逻辑
    if (negativeCount > positiveCount && negativeCount > 0) {
      return 'negative';
    }
    if (positiveCount > negativeCount && positiveCount > 0) {
      return 'positive';
    }

    // 检查表情符号
    if (/😊|😄|😃|🎉|👍|❤️|💕/.test(message)) {
      return 'positive';
    }
    if (/😢|😭|😔|💔|😰|😤/.test(message)) {
      return 'negative';
    }

    return 'neutral';
  }

  /**
   * 分析用户话题 (硬编码回退方法)
   */
  private static analyzeTopic(message: string): 'emotional' | 'practical' | 'creative' | 'general' {
    const emotionalWords = ['心情', '感情', '感受', '情绪', '心理', '压力', '焦虑', '开心', '难过', '爱情', '友情'];
    const practicalWords = ['怎么做', '怎么办', '建议', '方法', '解决', '工作', '学习', '技巧', '步骤', '计划'];
    const creativeWords = ['创意', '想法', '创新', '设计', '艺术', '灵感', '创作', '音乐', '画画', '写作'];

    const lowerMessage = message.toLowerCase();

    let emotionalScore = 0;
    let practicalScore = 0;
    let creativeScore = 0;

    for (const word of emotionalWords) {
      if (lowerMessage.includes(word)) emotionalScore++;
    }

    for (const word of practicalWords) {
      if (lowerMessage.includes(word)) practicalScore++;
    }

    for (const word of creativeWords) {
      if (lowerMessage.includes(word)) creativeScore++;
    }

    // 选择得分最高的分类
    const maxScore = Math.max(emotionalScore, practicalScore, creativeScore);
    
    if (maxScore === 0) return 'general';
    
    if (emotionalScore === maxScore) return 'emotional';
    if (practicalScore === maxScore) return 'practical';
    if (creativeScore === maxScore) return 'creative';
    
    return 'general';
  }

  /**
   * 随机打乱数组
   */
  private static shuffleArray(array: string[]): string[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * 根据情绪和话题优化智能体顺序
   */
  private static optimizeForEmotionAndTopic(
    steps: string[],
    emotion: string,
    topic: string
  ): string[] {
    let optimizedSteps = [...steps];

    // 负面情绪优先安排共情者
    if (emotion === 'negative') {
      // 确保EMPATHY在前面
      const empathyIndex = optimizedSteps.indexOf('EMPATHY');
      if (empathyIndex > 0) {
        optimizedSteps.splice(empathyIndex, 1);
        optimizedSteps.unshift('EMPATHY');
      }
    }

    // 实际问题优先安排实用建议者
    if (topic === 'practical') {
      const practicalIndex = optimizedSteps.indexOf('PRACTICAL');
      if (practicalIndex > 1) {
        optimizedSteps.splice(practicalIndex, 1);
        optimizedSteps.splice(1, 0, 'PRACTICAL');
      }
    }

    return optimizedSteps;
  }

  /**
   * 默认智能体选择策略
   */
  private static getDefaultAgentSequence(emotion: string, topic: string): string[] {
    // 基础组合
    let sequence = ['EMPATHY', 'PRACTICAL', 'FOLLOWUP'];

    // 根据情绪调整
    if (emotion === 'negative') {
      // 负面情绪多加关怀
      sequence = ['EMPATHY', 'PRACTICAL', 'FOLLOWUP'];
    } else if (emotion === 'positive') {
      // 正面情绪可以更轻松
      sequence = ['EMPATHY', 'CREATIVE', 'FOLLOWUP'];
    }

    // 根据话题调整
    if (topic === 'creative') {
      sequence.splice(1, 0, 'CREATIVE');
    } else if (topic === 'practical') {
      // 实用话题确保有PRACTICAL
      if (!sequence.includes('PRACTICAL')) {
        sequence.splice(1, 0, 'PRACTICAL');
      }
    }

    return sequence;
  }

  /**
   * 验证编排器配置
   */
  static async validateConfiguration(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 检查LLM配置
    const llmValidation = await LLMConfigManager.validateConfiguration();
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