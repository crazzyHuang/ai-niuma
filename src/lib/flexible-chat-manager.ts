import llmService from './llm-service';
import LLMConfigManager from './llm-config';
import { LLMMessage } from '@/types/llm';
import prisma from './db';
import flexibleFriends from '../../config/flexible-friends.json';

interface Friend {
  roleTag: string;
  name: string;
  basePersonality: string;
  traits: string[];
  topics: Record<string, string>;
  responseStyles: string[];
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
 * 让AI朋友们能够进行真实、多样化的对话
 */
export class FlexibleChatManager {
  private static friends: Friend[] = flexibleFriends.friends as Friend[];
  
  /**
   * 智能选择参与对话的朋友
   */
  static selectFriends(context: ChatContext): Friend[] {
    const topicType = this.analyzeTopicType(context.userMessage);
    const friendCount = this.decideFriendCount(context.userMessage);
    
    // 基于话题类型和随机性选择朋友
    const availableFriends = [...this.friends];
    const selectedFriends: Friend[] = [];
    
    // 确保至少有一个朋友适合当前话题
    const topicMatchFriends = availableFriends.filter(friend => 
      friend.topics[topicType] && friend.topics[topicType].length > 0
    );
    
    if (topicMatchFriends.length > 0) {
      const primaryFriend = topicMatchFriends[Math.floor(Math.random() * topicMatchFriends.length)];
      selectedFriends.push(primaryFriend);
      availableFriends.splice(availableFriends.indexOf(primaryFriend), 1);
    }
    
    // 随机选择剩余的朋友
    while (selectedFriends.length < friendCount && availableFriends.length > 0) {
      const randomIndex = Math.floor(Math.random() * availableFriends.length);
      selectedFriends.push(availableFriends[randomIndex]);
      availableFriends.splice(randomIndex, 1);
    }
    
    return selectedFriends;
  }
  
