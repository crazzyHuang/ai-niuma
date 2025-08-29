/**
 * 🔍 系统诊断服务
 * 
 * 收集和分析整个对话流程的内部数据，用于系统调优和监控
 */

import agentBus from './intelligent-agent-bus';
import intelligentScheduler from './intelligent-scheduler';
import messageRouter from './message-router';
import resultAggregator from './result-aggregator';
import aiEmotionAnalyzer from './ai-emotion-analyzer';
import { AgentResult } from './intelligent-agent-bus';
import { SceneAnalysisResult } from './agents/scene-analyzer-agent';

// ============= 诊断数据类型定义 =============

export interface SystemDiagnostic {
  timestamp: Date;
  conversationId: string;
  userMessage: string;
  
  // 分析阶段数据
  analysisPhase: {
    aiAnalysis?: any;
    sceneAnalysis?: SceneAnalysisResult;
    executionPlan?: any;
    analysisTime: number;
  };
  
  // 执行阶段数据
  executionPhase: {
    selectedAgents: string[];
    executionStrategy: string;
    phaseResults: PhaseExecutionResult[];
    totalExecutionTime: number;
  };
  
  // 聚合阶段数据
  aggregationPhase: {
    strategy: string;
    qualityScore: number;
    finalResponses: any[];
    aggregationTime: number;
  };
  
  // 系统性能数据
  performance: {
    memoryUsage: NodeJS.MemoryUsage;
    agentHealth: { [agentId: string]: any };
    routingStats: any;
    cacheStats: any;
  };
  
  // 错误和警告
  errors: DiagnosticError[];
  warnings: DiagnosticWarning[];
}

export interface PhaseExecutionResult {
  phaseName: string;
  executionMode: string;
  agents: {
    agentId: string;
    success: boolean;
    executionTime: number;
    result?: AgentResult;
    error?: string;
  }[];
  totalTime: number;
}

export interface DiagnosticError {
  timestamp: Date;
  component: string;
  level: 'error' | 'warning' | 'info';
  message: string;
  stack?: string;
  metadata?: any;
}

export interface DiagnosticWarning {
  timestamp: Date;
  component: string;
  message: string;
  impact: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface LiveMetrics {
  activeConversations: number;
  totalAgents: number;
  healthyAgents: number;
  averageResponseTime: number;
  cacheHitRate: number;
  errorRate: number;
  lastUpdate: Date;
}

// ============= 诊断服务主类 =============

export class DiagnosticService {
  private diagnostics: Map<string, SystemDiagnostic> = new Map();
  private liveMetrics: LiveMetrics;
  private logBuffer: DiagnosticError[] = [];
  private maxDiagnosticsHistory = 100;
  private maxLogBuffer = 500;
  
  // 实时监控订阅
  private subscribers: Array<(data: any) => void> = [];

  constructor() {
    this.liveMetrics = {
      activeConversations: 0,
      totalAgents: 0,
      healthyAgents: 0,
      averageResponseTime: 0,
      cacheHitRate: 0,
      errorRate: 0,
      lastUpdate: new Date()
    };

    this.initializeMonitoring();
    console.log('🔍 系统诊断服务初始化完成');
  }

  /**
   * 开始监控对话流程
   */
  async startConversationDiagnostic(conversationId: string, userMessage: string): Promise<string> {
    const diagnosticId = `${conversationId}_${Date.now()}`;
    
    const diagnostic: SystemDiagnostic = {
      timestamp: new Date(),
      conversationId,
      userMessage,
      analysisPhase: {
        analysisTime: 0
      },
      executionPhase: {
        selectedAgents: [],
        executionStrategy: '',
        phaseResults: [],
        totalExecutionTime: 0
      },
      aggregationPhase: {
        strategy: '',
        qualityScore: 0,
        finalResponses: [],
        aggregationTime: 0
      },
      performance: {
        memoryUsage: process.memoryUsage(),
        agentHealth: {},
        routingStats: {},
        cacheStats: {}
      },
      errors: [],
      warnings: []
    };

    this.diagnostics.set(diagnosticId, diagnostic);
    this.log('info', 'DiagnosticService', `开始监控对话: ${conversationId}`, { diagnosticId });
    
    return diagnosticId;
  }

