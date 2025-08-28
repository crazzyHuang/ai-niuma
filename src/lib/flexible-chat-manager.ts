import llmService from './llm-service';
import LLMConfigManager from './llm-config';
import { AgentConfigManager } from './agent-config-manager';
import { LLMMessage } from '@/types/llm';
import prisma from './db';

interface Agent {
  id: string;
  name: string;
  roleTag: string;
  prompt: string;
  temperature: number;
  color: string;
  description: string | null;
}

interface ChatContext {
  userMessage: string;
  conversationHistory: string;
  topicType: string;
  timeOfDay: string;
  mood: string;
}

/**
 * 灵活聊天管理器
 * 使用数据库中的智能体进行对话
 */
export class FlexibleChatManager {
  
  /**
   * 根据用户选择的智能体ID获取对应的智能体
   */
  static async getSelectedAgents(selectedAgentIds: string[]): Promise<Agent[]> {
    if (!selectedAgentIds || selectedAgentIds.length === 0) {
      // 如果没有选择特定智能体，随机选择一个
      const agents = await prisma.agent.findMany({
        where: { enabled: true },
        orderBy: { order: 'asc' }
      });
      
      if (agents.length === 0) {
        throw new Error('没有可用的智能体');
      }
      
      return [agents[Math.floor(Math.random() * agents.length)]];
    }

    // 根据ID获取选定的智能体
    const agents = await prisma.agent.findMany({
      where: {
        id: { in: selectedAgentIds },
        enabled: true
      },
      orderBy: { order: 'asc' }
    });
    
    return agents;
  }
  
  /**
   * 为智能体生成对话系统提示词
   */
  static async generateAgentPrompt(
    agent: Agent,
    context: ChatContext,
    isFirstResponder: boolean,
    previousResponses: string[]
  ): Promise<string> {
    const currentMood = this.generateRandomMood();
    const timePersonality = this.getTimeBasedPersonality(context.timeOfDay);
    
    // 分析对话氛围
    const conversationTone = this.analyzeConversationTone(previousResponses);
    
    const dynamicPrompt = `
你是${agent.name}。

${agent.prompt}

【当前状态】
- 时间：${context.timeOfDay}，${timePersonality}
- 今天心情：${currentMood}

【当前对话情况】
${isFirstResponder ? '你是第一个看到消息的朋友，可以自然地回应。' : ''}
${previousResponses.length > 0 ? `\n前面的朋友们已经说了：\n${previousResponses.join('\n')}\n你可以回应他们的话，或者从新角度回应用户。` : ''}

【对话氛围】${conversationTone}

【重要要求】
- 像真实朋友一样聊天，不要太刻意
- 可以有情绪波动，不用永远保持同一个状态
- 回应长度：20-60字，像微信聊天一样自然
- 可以提到自己的事情、经历、想法
- 不要总是给建议，有时候就是聊天
- 可以问问题、开玩笑、抱怨、分享
- 如果不知道说什么，可以问问用户其他事情

记住：你是一个有血有肉的朋友，不是AI助手！
`;
    
    return dynamicPrompt;
  }
  
