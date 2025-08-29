/**
 * 🔄 结果聚合系统
 * 
 * 智能聚合多个Agent的执行结果，提供统一的输出格式
 * 支持多种聚合策略和质量评估
 */

import { AgentResult, ChatbotResponse } from './intelligent-agent-bus';
import { SceneAnalysisResult } from './agents/scene-analyzer-agent';

// ============= 聚合策略接口 =============

export interface AggregationStrategy {
  readonly name: string;
  readonly description: string;
  
  /**
   * 检查是否适用于当前场景
   */
  isApplicable(results: AgentResult[], context: AggregationContext): boolean;
  
  /**
   * 执行结果聚合
   */
  aggregate(results: AgentResult[], context: AggregationContext): Promise<AggregatedResult>;
}

export interface AggregationContext {
  sceneAnalysis?: SceneAnalysisResult;
  conversationId: string;
  originalUserMessage: string;
  executionMetrics: ExecutionMetrics;
  qualityRequirements: QualityRequirements;
}

export interface AggregatedResult {
  success: boolean;
  finalResponses: ChatbotResponse[];
  combinedContent?: string;
  qualityScore: number;
  confidence: number;
  metadata: {
    strategy: string;
    totalAgents: number;
    successfulAgents: number;
    aggregationTime: number;
    qualityBreakdown: QualityBreakdown;
  };
  recommendations?: string[];
  nextActions?: NextActionRecommendation[];
}

export interface ExecutionMetrics {
  totalExecutionTime: number;
  averageResponseTime: number;
  tokenUsage: {
    total: number;
    byAgent: { [agentId: string]: number };
  };
  costEstimate: number;
}

export interface QualityRequirements {
  minimumScore: number; // 0-1
  requireCoherence: boolean;
  requireCompleteness: boolean;
  requireRelevance: boolean;
  maxLength?: number;
  minLength?: number;
}

export interface QualityBreakdown {
  coherence: number; // 0-1, 连贯性
  completeness: number; // 0-1, 完整性
  relevance: number; // 0-1, 相关性
  diversity: number; // 0-1, 多样性
  emotional_alignment: number; // 0-1, 情感匹配度
}

export interface NextActionRecommendation {
  type: 'follow_up' | 'clarification' | 'escalation' | 'completion';
  description: string;
  priority: number; // 0-1
  suggestedAgent?: string;
}

// ============= 结果聚合器主类 =============

export class ResultAggregator {
  private aggregationStrategies: Map<string, AggregationStrategy> = new Map();
  private aggregationHistory: AggregationRecord[] = [];
  private qualityThresholds: QualityThresholds;

  constructor(qualityThresholds?: Partial<QualityThresholds>) {
    this.qualityThresholds = {
      minimumOverallScore: 0.7,
      minimumCoherence: 0.6,
      minimumRelevance: 0.8,
      minimumCompleteness: 0.5,
      ...qualityThresholds
    };
    
    this.initializeStrategies();
    console.log('🔄 结果聚合系统初始化完成');
  }

  /**
   * 初始化聚合策略
   */
  private initializeStrategies(): void {
    this.registerStrategy(new ConsensusAggregationStrategy());
    this.registerStrategy(new QualityBasedAggregationStrategy());
    this.registerStrategy(new ThematicAggregationStrategy());
    this.registerStrategy(new SequentialAggregationStrategy());
    this.registerStrategy(new EmotionalAggregationStrategy());
    this.registerStrategy(new HybridAggregationStrategy());
    
    console.log(`📋 聚合策略已加载: ${this.aggregationStrategies.size} 个策略`);
  }

  /**
   * 聚合Agent执行结果
   */
  async aggregateResults(
    results: AgentResult[],
    context: AggregationContext
  ): Promise<AggregatedResult> {
    const startTime = Date.now();
    console.log(`🔄 [结果聚合] 开始聚合 ${results.length} 个结果`);

    try {
      // 第一步：过滤有效结果
      const validResults = results.filter(r => r.success && r.data);
      console.log(`✅ [结果聚合] 有效结果: ${validResults.length}/${results.length}`);

      if (validResults.length === 0) {
        return this.createEmptyResult(context, Date.now() - startTime);
      }

      // 第二步：选择最佳聚合策略
      const strategy = await this.selectAggregationStrategy(validResults, context);
      console.log(`🎯 [结果聚合] 选择策略: ${strategy.name}`);

      // 第三步：执行聚合
      const aggregatedResult = await strategy.aggregate(validResults, context);
      
      // 第四步：质量验证和后处理
      const finalResult = await this.postProcessResult(aggregatedResult, context);
      finalResult.metadata.aggregationTime = Date.now() - startTime;

      // 第五步：记录聚合历史
      this.recordAggregation(validResults, finalResult, strategy.name, context);

      console.log(`✅ [结果聚合] 完成，质量分数: ${finalResult.qualityScore.toFixed(2)}`);
      return finalResult;

    } catch (error) {
      console.error('❌ [结果聚合] 聚合失败:', error);
      return this.createErrorResult(context, Date.now() - startTime, error);
    }
  }

