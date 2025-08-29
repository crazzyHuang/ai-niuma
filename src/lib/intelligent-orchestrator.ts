/**
 * 🧠 智能编排器 V2
 * 
 * 基于Agent总线系统的新一代智能编排器
 * 替代原有的固定模式编排，实现真正智能的群聊体验
 */

import agentBus, { GroupChatRequest, GroupChatResult } from './intelligent-agent-bus';
import SceneAnalyzerAgent from './agents/scene-analyzer-agent';
import ChatExecutorAgent from './agents/chat-executor-agent';
import CreativeAgent from './agents/creative-agent';
import AnalystAgent from './agents/analyst-agent';
import QualityAssessorAgent from './agents/quality-assessor-agent';
import dynamicSceneAnalyzer from './dynamic-scene-analyzer';
import prisma from './db';

/**
 * 智能编排器 - 新版本
 */
export class IntelligentOrchestrator {
  private isInitialized: boolean = false;

  constructor() {
    this.initialize();
  }

  /**
   * 初始化编排器
   */
  private async initialize(): Promise<void> {
    if (this.isInitialized) return;

    console.log('🧠 初始化智能编排器...');

    try {
      // 注册核心Agent
      agentBus.registerAgent(new SceneAnalyzerAgent());
      agentBus.registerAgent(new ChatExecutorAgent());
      
      // 注册专业化Agent
      agentBus.registerAgent(new CreativeAgent());
      agentBus.registerAgent(new AnalystAgent());
      agentBus.registerAgent(new QualityAssessorAgent());

      // 启动Agent总线
      await agentBus.start();

      this.isInitialized = true;
      console.log('✅ 智能编排器初始化完成');

    } catch (error) {
      console.error('❌ 智能编排器初始化失败:', error);
      throw error;
    }
  }

  /**
   * 运行智能群聊编排 - 新的流式版本
   */
  async runIntelligentOrchestration(
    conversationId: string,
    userMessageContent: string,
    onEvent: (event: any) => void
  ): Promise<void> {
    try {
      console.log(`🎯 [智能编排器] 开始处理会话: ${conversationId}`);

      // 确保系统已初始化
      await this.initialize();

      // 第一步：获取会话信息和可用Agent
      onEvent({ type: 'orchestration_started', conversationId });
      
      const conversationData = await this.loadConversationData(conversationId);
      
      // 第二步：构建群聊请求
      const groupChatRequest: GroupChatRequest = {
        conversationId,
        userMessage: userMessageContent,
        conversationHistory: conversationData.history,
        availableAgents: conversationData.availableAgents,
        context: {
          conversationType: conversationData.conversation?.mode || 'smart'
        }
      };

      // 第三步：保存用户消息
      const userMessage = await this.saveUserMessage(conversationId, userMessageContent);
      onEvent({ type: 'user_message_saved', messageId: userMessage.id });

      // 第四步：通过Agent总线处理群聊请求
      onEvent({ type: 'agent_bus_processing_started' });
      
      const result = await agentBus.processGroupChatRequest(groupChatRequest);
      
      if (!result.success) {
        throw new Error('Agent总线处理失败');
      }

      // 第五步：流式发送AI回复
      await this.streamAIResponses(conversationId, result, onEvent);

      // 第六步：完成编排
      onEvent({ 
        type: 'orchestration_completed', 
        summary: {
          totalResponses: result.responses.length,
          agentsUsed: result.metadata.agentsUsed,
          quality: result.metadata.quality,
          executionTime: result.metadata.totalExecutionTime
        }
      });

      console.log(`✅ [智能编排器] 会话处理完成: ${conversationId}`);

    } catch (error) {
      console.error(`❌ [智能编排器] 处理失败:`, error);
      
      onEvent({ 
        type: 'orchestration_failed', 
        error: error instanceof Error ? error.message : 'Unknown error',
        conversationId 
      });
    }
  }

