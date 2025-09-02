/**
 * 🔍 场景分析Agent
 * 
 * 负责分析用户消息的场景类型、情感状态和话题
 * 为后续的智能调度提供决策依据
 */

import { BaseAgent, AgentResult } from '../intelligent-agent-bus';
import aiEmotionAnalyzer from '../ai-emotion-analyzer';

export interface SceneAnalysisInput {
  message: string;
  history: any[];
  availableAgents: any[];
  context?: {
    timeOfDay?: string;
    conversationType?: string;
    userProfile?: any;
  };
}

// V1需求：深度情境理解结果
export interface SceneAnalysisResult {
  // 基础场景信息
  sceneType: string;
  secondaryScene?: string;
  emotion: string;
  emotionalIntensity: number; // 0-1，情感强度
  topics: string[];
  confidence: number;
  
  // V1需求：深度情境分析
  socialDynamics: SocialDynamics;
  userIntent: UserIntent;
  conversationFlow: ConversationFlow;
  contextualFactors: ContextualFactors;
  
  // 智能建议
  participationPlan: ParticipationSuggestion[];
  interactionStrategy: string;
  
  // 元信息
  reasoning: string;
  analysisDepth: 'basic' | 'enhanced' | 'deep';
}

// V1需求：社交动态分析
export interface SocialDynamics {
  conversationTone: string; // formal, casual, friendly, tense
  powerDynamics: string; // equal, user_leading, ai_leading
  intimacyLevel: string; // stranger, acquaintance, friend, close_friend
  groupCohesion: number; // 0-1，群聊凝聚力
}

// V1需求：用户意图理解
export interface UserIntent {
  primaryIntent: string; // seek_info, emotional_support, problem_solving, entertainment, etc.
  secondaryIntents: string[];
  urgencyLevel: number; // 0-1，紧迫程度
  expectationType: string; // quick_answer, deep_discussion, creative_collaboration, etc.
}

// V1需求：对话流程分析
export interface ConversationFlow {
  phase: string; // opening, development, climax, resolution, closing
  momentum: string; // building, stable, declining
  topicProgression: string[]; // 话题演进路径
  interactionPattern: string; // question_answer, storytelling, brainstorming, debate
}

// V1需求：上下文因素
export interface ContextualFactors {
  timeContext: {
    timeOfDay?: string;
    isWorkingHours?: boolean;
    temporalRelevance?: string; // past, present, future focused
  };
  environmentalContext: {
    setting?: string; // personal, professional, academic, social
    formality?: string; // very_formal, formal, casual, very_casual
  };
  culturalContext: {
    communicationStyle?: string; // direct, indirect, diplomatic
    culturalSensitivity?: string[]; // 需要注意的文化因素
  };
}

// V1需求：参与建议
export interface ParticipationSuggestion {
  agentName: string;
  roleInConversation: string; // primary_responder, supporter, moderator, observer
  participationTiming: string; // immediate, delayed, conditional
  expectedContribution: string;
  priority: number; // 0-1
}

export class SceneAnalyzerAgent extends BaseAgent {
  readonly id = 'scene-analyzer';
  readonly capabilities = ['scene_analysis', 'emotion_detection', 'topic_extraction', 'deep_context_understanding'];

  async execute(input: SceneAnalysisInput): Promise<AgentResult> {
    this.lastExecution = new Date();
    
    try {
      // 输入验证
      if (!this.validateInput(input, ['message', 'history', 'availableAgents'])) {
        return this.formatOutput(null, false);
      }

      console.log(`🔍 [深度场景分析Agent] 开始多维度分析: "${input.message.substring(0, 50)}..."`);

      // V1需求：多维度分析
      const analysisResult = await this.performDeepAnalysis(input);
      
      console.log(`✅ [深度场景分析Agent] 分析完成: 场景=${analysisResult.sceneType}, 情感=${analysisResult.emotion}, 深度=${analysisResult.analysisDepth}`);
      
      return this.formatOutput(analysisResult, true);

    } catch (error) {
      console.error('❌ [深度场景分析Agent] 执行失败:', error);
      
      // 返回基础分析结果
      const fallbackResult = await this.createFallbackResult(input);
      return this.formatOutput(fallbackResult, false);
    }
  }

