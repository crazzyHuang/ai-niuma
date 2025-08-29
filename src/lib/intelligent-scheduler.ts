/**
 * 🧠 智能调度引擎
 * 
 * V2架构核心组件 - 基于深度场景分析实现多策略Agent调度
 * 根据V1需求实现真正智能的AI编排决策
 */

import { SceneAnalysisResult, ParticipationSuggestion } from './agents/scene-analyzer-agent';
import { BaseAgent } from './intelligent-agent-bus';

// ============= 调度策略接口定义 =============

export interface SchedulingStrategy {
  readonly name: string;
  readonly description: string;
  
  /**
   * 分析是否适合使用此策略
   */
  isApplicable(sceneAnalysis: SceneAnalysisResult, availableAgents: BaseAgent[]): boolean;
  
  /**
   * 创建执行计划
   */
  createExecutionPlan(
    sceneAnalysis: SceneAnalysisResult, 
    availableAgents: BaseAgent[]
  ): Promise<ExecutionPlan>;
}

// ============= 执行计划定义 =============

export interface ExecutionPlan {
  strategyUsed: string;
  totalEstimatedTime: number;
  phases: ExecutionPhase[];
  resourceRequirements: ResourceRequirement[];
  qualityExpectation: number; // 0-1，预期质量得分
  interactionComplexity: 'simple' | 'moderate' | 'complex';
}

export interface ExecutionPhase {
  name: string;
  agents: AgentExecution[];
  executionMode: 'sequential' | 'parallel' | 'pipeline' | 'conditional';
  dependencies?: string[]; // 依赖的前置阶段
  timeout: number; // 阶段超时时间（毫秒）
  conditions?: ExecutionCondition[]; // 执行条件
}

export interface AgentExecution {
  agentId: string;
  priority: number; // 0-1，优先级
  expectedRole: string;
  estimatedDuration: number;
  inputTransformation?: (previousResults: any[]) => any;
  retryPolicy?: RetryPolicy;
}

export interface ExecutionCondition {
  type: 'scene_confidence' | 'agent_availability' | 'resource_threshold';
  threshold: number;
  action: 'skip' | 'fallback' | 'retry';
}

export interface ResourceRequirement {
  type: 'llm_calls' | 'memory' | 'concurrent_agents';
  amount: number;
  critical: boolean;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  conditions: string[]; // 什么情况下重试
}

// ============= 智能调度引擎主类 =============

export class IntelligentScheduler {
  private strategies: Map<string, SchedulingStrategy> = new Map();
  private executionHistory: ExecutionRecord[] = [];
  private performanceMetrics: PerformanceMetrics = {
    totalExecutions: 0,
    successRate: 0,
    averageQuality: 0,
    strategyPerformance: new Map()
  };

  constructor() {
    this.initializeStrategies();
    console.log('🧠 智能调度引擎初始化完成');
  }

  /**
   * 初始化所有调度策略
   */
  private initializeStrategies(): void {
    // V1需求：多种智能调度策略
    this.registerStrategy(new SequentialStrategy());
    this.registerStrategy(new ParallelStrategy());
    this.registerStrategy(new AdaptiveDynamicStrategy());
    this.registerStrategy(new EmotionDrivenStrategy());
    this.registerStrategy(new CollaborativeStrategy());
    this.registerStrategy(new EfficiencyOptimizedStrategy());
    
    console.log(`📋 已注册 ${this.strategies.size} 种调度策略`);
  }

  /**
   * 注册新的调度策略
   */
  registerStrategy(strategy: SchedulingStrategy): void {
    this.strategies.set(strategy.name, strategy);
    console.log(`✅ 调度策略已注册: ${strategy.name}`);
  }

