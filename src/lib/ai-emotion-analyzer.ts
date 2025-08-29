/**
 * 🧠 AI情感和意图分析器
 * 
 * 使用LLM API智能分析用户消息的情感、意图、主题等
 * 提供比硬编码关键词更准确的分析结果
 */

import { LLMMessage } from '@/types/llm';
import llmService from './llm-service';
import LLMConfigManager from './llm-config';

// ============= 分析结果接口定义 =============

export interface EmotionAnalysisResult {
  // 主要情感
  primaryEmotion: 'positive' | 'negative' | 'neutral' | 'excited' | 'worried' | 'angry';
  
  // 情感强度 0-1
  intensity: number;
  
  // 详细情感描述
  emotionDetails: {
    happiness: number;    // 快乐程度
    sadness: number;      // 悲伤程度
    anger: number;        // 愤怒程度
    fear: number;         // 恐惧程度
    surprise: number;     // 惊讶程度
    disgust: number;      // 厌恶程度
  };
  
  // 情感关键词
  emotionKeywords: string[];
  
  // 分析置信度
  confidence: number;
}

export interface IntentAnalysisResult {
  // 主要意图
  primaryIntent: 'seek_info' | 'emotional_support' | 'problem_solving' | 'entertainment' | 
                 'social_bonding' | 'creative_collaboration' | 'complaining' | 'celebrating';
  
  // 次要意图
  secondaryIntents: string[];
  
  // 紧迫程度 0-1
  urgencyLevel: number;
  
  // 期望类型
  expectationType: 'quick_answer' | 'deep_discussion' | 'creative_collaboration' | 
                  'emotional_validation' | 'practical_solution' | 'casual_chat';
  
  // 意图关键词
  intentKeywords: string[];
  
  // 分析置信度
  confidence: number;
}

export interface TopicAnalysisResult {
  // 主要话题
  primaryTopic: 'emotional' | 'practical' | 'creative' | 'technical' | 'social' | 'personal' | 'general';
  
  // 具体话题
  specificTopics: string[];
  
  // 话题关键词
  topicKeywords: string[];
  
  // 分析置信度
  confidence: number;
}

export interface ComprehensiveAnalysisResult {
  emotion: EmotionAnalysisResult;
  intent: IntentAnalysisResult;
  topic: TopicAnalysisResult;
  
  // 整体分析元数据
  metadata: {
    analysisTime: number;
    messageLength: number;
    hasEmoji: boolean;
    hasQuestionMarks: boolean;
    hasExclamationMarks: boolean;
    overallConfidence: number;
  };
}

// ============= AI分析器主类 =============

export class AIEmotionAnalyzer {
  private cache: Map<string, ComprehensiveAnalysisResult> = new Map();
  private cacheTimeout: number = 30 * 60 * 1000; // 30分钟缓存

  constructor() {
    console.log('🧠 AI情感分析器初始化完成');
  }

  /**
   * 综合分析用户消息
   */
  async analyzeMessage(message: string): Promise<ComprehensiveAnalysisResult> {
    const startTime = Date.now();
    console.log(`🧠 [AI分析] 开始分析消息: "${message.substring(0, 50)}..."`);

    try {
      // 检查缓存
      const cacheKey = this.generateCacheKey(message);
      const cached = this.cache.get(cacheKey);
      
      if (cached) {
        console.log('📦 [AI分析] 使用缓存结果');
        return cached;
      }

      // 执行AI分析
      const [emotionResult, intentResult, topicResult] = await Promise.all([
        this.analyzeEmotion(message),
        this.analyzeIntent(message),
        this.analyzeTopic(message)
      ]);

      // 构建综合结果
      const result: ComprehensiveAnalysisResult = {
        emotion: emotionResult,
        intent: intentResult,
        topic: topicResult,
        metadata: {
          analysisTime: Date.now() - startTime,
          messageLength: message.length,
          hasEmoji: /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(message),
          hasQuestionMarks: message.includes('?') || message.includes('？'),
          hasExclamationMarks: message.includes('!') || message.includes('！'),
          overallConfidence: (emotionResult.confidence + intentResult.confidence + topicResult.confidence) / 3
        }
      };

      // 缓存结果
      this.cache.set(cacheKey, result);
      this.scheduleCleanup(cacheKey);

      console.log(`✅ [AI分析] 分析完成，用时: ${result.metadata.analysisTime}ms，置信度: ${result.metadata.overallConfidence.toFixed(2)}`);
      return result;

    } catch (error) {
      console.error('❌ [AI分析] 分析失败，使用回退分析:', error);
      return await this.fallbackAnalysis(message, Date.now() - startTime);
    }
  }