  /**
   * V1需求：执行深度多维度分析 (集成AI分析)
   */
  private async performDeepAnalysis(input: SceneAnalysisInput): Promise<SceneAnalysisResult> {
    console.log('🧠 [深度分析] 开始情境理解（AI增强版）...');

    // 第零步：AI综合分析
    let aiAnalysisResult;
    try {
      aiAnalysisResult = await aiEmotionAnalyzer.analyzeMessage(input.message);
      console.log(`🤖 [AI分析] 完成，置信度: ${aiAnalysisResult.metadata.overallConfidence.toFixed(2)}`);
    } catch (error) {
      console.warn('⚠️ AI分析失败，继续使用传统分析:', error);
    }

    // 第一步：基础场景分析（集成AI结果）
    const basicAnalysis = await this.performBasicAnalysis(input, aiAnalysisResult);
    console.log('✅ [深度分析] 基础分析完成');

    // 第二步：深度情境理解
    const contextAnalysis = await this.analyzeDeepContext(input, basicAnalysis);
    console.log('✅ [深度分析] 上下文分析完成');

    // 第三步：社交动态分析
    const socialAnalysis = await this.analyzeSocialDynamics(input);
    console.log('✅ [深度分析] 社交动态分析完成');

    // 第四步：用户意图理解
    const intentAnalysis = await this.analyzeUserIntent(input, basicAnalysis);
    console.log('✅ [深度分析] 意图分析完成');

    // 第五步：对话流程分析
    const flowAnalysis = await this.analyzeConversationFlow(input);
    console.log('✅ [深度分析] 对话流程分析完成');

    // 第六步：生成智能参与计划
    const participationPlan = await this.generateParticipationPlan(
      input, 
      basicAnalysis, 
      socialAnalysis, 
      intentAnalysis
    );
    console.log('✅ [深度分析] 参与计划生成完成');

    // 综合所有分析结果
    return {
      ...basicAnalysis,
      socialDynamics: socialAnalysis,
      userIntent: intentAnalysis,
      conversationFlow: flowAnalysis,
      contextualFactors: contextAnalysis,
      participationPlan,
      interactionStrategy: this.determineInteractionStrategy(basicAnalysis, socialAnalysis, intentAnalysis),
      analysisDepth: 'deep'
    };
  }

  /**
   * 基础场景分析 - 集成AI分析结果
   */
  private async performBasicAnalysis(input: SceneAnalysisInput, aiAnalysisResult?: any): Promise<Partial<SceneAnalysisResult>> {
    // 如果有AI分析结果，优先使用并结合LLM分析
    if (aiAnalysisResult) {
      console.log('🤖 [基础分析] 使用AI分析结果');
      
      const sceneType = this.mapTopicToSceneType(aiAnalysisResult.topic.primaryTopic);
      const emotion = this.mapAIEmotionToEmotion(aiAnalysisResult.emotion.primaryEmotion);
      const topics = aiAnalysisResult.topic.specificTopics.length > 0 
        ? aiAnalysisResult.topic.specificTopics 
        : aiAnalysisResult.topic.topicKeywords;

      // 如果AI分析置信度很高，直接使用
      if (aiAnalysisResult.metadata.overallConfidence > 0.8) {
        return {
          sceneType,
          emotion,
          emotionalIntensity: aiAnalysisResult.emotion.intensity,
          topics: topics.slice(0, 5),
          confidence: aiAnalysisResult.metadata.overallConfidence,
          reasoning: `基于AI分析：${aiAnalysisResult.emotion.primaryEmotion}情感，${aiAnalysisResult.topic.primaryTopic}话题`
        };
      }

      // 如果置信度中等，结合LLM分析进行验证
      console.log('🔄 [基础分析] AI置信度中等，结合LLM验证');
    }

    // 执行传统LLM分析
    const analysisPrompt = this.buildBasicAnalysisPrompt(input);
    const llmResponse = await this.callLLM(analysisPrompt);
    const llmResult = this.parseBasicAnalysisResult(llmResponse, input);
    
    // 如果有AI结果，进行混合判断
    if (aiAnalysisResult) {
      return this.combineAIAndLLMResults(aiAnalysisResult, llmResult, input);
    }

    // 纯LLM结果
    return {
      sceneType: llmResult.sceneType,
      emotion: llmResult.emotion,
      emotionalIntensity: this.calculateEmotionalIntensity(llmResult.emotion, input.message),
      topics: llmResult.topics,
      confidence: llmResult.confidence,
      reasoning: llmResult.reasoning
    };
  }