  /**
   * 智能选择最佳调度策略并创建执行计划
   */
  async scheduleExecution(
    sceneAnalysis: SceneAnalysisResult,
    availableAgents: BaseAgent[]
  ): Promise<ExecutionPlan> {
    console.log(`🎯 [智能调度] 开始策略选择，场景: ${sceneAnalysis.sceneType}`);

    try {
      // 第一步：评估所有可用策略
      const applicableStrategies = this.evaluateStrategies(sceneAnalysis, availableAgents);
      
      if (applicableStrategies.length === 0) {
        console.warn('⚠️ 没有适用的策略，使用默认策略');
        return await this.createFallbackPlan(sceneAnalysis, availableAgents);
      }

      // 第二步：选择最优策略
      const bestStrategy = this.selectBestStrategy(applicableStrategies, sceneAnalysis);
      console.log(`🎯 [智能调度] 选择策略: ${bestStrategy.name}`);

      // 第三步：创建执行计划
      const executionPlan = await bestStrategy.createExecutionPlan(sceneAnalysis, availableAgents);
      
      // 第四步：优化执行计划
      const optimizedPlan = this.optimizeExecutionPlan(executionPlan, sceneAnalysis);
      
      console.log(`✅ [智能调度] 执行计划创建完成: ${optimizedPlan.phases.length} 个阶段`);
      
      return optimizedPlan;

    } catch (error) {
      console.error('❌ [智能调度] 策略选择失败:', error);
      return await this.createFallbackPlan(sceneAnalysis, availableAgents);
    }
  }

  /**
   * 评估所有策略的适用性
   */
  private evaluateStrategies(
    sceneAnalysis: SceneAnalysisResult, 
    availableAgents: BaseAgent[]
  ): StrategyEvaluation[] {
    const evaluations: StrategyEvaluation[] = [];

    for (const [name, strategy] of this.strategies) {
      try {
        const isApplicable = strategy.isApplicable(sceneAnalysis, availableAgents);
        const historicalPerformance = this.getStrategyPerformance(name);
        const contextFitness = this.calculateContextFitness(strategy, sceneAnalysis);

        if (isApplicable) {
          evaluations.push({
            strategy,
            applicabilityScore: 1.0,
            historicalPerformance,
            contextFitness,
            overallScore: this.calculateOverallScore(1.0, historicalPerformance, contextFitness)
          });
        }
      } catch (error) {
        console.warn(`⚠️ 策略 ${name} 评估失败:`, error);
      }
    }

    return evaluations.sort((a, b) => b.overallScore - a.overallScore);
  }

  /**
   * 选择最佳策略
   */
  private selectBestStrategy(
    applicableStrategies: StrategyEvaluation[],
    sceneAnalysis: SceneAnalysisResult
  ): SchedulingStrategy {
    // V1需求：基于多维度评估选择最优策略
    
    // 高紧迫性场景优先选择效率策略
    if (sceneAnalysis.userIntent.urgencyLevel > 0.8) {
      const efficiencyStrategy = applicableStrategies.find(s => 
        s.strategy.name.includes('Efficiency')
      );
      if (efficiencyStrategy) {
        console.log('🚀 高紧迫性，选择效率优化策略');
        return efficiencyStrategy.strategy;
      }
    }

    // 情感支持场景优先情感驱动策略
    if (sceneAnalysis.sceneType === 'emotional_support') {
      const emotionStrategy = applicableStrategies.find(s => 
        s.strategy.name.includes('Emotion')
      );
      if (emotionStrategy) {
        console.log('💝 情感场景，选择情感驱动策略');
        return emotionStrategy.strategy;
      }
    }

    // 创意场景优先协作策略
    if (sceneAnalysis.sceneType === 'creative_brainstorm') {
      const collaborativeStrategy = applicableStrategies.find(s => 
        s.strategy.name.includes('Collaborative')
      );
      if (collaborativeStrategy) {
        console.log('🎨 创意场景，选择协作策略');
        return collaborativeStrategy.strategy;
      }
    }

    // 默认选择综合得分最高的策略
    return applicableStrategies[0].strategy;
  }