  /**
   * AI驱动的情感分析
   */
  private async analyzeEmotion(message: string): Promise<EmotionAnalysisResult> {
    const prompt = `请分析以下消息的情感色彩，只返回JSON格式的结果，不要任何额外文字：

消息: "${message}"

请分析并返回以下格式的JSON：
{
  "primaryEmotion": "positive/negative/neutral/excited/worried/angry",
  "intensity": 0.8,
  "emotionDetails": {
    "happiness": 0.2,
    "sadness": 0.1, 
    "anger": 0.0,
    "fear": 0.0,
    "surprise": 0.1,
    "disgust": 0.0
  },
  "emotionKeywords": ["开心", "高兴"],
  "confidence": 0.9
}

注意：
- intensity是情感强度，0-1之间
- emotionDetails中各项数值和为1.0左右
- emotionKeywords是从消息中提取的情感相关词汇
- confidence是你对分析结果的置信度`;

    try {
      const llmConfig = await LLMConfigManager.getConfig();
      const messages: LLMMessage[] = [
        { role: 'system', content: '你是专业的情感分析专家，只返回JSON格式的结果。' },
        { role: 'user', content: prompt }
      ];

      const response = await llmService.chat(llmConfig, messages);
      const result = JSON.parse(this.extractJsonFromResponse(response.content));
      
      // 验证和修正结果
      return this.validateEmotionResult(result);
      
    } catch (error) {
      console.warn('⚠️ AI情感分析失败，使用硬编码回退:', error);
      return this.fallbackEmotionAnalysis(message);
    }
  }

  /**
   * AI驱动的意图分析
   */
  private async analyzeIntent(message: string): Promise<IntentAnalysisResult> {
    const prompt = `请分析以下消息的用户意图，只返回JSON格式的结果，不要任何额外文字：

消息: "${message}"

请分析并返回以下格式的JSON：
{
  "primaryIntent": "seek_info/emotional_support/problem_solving/entertainment/social_bonding/creative_collaboration/complaining/celebrating",
  "secondaryIntents": ["intent1", "intent2"],
  "urgencyLevel": 0.7,
  "expectationType": "quick_answer/deep_discussion/creative_collaboration/emotional_validation/practical_solution/casual_chat", 
  "intentKeywords": ["怎么办", "建议"],
  "confidence": 0.9
}

注意：
- urgencyLevel是紧迫程度，0-1之间，0.8以上为高紧急
- intentKeywords是从消息中提取的意图相关词汇
- confidence是你对分析结果的置信度`;

    try {
      const llmConfig = await LLMConfigManager.getConfig();
      const messages: LLMMessage[] = [
        { role: 'system', content: '你是专业的意图分析专家，只返回JSON格式的结果。' },
        { role: 'user', content: prompt }
      ];

      const response = await llmService.chat(llmConfig, messages);
      const result = JSON.parse(this.extractJsonFromResponse(response.content));
      
      return this.validateIntentResult(result);
      
    } catch (error) {
      console.warn('⚠️ AI意图分析失败，使用硬编码回退:', error);
      return this.fallbackIntentAnalysis(message);
    }
  }

