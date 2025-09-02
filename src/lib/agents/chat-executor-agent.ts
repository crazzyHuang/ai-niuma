/**
 * 💬 对话执行Agent
 * 
 * 负责根据场景分析结果，智能选择和调用合适的聊天机器人
 * 实现真正的群聊互动体验
 */

import { BaseAgent, AgentResult, ChatbotResponse } from '../intelligent-agent-bus';
import { SceneAnalysisResult } from './scene-analyzer-agent';
import agentBus from '../intelligent-agent-bus';

export interface ChatExecutionInput {
  request: {
    conversationId: string;
    userMessage: string;
    conversationHistory: any[];
    availableAgents: any[];
  };
  analysisResult: SceneAnalysisResult;
  availableAgents: any[];
}

export interface ChatExecutionResult {
  responses: ChatbotResponse[];
  agentsUsed: string[];
  quality: number;
  interactionPattern: string;
}

export class ChatExecutorAgent extends BaseAgent {
  readonly id = 'chat-executor';
  readonly capabilities = ['chat_execution', 'agent_selection', 'group_coordination'];

  async execute(input: ChatExecutionInput): Promise<AgentResult> {
    this.lastExecution = new Date();
    
    try {
      if (!this.validateInput(input, ['request', 'analysisResult', 'availableAgents'])) {
        return this.formatOutput(null, false);
      }

      console.log(`💬 [对话执行Agent] 开始执行群聊，场景: ${input.analysisResult.sceneType}`);

      // 第一步：智能选择参与的聊天机器人
      const selectedAgents = await this.selectParticipatingAgents(input);
      
      // 第二步：确定互动模式
      const interactionPattern = this.determineInteractionPattern(input.analysisResult, selectedAgents);
      
      // 第三步：执行群聊对话
      const responses = await this.executeGroupChat(input, selectedAgents, interactionPattern);
      
      // 第四步：评估质量
      const quality = this.evaluateResponseQuality(responses, input);

      const result: ChatExecutionResult = {
        responses,
        agentsUsed: selectedAgents.map(agent => agent.name),
        quality,
        interactionPattern
      };

      console.log(`✅ [对话执行Agent] 群聊完成，参与AI: ${result.agentsUsed.join(', ')}`);
      
      return this.formatOutput(result, true);

    } catch (error) {
      console.error('❌ [对话执行Agent] 执行失败:', error);
      return this.formatOutput(null, false);
    }
  }

  /**
   * 智能选择参与的聊天机器人
   */
  private async selectParticipatingAgents(input: ChatExecutionInput): Promise<any[]> {
    const { analysisResult, availableAgents } = input;
    
    // 首先使用场景分析的建议
    let selectedAgents = availableAgents.filter(agent => 
      analysisResult.participationPlan?.some(suggestion => suggestion.agentName === agent.roleTag) ||
      analysisResult.participationPlan?.some(suggestion => suggestion.agentName === agent.name)
    );

    // 如果建议的Agent不够，使用智能匹配
    if (selectedAgents.length === 0) {
      selectedAgents = await this.intelligentAgentMatching(input);
    }

    // 确保至少有一个Agent参与
    if (selectedAgents.length === 0) {
      selectedAgents = availableAgents.slice(0, 1);
    }

    // 根据场景类型限制参与数量
    const maxAgents = this.getMaxAgentsForScene(analysisResult.sceneType);
    selectedAgents = selectedAgents.slice(0, maxAgents);

    console.log(`🎯 [对话执行Agent] 选中参与AI: ${selectedAgents.map(a => a.name).join(', ')}`);
    
    return selectedAgents;
  }

  /**
   * 智能Agent匹配算法
   */
  private async intelligentAgentMatching(input: ChatExecutionInput): Promise<any[]> {
    const { analysisResult, availableAgents } = input;
    const userMessage = input.request.userMessage.toLowerCase();

    const agentScores: { agent: any; score: number }[] = [];

    for (const agent of availableAgents) {
      let score = 0;

      // 基于角色标签匹配
      score += this.calculateRoleTagMatch(agent.roleTag, analysisResult);
      
      // 基于关键词匹配
      score += this.calculateKeywordMatch(agent, userMessage, analysisResult.topics);
      
      // 基于情感匹配
      score += this.calculateEmotionMatch(agent.roleTag, analysisResult.emotion);

      agentScores.push({ agent, score });
    }

    // 按分数排序，选择前几名
    agentScores.sort((a, b) => b.score - a.score);
    
    const topAgents = agentScores
      .filter(item => item.score > 0.3) // 过滤分数过低的
      .slice(0, 3) // 最多3个
      .map(item => item.agent);

    return topAgents;
  }