  /**
   * 优化执行计划
   */
  private optimizeExecutionPlan(
    plan: ExecutionPlan, 
    sceneAnalysis: SceneAnalysisResult
  ): ExecutionPlan {
    const optimizedPlan = { ...plan };

    // 根据场景分析调整超时时间
    if (sceneAnalysis.userIntent.urgencyLevel > 0.7) {
      optimizedPlan.phases.forEach(phase => {
        phase.timeout = Math.max(phase.timeout * 0.8, 5000); // 最少5秒
      });
    }

    // 根据社交动态调整并发度
    if (sceneAnalysis.socialDynamics.groupCohesion < 0.5) {
      optimizedPlan.phases.forEach(phase => {
        if (phase.executionMode === 'parallel') {
          phase.executionMode = 'sequential'; // 群聊凝聚力低时使用顺序执行
        }
      });
    }

    // 根据置信度调整重试策略
    if (sceneAnalysis.confidence < 0.7) {
      optimizedPlan.phases.forEach(phase => {
        phase.agents.forEach(agent => {
          if (!agent.retryPolicy) {
            agent.retryPolicy = {
              maxAttempts: 2,
              backoffMs: 1000,
              conditions: ['llm_timeout', 'parsing_error']
            };
          }
        });
      });
    }

    return optimizedPlan;
  }

  /**
   * 创建后备执行计划
   */
  private async createFallbackPlan(
    sceneAnalysis: SceneAnalysisResult,
    availableAgents: BaseAgent[]
  ): Promise<ExecutionPlan> {
    console.log('🔄 创建后备执行计划...');

    // 简单的顺序执行计划
    const agentExecutions: AgentExecution[] = availableAgents
      .slice(0, 3) // 最多3个Agent
      .map((agent, index) => ({
        agentId: agent.id,
        priority: 1 - (index * 0.1),
        expectedRole: 'supporter',
        estimatedDuration: 3000,
        retryPolicy: {
          maxAttempts: 1,
          backoffMs: 500,
          conditions: ['llm_timeout']
        }
      }));

    return {
      strategyUsed: 'fallback',
      totalEstimatedTime: agentExecutions.length * 3000,
      phases: [{
        name: 'fallback_execution',
        agents: agentExecutions,
        executionMode: 'sequential',
        timeout: 15000
      }],
      resourceRequirements: [{
        type: 'llm_calls',
        amount: agentExecutions.length,
        critical: true
      }],
      qualityExpectation: 0.6,
      interactionComplexity: 'simple'
    };
  }

  // ============= 辅助方法 =============

  private getStrategyPerformance(strategyName: string): number {
    return this.performanceMetrics.strategyPerformance.get(strategyName) || 0.5;
  }

  private calculateContextFitness(strategy: SchedulingStrategy, sceneAnalysis: SceneAnalysisResult): number {
    // 基于策略类型和场景匹配度计算
    let fitness = 0.5;
    
    if (strategy.name.includes('Emotion') && sceneAnalysis.sceneType === 'emotional_support') {
      fitness += 0.3;
    }
    
    if (strategy.name.includes('Collaborative') && sceneAnalysis.sceneType === 'creative_brainstorm') {
      fitness += 0.3;
    }
    
    if (strategy.name.includes('Efficiency') && sceneAnalysis.userIntent.urgencyLevel > 0.7) {
      fitness += 0.2;
    }

    return Math.min(fitness, 1.0);
  }

  private calculateOverallScore(
    applicability: number, 
    historical: number, 
    contextFitness: number
  ): number {
    // 权重：适用性40%，历史表现30%，上下文适应性30%
    return (applicability * 0.4) + (historical * 0.3) + (contextFitness * 0.3);
  }

  /**
   * 记录执行结果用于学习优化
   */
  recordExecution(executionRecord: ExecutionRecord): void {
    this.executionHistory.push(executionRecord);
    this.updatePerformanceMetrics(executionRecord);
  }

  private updatePerformanceMetrics(record: ExecutionRecord): void {
    this.performanceMetrics.totalExecutions++;
    
    // 更新成功率
    const successfulExecutions = this.executionHistory.filter(r => r.success).length;
    this.performanceMetrics.successRate = successfulExecutions / this.performanceMetrics.totalExecutions;
    
    // 更新策略特定性能
    const strategyRecords = this.executionHistory.filter(r => r.strategyUsed === record.strategyUsed);
    const strategySuccessRate = strategyRecords.filter(r => r.success).length / strategyRecords.length;
    this.performanceMetrics.strategyPerformance.set(record.strategyUsed, strategySuccessRate);
  }