  /**
   * V1需求：深度上下文分析
   */
  private async analyzeDeepContext(input: SceneAnalysisInput, basicAnalysis: Partial<SceneAnalysisResult>): Promise<ContextualFactors> {
    const contextPrompt = `作为上下文分析专家，请深度分析以下对话的情境因素：

用户消息: "${input.message}"
基础场景: ${basicAnalysis.sceneType}
情感状态: ${basicAnalysis.emotion}

请分析以下维度并返回JSON：

{
  "timeContext": {
    "timeOfDay": "morning/afternoon/evening/night/unknown",
    "isWorkingHours": true/false,
    "temporalRelevance": "past/present/future"
  },
  "environmentalContext": {
    "setting": "personal/professional/academic/social/unknown", 
    "formality": "very_formal/formal/casual/very_casual"
  },
  "culturalContext": {
    "communicationStyle": "direct/indirect/diplomatic",
    "culturalSensitivity": ["factor1", "factor2"]
  }
}`;

    const response = await this.callLLM(contextPrompt);
    return this.parseContextAnalysis(response);
  }

  /**
   * V1需求：社交动态分析
   */
  private async analyzeSocialDynamics(input: SceneAnalysisInput): Promise<SocialDynamics> {
    const historyText = input.history.slice(-10).map(msg => 
      `${msg.role === 'user' ? '用户' : 'AI'}: ${msg.content}`
    ).join('\n');

    const socialPrompt = `作为社交动态分析专家，分析以下对话的社交特征：

当前消息: "${input.message}"
对话历史:
${historyText || '无历史记录'}

请分析并返回JSON：

{
  "conversationTone": "formal/casual/friendly/tense/professional",
  "powerDynamics": "equal/user_leading/ai_leading/collaborative",
  "intimacyLevel": "stranger/acquaintance/friend/close_friend",
  "groupCohesion": 0.8
}`;

    const response = await this.callLLM(socialPrompt);
    return this.parseSocialDynamics(response);
  }

  /**
   * V1需求：用户意图理解
   */
  private async analyzeUserIntent(input: SceneAnalysisInput, basicAnalysis: Partial<SceneAnalysisResult>): Promise<UserIntent> {
    const intentPrompt = `作为意图理解专家，深度分析用户的真实意图：

用户消息: "${input.message}"
场景类型: ${basicAnalysis.sceneType}
情感状态: ${basicAnalysis.emotion}

请分析用户的深层意图并返回JSON：

{
  "primaryIntent": "seek_info/emotional_support/problem_solving/entertainment/social_bonding/creative_collaboration",
  "secondaryIntents": ["intent1", "intent2"],
  "urgencyLevel": 0.7,
  "expectationType": "quick_answer/deep_discussion/creative_collaboration/emotional_validation/practical_solution"
}`;

    const response = await this.callLLM(intentPrompt);
    return this.parseUserIntent(response);
  }

  /**
   * V1需求：对话流程分析
   */
  private async analyzeConversationFlow(input: SceneAnalysisInput): Promise<ConversationFlow> {
    const recentTopics = this.extractTopicsFromHistory(input.history);
    
    return {
      phase: this.determineConversationPhase(input.history),
      momentum: this.analyzeMomentum(input.history, input.message),
      topicProgression: recentTopics,
      interactionPattern: this.identifyInteractionPattern(input.history, input.message)
    };
  }

  /**
   * V1需求：生成智能参与计划
   */
  private async generateParticipationPlan(
    input: SceneAnalysisInput,
    basicAnalysis: Partial<SceneAnalysisResult>,
    socialAnalysis: SocialDynamics,
    intentAnalysis: UserIntent
  ): Promise<ParticipationSuggestion[]> {
    const planPrompt = `作为AI参与策略专家，为以下场景制定最优的AI参与计划：

场景: ${basicAnalysis.sceneType}
用户意图: ${intentAnalysis.primaryIntent}  
社交氛围: ${socialAnalysis.conversationTone}
可用AI: ${input.availableAgents.map(a => `${a.name}(${a.roleTag})`).join(', ')}

请为每个合适的AI制定参与策略，返回JSON数组：

[{
  "agentName": "AI名称",
  "roleInConversation": "primary_responder/supporter/moderator/creative_catalyst",
  "participationTiming": "immediate/delayed/conditional",
  "expectedContribution": "具体贡献描述",
  "priority": 0.9
}]

最多选择3个最合适的AI。`;

    const response = await this.callLLM(planPrompt);
    return this.parseParticipationPlan(response, input.availableAgents);
  }

  // ============= 辅助方法实现 =============