  /**
   * 选择最佳聚合策略
   */
  private async selectAggregationStrategy(
    results: AgentResult[],
    context: AggregationContext
  ): Promise<AggregationStrategy> {
    const applicableStrategies: Array<{ strategy: AggregationStrategy; score: number }> = [];

    for (const [name, strategy] of this.aggregationStrategies) {
      try {
        if (strategy.isApplicable(results, context)) {
          const score = await this.calculateStrategyScore(strategy, results, context);
          applicableStrategies.push({ strategy, score });
        }
      } catch (error) {
        console.warn(`⚠️ 策略 ${name} 评估失败:`, error);
      }
    }

    if (applicableStrategies.length === 0) {
      console.warn('⚠️ 没有适用的聚合策略，使用默认策略');
      return this.aggregationStrategies.get('sequential')!;
    }

    // 选择得分最高的策略
    applicableStrategies.sort((a, b) => b.score - a.score);
    return applicableStrategies[0].strategy;
  }

  /**
   * 计算策略适用分数
   */
  private async calculateStrategyScore(
    strategy: AggregationStrategy,
    results: AgentResult[],
    context: AggregationContext
  ): Promise<number> {
    let score = 0.5; // 基础分数

    // 基于场景类型调整分数
    if (context.sceneAnalysis) {
      const sceneType = context.sceneAnalysis.sceneType;
      
      if (strategy.name === 'emotional' && sceneType === 'emotional_support') {
        score += 0.3;
      } else if (strategy.name === 'thematic' && sceneType === 'creative_brainstorm') {
        score += 0.3;
      } else if (strategy.name === 'quality_based' && sceneType === 'problem_solving') {
        score += 0.3;
      } else if (strategy.name === 'consensus' && results.length > 3) {
        score += 0.2;
      }
    }

    // 基于结果数量调整
    if (results.length > 3 && strategy.name === 'consensus') {
      score += 0.2;
    } else if (results.length <= 2 && strategy.name === 'sequential') {
      score += 0.2;
    }

    // 基于历史表现调整
    const historicalPerformance = this.getStrategyPerformance(strategy.name);
    score *= (0.7 + historicalPerformance * 0.6); // 70%基础 + 60%历史表现

    return Math.min(score, 1.0);
  }

  /**
   * 后处理聚合结果
   */
  private async postProcessResult(
    result: AggregatedResult,
    context: AggregationContext
  ): Promise<AggregatedResult> {
    // 质量检查和改进
    if (result.qualityScore < this.qualityThresholds.minimumOverallScore) {
      console.warn(`⚠️ [结果聚合] 质量分数过低: ${result.qualityScore}, 尝试改进`);
      result = await this.improveQuality(result, context);
    }

    // 生成推荐行动
    result.recommendations = this.generateRecommendations(result, context);
    
    // 生成下一步行动建议
    result.nextActions = this.generateNextActions(result, context);

    return result;
  }

  /**
   * 改进聚合结果质量
   */
  private async improveQuality(
    result: AggregatedResult,
    context: AggregationContext
  ): Promise<AggregatedResult> {
    const improvements = [];

    // 连贯性改进
    if (result.metadata.qualityBreakdown.coherence < this.qualityThresholds.minimumCoherence) {
      result.finalResponses = await this.improveCoherence(result.finalResponses);
      improvements.push('coherence');
    }

    // 相关性改进
    if (result.metadata.qualityBreakdown.relevance < this.qualityThresholds.minimumRelevance) {
      result.finalResponses = await this.improveRelevance(result.finalResponses, context);
      improvements.push('relevance');
    }

    // 重新计算质量分数
    if (improvements.length > 0) {
      result.metadata.qualityBreakdown = await this.calculateQuality(result.finalResponses, context);
      result.qualityScore = this.calculateOverallQuality(result.metadata.qualityBreakdown);
      console.log(`🔧 [质量改进] 应用改进: ${improvements.join(', ')}, 新分数: ${result.qualityScore.toFixed(2)}`);
    }

    return result;
  }

  /**
   * 改进连贯性
   */
  private async improveCoherence(responses: ChatbotResponse[]): Promise<ChatbotResponse[]> {
    // 按时间排序确保逻辑顺序
    responses.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    
    // 移除重复或矛盾的内容
    const filteredResponses = responses.filter((response, index, array) => {
      const content = response.content.toLowerCase();
      return !array.slice(0, index).some(prev => 
        this.calculateSimilarity(prev.content.toLowerCase(), content) > 0.8
      );
    });

    return filteredResponses;
  }