  /**
   * 计算角色标签匹配度
   */
  private calculateRoleTagMatch(roleTag: string, analysis: SceneAnalysisResult): number {
    const roleSceneMapping: { [key: string]: string[] } = {
      'EMPATHY': ['emotional_support', 'personal_sharing'],
      'PRACTICAL': ['problem_solving', 'work_discussion'],
      'CREATIVE': ['creative_brainstorm', 'humor_entertainment'],
      'ANALYST': ['learning_discussion', 'debate_discussion'],
      'FOLLOWUP': ['casual_chat']
    };

    const relevantScenes = roleSceneMapping[roleTag] || [];
    return relevantScenes.includes(analysis.sceneType) ? 1.0 : 0.2;
  }

  /**
   * 计算关键词匹配度
   */
  private calculateKeywordMatch(agent: any, userMessage: string, topics: string[]): number {
    let score = 0;
    
    // 基于Agent的系统提示词匹配
    const systemPrompt = agent.prompt?.toLowerCase() || '';
    
    for (const topic of topics) {
      if (systemPrompt.includes(topic.toLowerCase()) || userMessage.includes(topic.toLowerCase())) {
        score += 0.3;
      }
    }

    return Math.min(score, 1.0);
  }

  /**
   * 计算情感匹配度
   */
  private calculateEmotionMatch(roleTag: string, emotion: string): number {
    const emotionRoleMapping: { [key: string]: string[] } = {
      'positive': ['CREATIVE', 'FOLLOWUP'],
      'negative': ['EMPATHY'],
      'worried': ['EMPATHY', 'PRACTICAL'],
      'excited': ['CREATIVE', 'EMPATHY'],
      'neutral': ['PRACTICAL', 'ANALYST']
    };

    const suitableRoles = emotionRoleMapping[emotion] || [];
    return suitableRoles.includes(roleTag) ? 0.5 : 0.1;
  }

  /**
   * 确定互动模式
   */
  private determineInteractionPattern(analysis: SceneAnalysisResult, selectedAgents: any[]): string {
    // 单个Agent：直接回复
    if (selectedAgents.length === 1) {
      return 'single_response';
    }

    // 多个Agent：根据场景决定
    switch (analysis.sceneType) {
      case 'emotional_support':
        return 'sequential_support'; // 顺序安慰
      case 'problem_solving':
        return 'collaborative_solving'; // 协作解决
      case 'debate_discussion':
        return 'perspective_exchange'; // 观点交流
      case 'creative_brainstorm':
        return 'creative_building'; // 创意叠加
      default:
        return 'natural_conversation'; // 自然对话
    }
  }

  /**
   * 执行群聊对话
   */
  private async executeGroupChat(
    input: ChatExecutionInput, 
    selectedAgents: any[], 
    interactionPattern: string
  ): Promise<ChatbotResponse[]> {
    const responses: ChatbotResponse[] = [];

    // 首先尝试调用专业化Agent
    const specializedResponses = await this.trySpecializedAgents(input);
    responses.push(...specializedResponses);

    // 如果没有专业Agent回复，或者需要更多回复，使用常规Agent
    if (responses.length === 0) {
      switch (interactionPattern) {
        case 'single_response':
          const singleResponse = await this.executeSingleAgentResponse(input, selectedAgents[0]);
          if (singleResponse) responses.push(singleResponse);
          break;

        case 'sequential_support':
          const sequentialResponses = await this.executeSequentialSupport(input, selectedAgents);
          responses.push(...sequentialResponses);
          break;

        case 'natural_conversation':
        default:
          const conversationResponses = await this.executeNaturalConversation(input, selectedAgents);
          responses.push(...conversationResponses);
          break;
      }
    }

    return responses;
  }