  /**
   * 计算情感强度
   */
  private calculateEmotionalIntensity(emotion: string, message: string): number {
    const strongIndicators = ['非常', '极其', '特别', '超级', '太', '真的', '完全'];
    const hasStrongIndicators = strongIndicators.some(word => message.includes(word));
    
    const baseIntensity = {
      'excited': 0.8,
      'angry': 0.7,
      'worried': 0.6,
      'positive': 0.5,
      'negative': 0.5,
      'neutral': 0.2
    };
    
    const base = baseIntensity[emotion as keyof typeof baseIntensity] || 0.3;
    return hasStrongIndicators ? Math.min(base + 0.2, 1.0) : base;
  }

  /**
   * 确定交互策略
   */
  private determineInteractionStrategy(
    basicAnalysis: Partial<SceneAnalysisResult>,
    socialAnalysis: SocialDynamics,
    intentAnalysis: UserIntent
  ): string {
    if (intentAnalysis.urgencyLevel > 0.7) return 'immediate_response';
    if (basicAnalysis.sceneType === 'creative_brainstorm') return 'collaborative_exploration';
    if (socialAnalysis.conversationTone === 'tense') return 'gentle_mediation';
    if (intentAnalysis.expectationType === 'deep_discussion') return 'thoughtful_dialogue';
    return 'natural_conversation';
  }

  /**
   * 创建回退结果
   */
  private async createFallbackResult(input: SceneAnalysisInput): Promise<SceneAnalysisResult> {
    const basicResult = this.fallbackBasicAnalysis(input);
    
    return {
      ...basicResult,
      emotionalIntensity: 0.3,
      socialDynamics: {
        conversationTone: 'casual',
        powerDynamics: 'equal',
        intimacyLevel: 'acquaintance',
        groupCohesion: 0.5
      },
      userIntent: {
        primaryIntent: 'social_bonding',
        secondaryIntents: [],
        urgencyLevel: 0.3,
        expectationType: 'quick_answer'
      },
      conversationFlow: {
        phase: 'development',
        momentum: 'stable',
        topicProgression: ['general'],
        interactionPattern: 'question_answer'
      },
      contextualFactors: {
        timeContext: { temporalRelevance: 'present' },
        environmentalContext: { formality: 'casual' },
        culturalContext: { communicationStyle: 'direct', culturalSensitivity: [] }
      },
      participationPlan: input.availableAgents.slice(0, 2).map(agent => ({
        agentName: agent.name,
        roleInConversation: 'supporter',
        participationTiming: 'immediate',
        expectedContribution: '提供友好回应',
        priority: 0.5
      })),
      interactionStrategy: 'natural_conversation',
      analysisDepth: 'basic'
    };
  }

  // ============= 解析方法实现 =============

  /**
   * 解析上下文分析结果
   */
  private parseContextAnalysis(response: string): ContextualFactors {
    try {
      const cleaned = this.extractJsonFromResponse(response);
      const parsed = JSON.parse(cleaned);
      return {
        timeContext: parsed.timeContext || {},
        environmentalContext: parsed.environmentalContext || {},
        culturalContext: parsed.culturalContext || { communicationStyle: 'direct', culturalSensitivity: [] }
      };
    } catch (error) {
      return {
        timeContext: { temporalRelevance: 'present' },
        environmentalContext: { formality: 'casual' },
        culturalContext: { communicationStyle: 'direct', culturalSensitivity: [] }
      };
    }
  }

  /**
   * 解析社交动态结果
   */
  private parseSocialDynamics(response: string): SocialDynamics {
    try {
      const cleaned = this.extractJsonFromResponse(response);
      const parsed = JSON.parse(cleaned);
      return {
        conversationTone: parsed.conversationTone || 'casual',
        powerDynamics: parsed.powerDynamics || 'equal',
        intimacyLevel: parsed.intimacyLevel || 'acquaintance',
        groupCohesion: Number(parsed.groupCohesion) || 0.5
      };
    } catch (error) {
      return {
        conversationTone: 'casual',
        powerDynamics: 'equal',
        intimacyLevel: 'acquaintance',
        groupCohesion: 0.5
      };
    }
  }