  /**
   * AI驱动的话题分析
   */
  private async analyzeTopic(message: string): Promise<TopicAnalysisResult> {
    const prompt = `请分析以下消息的话题内容，只返回JSON格式的结果，不要任何额外文字：

消息: "${message}"

请分析并返回以下格式的JSON：
{
  "primaryTopic": "emotional/practical/creative/technical/social/personal/general",
  "specificTopics": ["工作", "学习", "感情"],
  "topicKeywords": ["项目", "任务", "压力"],
  "confidence": 0.9
}

注意：
- primaryTopic是主要话题分类
- specificTopics是具体的话题标签
- topicKeywords是从消息中提取的话题相关词汇
- confidence是你对分析结果的置信度`;

    try {
      const llmConfig = await LLMConfigManager.getConfig();
      const messages: LLMMessage[] = [
        { role: 'system', content: '你是专业的话题分析专家，只返回JSON格式的结果。' },
        { role: 'user', content: prompt }
      ];

      const response = await llmService.chat(llmConfig, messages);
      const result = JSON.parse(this.extractJsonFromResponse(response.content));
      
      return this.validateTopicResult(result);
      
    } catch (error) {
      console.warn('⚠️ AI话题分析失败，使用硬编码回退:', error);
      return this.fallbackTopicAnalysis(message);
    }
  }

  // ============= 混合判断方法（AI + 硬编码回退） =============

  /**
   * 混合情感分析：优先使用AI，硬编码作为回退和验证
   */
  async hybridEmotionAnalysis(message: string): Promise<EmotionAnalysisResult> {
    try {
      // 先尝试AI分析
      const aiResult = await this.analyzeEmotion(message);
      
      // 如果AI分析置信度很高，直接使用
      if (aiResult.confidence > 0.8) {
        return aiResult;
      }
      
      // 否则结合硬编码验证
      const hardcodedResult = this.fallbackEmotionAnalysis(message);
      
      // 混合结果：AI为主，硬编码验证
      return this.combineEmotionResults(aiResult, hardcodedResult);
      
    } catch (error) {
      console.warn('⚠️ 混合情感分析失败，使用硬编码:', error);
      return this.fallbackEmotionAnalysis(message);
    }
  }

  /**
   * 混合意图分析
   */
  async hybridIntentAnalysis(message: string): Promise<IntentAnalysisResult> {
    try {
      const aiResult = await this.analyzeIntent(message);
      
      if (aiResult.confidence > 0.8) {
        return aiResult;
      }
      
      const hardcodedResult = this.fallbackIntentAnalysis(message);
      return this.combineIntentResults(aiResult, hardcodedResult);
      
    } catch (error) {
      console.warn('⚠️ 混合意图分析失败，使用硬编码:', error);
      return this.fallbackIntentAnalysis(message);
    }
  }

  /**
   * 混合话题分析
   */
  async hybridTopicAnalysis(message: string): Promise<TopicAnalysisResult> {
    try {
      const aiResult = await this.analyzeTopic(message);
      
      if (aiResult.confidence > 0.8) {
        return aiResult;
      }
      
      const hardcodedResult = this.fallbackTopicAnalysis(message);
      return this.combineTopicResults(aiResult, hardcodedResult);
      
    } catch (error) {
      console.warn('⚠️ 混合话题分析失败，使用硬编码:', error);
      return this.fallbackTopicAnalysis(message);
    }
  }

  // ============= 硬编码回退分析方法 =============