  /**
   * 记录分析阶段数据
   */
  recordAnalysisPhase(
    diagnosticId: string,
    aiAnalysis: any,
    sceneAnalysis: SceneAnalysisResult,
    executionPlan: any,
    analysisTime: number
  ): void {
    const diagnostic = this.diagnostics.get(diagnosticId);
    if (!diagnostic) return;

    diagnostic.analysisPhase = {
      aiAnalysis,
      sceneAnalysis,
      executionPlan,
      analysisTime
    };

    // 检查分析质量
    if (sceneAnalysis.confidence < 0.6) {
      this.addWarning(diagnosticId, 'SceneAnalyzer', 
        `场景分析置信度较低: ${sceneAnalysis.confidence.toFixed(2)}`, 
        'medium', '考虑改进分析提示词或增加更多上下文');
    }

    if (aiAnalysis && aiAnalysis.metadata.overallConfidence < 0.7) {
      this.addWarning(diagnosticId, 'AIAnalyzer',
        `AI分析置信度较低: ${aiAnalysis.metadata.overallConfidence.toFixed(2)}`,
        'medium', '可能需要更好的AI提示词或回退策略');
    }

    this.notifySubscribers('analysis_phase', diagnostic);
  }

  /**
   * 记录执行阶段数据
   */
  recordExecutionPhase(
    diagnosticId: string,
    selectedAgents: string[],
    executionStrategy: string,
    phaseResults: PhaseExecutionResult[],
    totalExecutionTime: number
  ): void {
    const diagnostic = this.diagnostics.get(diagnosticId);
    if (!diagnostic) return;

    diagnostic.executionPhase = {
      selectedAgents,
      executionStrategy,
      phaseResults,
      totalExecutionTime
    };

    // 性能分析
    if (totalExecutionTime > 10000) {
      this.addWarning(diagnosticId, 'Execution',
        `执行时间过长: ${totalExecutionTime}ms`,
        'high', '考虑优化Agent执行速度或使用并行策略');
    }

    const failedAgents = phaseResults.flatMap(phase => 
      phase.agents.filter(agent => !agent.success)
    );

    if (failedAgents.length > 0) {
      this.addWarning(diagnosticId, 'Execution',
        `${failedAgents.length}个Agent执行失败`,
        'high', '检查Agent配置和LLM连接状态');
    }

    this.notifySubscribers('execution_phase', diagnostic);
  }

  /**
   * 记录聚合阶段数据
   */
  recordAggregationPhase(
    diagnosticId: string,
    strategy: string,
    qualityScore: number,
    finalResponses: any[],
    aggregationTime: number
  ): void {
    const diagnostic = this.diagnostics.get(diagnosticId);
    if (!diagnostic) return;

    diagnostic.aggregationPhase = {
      strategy,
      qualityScore,
      finalResponses,
      aggregationTime
    };

    // 质量分析
    if (qualityScore < 0.6) {
      this.addWarning(diagnosticId, 'Aggregation',
        `聚合质量分数较低: ${qualityScore.toFixed(2)}`,
        'high', '检查Agent输出质量和聚合策略');
    }

    if (finalResponses.length === 0) {
      this.addError(diagnosticId, 'Aggregation', 'error', 
        '没有生成任何最终响应', undefined, { strategy });
    }

    this.notifySubscribers('aggregation_phase', diagnostic);
  }

  /**
   * 完成对话诊断
   */
  async finishConversationDiagnostic(diagnosticId: string): Promise<SystemDiagnostic | null> {
    const diagnostic = this.diagnostics.get(diagnosticId);
    if (!diagnostic) return null;

    // 更新性能数据
    diagnostic.performance = await this.collectPerformanceData();

    // 清理旧的诊断数据
    this.cleanupOldDiagnostics();

    // 更新实时指标
    this.updateLiveMetrics();

    this.log('info', 'DiagnosticService', `完成对话诊断: ${diagnostic.conversationId}`);
    this.notifySubscribers('diagnostic_complete', diagnostic);

    return diagnostic;
  }