  /**
   * 解析用户意图结果
   */
  private parseUserIntent(response: string): UserIntent {
    try {
      const cleaned = this.extractJsonFromResponse(response);
      const parsed = JSON.parse(cleaned);
      return {
        primaryIntent: parsed.primaryIntent || 'social_bonding',
        secondaryIntents: Array.isArray(parsed.secondaryIntents) ? parsed.secondaryIntents : [],
        urgencyLevel: Number(parsed.urgencyLevel) || 0.3,
        expectationType: parsed.expectationType || 'quick_answer'
      };
    } catch (error) {
      return {
        primaryIntent: 'social_bonding',
        secondaryIntents: [],
        urgencyLevel: 0.3,
        expectationType: 'quick_answer'
      };
    }
  }

  /**
   * 解析参与计划
   */
  private parseParticipationPlan(response: string, availableAgents: any[]): ParticipationSuggestion[] {
    try {
      const cleaned = this.extractJsonFromResponse(response);
      const parsed = JSON.parse(cleaned);
      
      if (!Array.isArray(parsed)) return [];
      
      const agentNames = availableAgents.map(a => a.name);
      
      return parsed
        .filter(item => agentNames.includes(item.agentName))
        .slice(0, 3)
        .map(item => ({
          agentName: item.agentName,
          roleInConversation: item.roleInConversation || 'supporter',
          participationTiming: item.participationTiming || 'immediate',
          expectedContribution: item.expectedContribution || '提供支持',
          priority: Number(item.priority) || 0.5
        }));
    } catch (error) {
      return availableAgents.slice(0, 2).map(agent => ({
        agentName: agent.name,
        roleInConversation: 'supporter',
        participationTiming: 'immediate',
        expectedContribution: '提供友好回应',
        priority: 0.5
      }));
    }
  }

  // ============= 对话流程分析辅助方法 =============

  /**
   * 从历史中提取话题
   */
  private extractTopicsFromHistory(history: any[]): string[] {
    if (!history || history.length === 0) return ['general'];
    
    const recentMessages = history.slice(-5);
    const topics = new Set<string>();
    
    recentMessages.forEach(msg => {
      const content = msg.content.toLowerCase();
      
      // 简单的话题提取逻辑
      if (content.includes('工作') || content.includes('项目')) topics.add('工作');
      if (content.includes('学习') || content.includes('教育')) topics.add('学习');
      if (content.includes('创意') || content.includes('设计')) topics.add('创意');
      if (content.includes('感情') || content.includes('心情')) topics.add('情感');
      if (content.includes('技术') || content.includes('编程')) topics.add('技术');
    });
    
    return Array.from(topics).slice(0, 3);
  }

  /**
   * 确定对话阶段
   */
  private determineConversationPhase(history: any[]): string {
    if (!history || history.length === 0) return 'opening';
    if (history.length <= 2) return 'opening';
    if (history.length <= 6) return 'development';
    if (history.length <= 10) return 'climax';
    return 'resolution';
  }

  /**
   * 分析对话动量
   */
  private analyzeMomentum(history: any[], currentMessage: string): string {
    if (!history || history.length === 0) return 'building';
    
    const recentLength = history.slice(-3).reduce((sum, msg) => sum + msg.content.length, 0);
    const currentLength = currentMessage.length;
    
    if (currentLength > recentLength / 3) return 'building';
    if (currentLength < recentLength / 6) return 'declining';
    return 'stable';
  }

  /**
   * 识别交互模式
   */
  private identifyInteractionPattern(history: any[], currentMessage: string): string {
    const message = currentMessage.toLowerCase();
    
    if (message.includes('?') || message.includes('？')) return 'question_answer';
    if (message.includes('创意') || message.includes('想法')) return 'brainstorming';
    if (message.includes('故事') || message.includes('经历')) return 'storytelling';
    if (message.includes('不同意') || message.includes('但是')) return 'debate';
    
    return 'casual_exchange';
  }

  // ============= 保持原有方法兼容性 =============