  /**
   * 运行灵活对话
   */
  static async runFlexibleChat(
    conversationId: string,
    userMessage: string,
    conversationHistory: string,
    onEvent: (event: any) => void
  ): Promise<void> {
    // 获取对话信息以获取用户选择的智能体
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId }
    });
    
    const selectedAgentIds = conversation?.selectedAgents as string[] || [];
    
    const context: ChatContext = {
      userMessage,
      conversationHistory,
      topicType: this.analyzeTopicType(userMessage),
      timeOfDay: this.getCurrentTimeOfDay(),
      mood: this.generateRandomMood()
    };
    
    // 使用用户选择的智能体来选择智能体
    const selectedAgents = await this.getSelectedAgents(selectedAgentIds);
    console.log('🎭 选择的智能体们:', selectedAgents.map(a => a.name));
    
    const previousResponses: string[] = [];
    let updatedHistory = conversationHistory;
    
    // 依次让智能体回应
    for (let i = 0; i < selectedAgents.length; i++) {
      const agent = selectedAgents[i];
      const isFirstResponder = i === 0;
      
      try {
        onEvent({ type: 'step_started', step: agent.roleTag });
        
        // 生成动态提示词
        const dynamicPrompt = await this.generateAgentPrompt(
          agent,
          context,
          isFirstResponder,
          previousResponses
        );
        
        console.log(`🚀 ${agent.name}开始回应...`);
        
        const messages: LLMMessage[] = [
          { role: 'system', content: dynamicPrompt },
          { role: 'user', content: `【群聊记录】\n${updatedHistory}\n\n现在轮到你回复了，请保持自然的朋友语气。` }
        ];

        console.log(`🚀 ${agent.name}开始LLM调用...`);
        
        // 获取Agent的LLM配置
        const { agent: agentConfig, llmConfig } = await AgentConfigManager.getAgentConfig(agent.roleTag);
        
        // 使用Agent的具体配置
        const finalConfig = {
          ...llmConfig,
          temperature: agent.temperature || llmConfig.temperature || 1.0,
          maxTokens: 150 // 保持短回复
        };
        
        let fullContent = '';
        
        await llmService.streamChat(
          finalConfig,
          messages,
          (chunk) => {
            if (chunk.content) {
              fullContent += chunk.content;
              onEvent({
                type: 'agent_chunk',
                agent: agent.name,
                content: chunk.content,
                fullContent: fullContent
              });
            }
          }
        );
        
        console.log(`✅ ${agent.name}回应完成:`, fullContent);
        
        // 保存AI消息到数据库
        await prisma.message.create({
          data: {
            convId: conversationId,
            role: 'ai',
            content: fullContent,
            agentId: agent.id,
            step: agent.roleTag,
          },
        });
        
        // 添加到上下文
        previousResponses.push(`${agent.name}: ${fullContent}`);
        updatedHistory += `${agent.name}: ${fullContent}\n\n`;
        
        onEvent({
          type: 'agent_complete',
          agent: agent.name,
          content: fullContent,
          step: agent.roleTag
        });
        
      } catch (error) {
        console.error(`❌ ${agent.name}回应失败:`, error);
        onEvent({
          type: 'agent_error',
          agent: agent.name,
          error: error instanceof Error ? error.message : '未知错误',
          step: agent.roleTag
        });
      }
    }
    
    console.log('🏁 所有智能体回应完成');
    onEvent({ type: 'conversation_complete', message: '对话完成' });
  }
  
  /**
   * 分析话题类型
   */
  private static analyzeTopicType(message: string): string {
    const emotionalKeywords = ['压力', '难过', '开心', '生气', '焦虑', '兴奋', '失望'];
    const practicalKeywords = ['怎么办', '建议', '方法', '工作', '学习', '购买'];
    const casualKeywords = ['今天', '昨天', '明天', '看到', '听说', '想起'];
    
    if (emotionalKeywords.some(keyword => message.includes(keyword))) {
      return 'emotional';
    } else if (practicalKeywords.some(keyword => message.includes(keyword))) {
      return 'practical';
    } else {
      return 'casual';
    }
  }
  
  /**
   * 生成随机心情
   */
  private static generateRandomMood(): string {
    const moods = [
      '心情不错，比较有活力',
      '今天有点累，但还是想聊天',
      '状态很好，很想分享东西',
      '有点小情绪，但朋友找我还是会回应',
      '今天特别开心，什么都觉得有趣',
      '比较平静，适合深入聊天',
      '有点想开玩笑的心情',
    ];
    return moods[Math.floor(Math.random() * moods.length)];
  }
  
  /**
   * 根据时间段生成个性描述
   */
  private static getTimeBasedPersonality(timeOfDay: string): string {
    const timePersonalities = {
      'morning': '一天中状态最好的时候，很有活力',
      'afternoon': '一天中状态最好的时候，很有活力',
      'evening': '有点累了，但还是想聊天',
      'night': '有点困了，可能反应慢一点'
    };
    return timePersonalities[timeOfDay as keyof typeof timePersonalities] || timePersonalities.afternoon;
  }
  
  /**
   * 获取当前时间段
   */
  private static getCurrentTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
  }
  
  /**
   * 分析对话氛围
   */
  private static analyzeConversationTone(previousResponses: string[]): string {
    if (previousResponses.length === 0) {
      return '刚开始聊天，氛围还在形成中';
    }
    
    const allText = previousResponses.join(' ');
    
    if (allText.includes('哈哈') || allText.includes('😄')) {
      return '对话氛围比较轻松愉快';
    } else if (allText.includes('不过') || allText.includes('但是')) {
      return '对话氛围比较理性，在讨论问题';
    } else {
      return '对话氛围比较平和，可以自由发挥';
    }
  }
}

export default FlexibleChatManager;