  /**
   * 获取调度器状态
   */
  getSchedulerStatus(): SchedulerStatus {
    return {
      registeredStrategies: Array.from(this.strategies.keys()),
      performanceMetrics: this.performanceMetrics,
      totalExecutions: this.executionHistory.length,
      isHealthy: this.performanceMetrics.successRate > 0.8
    };
  }
}

// ============= 支持接口定义 =============

interface StrategyEvaluation {
  strategy: SchedulingStrategy;
  applicabilityScore: number;
  historicalPerformance: number;
  contextFitness: number;
  overallScore: number;
}

interface PerformanceMetrics {
  totalExecutions: number;
  successRate: number;
  averageQuality: number;
  strategyPerformance: Map<string, number>;
}

export interface ExecutionRecord {
  strategyUsed: string;
  sceneType: string;
  success: boolean;
  duration: number;
  qualityScore: number;
  timestamp: Date;
}

export interface SchedulerStatus {
  registeredStrategies: string[];
  performanceMetrics: PerformanceMetrics;
  totalExecutions: number;
  isHealthy: boolean;
}

// ============= 具体策略实现 =============

/**
 * 顺序执行策略 - 适合需要逻辑顺序的场景
 */
class SequentialStrategy implements SchedulingStrategy {
  readonly name = 'sequential';
  readonly description = '顺序执行策略，适合需要逻辑顺序的对话';

  isApplicable(sceneAnalysis: SceneAnalysisResult, availableAgents: BaseAgent[]): boolean {
    // 分析类、学习类场景适合顺序执行
    return ['learning_discussion', 'problem_solving'].includes(sceneAnalysis.sceneType) ||
           sceneAnalysis.userIntent.expectationType === 'deep_discussion';
  }

  async createExecutionPlan(
    sceneAnalysis: SceneAnalysisResult, 
    availableAgents: BaseAgent[]
  ): Promise<ExecutionPlan> {
    const selectedAgents = this.selectAgentsFromPlan(sceneAnalysis.participationPlan, availableAgents);
    
    return {
      strategyUsed: this.name,
      totalEstimatedTime: selectedAgents.length * 4000,
      phases: [{
        name: 'sequential_discussion',
        agents: selectedAgents.map((agent, index) => ({
          agentId: agent.agentName,
          priority: 1 - (index * 0.1),
          expectedRole: agent.roleInConversation,
          estimatedDuration: 4000
        })),
        executionMode: 'sequential',
        timeout: selectedAgents.length * 5000
      }],
      resourceRequirements: [{
        type: 'llm_calls',
        amount: selectedAgents.length,
        critical: true
      }],
      qualityExpectation: 0.8,
      interactionComplexity: 'moderate'
    };
  }

  private selectAgentsFromPlan(
    participationPlan: ParticipationSuggestion[], 
    availableAgents: BaseAgent[]
  ): ParticipationSuggestion[] {
    return participationPlan
      .filter(suggestion => 
        availableAgents.some(agent => agent.id === suggestion.agentName)
      )
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 4); // 最多4个Agent
  }
}

/**
 * 并行执行策略 - 适合需要多角度快速响应的场景
 */
class ParallelStrategy implements SchedulingStrategy {
  readonly name = 'parallel';
  readonly description = '并行执行策略，适合需要多角度快速响应的场景';

  isApplicable(sceneAnalysis: SceneAnalysisResult, availableAgents: BaseAgent[]): boolean {
    return sceneAnalysis.userIntent.urgencyLevel > 0.6 ||
           sceneAnalysis.sceneType === 'humor_entertainment' ||
           sceneAnalysis.socialDynamics.groupCohesion > 0.7;
  }

  async createExecutionPlan(
    sceneAnalysis: SceneAnalysisResult, 
    availableAgents: BaseAgent[]
  ): Promise<ExecutionPlan> {
    const selectedAgents = sceneAnalysis.participationPlan.slice(0, 3);
    
    return {
      strategyUsed: this.name,
      totalEstimatedTime: 6000, // 并行执行，总时间较短
      phases: [{
        name: 'parallel_response',
        agents: selectedAgents.map(agent => ({
          agentId: agent.agentName,
          priority: agent.priority,
          expectedRole: agent.roleInConversation,
          estimatedDuration: 5000
        })),
        executionMode: 'parallel',
        timeout: 8000
      }],
      resourceRequirements: [{
        type: 'llm_calls',
        amount: selectedAgents.length,
        critical: true
      }, {
        type: 'concurrent_agents',
        amount: selectedAgents.length,
        critical: true
      }],
      qualityExpectation: 0.7,
      interactionComplexity: 'moderate'
    };
  }
}