  /**
   * 构建基础分析的提示词
   */
  private buildBasicAnalysisPrompt(input: SceneAnalysisInput): string {
    const recentHistory = input.history.slice(-5).map(msg => 
      `${msg.role === 'user' ? '用户' : msg.agent || 'AI'}: ${msg.content}`
    ).join('\n');

    const availableAgentInfo = input.availableAgents.map(agent => 
      `- ${agent.name} (${agent.roleTag}): ${agent.prompt?.substring(0, 100) || '专业智能体'}...`
    ).join('\n');

    return `你是一个专业的场景分析AI，请分析以下对话场景：

【当前用户消息】
${input.message}

【最近对话历史】
${recentHistory || '无历史记录'}

【可用智能体】
${availableAgentInfo}

请从以下场景类型中选择最合适的1-2个：
- casual_chat: 日常闲聊
- emotional_support: 情感支持
- work_discussion: 工作讨论  
- problem_solving: 问题解决
- creative_brainstorm: 创意头脑风暴
- debate_discussion: 争论讨论
- humor_entertainment: 娱乐搞笑
- learning_discussion: 学习讨论
- personal_sharing: 个人分享

请分析用户的情感状态：
- positive: 积极开心
- negative: 消极难过
- neutral: 平静中性
- excited: 兴奋激动
- worried: 担心焦虑
- angry: 愤怒不满

请提取3-5个核心话题关键词。

请建议2-3个最适合参与此次对话的智能体（从上面的可用智能体中选择）。

请严格按照以下JSON格式返回，不要添加任何额外的解释文字：

{
  "sceneType": "主要场景类型",
  "emotion": "情感状态", 
  "topics": ["话题1", "话题2", "话题3"],
  "confidence": 0.85,
  "participantSuggestions": ["智能体名称1", "智能体名称2"],
  "reasoning": "分析理由，50字以内"
}`;
  }

  /**
   * 解析基础分析结果 - 保持向后兼容
   */
  private parseBasicAnalysisResult(llmResponse: string, input: SceneAnalysisInput): {
    sceneType: string;
    emotion: string;
    topics: string[];
    confidence: number;
    participantSuggestions: string[];
    reasoning: string;
  } {
    try {
      // 尝试解析JSON响应
      const cleanResponse = this.extractJsonFromResponse(llmResponse);
      const parsed = JSON.parse(cleanResponse);
      
      // 验证和修正结果
      return {
        sceneType: this.validateSceneType(parsed.sceneType),
        emotion: this.validateEmotion(parsed.emotion),
        topics: Array.isArray(parsed.topics) ? parsed.topics.slice(0, 5) : ['general'],
        confidence: this.validateConfidence(parsed.confidence),
        participantSuggestions: this.validateParticipants(parsed.participantSuggestions, input.availableAgents),
        reasoning: parsed.reasoning || '基于内容和上下文的综合分析'
      };
      
    } catch (error) {
      console.warn('⚠️ JSON解析失败，使用关键词匹配分析');
      return this.fallbackBasicAnalysis(input);
    }
  }

  /**
   * 基础后备分析方法
   */
  private fallbackBasicAnalysis(input: SceneAnalysisInput): {
    sceneType: string;
    emotion: string;
    topics: string[];
    confidence: number;
    participantSuggestions: string[];
    reasoning: string;
  } {
    const message = input.message.toLowerCase();
    
    // 改进的场景检测
    let sceneType = 'casual_chat';
    let emotion = 'neutral';
    
    // 创意场景检测
    if (message.includes('创意') || message.includes('点子') || message.includes('想法') || 
        message.includes('设计') || message.includes('创作') || message.includes('科幻') ||
        message.includes('小说') || message.includes('故事')) {
      sceneType = 'creative_brainstorm';
      emotion = 'excited';
    }
    // 分析场景检测
    else if (message.includes('分析') || message.includes('为什么') || message.includes('原因') ||
            message.includes('怎么回事') || message.includes('解释')) {
      sceneType = 'learning_discussion'; 
      emotion = 'neutral';
    }
    // 问题解决检测
    else if (message.includes('帮我') || message.includes('怎么') || message.includes('如何') ||
            message.includes('解决') || message.includes('办法')) {
      sceneType = 'problem_solving';
    }
    // 情感支持检测  
    else if (message.includes('难过') || message.includes('高兴') || message.includes('感觉') ||
            message.includes('压力') || message.includes('烦恼') || message.includes('困扰')) {
      sceneType = 'emotional_support';
      emotion = 'worried';
    } else if (message.includes('工作') || message.includes('项目') || message.includes('任务')) {
      sceneType = 'work_discussion';
    }

    // 细化情感检测（只在未设置时更新）
    if (emotion === 'neutral') {
      if (message.includes('开心') || message.includes('高兴') || message.includes('好棒')) {
        emotion = 'positive';
      } else if (message.includes('难过') || message.includes('伤心') || message.includes('烦恼')) {
        emotion = 'negative';
      }
    }

    // 提取关键词
    const keywords = message.split(/\s+/).filter(word => word.length > 1).slice(0, 3);
    
    return {
      sceneType,
      emotion,
      topics: keywords.length > 0 ? keywords : ['general'],
      confidence: 0.6,
      participantSuggestions: input.availableAgents.slice(0, 2).map(agent => agent.name),
      reasoning: '基于关键词匹配的简单分析'
    };
  }