  private fallbackEmotionAnalysis(message: string): EmotionAnalysisResult {
    const lowerMessage = message.toLowerCase();
    
    // 情感词汇检测
    const positiveWords = ['开心', '高兴', '快乐', '兴奋', '满意', '棒', '好', '赞', '爱', '喜欢'];
    const negativeWords = ['难过', '伤心', '失望', '生气', '愤怒', '讨厌', '烦', '累', '压力', '焦虑'];
    const neutralWords = ['觉得', '认为', '想', '看', '听'];
    
    let positiveCount = 0;
    let negativeCount = 0;
    let neutralCount = 0;
    
    const foundKeywords: string[] = [];
    
    for (const word of positiveWords) {
      if (lowerMessage.includes(word)) {
        positiveCount++;
        foundKeywords.push(word);
      }
    }
    
    for (const word of negativeWords) {
      if (lowerMessage.includes(word)) {
        negativeCount++;
        foundKeywords.push(word);
      }
    }
    
    for (const word of neutralWords) {
      if (lowerMessage.includes(word)) {
        neutralCount++;
      }
    }
    
    // 决定主要情感
    let primaryEmotion: EmotionAnalysisResult['primaryEmotion'];
    let intensity = 0.5;
    
    if (positiveCount > negativeCount && positiveCount > 0) {
      primaryEmotion = positiveCount > 2 ? 'excited' : 'positive';
      intensity = Math.min(0.3 + positiveCount * 0.2, 1.0);
    } else if (negativeCount > positiveCount && negativeCount > 0) {
      primaryEmotion = negativeCount > 2 ? 'angry' : 'negative';
      intensity = Math.min(0.3 + negativeCount * 0.2, 1.0);
    } else {
      primaryEmotion = 'neutral';
      intensity = 0.3;
    }
    
    // 检测特殊情感
    if (lowerMessage.includes('担心') || lowerMessage.includes('焦虑') || lowerMessage.includes('害怕')) {
      primaryEmotion = 'worried';
      intensity = Math.max(intensity, 0.7);
    }
    
    return {
      primaryEmotion,
      intensity,
      emotionDetails: {
        happiness: primaryEmotion === 'positive' || primaryEmotion === 'excited' ? intensity : 0.1,
        sadness: primaryEmotion === 'negative' ? intensity * 0.8 : 0.1,
        anger: primaryEmotion === 'angry' ? intensity : 0.0,
        fear: primaryEmotion === 'worried' ? intensity * 0.9 : 0.0,
        surprise: primaryEmotion === 'excited' ? intensity * 0.3 : 0.0,
        disgust: 0.0
      },
      emotionKeywords: foundKeywords,
      confidence: foundKeywords.length > 0 ? Math.min(0.7, foundKeywords.length * 0.2 + 0.3) : 0.3
    };
  }

  private fallbackIntentAnalysis(message: string): IntentAnalysisResult {
    const lowerMessage = message.toLowerCase();
    
    let primaryIntent: IntentAnalysisResult['primaryIntent'] = 'social_bonding';
    let urgencyLevel = 0.3;
    let expectationType: IntentAnalysisResult['expectationType'] = 'casual_chat';
    const intentKeywords: string[] = [];
    
    // 信息寻求
    if (lowerMessage.includes('怎么') || lowerMessage.includes('如何') || lowerMessage.includes('为什么') || 
        lowerMessage.includes('什么') || lowerMessage.includes('?') || lowerMessage.includes('？')) {
      primaryIntent = 'seek_info';
      expectationType = 'quick_answer';
      intentKeywords.push('询问');
    }
    
    // 问题解决
    if (lowerMessage.includes('解决') || lowerMessage.includes('办法') || lowerMessage.includes('方法') || 
        lowerMessage.includes('建议') || lowerMessage.includes('帮我')) {
      primaryIntent = 'problem_solving';
      expectationType = 'practical_solution';
      urgencyLevel = 0.6;
      intentKeywords.push('寻求帮助');
    }
    
    // 情感支持
    if (lowerMessage.includes('难过') || lowerMessage.includes('伤心') || lowerMessage.includes('压力') || 
        lowerMessage.includes('焦虑') || lowerMessage.includes('烦恼')) {
      primaryIntent = 'emotional_support';
      expectationType = 'emotional_validation';
      intentKeywords.push('情感支持');
    }
    
    // 创意协作
    if (lowerMessage.includes('创意') || lowerMessage.includes('想法') || lowerMessage.includes('设计') || 
        lowerMessage.includes('头脑风暴')) {
      primaryIntent = 'creative_collaboration';
      expectationType = 'creative_collaboration';
      intentKeywords.push('创意');
    }
    
    // 紧急程度检测
    if (lowerMessage.includes('紧急') || lowerMessage.includes('急') || lowerMessage.includes('马上') || 
        lowerMessage.includes('立刻') || lowerMessage.includes('!!') || lowerMessage.includes('！！')) {
      urgencyLevel = Math.min(urgencyLevel + 0.4, 1.0);
      intentKeywords.push('紧急');
    }
    
    return {
      primaryIntent,
      secondaryIntents: [],
      urgencyLevel,
      expectationType,
      intentKeywords,
      confidence: intentKeywords.length > 0 ? Math.min(0.8, intentKeywords.length * 0.2 + 0.4) : 0.4
    };
  }