/**
 * 自适应动态策略 - V1需求的核心智能策略
 */
class AdaptiveDynamicStrategy implements SchedulingStrategy {
  readonly name = 'adaptive_dynamic';
  readonly description = 'V1智能策略，根据实时情境动态调整执行方式';

  isApplicable(sceneAnalysis: SceneAnalysisResult, availableAgents: BaseAgent[]): boolean {
    // 复杂场景或高置信度分析适合动态策略
    return sceneAnalysis.confidence > 0.8 || 
           sceneAnalysis.analysisDepth === 'deep';
  }

  async createExecutionPlan(
    sceneAnalysis: SceneAnalysisResult, 
    availableAgents: BaseAgent[]
  ): Promise<ExecutionPlan> {
    // 根据场景分析动态构建多阶段执行计划
    const phases: ExecutionPhase[] = [];
    
    // 第一阶段：主要响应者
    const primaryResponders = sceneAnalysis.participationPlan
      .filter(p => p.roleInConversation === 'primary_responder')
      .slice(0, 2);
    
    if (primaryResponders.length > 0) {
      phases.push({
        name: 'primary_response',
        agents: primaryResponders.map(agent => ({
          agentId: agent.agentName,
          priority: agent.priority,
          expectedRole: agent.roleInConversation,
          estimatedDuration: 4000
        })),
        executionMode: primaryResponders.length > 1 ? 'parallel' : 'sequential',
        timeout: 6000
      });
    }
    
    // 第二阶段：支持者和调节者
    const supporters = sceneAnalysis.participationPlan
      .filter(p => ['supporter', 'moderator'].includes(p.roleInConversation))
      .slice(0, 2);
    
    if (supporters.length > 0) {
      phases.push({
        name: 'supportive_response',
        agents: supporters.map(agent => ({
          agentId: agent.agentName,
          priority: agent.priority,
          expectedRole: agent.roleInConversation,
          estimatedDuration: 3000
        })),
        executionMode: 'sequential',
        dependencies: ['primary_response'],
        timeout: 5000,
        conditions: [{
          type: 'scene_confidence',
          threshold: 0.6,
          action: 'skip'
        }]
      });
    }

    return {
      strategyUsed: this.name,
      totalEstimatedTime: phases.reduce((sum, phase) => 
        sum + phase.agents.reduce((phaseSum, agent) => phaseSum + agent.estimatedDuration, 0), 0
      ),
      phases,
      resourceRequirements: [{
        type: 'llm_calls',
        amount: phases.reduce((sum, phase) => sum + phase.agents.length, 0),
        critical: true
      }],
      qualityExpectation: 0.9,
      interactionComplexity: 'complex'
    };
  }
}

/**
 * 情感驱动策略 - 优先考虑用户情感状态
 */
class EmotionDrivenStrategy implements SchedulingStrategy {
  readonly name = 'emotion_driven';
  readonly description = '情感驱动策略，优先响应用户情感需求';

  isApplicable(sceneAnalysis: SceneAnalysisResult, availableAgents: BaseAgent[]): boolean {
    return sceneAnalysis.sceneType === 'emotional_support' ||
           sceneAnalysis.emotionalIntensity > 0.6;
  }