  /**
   * 改进相关性
   */
  private async improveRelevance(
    responses: ChatbotResponse[],
    context: AggregationContext
  ): Promise<ChatbotResponse[]> {
    const userMessageLower = context.originalUserMessage.toLowerCase();
    
    // 过滤与用户消息相关度过低的回复
    return responses.filter(response => {
      const relevanceScore = this.calculateRelevance(response.content, userMessageLower);
      return relevanceScore > 0.3; // 相关度阈值
    });
  }

  /**
   * 生成建议
   */
  private generateRecommendations(
    result: AggregatedResult,
    context: AggregationContext
  ): string[] {
    const recommendations: string[] = [];

    if (result.metadata.successfulAgents < result.metadata.totalAgents) {
      recommendations.push('考虑优化Agent配置以提高成功率');
    }

    if (result.metadata.qualityBreakdown.coherence < 0.7) {
      recommendations.push('建议增强Agent间的协调机制');
    }

    if (result.metadata.qualityBreakdown.diversity < 0.5) {
      recommendations.push('考虑引入更多样化的Agent视角');
    }

    if (context.executionMetrics.totalExecutionTime > 10000) {
      recommendations.push('建议优化执行性能，减少响应时间');
    }

    return recommendations;
  }

  /**
   * 生成下一步行动
   */
  private generateNextActions(
    result: AggregatedResult,
    context: AggregationContext
  ): NextActionRecommendation[] {
    const actions: NextActionRecommendation[] = [];

    // 基于质量分数决定行动
    if (result.qualityScore > 0.8) {
      actions.push({
        type: 'completion',
        description: '聚合结果质量良好，可以完成对话',
        priority: 0.9
      });
    } else if (result.qualityScore > 0.6) {
      actions.push({
        type: 'follow_up',
        description: '建议进行后续互动以提升质量',
        priority: 0.7
      });
    } else {
      actions.push({
        type: 'escalation',
        description: '结果质量较低，建议升级处理',
        priority: 0.8
      });
    }

    // 基于场景分析决定行动
    if (context.sceneAnalysis?.userIntent.urgencyLevel > 0.7) {
      actions.push({
        type: 'clarification',
        description: '用户需求紧急，建议快速澄清和响应',
        priority: 0.9
      });
    }

    return actions.sort((a, b) => b.priority - a.priority);
  }

  // ============= 质量评估方法 =============

  private async calculateQuality(
    responses: ChatbotResponse[],
    context: AggregationContext
  ): Promise<QualityBreakdown> {
    return {
      coherence: await this.calculateCoherence(responses),
      completeness: await this.calculateCompleteness(responses, context),
      relevance: await this.calculateRelevanceScore(responses, context),
      diversity: await this.calculateDiversity(responses),
      emotional_alignment: await this.calculateEmotionalAlignment(responses, context)
    };
  }

  private async calculateCoherence(responses: ChatbotResponse[]): Promise<number> {
    if (responses.length <= 1) return 1.0;

    let coherenceSum = 0;
    let comparisons = 0;

    for (let i = 0; i < responses.length - 1; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const similarity = this.calculateSimilarity(responses[i].content, responses[j].content);
        const contradiction = this.detectContradiction(responses[i].content, responses[j].content);
        
        coherenceSum += similarity * 0.3 + (1 - contradiction) * 0.7;
        comparisons++;
      }
    }