  /**
   * 尝试调用专业化Agent
   */
  private async trySpecializedAgents(input: ChatExecutionInput): Promise<ChatbotResponse[]> {
    const responses: ChatbotResponse[] = [];
    const sceneType = input.analysisResult.sceneType;
    const userMessage = input.request.userMessage.toLowerCase();

    try {
      // 根据场景类型决定调用哪个专业Agent
      if (sceneType === 'creative_brainstorm' || userMessage.includes('创意') || userMessage.includes('点子') || userMessage.includes('想法')) {
        console.log('🎨 调用创意Agent');
        const creativeAgents = agentBus.discoverAgents(['creative_thinking']);
        if (creativeAgents.length > 0) {
          const result = await creativeAgents[0].execute(input);
          if (result.success && result.data) {
            responses.push(result.data);
          }
        }
      }

      if (sceneType === 'problem_solving' || userMessage.includes('分析') || userMessage.includes('为什么') || userMessage.includes('原因')) {
        console.log('📊 调用分析师Agent');
        const analystAgents = agentBus.discoverAgents(['data_analysis']);
        if (analystAgents.length > 0) {
          const result = await analystAgents[0].execute(input);
          if (result.success && result.data) {
            responses.push(result.data);
          }
        }
      }

      // 如果有多个回复，可以调用质量评估Agent
      if (responses.length > 1) {
        console.log('🎯 调用质量评估Agent');
        const qualityAgents = agentBus.discoverAgents(['quality_assessment']);
        if (qualityAgents.length > 0) {
          const assessmentInput = {
            originalMessage: input.request.userMessage,
            agentResponses: responses,
            sceneAnalysis: input.analysisResult
          };
          const result = await qualityAgents[0].execute(assessmentInput);
          if (result.success) {
            console.log('📈 质量评估完成:', result.data?.overallScore);
          }
        }
      }

    } catch (error) {
      console.error('❌ 专业Agent调用失败:', error);
    }

    return responses;
  }

  /**
   * 执行单个Agent回复
   */
  private async executeSingleAgentResponse(input: ChatExecutionInput, agent: any): Promise<ChatbotResponse | null> {
    try {
      const prompt = await this.buildDynamicPrompt(agent, input, '你是群聊中的唯一回复者，请直接自然地回应用户。');
      const response = await this.callAgentLLM(agent, prompt);
      
      return {
        agentName: agent.name,
        content: response,
        timestamp: new Date(),
        confidence: 0.8
      };
    } catch (error) {
      console.error(`Agent ${agent.name} 回复失败:`, error);
      return null;
    }
  }

  /**
   * 执行顺序支持模式
   */
  private async executeSequentialSupport(input: ChatExecutionInput, agents: any[]): Promise<ChatbotResponse[]> {
    const responses: ChatbotResponse[] = [];
    let conversationContext = `用户: ${input.request.userMessage}\n`;

    for (let i = 0; i < agents.length; i++) {
      const agent = agents[i];
      const isFirst = i === 0;
      const isLast = i === agents.length - 1;

      let roleInstruction = '';
      if (isFirst) {
        roleInstruction = '你是第一个回复的朋友，请给予温暖的理解和支持。';
      } else if (isLast) {
        roleInstruction = '你是最后回复的朋友，请做个温暖的总结和鼓励。';
      } else {
        roleInstruction = '你是中间回复的朋友，请在前面朋友的基础上补充支持。';
      }

      try {
        const prompt = await this.buildDynamicPrompt(agent, input, roleInstruction, conversationContext);
        const response = await this.callAgentLLM(agent, prompt);
        
        const chatResponse: ChatbotResponse = {
          agentName: agent.name,
          content: response,
          timestamp: new Date(),
          confidence: 0.8
        };

        responses.push(chatResponse);
        conversationContext += `${agent.name}: ${response}\n`;

        // 短暂延迟，模拟真实打字时间
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.error(`Agent ${agent.name} 回复失败:`, error);
      }
    }

    return responses;
  }