  /**
   * 从响应中提取JSON字符串
   */
  private extractJsonFromResponse(response: string): string {
    // 先尝试原始响应是否就是JSON
    const trimmed = response.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed;
    }
    
    // 处理不完整的JSON（可能缺少结尾大括号）
    if (trimmed.startsWith('{') && !trimmed.endsWith('}')) {
      // 尝试修复缺少的结尾大括号
      const fixed = trimmed + '}';
      try {
        JSON.parse(fixed);
        return fixed;
      } catch (e) {
        // 如果修复后仍然无效，继续其他方法
      }
    }
    
    // 查找更复杂的嵌套JSON
    let braceCount = 0;
    let startIndex = -1;
    let endIndex = -1;
    
    for (let i = 0; i < response.length; i++) {
      if (response[i] === '{') {
        if (braceCount === 0) startIndex = i;
        braceCount++;
      } else if (response[i] === '}') {
        braceCount--;
        if (braceCount === 0 && startIndex !== -1) {
          endIndex = i;
          break;
        }
      }
    }
    
    if (startIndex !== -1 && endIndex !== -1) {
      return response.substring(startIndex, endIndex + 1);
    }
    
    // 最后尝试：找到开始但没有找到结束的情况
    if (startIndex !== -1 && endIndex === -1) {
      // 截取到最后，然后尝试修复
      const partial = response.substring(startIndex);
      const fixed = partial + '}';
      try {
        JSON.parse(fixed);
        return fixed;
      } catch (e) {
        // 仍然失败
      }
    }
    