    return comparisons > 0 ? coherenceSum / comparisons : 1.0;
  }

  private async calculateCompleteness(
    responses: ChatbotResponse[],
    context: AggregationContext
  ): Promise<number> {
    // 简化的完整性评估：基于响应长度和Agent数量
    const totalLength = responses.reduce((sum, r) => sum + r.content.length, 0);
    const averageLength = totalLength / responses.length;
    
    // 理想长度范围 50-200字
    const lengthScore = Math.min(averageLength / 150, 1.0);
    
    // Agent覆盖度
    const agentCoverage = responses.length >= 2 ? 1.0 : responses.length / 2;
    
    return (lengthScore * 0.6 + agentCoverage * 0.4);
  }

  private async calculateRelevanceScore(
    responses: ChatbotResponse[],
    context: AggregationContext
  ): Promise<number> {
    const userMessage = context.originalUserMessage.toLowerCase();
    
    const relevanceScores = responses.map(response => 
      this.calculateRelevance(response.content, userMessage)
    );
    
    return relevanceScores.length > 0 
      ? relevanceScores.reduce((sum, score) => sum + score, 0) / relevanceScores.length 
      : 0;
  }

  private async calculateDiversity(responses: ChatbotResponse[]): Promise<number> {
    if (responses.length <= 1) return 1.0;

    let diversitySum = 0;
    let comparisons = 0;

    for (let i = 0; i < responses.length - 1; i++) {
      for (let j = i + 1; j < responses.length; j++) {
        const similarity = this.calculateSimilarity(responses[i].content, responses[j].content);
        diversitySum += (1 - similarity); // 相似度越低，多样性越高
        comparisons++;
      }
    }

    return comparisons > 0 ? diversitySum / comparisons : 1.0;
  }

  private async calculateEmotionalAlignment(
    responses: ChatbotResponse[],
    context: AggregationContext
  ): Promise<number> {
    if (!context.sceneAnalysis) return 0.7; // 默认值

    const targetEmotion = context.sceneAnalysis.emotion;
    const emotionalIntensity = context.sceneAnalysis.emotionalIntensity;

    let alignmentSum = 0;
    
    for (const response of responses) {
      const responseEmotion = this.detectEmotion(response.content);
      const alignment = this.calculateEmotionalAlignment(responseEmotion, targetEmotion);
      alignmentSum += alignment;
    }

    const averageAlignment = responses.length > 0 ? alignmentSum / responses.length : 0;
    
    // 考虑情感强度
    return averageAlignment * Math.min(emotionalIntensity + 0.3, 1.0);
  }

  // ============= 辅助计算方法 =============

  private calculateSimilarity(text1: string, text2: string): number {
    // 简化的文本相似度计算（基于词汇重叠）
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private detectContradiction(text1: string, text2: string): number {
    // 简化的矛盾检测
    const contradictionPairs = [
      ['是', '不是'], ['能', '不能'], ['可以', '不可以'],
      ['好', '坏'], ['对', '错'], ['支持', '反对']
    ];
    
    let contradictions = 0;
    
    for (const [pos, neg] of contradictionPairs) {
      if ((text1.includes(pos) && text2.includes(neg)) || 
          (text1.includes(neg) && text2.includes(pos))) {
        contradictions++;
      }
    }
    
    return Math.min(contradictions * 0.2, 1.0);
  }

  private calculateRelevance(responseContent: string, userMessage: string): number {
    // 基于关键词匹配的相关性计算
    const responseWords = new Set(responseContent.toLowerCase().split(/\s+/));
    const userWords = new Set(userMessage.split(/\s+/));
    
    const matches = [...responseWords].filter(word => userWords.has(word)).length;
    return userWords.size > 0 ? matches / userWords.size : 0;
  }

  private detectEmotion(text: string): string {
    // 简化的情感检测
    const positiveWords = ['开心', '高兴', '快乐', '满意', '好', '棒', '不错'];
    const negativeWords = ['难过', '伤心', '失望', '生气', '糟糕', '坏'];
    
    const textLower = text.toLowerCase();
    
    const positiveCount = positiveWords.filter(word => textLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => textLower.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private calculateEmotionalAlignment(detected: string, target: string): number {
    if (detected === target) return 1.0;
    
    // 情感兼容性矩阵
    const compatibility: { [key: string]: { [key: string]: number } } = {
      'positive': { 'excited': 0.8, 'neutral': 0.6, 'negative': 0.2 },
      'negative': { 'worried': 0.8, 'neutral': 0.6, 'positive': 0.2 },
      'neutral': { 'positive': 0.7, 'negative': 0.7, 'excited': 0.5, 'worried': 0.5 },
      'excited': { 'positive': 0.8, 'neutral': 0.5, 'negative': 0.1 },
      'worried': { 'negative': 0.8, 'neutral': 0.5, 'positive': 0.1 }
    };
    
    return compatibility[target]?.[detected] || 0.3;
  }

  private calculateOverallQuality(breakdown: QualityBreakdown): number {
    // 加权平均质量分数
    return (breakdown.coherence * 0.25 + 
            breakdown.completeness * 0.2 + 
            breakdown.relevance * 0.3 + 
            breakdown.diversity * 0.15 + 
            breakdown.emotional_alignment * 0.1);
  }

  // ============= 管理和统计方法 =============

  registerStrategy(strategy: AggregationStrategy): void {
    this.aggregationStrategies.set(strategy.name, strategy);
    console.log(`➕ [聚合策略] 注册策略: ${strategy.name}`);
  }

  private getStrategyPerformance(strategyName: string): number {
    const strategyRecords = this.aggregationHistory.filter(r => r.strategy === strategyName);
    
    if (strategyRecords.length === 0) return 0.5; // 默认值
    
    const averageQuality = strategyRecords.reduce((sum, r) => sum + r.qualityScore, 0) / strategyRecords.length;
    return Math.min(averageQuality, 1.0);
  }

  private recordAggregation(
    results: AgentResult[],
    finalResult: AggregatedResult,
    strategy: string,
    context: AggregationContext
  ): void {
    this.aggregationHistory.push({
      timestamp: new Date(),
      strategy,
      inputCount: results.length,
      qualityScore: finalResult.qualityScore,
      executionTime: finalResult.metadata.aggregationTime,
      conversationId: context.conversationId
    });

    // 保持历史记录不超过1000条
    if (this.aggregationHistory.length > 1000) {
      this.aggregationHistory.splice(0, 100);
    }
  }

  private createEmptyResult(context: AggregationContext, executionTime: number): AggregatedResult {
    return {
      success: false,
      finalResponses: [],
      qualityScore: 0,
      confidence: 0,
      metadata: {
        strategy: 'empty',
        totalAgents: 0,
        successfulAgents: 0,
        aggregationTime: executionTime,
        qualityBreakdown: {
          coherence: 0,
          completeness: 0,
          relevance: 0,
          diversity: 0,
          emotional_alignment: 0
        }
      }
    };
  }

  private createErrorResult(
    context: AggregationContext,
    executionTime: number,
    error: any
  ): AggregatedResult {
    return {
      success: false,
      finalResponses: [],
      qualityScore: 0,
      confidence: 0,
      metadata: {
        strategy: 'error',
        totalAgents: 0,
        successfulAgents: 0,
        aggregationTime: executionTime,
        qualityBreakdown: {
          coherence: 0,
          completeness: 0,
          relevance: 0,
          diversity: 0,
          emotional_alignment: 0
        }
      },
      recommendations: ['处理聚合错误并重试'],
      nextActions: [{
        type: 'escalation',
        description: `聚合失败: ${error instanceof Error ? error.message : String(error)}`,
        priority: 1.0
      }]
    };
  }
}

// ============= 支持接口和类型 =============

interface QualityThresholds {
  minimumOverallScore: number;
  minimumCoherence: number;
  minimumRelevance: number;
  minimumCompleteness: number;
}

interface AggregationRecord {
  timestamp: Date;
  strategy: string;
  inputCount: number;
  qualityScore: number;
  executionTime: number;
  conversationId: string;
}

// ============= 具体聚合策略实现 =============

/**
 * 共识聚合策略 - 寻找Agent间的共同观点
 */
class ConsensusAggregationStrategy implements AggregationStrategy {
  readonly name = 'consensus';
  readonly description = '基于Agent共识的聚合策略';

  isApplicable(results: AgentResult[], context: AggregationContext): boolean {
    return results.length >= 3; // 至少需要3个结果才能找共识
  }

  async aggregate(results: AgentResult[], context: AggregationContext): Promise<AggregatedResult> {
    const responses = results
      .filter(r => r.data && typeof r.data === 'object' && r.data.content)
      .map(r => ({
        agentName: r.data.agentName || 'unknown',
        content: r.data.content,
        timestamp: new Date(),
        confidence: r.data.confidence || 0.7
      }));

    // 寻找共同主题和观点
    const consensusResponses = await this.findConsensusResponses(responses);

    const qualityBreakdown = {
      coherence: 0.9, // 共识策略通常有很好的连贯性
      completeness: Math.min(consensusResponses.length / 3, 1.0),
      relevance: 0.8,
      diversity: Math.max(0.3, 1 - consensusResponses.length / responses.length),
      emotional_alignment: 0.7
    };

    return {
      success: consensusResponses.length > 0,
      finalResponses: consensusResponses,
      qualityScore: (qualityBreakdown.coherence + qualityBreakdown.completeness + 
                    qualityBreakdown.relevance + qualityBreakdown.diversity + 
                    qualityBreakdown.emotional_alignment) / 5,
      confidence: consensusResponses.length > 0 ? 
        consensusResponses.reduce((sum, r) => sum + r.confidence, 0) / consensusResponses.length : 0,
      metadata: {
        strategy: this.name,
        totalAgents: results.length,
        successfulAgents: responses.length,
        aggregationTime: 0,
        qualityBreakdown
      }
    };
  }

  private async findConsensusResponses(responses: ChatbotResponse[]): Promise<ChatbotResponse[]> {
    // 简化的共识查找：选择内容相似度较高的回复
    const consensusThreshold = 0.3;
    const consensusResponses: ChatbotResponse[] = [];

    for (const response of responses) {
      const similarityScores = responses
        .filter(r => r !== response)
        .map(r => this.calculateSimilarity(response.content, r.content));
      
      const averageSimilarity = similarityScores.length > 0 
        ? similarityScores.reduce((sum, score) => sum + score, 0) / similarityScores.length 
        : 0;

      if (averageSimilarity >= consensusThreshold) {
        consensusResponses.push(response);
      }
    }

    return consensusResponses.slice(0, 3); // 最多保留3个共识回复
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }
}

/**
 * 质量优先聚合策略 - 选择质量最高的结果
 */
class QualityBasedAggregationStrategy implements AggregationStrategy {
  readonly name = 'quality_based';
  readonly description = '基于质量评估的聚合策略';

  isApplicable(results: AgentResult[], context: AggregationContext): boolean {
    return results.length >= 1;
  }

  async aggregate(results: AgentResult[], context: AggregationContext): Promise<AggregatedResult> {
    const responses = results
      .filter(r => r.data && typeof r.data === 'object' && r.data.content)
      .map(r => ({
        agentName: r.data.agentName || 'unknown',
        content: r.data.content,
        timestamp: new Date(),
        confidence: r.data.confidence || 0.7
      }));

    // 按置信度排序，选择最高质量的回复
    responses.sort((a, b) => b.confidence - a.confidence);
    const topResponses = responses.slice(0, Math.min(3, responses.length));

    const qualityBreakdown = {
      coherence: 0.8,
      completeness: Math.min(topResponses.length / 2, 1.0),
      relevance: 0.9, // 质量优先通常相关性较高
      diversity: Math.min(topResponses.length / responses.length, 1.0),
      emotional_alignment: 0.7
    };

    return {
      success: topResponses.length > 0,
      finalResponses: topResponses,
      qualityScore: (qualityBreakdown.coherence + qualityBreakdown.completeness + 
                    qualityBreakdown.relevance + qualityBreakdown.diversity + 
                    qualityBreakdown.emotional_alignment) / 5,
      confidence: topResponses.length > 0 ? topResponses[0].confidence : 0,
      metadata: {
        strategy: this.name,
        totalAgents: results.length,
        successfulAgents: responses.length,
        aggregationTime: 0,
        qualityBreakdown
      }
    };
  }
}

/**
 * 主题聚合策略 - 按主题组织回复
 */
class ThematicAggregationStrategy implements AggregationStrategy {
  readonly name = 'thematic';
  readonly description = '基于主题分类的聚合策略';

  isApplicable(results: AgentResult[], context: AggregationContext): boolean {
    return results.length >= 2 && 
           (context.sceneAnalysis?.sceneType === 'creative_brainstorm' ||
            context.sceneAnalysis?.sceneType === 'problem_solving');
  }

  async aggregate(results: AgentResult[], context: AggregationContext): Promise<AggregatedResult> {
    const responses = results
      .filter(r => r.data && typeof r.data === 'object' && r.data.content)
      .map(r => ({
        agentName: r.data.agentName || 'unknown',
        content: r.data.content,
        timestamp: new Date(),
        confidence: r.data.confidence || 0.7
      }));

    // 按主题分组并选择代表性回复
    const thematicResponses = await this.organizeByTheme(responses);

    const qualityBreakdown = {
      coherence: 0.7,
      completeness: Math.min(thematicResponses.length / 3, 1.0),
      relevance: 0.8,
      diversity: Math.min(thematicResponses.length / Math.max(responses.length - 1, 1), 1.0),
      emotional_alignment: 0.6
    };

    return {
      success: thematicResponses.length > 0,
      finalResponses: thematicResponses,
      qualityScore: (qualityBreakdown.coherence + qualityBreakdown.completeness + 
                    qualityBreakdown.relevance + qualityBreakdown.diversity + 
                    qualityBreakdown.emotional_alignment) / 5,
      confidence: thematicResponses.length > 0 ? 
        thematicResponses.reduce((sum, r) => sum + r.confidence, 0) / thematicResponses.length : 0,
      metadata: {
        strategy: this.name,
        totalAgents: results.length,
        successfulAgents: responses.length,
        aggregationTime: 0,
        qualityBreakdown
      }
    };
  }

  private async organizeByTheme(responses: ChatbotResponse[]): Promise<ChatbotResponse[]> {
    // 简化的主题分类：每种Agent类型选择一个最佳回复
    const themeGroups = new Map<string, ChatbotResponse[]>();

    responses.forEach(response => {
      const theme = this.extractTheme(response.content);
      if (!themeGroups.has(theme)) {
        themeGroups.set(theme, []);
      }
      themeGroups.get(theme)!.push(response);
    });

    const thematicResponses: ChatbotResponse[] = [];
    themeGroups.forEach((group, theme) => {
      // 选择每个主题组中置信度最高的回复
      group.sort((a, b) => b.confidence - a.confidence);
      thematicResponses.push(group[0]);
    });

    return thematicResponses;
  }

  private extractTheme(content: string): string {
    const contentLower = content.toLowerCase();
    
    if (contentLower.includes('创意') || contentLower.includes('想法')) return 'creative';
    if (contentLower.includes('实用') || contentLower.includes('方法')) return 'practical';
    if (contentLower.includes('情感') || contentLower.includes('理解')) return 'emotional';
    if (contentLower.includes('分析') || contentLower.includes('数据')) return 'analytical';
    
    return 'general';
  }
}

/**
 * 顺序聚合策略 - 保持Agent执行顺序
 */
class SequentialAggregationStrategy implements AggregationStrategy {
  readonly name = 'sequential';
  readonly description = '保持执行顺序的聚合策略';

  isApplicable(results: AgentResult[], context: AggregationContext): boolean {
    return true; // 始终适用，作为默认策略
  }

  async aggregate(results: AgentResult[], context: AggregationContext): Promise<AggregatedResult> {
    const responses = results
      .filter(r => r.data && typeof r.data === 'object' && r.data.content)
      .map((r, index) => ({
        agentName: r.data.agentName || `agent-${index}`,
        content: r.data.content,
        timestamp: new Date(Date.now() + index * 1000), // 保持顺序
        confidence: r.data.confidence || 0.7
      }));

    const qualityBreakdown = {
      coherence: 0.8, // 顺序聚合通常有良好的连贯性
      completeness: Math.min(responses.length / 3, 1.0),
      relevance: 0.7,
      diversity: Math.min(responses.length / Math.max(responses.length - 1, 1), 1.0),
      emotional_alignment: 0.7
    };

    return {
      success: responses.length > 0,
      finalResponses: responses,
      qualityScore: (qualityBreakdown.coherence + qualityBreakdown.completeness + 
                    qualityBreakdown.relevance + qualityBreakdown.diversity + 
                    qualityBreakdown.emotional_alignment) / 5,
      confidence: responses.length > 0 ? 
        responses.reduce((sum, r) => sum + r.confidence, 0) / responses.length : 0,
      metadata: {
        strategy: this.name,
        totalAgents: results.length,
        successfulAgents: responses.length,
        aggregationTime: 0,
        qualityBreakdown
      }
    };
  }
}

/**
 * 情感聚合策略 - 基于情感一致性
 */
class EmotionalAggregationStrategy implements AggregationStrategy {
  readonly name = 'emotional';
  readonly description = '基于情感一致性的聚合策略';

  isApplicable(results: AgentResult[], context: AggregationContext): boolean {
    return context.sceneAnalysis?.sceneType === 'emotional_support' ||
           (context.sceneAnalysis?.emotionalIntensity || 0) > 0.6;
  }

  async aggregate(results: AgentResult[], context: AggregationContext): Promise<AggregatedResult> {
    const responses = results
      .filter(r => r.data && typeof r.data === 'object' && r.data.content)
      .map(r => ({
        agentName: r.data.agentName || 'unknown',
        content: r.data.content,
        timestamp: new Date(),
        confidence: r.data.confidence || 0.7
      }));

    // 选择情感匹配度最高的回复
    const targetEmotion = context.sceneAnalysis?.emotion || 'neutral';
    const emotionallyAlignedResponses = responses.filter(response => {
      const responseEmotion = this.detectEmotion(response.content);
      return this.calculateEmotionalAlignment(responseEmotion, targetEmotion) > 0.5;
    });

    const finalResponses = emotionallyAlignedResponses.length > 0 ? emotionallyAlignedResponses : responses.slice(0, 2);

    const qualityBreakdown = {
      coherence: 0.7,
      completeness: Math.min(finalResponses.length / 2, 1.0),
      relevance: 0.8,
      diversity: 0.6,
      emotional_alignment: 0.9 // 情感聚合的强项
    };

    return {
      success: finalResponses.length > 0,
      finalResponses,
      qualityScore: (qualityBreakdown.coherence + qualityBreakdown.completeness + 
                    qualityBreakdown.relevance + qualityBreakdown.diversity + 
                    qualityBreakdown.emotional_alignment) / 5,
      confidence: finalResponses.length > 0 ? 
        finalResponses.reduce((sum, r) => sum + r.confidence, 0) / finalResponses.length : 0,
      metadata: {
        strategy: this.name,
        totalAgents: results.length,
        successfulAgents: responses.length,
        aggregationTime: 0,
        qualityBreakdown
      }
    };
  }

  private detectEmotion(text: string): string {
    const positiveWords = ['开心', '高兴', '快乐', '满意', '好', '棒'];
    const negativeWords = ['难过', '伤心', '失望', '生气', '糟糕'];
    
    const textLower = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => textLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => textLower.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private calculateEmotionalAlignment(detected: string, target: string): number {
    if (detected === target) return 1.0;
    
    const compatibility: { [key: string]: { [key: string]: number } } = {
      'positive': { 'excited': 0.8, 'neutral': 0.6, 'negative': 0.2 },
      'negative': { 'worried': 0.8, 'neutral': 0.6, 'positive': 0.2 },
      'neutral': { 'positive': 0.7, 'negative': 0.7 }
    };
    
    return compatibility[target]?.[detected] || 0.3;
  }
}

/**
 * 混合聚合策略 - 结合多种策略的优势
 */
class HybridAggregationStrategy implements AggregationStrategy {
  readonly name = 'hybrid';
  readonly description = '混合多种聚合策略的优势';

  isApplicable(results: AgentResult[], context: AggregationContext): boolean {
    return results.length >= 3 && context.sceneAnalysis?.confidence && context.sceneAnalysis.confidence > 0.7;
  }

  async aggregate(results: AgentResult[], context: AggregationContext): Promise<AggregatedResult> {
    const responses = results
      .filter(r => r.data && typeof r.data === 'object' && r.data.content)
      .map(r => ({
        agentName: r.data.agentName || 'unknown',
        content: r.data.content,
        timestamp: new Date(),
        confidence: r.data.confidence || 0.7
      }));

    // 应用多种策略并合并结果
    const qualityFiltered = responses
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, Math.ceil(responses.length * 0.7));

    const diversityFiltered = await this.ensureDiversity(qualityFiltered);
    const emotionallyAligned = await this.applyEmotionalAlignment(diversityFiltered, context);

    const qualityBreakdown = {
      coherence: 0.8,
      completeness: Math.min(emotionallyAligned.length / 3, 1.0),
      relevance: 0.85,
      diversity: 0.8,
      emotional_alignment: 0.8
    };

    return {
      success: emotionallyAligned.length > 0,
      finalResponses: emotionallyAligned,
      qualityScore: (qualityBreakdown.coherence + qualityBreakdown.completeness + 
                    qualityBreakdown.relevance + qualityBreakdown.diversity + 
                    qualityBreakdown.emotional_alignment) / 5,
      confidence: emotionallyAligned.length > 0 ? 
        emotionallyAligned.reduce((sum, r) => sum + r.confidence, 0) / emotionallyAligned.length : 0,
      metadata: {
        strategy: this.name,
        totalAgents: results.length,
        successfulAgents: responses.length,
        aggregationTime: 0,
        qualityBreakdown
      }
    };
  }

  private async ensureDiversity(responses: ChatbotResponse[]): Promise<ChatbotResponse[]> {
    const diverseResponses: ChatbotResponse[] = [];
    const similarityThreshold = 0.7;

    for (const response of responses) {
      const isTooSimilar = diverseResponses.some(existing => 
        this.calculateSimilarity(response.content, existing.content) > similarityThreshold
      );

      if (!isTooSimilar) {
        diverseResponses.push(response);
      }
    }

    return diverseResponses;
  }

  private async applyEmotionalAlignment(
    responses: ChatbotResponse[], 
    context: AggregationContext
  ): Promise<ChatbotResponse[]> {
    if (!context.sceneAnalysis) return responses;

    const targetEmotion = context.sceneAnalysis.emotion;
    return responses.filter(response => {
      const responseEmotion = this.detectEmotion(response.content);
      const alignment = this.calculateEmotionalAlignment(responseEmotion, targetEmotion);
      return alignment > 0.3; // 较宽松的情感匹配要求
    });
  }

  private calculateSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private detectEmotion(text: string): string {
    const positiveWords = ['开心', '高兴', '快乐', '满意', '好', '棒'];
    const negativeWords = ['难过', '伤心', '失望', '生气', '糟糕'];
    
    const textLower = text.toLowerCase();
    const positiveCount = positiveWords.filter(word => textLower.includes(word)).length;
    const negativeCount = negativeWords.filter(word => textLower.includes(word)).length;
    
    if (positiveCount > negativeCount) return 'positive';
    if (negativeCount > positiveCount) return 'negative';
    return 'neutral';
  }

  private calculateEmotionalAlignment(detected: string, target: string): number {
    if (detected === target) return 1.0;
    
    const compatibility: { [key: string]: { [key: string]: number } } = {
      'positive': { 'excited': 0.8, 'neutral': 0.6, 'negative': 0.2 },
      'negative': { 'worried': 0.8, 'neutral': 0.6, 'positive': 0.2 },
      'neutral': { 'positive': 0.7, 'negative': 0.7 }
    };
    
    return compatibility[target]?.[detected] || 0.3;
  }
}

// 导出默认实例
const resultAggregator = new ResultAggregator();
export default resultAggregator;