  /**
   * 为特定朋友生成动态系统提示词
   */
  static async generateDynamicPrompt(
    friend: Friend,
    context: ChatContext,
    isFirstResponder: boolean,
    previousResponses: string[]
  ): Promise<string> {
    const topicType = this.analyzeTopicType(context.userMessage);
    const currentMood = this.generateRandomMood();
    const timePersonality = this.getTimeBasedPersonality(context.timeOfDay);
    
    // 随机选择一个回应风格
    const responseStyle = friend.responseStyles[Math.floor(Math.random() * friend.responseStyles.length)];
    
    // 分析对话氛围
    const conversationTone = this.analyzeConversationTone(previousResponses);
    
    const dynamicPrompt = `
你是${friend.name}，${friend.basePersonality}。

【当前状态】
- 时间：${context.timeOfDay}，${timePersonality}
- 今天心情：${currentMood}
- 话题类型：${topicType}
- 你在这个话题上的特点：${friend.topics[topicType] || '可以随意聊聊'}

【个性特征】
${friend.traits.map(trait => `- ${trait}`).join('\n')}

【当前对话情况】
${isFirstResponder ? '你是第一个看到消息的朋友，可以自然地回应。' : ''}
${previousResponses.length > 0 ? `前面的朋友们已经说了：\n${previousResponses.join('\n')}\n你可以回应他们的话，或者从新角度回应用户。` : ''}

【对话氛围】${conversationTone}

【今天的回应倾向】${responseStyle}

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
   * 决定朋友数量
   */
  private static decideFriendCount(message: string): number {
    // 根据消息复杂度决定朋友数量
    if (message.length > 50) {
      return Math.floor(Math.random() * 2) + 3; // 3-4个朋友
    } else {
      return Math.floor(Math.random() * 2) + 2; // 2-3个朋友
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
      '今天比较感性，容易共鸣'
    ];
    
    return moods[Math.floor(Math.random() * moods.length)];
  }
  
  /**
   * 基于时间的个性调整
   */
  private static getTimeBasedPersonality(timeOfDay: string): string {
    const timePersonalities = {
      morning: '刚起床不久，可能还有点迷糊但很温和',
      afternoon: '一天中状态最好的时候，很有活力',
      evening: '一天结束了，比较放松，适合深入聊天',
      night: '有点累但还想聊会天，比较随性'
    };
    
    return timePersonalities[timeOfDay as keyof typeof timePersonalities] || '状态正常';
  }
  
  /**
   * 分析对话氛围
   */
  private static analyzeConversationTone(previousResponses: string[]): string {
    if (previousResponses.length === 0) return '刚开始聊天，氛围还在形成中';
    
    const allResponses = previousResponses.join(' ');
    
    if (allResponses.includes('哈哈') || allResponses.includes('😂')) {
      return '氛围比较轻松愉快，大家都在开心聊天';
    } else if (allResponses.includes('抱抱') || allResponses.includes('理解')) {
      return '氛围比较温暖，大家在互相关心';
    } else if (allResponses.includes('建议') || allResponses.includes('可以')) {
      return '大家在认真讨论问题，氛围比较务实';
    } else {
      return '对话氛围比较平和，可以自由发挥';
    }
  }
  
  /**
   * 获取当前时间段
   */
  static getCurrentTimeOfDay(): string {
    const hour = new Date().getHours();
    
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
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
    const context: ChatContext = {
      userMessage,
      conversationHistory,
      topicType: this.analyzeTopicType(userMessage),
      timeOfDay: this.getCurrentTimeOfDay(),
      mood: this.generateRandomMood()
    };
    
    // 选择参与对话的朋友
    const selectedFriends = this.selectFriends(context);
    console.log('🎭 选择的朋友们:', selectedFriends.map(f => f.name));
    
    const previousResponses: string[] = [];
    let updatedHistory = conversationHistory;
    
    // 依次让朋友们回应
    for (let i = 0; i < selectedFriends.length; i++) {
      const friend = selectedFriends[i];
      const isFirstResponder = i === 0;
      
      try {
        onEvent({ type: 'step_started', step: friend.roleTag });
        
        // 生成动态提示词
        const dynamicPrompt = await this.generateDynamicPrompt(
          friend,
          context,
          isFirstResponder,
          previousResponses
        );
        
        // 构建消息
        const messages: LLMMessage[] = [
          {
            role: 'system',
            content: dynamicPrompt,
          },
          {
            role: 'user',
            content: `【群聊记录】\n${updatedHistory}\n\n现在轮到你回复了，请保持自然的朋友语气。`,
          },
        ];
        
        // 调用LLM
        const llmConfig = LLMConfigManager.buildLLMConfig('modelscope', 'deepseek-ai/DeepSeek-V3.1', {
          temperature: 0.8 + Math.random() * 0.4, // 增加随机性
          maxTokens: 150,
        });
        
        console.log(`🚀 ${friend.name}开始回应...`);
        
        const response = await llmService.streamChat(
          llmConfig,
          messages,
          (chunk) => {
            if (!chunk.isComplete && chunk.content) {
              onEvent({
                type: 'ai_chunk',
                text: chunk.content,
                agent: friend.roleTag
              });
            }
          }
        );
        
        console.log(`✅ ${friend.name}回应完成: ${response.content}`);
        
        // 保存消息到数据库
        await prisma.message.create({
          data: {
            convId: conversationId,
            role: 'ai',
            agentId: friend.roleTag,
            step: friend.roleTag,
            content: response.content,
            tokens: response.usage?.totalTokens || 0,
            costCents: 0, // 暂时设为0，后续可以加入成本计算
          },
        });
        
        // 发送完成事件
        onEvent({
          type: 'ai_message_completed',
          agent: friend.roleTag,
          content: response.content,
        });
        
        // 更新历史记录
        previousResponses.push(`${friend.name}: ${response.content}`);
        updatedHistory += `${friend.name}: ${response.content}\n\n`;
        
        // 随机延迟，模拟真实聊天
        if (i < selectedFriends.length - 1) {
          await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
        }
        
      } catch (error) {
        console.error(`${friend.name}回应失败:`, error);
        onEvent({
          type: 'step_failed',
          step: friend.roleTag,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
    
    onEvent({ type: 'orchestration_completed' });
  }
}

export default FlexibleChatManager;