  private fallbackTopicAnalysis(message: string): TopicAnalysisResult {
    const lowerMessage = message.toLowerCase();
    
    let primaryTopic: TopicAnalysisResult['primaryTopic'] = 'general';
    const specificTopics: string[] = [];
    const topicKeywords: string[] = [];
    
    // 情感话题
    if (lowerMessage.includes('心情') || lowerMessage.includes('感情') || lowerMessage.includes('情感') || 
        lowerMessage.includes('爱情') || lowerMessage.includes('友情')) {
      primaryTopic = 'emotional';
      specificTopics.push('情感交流');
      topicKeywords.push('情感', '心情');
    }
    
    // 实用话题
    else if (lowerMessage.includes('工作') || lowerMessage.includes('学习') || lowerMessage.includes('方法') || 
             lowerMessage.includes('技巧') || lowerMessage.includes('解决')) {
      primaryTopic = 'practical';
      if (lowerMessage.includes('工作')) specificTopics.push('工作');
      if (lowerMessage.includes('学习')) specificTopics.push('学习');
      topicKeywords.push('实用', '方法');
    }
    
    // 创意话题
    else if (lowerMessage.includes('创意') || lowerMessage.includes('设计') || lowerMessage.includes('艺术') || 
             lowerMessage.includes('创作') || lowerMessage.includes('想法')) {
      primaryTopic = 'creative';
      specificTopics.push('创意设计');
      topicKeywords.push('创意', '设计');
    }
    
    // 技术话题
    else if (lowerMessage.includes('编程') || lowerMessage.includes('技术') || lowerMessage.includes('代码') || 
             lowerMessage.includes('软件') || lowerMessage.includes('AI')) {
      primaryTopic = 'technical';
      specificTopics.push('技术讨论');
      topicKeywords.push('技术', '编程');
    }
    
    // 社交话题
    else if (lowerMessage.includes('朋友') || lowerMessage.includes('社交') || lowerMessage.includes('聊天') || 
             lowerMessage.includes('交流')) {
      primaryTopic = 'social';
      specificTopics.push('社交交流');
      topicKeywords.push('社交', '朋友');
    }
    
    // 个人话题
    else if (lowerMessage.includes('我') || lowerMessage.includes('自己') || lowerMessage.includes('个人')) {
      primaryTopic = 'personal';
      specificTopics.push('个人分享');
      topicKeywords.push('个人', '自己');
    }
    
    return {
      primaryTopic,
      specificTopics: specificTopics.length > 0 ? specificTopics : ['一般话题'],
      topicKeywords: topicKeywords.length > 0 ? topicKeywords : ['通用'],
      confidence: topicKeywords.length > 0 ? Math.min(0.7, topicKeywords.length * 0.3 + 0.4) : 0.4
    };
  }

  // ============= 结果合并和验证方法 =============