  /**
   * 获取实时指标
   */
  getLiveMetrics(): LiveMetrics {
    return { ...this.liveMetrics };
  }

  /**
   * 获取所有诊断数据
   */
  getAllDiagnostics(): SystemDiagnostic[] {
    return Array.from(this.diagnostics.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * 获取特定对话的诊断数据
   */
  getDiagnostic(diagnosticId: string): SystemDiagnostic | null {
    return this.diagnostics.get(diagnosticId) || null;
  }

  /**
   * 获取日志缓冲区
   */
  getLogBuffer(): DiagnosticError[] {
    return [...this.logBuffer].reverse(); // 最新的在前面
  }

  /**
   * 搜索诊断数据
   */
  searchDiagnostics(filters: {
    conversationId?: string;
    timeRange?: { start: Date; end: Date };
    hasErrors?: boolean;
    minQuality?: number;
  }): SystemDiagnostic[] {
    let results = this.getAllDiagnostics();

    if (filters.conversationId) {
      results = results.filter(d => d.conversationId === filters.conversationId);
    }

    if (filters.timeRange) {
      results = results.filter(d => 
        d.timestamp >= filters.timeRange!.start && 
        d.timestamp <= filters.timeRange!.end
      );
    }

    if (filters.hasErrors !== undefined) {
      results = results.filter(d => 
        filters.hasErrors ? d.errors.length > 0 : d.errors.length === 0
      );
    }

    if (filters.minQuality !== undefined) {
      results = results.filter(d => d.aggregationPhase.qualityScore >= filters.minQuality!);
    }

    return results;
  }

  /**
   * 获取系统健康状态
   */
  async getSystemHealth(): Promise<{
    overall: 'healthy' | 'warning' | 'critical';
    components: { [key: string]: any };
    recommendations: string[];
  }> {
    const agentBusStatus = await agentBus.getSystemStatus();
    const schedulerStatus = intelligentScheduler.getSchedulerStatus();
    const routingStats = messageRouter.getRoutingStats();
    const analysisStats = aiEmotionAnalyzer.getAnalysisStats();

    const components = {
      agentBus: agentBusStatus,
      scheduler: schedulerStatus,
      routing: routingStats,
      analysis: analysisStats,
      memory: process.memoryUsage()
    };

    const recommendations: string[] = [];
    let overall: 'healthy' | 'warning' | 'critical' = 'healthy';

    // 健康检查逻辑
    if (!agentBusStatus.isRunning) {
      overall = 'critical';
      recommendations.push('Agent Bus系统未运行');
    }

    if (routingStats.successRate < 0.8) {
      overall = overall === 'critical' ? 'critical' : 'warning';
      recommendations.push('消息路由成功率较低，检查路由规则配置');
    }

    if (components.memory.heapUsed > 500 * 1024 * 1024) { // 500MB
      overall = overall === 'critical' ? 'critical' : 'warning';
      recommendations.push('内存使用量较高，考虑优化或重启');
    }

    return { overall, components, recommendations };
  }

  /**
   * 订阅实时更新
   */
  subscribe(callback: (data: any) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  // ============= 私有方法 =============

  private initializeMonitoring(): void {
    // 定期更新实时指标
    setInterval(() => {
      this.updateLiveMetrics();
    }, 5000); // 每5秒更新一次

    // 定期清理旧数据
    setInterval(() => {
      this.cleanupOldDiagnostics();
      this.cleanupLogBuffer();
    }, 60000); // 每分钟清理一次
  }

  private async collectPerformanceData(): Promise<SystemDiagnostic['performance']> {
    const memoryUsage = process.memoryUsage();
    const agentHealth = await agentBus.getSystemStatus();
    const routingStats = messageRouter.getRoutingStats();
    const cacheStats = aiEmotionAnalyzer.getAnalysisStats();

    return {
      memoryUsage,
      agentHealth: agentHealth.agentHealth,
      routingStats,
      cacheStats
    };
  }

  private updateLiveMetrics(): void {
    const diagnostics = this.getAllDiagnostics();
    const recentDiagnostics = diagnostics.filter(d => 
      Date.now() - d.timestamp.getTime() < 300000 // 最近5分钟
    );

    this.liveMetrics = {
      activeConversations: recentDiagnostics.length,
      totalAgents: agentBus.getRegisteredAgents().length,
      healthyAgents: 0, // 这里需要从agentBus获取
      averageResponseTime: recentDiagnostics.length > 0 ? 
        recentDiagnostics.reduce((sum, d) => sum + d.executionPhase.totalExecutionTime, 0) / recentDiagnostics.length : 0,
      cacheHitRate: 0, // 从缓存统计获取
      errorRate: this.calculateErrorRate(),
      lastUpdate: new Date()
    };
  }

  private calculateErrorRate(): number {
    const recentLogs = this.logBuffer.filter(log => 
      Date.now() - log.timestamp.getTime() < 300000 // 最近5分钟
    );

    if (recentLogs.length === 0) return 0;

    const errorCount = recentLogs.filter(log => log.level === 'error').length;
    return errorCount / recentLogs.length;
  }

  private cleanupOldDiagnostics(): void {
    if (this.diagnostics.size <= this.maxDiagnosticsHistory) return;

    const diagnostics = Array.from(this.diagnostics.entries())
      .sort((a, b) => b[1].timestamp.getTime() - a[1].timestamp.getTime());

    // 保留最新的诊断数据
    const toKeep = diagnostics.slice(0, this.maxDiagnosticsHistory);
    this.diagnostics.clear();
    toKeep.forEach(([id, diagnostic]) => {
      this.diagnostics.set(id, diagnostic);
    });
  }

  private cleanupLogBuffer(): void {
    if (this.logBuffer.length <= this.maxLogBuffer) return;

    this.logBuffer.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    this.logBuffer = this.logBuffer.slice(0, this.maxLogBuffer);
  }

  private addError(
    diagnosticId: string,
    component: string,
    level: 'error' | 'warning' | 'info',
    message: string,
    stack?: string,
    metadata?: any
  ): void {
    const diagnostic = this.diagnostics.get(diagnosticId);
    if (!diagnostic) return;

    const error: DiagnosticError = {
      timestamp: new Date(),
      component,
      level,
      message,
      stack,
      metadata
    };

    diagnostic.errors.push(error);
    this.log(level, component, message, metadata);
  }

  private addWarning(
    diagnosticId: string,
    component: string,
    message: string,
    impact: 'low' | 'medium' | 'high',
    suggestion: string
  ): void {
    const diagnostic = this.diagnostics.get(diagnosticId);
    if (!diagnostic) return;

    const warning: DiagnosticWarning = {
      timestamp: new Date(),
      component,
      message,
      impact,
      suggestion
    };

    diagnostic.warnings.push(warning);
    this.log('warning', component, message, { impact, suggestion });
  }

  private log(
    level: 'error' | 'warning' | 'info',
    component: string,
    message: string,
    metadata?: any
  ): void {
    const logEntry: DiagnosticError = {
      timestamp: new Date(),
      component,
      level,
      message,
      metadata
    };

    this.logBuffer.push(logEntry);
    
    // 控制台输出
    const prefix = level === 'error' ? '❌' : level === 'warning' ? '⚠️' : 'ℹ️';
    console.log(`${prefix} [${component}] ${message}`, metadata ? metadata : '');
  }

  private notifySubscribers(event: string, data: any): void {
    this.subscribers.forEach(callback => {
      try {
        callback({ event, data });
      } catch (error) {
        console.error('Subscriber notification failed:', error);
      }
    });
  }
}

// 导出默认实例
const diagnosticService = new DiagnosticService();
export default diagnosticService;