  async createExecutionPlan(
    sceneAnalysis: SceneAnalysisResult, 
    availableAgents: BaseAgent[]
  ): Promise<ExecutionPlan> {
    // 情感场景优先安排共情型Agent
    const empathyAgents = sceneAnalysis.participationPlan
      .filter(p => p.expectedContribution.includes('情感') || p.expectedContribution.includes('支持'))
      .sort((a, b) => b.priority - a.priority);
    
    return {
      strategyUsed: this.name,
      totalEstimatedTime: 8000,
      phases: [{
        name: 'emotional_support',
        agents: empathyAgents.slice(0, 2).map(agent => ({
          agentId: agent.agentName,
          priority: agent.priority,
          expectedRole: 'emotional_supporter',
          estimatedDuration: 4000
        })),
        executionMode: 'sequential', // 情感支持需要连贯性
        timeout: 10000
      }],
      resourceRequirements: [{
        type: 'llm_calls',
        amount: Math.min(empathyAgents.length, 2),
        critical: true
      }],
      qualityExpectation: 0.85,
      interactionComplexity: 'moderate'
    };
  }
}

/**
 * 协作策略 - 适合创意和头脑风暴场景
 */
class CollaborativeStrategy implements SchedulingStrategy {
  readonly name = 'collaborative';
  readonly description = '协作策略，适合创意讨论和团队协作';

  isApplicable(sceneAnalysis: SceneAnalysisResult, availableAgents: BaseAgent[]): boolean {
    return sceneAnalysis.sceneType === 'creative_brainstorm' ||
           sceneAnalysis.conversationFlow.interactionPattern === 'brainstorming';
  }

  async createExecutionPlan(
    sceneAnalysis: SceneAnalysisResult, 
    availableAgents: BaseAgent[]
  ): Promise<ExecutionPlan> {
    const creativeAgents = sceneAnalysis.participationPlan
      .filter(p => p.roleInConversation.includes('creative') || 
                   p.expectedContribution.includes('创意'))
      .slice(0, 3);

    return {
      strategyUsed: this.name,
      totalEstimatedTime: 12000,
      phases: [{
        name: 'idea_generation',
        agents: creativeAgents.map(agent => ({
          agentId: agent.agentName,
          priority: agent.priority,
          expectedRole: 'creative_contributor',
          estimatedDuration: 4000
        })),
        executionMode: 'parallel', // 并行产生创意
        timeout: 6000
      }, {
        name: 'idea_synthesis',
        agents: [{
          agentId: creativeAgents[0]?.agentName || 'creative-agent',
          priority: 1.0,
          expectedRole: 'synthesizer',
          estimatedDuration: 3000
        }],
        executionMode: 'sequential',
        dependencies: ['idea_generation'],
        timeout: 5000
      }],
      resourceRequirements: [{
        type: 'llm_calls',
        amount: creativeAgents.length + 1,
        critical: true
      }],
      qualityExpectation: 0.8,
      interactionComplexity: 'complex'
    };
  }
}

/**
 * 效率优化策略 - 高紧迫性场景的快速响应
 */
class EfficiencyOptimizedStrategy implements SchedulingStrategy {
  readonly name = 'efficiency_optimized';
  readonly description = '效率优化策略，适合高紧迫性场景';

  isApplicable(sceneAnalysis: SceneAnalysisResult, availableAgents: BaseAgent[]): boolean {
    return sceneAnalysis.userIntent.urgencyLevel > 0.7 ||
           sceneAnalysis.userIntent.expectationType === 'quick_answer';
  }

  async createExecutionPlan(
    sceneAnalysis: SceneAnalysisResult, 
    availableAgents: BaseAgent[]
  ): Promise<ExecutionPlan> {
    // 选择最高优先级的单个Agent快速响应
    const topAgent = sceneAnalysis.participationPlan
      .sort((a, b) => b.priority - a.priority)[0];

    return {
      strategyUsed: this.name,
      totalEstimatedTime: 3000,
      phases: [{
        name: 'rapid_response',
        agents: [{
          agentId: topAgent.agentName,
          priority: 1.0,
          expectedRole: 'rapid_responder',
          estimatedDuration: 3000
        }],
        executionMode: 'sequential',
        timeout: 4000
      }],
      resourceRequirements: [{
        type: 'llm_calls',
        amount: 1,
        critical: true
      }],
      qualityExpectation: 0.7, // 速度优先，质量稍低
      interactionComplexity: 'simple'
    };
  }
}

// 导出默认实例
const intelligentScheduler = new IntelligentScheduler();
export default intelligentScheduler;