  private combineEmotionResults(aiResult: EmotionAnalysisResult, hardcodedResult: EmotionAnalysisResult): EmotionAnalysisResult {
    // 如果AI和硬编码结果一致，提高置信度
    if (aiResult.primaryEmotion === hardcodedResult.primaryEmotion) {
      return {
        ...aiResult,
        confidence: Math.min(aiResult.confidence + 0.2, 1.0),
        emotionKeywords: [...new Set([...aiResult.emotionKeywords, ...hardcodedResult.emotionKeywords])]
      };
    }
    
    // 如果不一致，选择置信度更高的结果
    if (aiResult.confidence >= hardcodedResult.confidence) {
      return aiResult;
    } else {
      return hardcodedResult;
    }
  }

  private combineIntentResults(aiResult: IntentAnalysisResult, hardcodedResult: IntentAnalysisResult): IntentAnalysisResult {
    if (aiResult.primaryIntent === hardcodedResult.primaryIntent) {
      return {
        ...aiResult,
        confidence: Math.min(aiResult.confidence + 0.2, 1.0),
        urgencyLevel: Math.max(aiResult.urgencyLevel, hardcodedResult.urgencyLevel),
        intentKeywords: [...new Set([...aiResult.intentKeywords, ...hardcodedResult.intentKeywords])]
      };
    }
    
    return aiResult.confidence >= hardcodedResult.confidence ? aiResult : hardcodedResult;
  }

  private combineTopicResults(aiResult: TopicAnalysisResult, hardcodedResult: TopicAnalysisResult): TopicAnalysisResult {
    if (aiResult.primaryTopic === hardcodedResult.primaryTopic) {
      return {
        ...aiResult,
        confidence: Math.min(aiResult.confidence + 0.2, 1.0),
        specificTopics: [...new Set([...aiResult.specificTopics, ...hardcodedResult.specificTopics])],
        topicKeywords: [...new Set([...aiResult.topicKeywords, ...hardcodedResult.topicKeywords])]
      };
    }
    
    return aiResult.confidence >= hardcodedResult.confidence ? aiResult : hardcodedResult;
  }

  // ============= 辅助方法 =============