    console.warn('原始响应:', response);
    throw new Error('No valid JSON found in response');
  }


  /**
   * 验证场景类型
   */
  private validateSceneType(sceneType: string): string {
    const validScenes = [
      'casual_chat', 'emotional_support', 'work_discussion', 'problem_solving',
      'creative_brainstorm', 'debate_discussion', 'humor_entertainment',
      'learning_discussion', 'personal_sharing'
    ];
    
    return validScenes.includes(sceneType) ? sceneType : 'casual_chat';
  }

  /**
   * 验证情感状态
   */
  private validateEmotion(emotion: string): string {
    const validEmotions = ['positive', 'negative', 'neutral', 'excited', 'worried', 'angry'];
    return validEmotions.includes(emotion) ? emotion : 'neutral';
  }

  /**
   * 验证置信度
   */
  private validateConfidence(confidence: any): number {
    const conf = Number(confidence);
    if (isNaN(conf)) return 0.5;
    return Math.max(0, Math.min(1, conf));
  }

  /**
   * 验证参与者建议
   */
  private validateParticipants(suggestions: any, availableAgents: any[]): string[] {
    if (!Array.isArray(suggestions)) return [];
    
    const availableNames = availableAgents.map(agent => agent.name);
    return suggestions
      .filter(name => availableNames.includes(name))
      .slice(0, 3);
  }

  // ============= AI集成方法 =============

  /**
   * 将AI话题类型映射到场景类型
   */
  private mapTopicToSceneType(aiTopic: string): string {
    const topicSceneMap: { [key: string]: string } = {
      'emotional': 'emotional_support',
      'practical': 'problem_solving',
      'creative': 'creative_brainstorm',
      'technical': 'learning_discussion',
      'social': 'casual_chat',
      'personal': 'personal_sharing',
      'general': 'casual_chat'
    };
    
    return topicSceneMap[aiTopic] || 'casual_chat';
  }

  /**
   * 将AI情感类型映射到场景情感
   */
  private mapAIEmotionToEmotion(aiEmotion: string): string {
    const emotionMap: { [key: string]: string } = {
      'positive': 'positive',
      'negative': 'negative',
      'neutral': 'neutral',
      'excited': 'excited',
      'worried': 'worried',
      'angry': 'angry'
    };
    
    return emotionMap[aiEmotion] || 'neutral';
  }

  /**
   * 混合AI和LLM分析结果
   */
  private combineAIAndLLMResults(
    aiResult: any,
    llmResult: any,
    input: SceneAnalysisInput
  ): Partial<SceneAnalysisResult> {
    console.log('🔄 [结果混合] 合并AI和LLM分析结果');

    // 场景类型：如果两者一致，提高置信度；否则选择置信度更高的
    const aiSceneType = this.mapTopicToSceneType(aiResult.topic.primaryTopic);
    const sceneType = aiSceneType === llmResult.sceneType ? aiSceneType : 
                     (aiResult.metadata.overallConfidence > llmResult.confidence ? aiSceneType : llmResult.sceneType);

    // 情感：类似处理
    const aiEmotion = this.mapAIEmotionToEmotion(aiResult.emotion.primaryEmotion);
    const emotion = aiEmotion === llmResult.emotion ? aiEmotion :
                   (aiResult.emotion.confidence > 0.6 ? aiEmotion : llmResult.emotion);

    // 情感强度：使用AI的精确数值，但用LLM结果验证
    const emotionalIntensity = aiResult.emotion.intensity;
    const adjustedIntensity = this.adjustEmotionalIntensityWithLLM(emotionalIntensity, llmResult, input.message);

    // 话题：合并两者的结果
    const aiTopics = aiResult.topic.specificTopics.length > 0 ? 
      aiResult.topic.specificTopics : aiResult.topic.topicKeywords;
    const combinedTopics = [...new Set([...aiTopics, ...llmResult.topics])].slice(0, 5);

    // 置信度：如果结果一致则提高，否则取平均值
    const isConsistent = (aiSceneType === llmResult.sceneType) && (aiEmotion === llmResult.emotion);
    const combinedConfidence = isConsistent ? 
      Math.min((aiResult.metadata.overallConfidence + llmResult.confidence) / 2 + 0.1, 1.0) :
      (aiResult.metadata.overallConfidence + llmResult.confidence) / 2;

    // 推理说明
    const reasoning = `混合分析：AI分析(${aiResult.metadata.overallConfidence.toFixed(2)})与LLM分析(${llmResult.confidence.toFixed(2)})${isConsistent ? '一致' : '存在差异'}`;

    return {
      sceneType,
      emotion,
      emotionalIntensity: adjustedIntensity,
      topics: combinedTopics,
      confidence: combinedConfidence,
      reasoning
    };
  }

  /**
   * 使用LLM结果调整AI的情感强度
   */
  private adjustEmotionalIntensityWithLLM(
    aiIntensity: number,
    llmResult: any,
    message: string
  ): number {
    // 基于LLM的硬编码分析进行微调
    const hardcodedIntensity = this.calculateEmotionalIntensity(llmResult.emotion, message);
    
    // 如果两者差异很大，取平均值；否则主要使用AI结果
    const difference = Math.abs(aiIntensity - hardcodedIntensity);
    
    if (difference > 0.3) {
      return (aiIntensity + hardcodedIntensity) / 2;
    } else {
      // AI结果为主，硬编码微调
      return aiIntensity * 0.8 + hardcodedIntensity * 0.2;
    }
  }

  /**
   * 增强版情感强度计算（保留原有逻辑但增强）
   */
  private calculateEmotionalIntensity(emotion: string, message: string): number {
    const strongIndicators = ['非常', '极其', '特别', '超级', '太', '真的', '完全', '十分', '相当', '很'];
    const weakIndicators = ['有点', '稍微', '略微', '还好', '还行'];
    
    const hasStrongIndicators = strongIndicators.some(word => message.includes(word));
    const hasWeakIndicators = weakIndicators.some(word => message.includes(word));
    
    const baseIntensity = {
      'excited': 0.8,
      'angry': 0.7,
      'worried': 0.6,
      'positive': 0.5,
      'negative': 0.5,
      'neutral': 0.2
    };
    
    let base = baseIntensity[emotion as keyof typeof baseIntensity] || 0.3;
    
    // 调整强度
    if (hasStrongIndicators) {
      base = Math.min(base + 0.3, 1.0);
    } else if (hasWeakIndicators) {
      base = Math.max(base - 0.2, 0.1);
    }
    
    // 检查表情符号的影响
    const positiveEmojis = /😊|😄|😃|🎉|👍|❤️|💕|😍|🤩/g;
    const negativeEmojis = /😢|😭|😔|💔|😰|😤|😡|😠/g;
    
    const positiveEmojiCount = (message.match(positiveEmojis) || []).length;
    const negativeEmojiCount = (message.match(negativeEmojis) || []).length;
    
    if (positiveEmojiCount > 0) {
      base = Math.min(base + positiveEmojiCount * 0.1, 1.0);
    }
    if (negativeEmojiCount > 0) {
      base = Math.min(base + negativeEmojiCount * 0.1, 1.0);
    }
    
    return base;
  }
}

export default SceneAnalyzerAgent;