  /**
   * 执行自然对话模式
   */
  private async executeNaturalConversation(input: ChatExecutionInput, agents: any[]): Promise<ChatbotResponse[]> {
    const responses: ChatbotResponse[] = [];
    
    // 随机打乱Agent顺序，增加自然性
    const shuffledAgents = [...agents].sort(() => Math.random() - 0.5);
    
    // 决定参与的Agent数量（随机性）
    const participatingCount = Math.min(
      Math.floor(Math.random() * shuffledAgents.length) + 1, 
      3 // 最多3个
    );
    
    const participatingAgents = shuffledAgents.slice(0, participatingCount);
    let conversationContext = `用户: ${input.request.userMessage}\n`;

    for (const agent of participatingAgents) {
      try {
        const roleInstruction = '请作为群聊中的朋友，自然地参与对话。可以简短回应，也可以补充观点。';
        const prompt = await this.buildDynamicPrompt(agent, input, roleInstruction, conversationContext);
        const response = await this.callAgentLLM(agent, prompt);
        
        const chatResponse: ChatbotResponse = {
          agentName: agent.name,
          content: response,
          timestamp: new Date(),
          confidence: 0.75
        };

        responses.push(chatResponse);
        conversationContext += `${agent.name}: ${response}\n`;

        // 随机延迟
        const delay = Math.random() * 1000 + 300; // 0.3-1.3秒
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (error) {
        console.error(`Agent ${agent.name} 回复失败:`, error);
      }
    }

    return responses;
  }

  /**
   * 构建动态提示词
   */
  private async buildDynamicPrompt(
    agent: any, 
    input: ChatExecutionInput, 
    roleInstruction: string,
    conversationContext?: string
  ): Promise<string> {
    const basePrompt = agent.prompt || `你是${agent.name}，一个友善的AI助手。`;
    
    const contextInfo = conversationContext || `用户: ${input.request.userMessage}`;
    
    const sceneContext = this.buildSceneContext(input.analysisResult);
    
    return `${basePrompt}

${sceneContext}

${roleInstruction}

【当前对话】
${contextInfo}

请简短、自然地回复（50-150字）。保持你的个性特色。`;
  }

  /**
   * 构建场景上下文
   */
  private buildSceneContext(analysis: SceneAnalysisResult): string {
    const sceneDescriptions: { [key: string]: string } = {
      'emotional_support': '当前是情感支持场景，请给予温暖的理解和鼓励。',
      'problem_solving': '当前是问题解决场景，请提供实用的建议和解决方案。',
      'casual_chat': '当前是日常闲聊场景，请轻松自然地参与对话。',
      'work_discussion': '当前是工作讨论场景，请保持专业且有帮助的态度。',
      'creative_brainstorm': '当前是创意讨论场景，请发挥创造性思维。'
    };

    const sceneDesc = sceneDescriptions[analysis.sceneType] || '请自然地参与这次对话。';
    const emotionDesc = `用户当前情感状态：${analysis.emotion}`;
    const topicsDesc = analysis.topics.length > 0 ? `讨论话题：${analysis.topics.join('、')}` : '';

    return `【场景信息】\n${sceneDesc}\n${emotionDesc}\n${topicsDesc}`.trim();
  }

  /**
   * 调用Agent的LLM
   */
  private async callAgentLLM(agent: any, prompt: string): Promise<string> {
    try {
      // 构建带有Agent个性的完整提示词
      const systemPrompt = agent.prompt || `你是${agent.name}，一个友善的AI助手。`;
      const fullPrompt = `${systemPrompt}\n\n${prompt}`;

      // 使用默认LLM配置调用
      const response = await this.callLLM(fullPrompt);
      return response;
      
    } catch (error) {
      console.error(`调用Agent ${agent.name} LLM失败:`, error);
      // 返回一个友好的错误回复
      return `抱歉，我现在有点忙，稍后再聊吧~ 😊`;
    }
  }

  /**
   * 评估回复质量
   */
  private evaluateResponseQuality(responses: ChatbotResponse[], input: ChatExecutionInput): number {
    if (responses.length === 0) return 0;

    let totalQuality = 0;
    
    for (const response of responses) {
      let quality = 0.5; // 基础分数
      
      // 长度合理性 (50-150字为最佳)
      const length = response.content.length;
      if (length >= 20 && length <= 200) {
        quality += 0.2;
      }
      
      // 内容相关性（简单检测）
      const hasRelevantContent = input.analysisResult.topics.some(topic =>
        response.content.toLowerCase().includes(topic.toLowerCase())
      );
      if (hasRelevantContent) {
        quality += 0.2;
      }
      
      // 情感匹配性
      if (this.matchesEmotionalTone(response.content, input.analysisResult.emotion)) {
        quality += 0.1;
      }
      
      totalQuality += quality;
    }

    return Math.min(totalQuality / responses.length, 1.0);
  }

  /**
   * 检查回复是否匹配情感基调
   */
  private matchesEmotionalTone(content: string, emotion: string): boolean {
    const contentLower = content.toLowerCase();
    
    switch (emotion) {
      case 'positive':
        return /[哈哈😊😄🎉👍]/.test(content) || 
               /[开心|高兴|棒|好的|不错|很好]/.test(contentLower);
      case 'negative':
        return /[理解|支持|没关系|会好的]/.test(contentLower);
      case 'worried':
        return /[别担心|放心|没问题|会解决]/.test(contentLower);
      default:
        return true; // 中性情况默认匹配
    }
  }

  /**
   * 获取场景对应的最大Agent数量
   */
  private getMaxAgentsForScene(sceneType: string): number {
    const maxAgentsMapping: { [key: string]: number } = {
      'emotional_support': 3, // 情感支持可以多人安慰
      'problem_solving': 2,   // 问题解决2-3个就够
      'casual_chat': 3,       // 闲聊可以热闹点
      'work_discussion': 2,   // 工作讨论保持专业
      'creative_brainstorm': 3, // 创意需要多元思维
      'debate_discussion': 2  // 争论不要太多人
    };

    return maxAgentsMapping[sceneType] || 2;
  }
}

export default ChatExecutorAgent;