  private validateEmotionResult(result: any): EmotionAnalysisResult {
    const validEmotions = ['positive', 'negative', 'neutral', 'excited', 'worried', 'angry'];
    
    return {
      primaryEmotion: validEmotions.includes(result.primaryEmotion) ? result.primaryEmotion : 'neutral',
      intensity: Math.max(0, Math.min(1, Number(result.intensity) || 0.5)),
      emotionDetails: {
        happiness: Math.max(0, Math.min(1, Number(result.emotionDetails?.happiness) || 0)),
        sadness: Math.max(0, Math.min(1, Number(result.emotionDetails?.sadness) || 0)),
        anger: Math.max(0, Math.min(1, Number(result.emotionDetails?.anger) || 0)),
        fear: Math.max(0, Math.min(1, Number(result.emotionDetails?.fear) || 0)),
        surprise: Math.max(0, Math.min(1, Number(result.emotionDetails?.surprise) || 0)),
        disgust: Math.max(0, Math.min(1, Number(result.emotionDetails?.disgust) || 0))
      },
      emotionKeywords: Array.isArray(result.emotionKeywords) ? result.emotionKeywords : [],
      confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0.5))
    };
  }

  private validateIntentResult(result: any): IntentAnalysisResult {
    const validIntents = ['seek_info', 'emotional_support', 'problem_solving', 'entertainment', 
                         'social_bonding', 'creative_collaboration', 'complaining', 'celebrating'];
    const validExpectations = ['quick_answer', 'deep_discussion', 'creative_collaboration', 
                              'emotional_validation', 'practical_solution', 'casual_chat'];
    
    return {
      primaryIntent: validIntents.includes(result.primaryIntent) ? result.primaryIntent : 'social_bonding',
      secondaryIntents: Array.isArray(result.secondaryIntents) ? result.secondaryIntents : [],
      urgencyLevel: Math.max(0, Math.min(1, Number(result.urgencyLevel) || 0.3)),
      expectationType: validExpectations.includes(result.expectationType) ? result.expectationType : 'casual_chat',
      intentKeywords: Array.isArray(result.intentKeywords) ? result.intentKeywords : [],
      confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0.5))
    };
  }

  private validateTopicResult(result: any): TopicAnalysisResult {
    const validTopics = ['emotional', 'practical', 'creative', 'technical', 'social', 'personal', 'general'];
    
    return {
      primaryTopic: validTopics.includes(result.primaryTopic) ? result.primaryTopic : 'general',
      specificTopics: Array.isArray(result.specificTopics) ? result.specificTopics : ['一般话题'],
      topicKeywords: Array.isArray(result.topicKeywords) ? result.topicKeywords : ['通用'],
      confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0.5))
    };
  }

  private extractJsonFromResponse(response: string): string {
    // 尝试提取JSON
    const trimmed = response.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return trimmed;
    }
    
    // 查找JSON块
    const jsonMatch = response.match(/\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}/);
    if (jsonMatch) {
      return jsonMatch[0];
    }
    
    throw new Error('No valid JSON found in response');
  }

  private generateCacheKey(message: string): string {
    // 简单的哈希函数
    let hash = 0;
    for (let i = 0; i < message.length; i++) {
      const char = message.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString();
  }

  private scheduleCleanup(cacheKey: string): void {
    setTimeout(() => {
      this.cache.delete(cacheKey);
    }, this.cacheTimeout);
  }

  private async fallbackAnalysis(message: string, executionTime: number): Promise<ComprehensiveAnalysisResult> {
    const emotion = this.fallbackEmotionAnalysis(message);
    const intent = this.fallbackIntentAnalysis(message);
    const topic = this.fallbackTopicAnalysis(message);

    return {
      emotion,
      intent,
      topic,
      metadata: {
        analysisTime: executionTime,
        messageLength: message.length,
        hasEmoji: /[\u{1F600}-\u{1F64F}]/u.test(message),
        hasQuestionMarks: message.includes('?') || message.includes('？'),
        hasExclamationMarks: message.includes('!') || message.includes('！'),
        overallConfidence: (emotion.confidence + intent.confidence + topic.confidence) / 3
      }
    };
  }

  // ============= 公共接口方法 =============

  /**
   * 快速情感分析（优先使用缓存和硬编码）
   */
  async quickEmotionAnalysis(message: string): Promise<'positive' | 'negative' | 'neutral'> {
    try {
      const cached = this.cache.get(this.generateCacheKey(message));
      if (cached) {
        return cached.emotion.primaryEmotion === 'excited' ? 'positive' : 
               ['positive', 'negative', 'neutral'].includes(cached.emotion.primaryEmotion) ? 
               cached.emotion.primaryEmotion as any : 'neutral';
      }
      
      const hardcodedResult = this.fallbackEmotionAnalysis(message);
      return hardcodedResult.primaryEmotion === 'excited' ? 'positive' : 
             ['positive', 'negative', 'neutral'].includes(hardcodedResult.primaryEmotion) ? 
             hardcodedResult.primaryEmotion as any : 'neutral';
    } catch (error) {
      return 'neutral';
    }
  }

  /**
   * 快速意图分析
   */
  async quickIntentAnalysis(message: string): Promise<string> {
    try {
      const cached = this.cache.get(this.generateCacheKey(message));
      if (cached) {
        return cached.intent.primaryIntent;
      }
      
      const hardcodedResult = this.fallbackIntentAnalysis(message);
      return hardcodedResult.primaryIntent;
    } catch (error) {
      return 'social_bonding';
    }
  }

  /**
   * 获取分析统计
   */
  getAnalysisStats() {
    return {
      cacheSize: this.cache.size,
      cacheTimeout: this.cacheTimeout / 1000 / 60 // 转换为分钟
    };
  }
}

// 导出默认实例
const aiEmotionAnalyzer = new AIEmotionAnalyzer();
export default aiEmotionAnalyzer;