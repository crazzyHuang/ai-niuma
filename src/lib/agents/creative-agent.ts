/**
 * 🎨 创意Agent
 * 
 * 专门负责创意思维、头脑风暴、艺术创作等场景
 * 提供富有想象力和创新性的回应
 */

import { BaseAgent, AgentResult, ChatbotResponse } from '../intelligent-agent-bus';

export interface CreativeInput {
  request: {
    conversationId: string;
    userMessage: string;
    conversationHistory: any[];
  };
  analysisResult: any;
  creativeFocus?: 'brainstorm' | 'storytelling' | 'problem_solving' | 'artistic';
}

export class CreativeAgent extends BaseAgent {
  readonly id = 'creative-agent';
  readonly capabilities = ['creative_thinking', 'brainstorming', 'storytelling', 'artistic_inspiration'];

  async execute(input: CreativeInput): Promise<AgentResult> {
    this.lastExecution = new Date();
    
    try {
      if (!this.validateInput(input, ['request'])) {
        return this.formatOutput(null, false);
      }

      console.log(`🎨 [创意Agent] 开始创意思考...`);

      const creativeFocus = input.creativeFocus || this.detectCreativeFocus(input.request.userMessage);
      const creativePrompt = this.buildCreativePrompt(input, creativeFocus);
      
      const response = await this.callLLM(creativePrompt);
      
      const result: ChatbotResponse = {
        agentName: '创意大师',
        content: response,
        timestamp: new Date(),
        confidence: 0.85
      };

      console.log(`✨ [创意Agent] 创意完成: ${creativeFocus}`);
      
      return this.formatOutput(result, true);

    } catch (error) {
      console.error('❌ [创意Agent] 执行失败:', error);
      return this.formatOutput(null, false);
    }
  }

  /**
   * 检测创意焦点类型
   */
  private detectCreativeFocus(userMessage: string): string {
    const message = userMessage.toLowerCase();
    
    if (message.includes('故事') || message.includes('小说') || message.includes('剧本')) {
      return 'storytelling';
    }
    if (message.includes('设计') || message.includes('艺术') || message.includes('创作')) {
      return 'artistic';
    }
    if (message.includes('想法') || message.includes('点子') || message.includes('创意')) {
      return 'brainstorm';
    }
    if (message.includes('解决') || message.includes('方案') || message.includes('办法')) {
      return 'problem_solving';
    }
    
    return 'brainstorm';
  }

  /**
   * 构建创意提示词
   */
  private buildCreativePrompt(input: CreativeInput, focus: string): string {
    const userMessage = input.request.userMessage;
    const emotion = input.analysisResult?.emotion || 'neutral';
    
    const focusInstructions = {
      brainstorm: '发挥发散思维，提供多个创新角度和独特想法。要敢于突破常规思维。',
      storytelling: '运用丰富的想象力，创造生动有趣的情节和角色。注重故事的吸引力。',
      artistic: '从美学角度思考，提供富有艺术感和视觉冲击力的创意方案。',
      problem_solving: '跳出框架思考，提供创新性的解决方案，敢于尝试不寻常的方法。'
    };

    const emotionAdaptation = {
      excited: '保持这种兴奋的能量，让创意更加天马行空！',
      worried: '通过创意思维找到新的可能性，化担忧为动力。',
      positive: '在这种积极状态下，创意会更加闪闪发光！',
      neutral: '用创意的火花点亮平静的思绪。',
      negative: '让创意成为突破困境的光芒。'
    };

    return `你是一位充满想象力的创意大师，擅长${focus === 'brainstorm' ? '头脑风暴' : focus === 'storytelling' ? '故事创作' : focus === 'artistic' ? '艺术创意' : '创新解决方案'}。

当前用户情感状态：${emotion}
适应策略：${emotionAdaptation[emotion] || emotionAdaptation.neutral}

用户消息：${userMessage}

创意指导：${focusInstructions[focus]}

请以创意大师的身份，用充满想象力和启发性的语言回应（100-200字）。要：
1. 提供具体可行的创意想法
2. 激发用户的创造性思维  
3. 保持轻松有趣的语调
4. 给出2-3个不同角度的建议`;
  }
}

export default CreativeAgent;