  /**
   * 加载会话数据
   */
  private async loadConversationData(conversationId: string): Promise<{
    conversation: any;
    history: any[];
    availableAgents: any[];
  }> {
    console.log(`📊 [智能编排器] 加载会话数据: ${conversationId}`);

    // 获取会话信息
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

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // 获取消息历史（最近20条）
    const history = await prisma.message.findMany({
      where: { convId: conversationId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        role: true,
        content: true,
        step: true,
        createdAt: true
      }
    });

    // 获取可用的AI智能体
    let availableAgents: any[] = [];

    if (conversation.group) {
      // 群聊模式：使用群组中的AI
      availableAgents = conversation.group.members.map(member => ({
        id: member.agent.id,
        name: member.agent.name,
        roleTag: member.agent.roleTag,
        systemPrompt: member.agent.prompt,
        color: member.agent.color
      }));
    } else {
      // 单聊或智能模式：使用所有启用的AI
      const agents = await prisma.agent.findMany({
        where: { enabled: true },
        select: {
          id: true,
          name: true,
          roleTag: true,
          prompt: true,
          color: true
        }
      });
      availableAgents = agents;
    }

    console.log(`📋 [智能编排器] 数据加载完成: 历史${history.length}条，可用AI${availableAgents.length}个`);

    return {
      conversation,
      history: history.reverse(), // 按时间正序
      availableAgents
    };
  }

  /**
   * 保存用户消息
   */
  private async saveUserMessage(conversationId: string, content: string): Promise<any> {
    return await prisma.message.create({
      data: {
        convId: conversationId,
        role: 'user',
        content,
        tokens: content.length, // 简单估算
        costCents: 0
      }
    });
  }

  /**
   * 流式发送AI回复
   */
  private async streamAIResponses(
    conversationId: string,
    result: GroupChatResult,
    onEvent: (event: any) => void
  ): Promise<void> {
    console.log(`📤 [智能编排器] 开始流式发送${result.responses.length}个AI回复`);

    for (let i = 0; i < result.responses.length; i++) {
      const response = result.responses[i];
      
      try {
        // 发送Agent开始事件
        onEvent({ 
          type: 'agent_start', 
          agent: response.agentName,
          index: i + 1,
          total: result.responses.length
        });

        // 模拟流式输出（将回复内容分块发送）
        await this.simulateStreamingOutput(response.content, response.agentName, onEvent);

        // 保存AI回复到数据库
        const savedMessage = await this.saveAIMessage(conversationId, response);

        // 发送Agent完成事件
        onEvent({ 
          type: 'agent_complete', 
          agent: response.agentName,
          content: response.content,
          messageId: savedMessage.id,
          confidence: response.confidence
        });

        // AI回复间的延迟
        if (i < result.responses.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }

      } catch (error) {
        console.error(`❌ [智能编排器] AI回复处理失败: ${response.agentName}`, error);
        
        onEvent({ 
          type: 'agent_error', 
          agent: response.agentName, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    }
  }

  /**
   * 模拟流式输出
   */
  private async simulateStreamingOutput(
    content: string,
    agentName: string,
    onEvent: (event: any) => void
  ): Promise<void> {
    const chunks = this.splitIntoChunks(content, 8); // 每8个字符一块
    
    for (const chunk of chunks) {
      onEvent({ 
        type: 'chunk', 
        agent: agentName, 
        content: chunk 
      });
      
      // 模拟打字延迟
      const delay = Math.random() * 100 + 50; // 50-150ms
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * 将文本分块
   */
  private splitIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.slice(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * 保存AI消息
   */
  private async saveAIMessage(conversationId: string, response: any): Promise<any> {
    return await prisma.message.create({
      data: {
        convId: conversationId,
        role: 'ai',
        content: response.content,
        step: response.agentName,
        agentId: response.agentName, // 这里可以优化，使用真实的agentId
        tokens: response.content.length,
        costCents: this.estimateCost(response.content.length)
      }
    });
  }

  /**
   * 估算成本
   */
  private estimateCost(contentLength: number): number {
    // 简单估算：每1000字符约0.01元
    return Math.ceil(contentLength / 1000 * 0.01 * 100); // 转换为分
  }

  /**
   * 获取系统健康状态
   */
  async getSystemHealth(): Promise<{
    orchestratorStatus: string;
    agentBusStatus: any;
    registeredAgents: number;
  }> {
    const agentBusStatus = await agentBus.getSystemStatus();
    
    return {
      orchestratorStatus: this.isInitialized ? 'healthy' : 'initializing',
      agentBusStatus,
      registeredAgents: agentBusStatus.registeredAgents
    };
  }

  /**
   * 停止编排器
   */
  async stop(): Promise<void> {
    console.log('🛑 停止智能编排器...');
    await agentBus.stop();
    this.isInitialized = false;
    console.log('✅ 智能编排器已停止');
  }
}

// 创建默认实例
const intelligentOrchestrator = new IntelligentOrchestrator();

export default intelligentOrchestrator;