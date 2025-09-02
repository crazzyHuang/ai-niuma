/**
 * 🚌 智能Agent总线系统
 * 
 * 仿照Claude Code架构，实现多Agent专业分工的总线调度系统
 * 让每个Agent专注自己的领域，通过智能总线协调工作
 */

import { LLMMessage } from '@/types/llm';
import llmService from './llm-service';
import LLMConfigManager, { LLMConfig } from './llm-config';
import intelligentScheduler, { ExecutionPlan, ExecutionPhase, IntelligentScheduler } from './intelligent-scheduler';
import { SceneAnalysisResult } from './agents/scene-analyzer-agent';
import messageRouter, { RoutingContext } from './message-router';
import resultAggregator, { AggregationContext, ExecutionMetrics, QualityRequirements } from './result-aggregator';

// ============= 基础类型定义 =============

export interface AgentMessage {
  id: string;
  type: string;
  payload: any;
  metadata: {
    timestamp: Date;
    sender: string;
    recipient?: string;
    priority: number;
  };
}

export interface AgentResult {
  success: boolean;
  data?: any;
  error?: string;
  metrics: {
    executionTime: number;
    memoryUsage?: any;
  };
  nextActions?: NextAction[];
}

export interface NextAction {
  agentId: string;
  action: string;
  input: any;
  priority: number;
}

export interface GroupChatRequest {
  conversationId: string;
  userMessage: string;
  conversationHistory: any[];
  availableAgents: any[];
  context?: any;
}

export interface GroupChatResult {
  success: boolean;
  responses: ChatbotResponse[];
  metadata: {
    totalExecutionTime: number;
    agentsUsed: string[];
    quality: number;
  };
}

export interface ChatbotResponse {
  agentName: string;
  content: string;
  timestamp: Date;
  confidence: number;
}

// ============= Agent基础抽象类 =============

export abstract class BaseAgent {
  abstract readonly id: string;
  abstract readonly capabilities: string[];
  
  protected lastExecution?: Date;
  protected executionHistory: number[] = [];
  protected messageQueue: AgentMessage[] = [];

  /**
   * Agent的核心执行方法
   */
  abstract execute(input: any): Promise<AgentResult>;

  /**
   * 统一的LLM调用接口
   */
  protected async callLLM(prompt: string, config?: LLMConfig): Promise<string> {
    try {
      const messages: LLMMessage[] = [
        { role: 'system', content: 'You are a helpful AI assistant.' },
        { role: 'user', content: prompt }
      ];

      // 如果没有提供配置，获取默认配置
      const llmConfig = config || await this.getLLMConfig();
      const response = await llmService.chat(llmConfig, messages);
      return response.content;
    } catch (error) {
      console.error(`LLM调用失败 [${this.id}]:`, error);
      throw error;
    }
  }

  /**
   * 获取LLM配置 - 从数据库动态获取
   */
  protected async getLLMConfig(): Promise<LLMConfig> {
    try {
      // 尝试根据Agent ID获取专属配置
      const config = await LLMConfigManager.getConfigForAgent(this.id);
      console.log(`🔧 [BaseAgent] Agent [${this.id}] 获取LLM配置:`, {
        provider: config.provider,
        model: config.model,
        hasApiKey: !!config.apiKey
      });
      return config;
    } catch (error) {
      console.warn(`⚠️ [BaseAgent] Agent [${this.id}] 无法获取专属配置，使用默认配置:`, error);
      // 回退到全局默认配置
      return await LLMConfigManager.getConfig();
    }
  }

  /**
   * @deprecated 使用 getLLMConfig() 替代
   */
  protected getDefaultLLMConfig(): LLMConfig {
    throw new Error('getDefaultLLMConfig() is deprecated. Use await getLLMConfig() instead.');
  }

  /**
   * 输入验证
   */
  protected validateInput(input: any, requiredFields: string[]): boolean {
    if (!input) return false;
    
    for (const field of requiredFields) {
      if (!(field in input)) {
        console.warn(`缺少必需字段: ${field}`);
        return false;
      }
    }
    
    return true;
  }

  /**
   * 格式化输出
   */
  protected formatOutput(data: any, success: boolean = true): AgentResult {
    const endTime = Date.now();
    const startTime = this.lastExecution?.getTime() || endTime;
    const executionTime = endTime - startTime;

    // 记录执行时间
    this.executionHistory.push(executionTime);
    if (this.executionHistory.length > 100) {
      this.executionHistory.shift(); // 保持最近100次记录
    }

    return {
      success,
      data,
      error: success ? undefined : '执行失败',
      metrics: {
        executionTime,
        memoryUsage: process.memoryUsage()
      }
    };
  }

  /**
   * Agent健康检查
   */
  async healthCheck(): Promise<{ status: string; averageResponseTime: number }> {
    const avgTime = this.executionHistory.length > 0 
      ? this.executionHistory.reduce((a, b) => a + b, 0) / this.executionHistory.length
      : 0;

    return {
      status: 'healthy',
      averageResponseTime: avgTime
    };
  }

  /**
   * 启动Agent
   */
  async start(): Promise<void> {
    console.log(`🤖 Agent [${this.id}] 已启动`);
  }

  /**
   * 停止Agent
   */
  async stop(): Promise<void> {
    console.log(`🛑 Agent [${this.id}] 已停止`);
  }

  /**
   * 接收消息的处理方法
   */
  async onMessage(message: AgentMessage): Promise<void> {
    console.log(`📨 Agent [${this.id}] 收到消息: ${message.type}`);
    
    // 添加到消息队列
    this.messageQueue.push(message);
    
    // 触发消息处理
    await this.processMessages();
  }

  /**
   * 处理消息队列
   */
  protected async processMessages(): Promise<void> {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift()!;
      
      try {
        await this.handleMessage(message);
      } catch (error) {
        console.error(`❌ Agent [${this.id}] 处理消息失败:`, error);
      }
    }
  }

  /**
   * 处理单个消息 - 子类可以重写
   */
  protected async handleMessage(message: AgentMessage): Promise<void> {
    console.log(`🔄 Agent [${this.id}] 处理消息: ${message.type}，来自: ${message.metadata.sender}`);
    
    // 默认处理：根据消息类型执行不同的逻辑
    switch (message.type) {
      case 'scene_analysis_result':
        await this.onSceneAnalysisReceived(message.payload);
        break;
      case 'quality_feedback':
        await this.onQualityFeedbackReceived(message.payload);
        break;
      default:
        console.log(`💬 Agent [${this.id}] 收到未处理的消息类型: ${message.type}`);
    }
  }

  /**
   * 场景分析结果处理 - 子类可以重写
   */
  protected async onSceneAnalysisReceived(analysisResult: SceneAnalysisResult): Promise<void> {
    console.log(`📊 Agent [${this.id}] 收到场景分析: ${analysisResult.sceneType}`);
  }

  /**
   * 质量反馈处理 - 子类可以重写
   */
  protected async onQualityFeedbackReceived(feedback: any): Promise<void> {
    console.log(`📈 Agent [${this.id}] 收到质量反馈: ${feedback.score}`);
  }
}

// ============= 智能Agent总线 =============

export class IntelligentAgentBus {
  private agents: Map<string, BaseAgent> = new Map();
  private isRunning: boolean = false;

  constructor() {
    console.log('🚌 智能Agent总线初始化...');
  }

  /**
   * 注册Agent到总线
   */
  registerAgent(agent: BaseAgent): void {
    if (this.agents.has(agent.id)) {
      console.warn(`⚠️ Agent [${agent.id}] 已存在，将被替换`);
    }

    this.agents.set(agent.id, agent);
    console.log(`✅ Agent [${agent.id}] 注册成功，能力: [${agent.capabilities.join(', ')}]`);
  }

  /**
   * 注销Agent
   */
  unregisterAgent(agentId: string): void {
    if (this.agents.delete(agentId)) {
      console.log(`🗑️ Agent [${agentId}] 已注销`);
    } else {
      console.warn(`⚠️ Agent [${agentId}] 不存在`);
    }
  }

  /**
   * 根据能力发现Agent
   */
  discoverAgents(capabilities: string[]): BaseAgent[] {
    const matchingAgents: BaseAgent[] = [];

    for (const agent of this.agents.values()) {
      const hasCapabilities = capabilities.some(cap => 
        agent.capabilities.includes(cap)
      );
      
      if (hasCapabilities) {
        matchingAgents.push(agent);
      }
    }

    return matchingAgents;
  }

  /**
   * 获取所有已注册的Agent
   */
  getRegisteredAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }

  /**
   * 处理群聊请求的主入口
   */
  async processGroupChatRequest(request: GroupChatRequest): Promise<GroupChatResult> {
    const startTime = Date.now();
    console.log(`🎯 开始处理群聊请求: ${request.conversationId}`);

    try {
      // 第一阶段：场景分析
      const analysisResult = await this.runAnalysisPhase(request);
      
      // 第二阶段：执行对话
      const executionResult = await this.runExecutionPhase(request, analysisResult);

      const totalTime = Date.now() - startTime;
      
      return {
        success: true,
        responses: executionResult.responses,
        metadata: {
          totalExecutionTime: totalTime,
          agentsUsed: executionResult.agentsUsed,
          quality: executionResult.quality
        }
      };

    } catch (error) {
      console.error('群聊请求处理失败:', error);
      
      return {
        success: false,
        responses: [],
        metadata: {
          totalExecutionTime: Date.now() - startTime,
          agentsUsed: [],
          quality: 0
        }
      };
    }
  }

  /**
   * 第一阶段：分析阶段 - 使用动态场景分析器
   */
  private async runAnalysisPhase(request: GroupChatRequest): Promise<any> {
    console.log('📊 执行分析阶段...');
    
    try {
      // 导入并使用动态场景分析器
      const { dynamicSceneAnalyzer } = await import('./dynamic-scene-analyzer');
      
      const analysisInput = {
        message: request.userMessage,
        history: request.conversationHistory,
        availableAgents: request.availableAgents,
        context: request.context
      };

      const result = await dynamicSceneAnalyzer.analyzeScene(analysisInput);
      console.log('✅ 动态场景分析完成:', result);
      return result;

    } catch (error) {
      console.warn('⚠️ 动态场景分析失败，尝试使用注册的Agent:', error);
      
      // 如果动态分析失败，回退到注册的场景分析Agent
      const analysisAgents = this.discoverAgents(['scene_analysis']);
      
      if (analysisAgents.length > 0) {
        const analysisAgent = analysisAgents[0];
        const analysisInput = {
          message: request.userMessage,
          history: request.conversationHistory,
          availableAgents: request.availableAgents
        };

        const result = await analysisAgent.execute(analysisInput);
        
        if (result.success) {
          console.log('✅ 回退场景分析完成:', result.data);
          return result.data;
        }
      }
      
      // 最后的默认回退
      console.warn('⚠️ 所有场景分析方式都失败，使用默认值');
      return {
        sceneType: 'casual_chat',
        emotion: 'neutral',
        topics: [],
        confidence: 0.3,
        participantSuggestions: [],
        reasoning: `场景分析失败: ${error instanceof Error ? error.message : '未知错误'}`
      };
    }
  }

  /**
   * 第二阶段：V2智能调度执行阶段（集成消息路由和结果聚合）
   */
  private async runExecutionPhase(
    request: GroupChatRequest, 
    analysisResult: SceneAnalysisResult
  ): Promise<{ responses: ChatbotResponse[]; agentsUsed: string[]; quality: number }> {
    console.log('🧠 [智能调度] 开始执行阶段（增强版）...');

    try {
      const executionStartTime = Date.now();
      
      // 第一步：创建智能执行计划
      const executionPlan = await intelligentScheduler.scheduleExecution(
        analysisResult,
        this.getRegisteredAgents()
      );
      
      console.log(`📋 [智能调度] 执行计划: ${executionPlan.strategyUsed}, ${executionPlan.phases.length}阶段`);

      // 第二步：广播场景分析结果给所有Agent
      await this.broadcastSceneAnalysis(analysisResult);

      // 第三步：执行所有阶段并收集结果
      const agentResults: AgentResult[] = [];
      const allResponses: ChatbotResponse[] = [];
      const usedAgents: Set<string> = new Set();
      const executionMetrics: ExecutionMetrics = {
        totalExecutionTime: 0,
        averageResponseTime: 0,
        tokenUsage: { total: 0, byAgent: {} },
        costEstimate: 0
      };

      for (const phase of executionPlan.phases) {
        console.log(`⚡ [智能调度] 执行阶段: ${phase.name}`);
        
        // 检查执行条件
        if (phase.conditions && !this.checkExecutionConditions(phase.conditions, analysisResult)) {
          console.log(`⏭️ [智能调度] 跳过阶段: ${phase.name} (条件不满足)`);
          continue;
        }

        const phaseResults = await this.executePhaseWithRouting(phase, request, analysisResult);
        agentResults.push(...phaseResults);
        
        // 记录使用的Agent
        phase.agents.forEach(agent => usedAgents.add(agent.agentId));
      }

      // 第四步：聚合所有Agent执行结果
      executionMetrics.totalExecutionTime = Date.now() - executionStartTime;
      executionMetrics.averageResponseTime = agentResults.length > 0 
        ? executionMetrics.totalExecutionTime / agentResults.length 
        : 0;

      const aggregationResult = await this.aggregateResults(
        agentResults, 
        analysisResult, 
        request, 
        executionMetrics
      );

      console.log(`🔄 [结果聚合] 聚合完成，质量分数: ${aggregationResult.qualityScore.toFixed(2)}`);

      // 使用聚合结果
      allResponses.push(...aggregationResult.finalResponses);

      // 第五步：使用聚合结果的质量分数

      // 第六步：记录执行结果用于学习
      intelligentScheduler.recordExecution({
        strategyUsed: executionPlan.strategyUsed,
        sceneType: analysisResult.sceneType,
        success: allResponses.length > 0,
        duration: executionMetrics.totalExecutionTime,
        qualityScore: aggregationResult.qualityScore,
        timestamp: new Date()
      });

      console.log(`✅ [智能调度] 执行完成: ${allResponses.length}个响应, 质量=${aggregationResult.qualityScore.toFixed(2)}`);

      return {
        responses: allResponses,
        agentsUsed: Array.from(usedAgents),
        quality: aggregationResult.qualityScore
      };

    } catch (error) {
      console.error('❌ [智能调度] 执行失败:', error);
      
      // 回退到简单执行
      return await this.fallbackExecution(request, analysisResult);
    }
  }

  /**
   * 执行单个阶段
   */
  private async executePhase(
    phase: ExecutionPhase,
    request: GroupChatRequest,
    analysisResult: SceneAnalysisResult
  ): Promise<ChatbotResponse[]> {
    const responses: ChatbotResponse[] = [];
    const startTime = Date.now();

    try {
      switch (phase.executionMode) {
        case 'sequential':
          for (const agentExec of phase.agents) {
            const response = await this.executeAgent(agentExec, request, analysisResult);
            if (response) responses.push(response);
          }
          break;

        case 'parallel':
          const parallelPromises = phase.agents.map(agentExec => 
            this.executeAgent(agentExec, request, analysisResult)
          );
          const parallelResults = await Promise.allSettled(parallelPromises);
          parallelResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
              responses.push(result.value);
            }
          });
          break;

        case 'pipeline':
          let pipelineInput = { request, analysisResult };
          for (const agentExec of phase.agents) {
            const response = await this.executeAgent(agentExec, pipelineInput, analysisResult);
            if (response) {
              responses.push(response);
              pipelineInput = { ...pipelineInput, previousResponse: response };
            }
          }
          break;

        case 'conditional':
          // 根据条件决定执行哪些Agent
          for (const agentExec of phase.agents) {
            if (this.shouldExecuteAgent(agentExec, analysisResult)) {
              const response = await this.executeAgent(agentExec, request, analysisResult);
              if (response) responses.push(response);
            }
          }
          break;
      }

      const executionTime = Date.now() - startTime;
      console.log(`⚡ [智能调度] 阶段 ${phase.name} 完成: ${responses.length}个响应, 用时${executionTime}ms`);

    } catch (error) {
      console.error(`❌ [智能调度] 阶段 ${phase.name} 执行失败:`, error);
    }

    return responses;
  }

  /**
   * 执行单个Agent
   */
  private async executeAgent(
    agentExecution: any,
    input: any,
    analysisResult: SceneAnalysisResult
  ): Promise<ChatbotResponse | null> {
    const agent = this.agents.get(agentExecution.agentId);
    if (!agent) {
      console.warn(`⚠️ Agent ${agentExecution.agentId} 未找到`);
      return null;
    }

    try {
      console.log(`🤖 [智能调度] 执行Agent: ${agent.id}`);
      
      const result = await agent.execute({
        ...input,
        expectedRole: agentExecution.expectedRole,
        analysisResult
      });

      if (result.success && result.data) {
        return {
          agentName: agent.id,
          content: result.data.content || result.data.toString(),
          timestamp: new Date(),
          confidence: this.calculateAgentConfidence(result, analysisResult)
        };
      }

      return null;
    } catch (error) {
      console.error(`❌ Agent ${agent.id} 执行失败:`, error);
      
      // 根据重试策略决定是否重试
      if (agentExecution.retryPolicy && agentExecution.retryPolicy.maxAttempts > 1) {
        console.log(`🔄 重试Agent: ${agent.id}`);
        await new Promise(resolve => setTimeout(resolve, agentExecution.retryPolicy.backoffMs));
        // 这里可以实现重试逻辑
      }
      
      return null;
    }
  }

  /**
   * 检查执行条件
   */
  private checkExecutionConditions(conditions: any[], analysisResult: SceneAnalysisResult): boolean {
    return conditions.every(condition => {
      switch (condition.type) {
        case 'scene_confidence':
          return analysisResult.confidence >= condition.threshold;
        case 'agent_availability':
          return this.agents.size >= condition.threshold;
        default:
          return true;
      }
    });
  }

  /**
   * 判断是否应该执行特定Agent
   */
  private shouldExecuteAgent(agentExecution: any, analysisResult: SceneAnalysisResult): boolean {
    // 基于分析结果的条件判断
    if (analysisResult.userIntent.urgencyLevel > 0.8 && agentExecution.expectedRole !== 'rapid_responder') {
      return false;
    }
    return true;
  }

  /**
   * 计算Agent置信度
   */
  private calculateAgentConfidence(result: AgentResult, analysisResult: SceneAnalysisResult): number {
    let confidence = 0.7; // 基础置信度
    
    // 基于场景分析置信度调整
    confidence *= analysisResult.confidence;
    
    // 基于执行成功与否调整
    if (result.success) {
      confidence = Math.min(confidence + 0.1, 1.0);
    }
    
    return confidence;
  }

  /**
   * 简单回退执行
   */
  private async fallbackExecution(
    request: GroupChatRequest,
    analysisResult: SceneAnalysisResult
  ): Promise<{ responses: ChatbotResponse[]; agentsUsed: string[]; quality: number }> {
    console.log('🔄 [智能调度] 使用回退执行...');
    
    // 选择1-2个可用Agent进行简单执行
    const availableAgents = this.getRegisteredAgents().slice(0, 2);
    const responses: ChatbotResponse[] = [];
    
    for (const agent of availableAgents) {
      try {
        const result = await agent.execute({
          request,
          analysisResult,
          availableAgents: request.availableAgents
        });
        
        if (result.success && result.data) {
          responses.push({
            agentName: agent.id,
            content: result.data.content || '简单回复',
            timestamp: new Date(),
            confidence: 0.6
          });
        }
      } catch (error) {
        console.error(`❌ 回退执行Agent ${agent.id} 失败:`, error);
      }
    }

    return {
      responses,
      agentsUsed: availableAgents.map(a => a.id),
      quality: 0.6
    };
  }

  /**
   * 启动总线系统
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Agent总线已在运行');
      return;
    }

    console.log('🚀 启动Agent总线系统...');
    
    // 启动所有已注册的Agent
    const startPromises = Array.from(this.agents.values()).map(agent => 
      agent.start().catch(error => 
        console.error(`Agent [${agent.id}] 启动失败:`, error)
      )
    );

    await Promise.allSettled(startPromises);
    
    this.isRunning = true;
    console.log('✅ Agent总线系统启动完成');
  }

  /**
   * 停止总线系统
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('⚠️ Agent总线未在运行');
      return;
    }

    console.log('🛑 停止Agent总线系统...');
    
    // 停止所有Agent
    const stopPromises = Array.from(this.agents.values()).map(agent => 
      agent.stop().catch(error => 
        console.error(`Agent [${agent.id}] 停止失败:`, error)
      )
    );

    await Promise.allSettled(stopPromises);
    
    this.isRunning = false;
    console.log('✅ Agent总线系统已停止');
  }

  /**
   * 获取系统状态
   */
  async getSystemStatus(): Promise<{
    isRunning: boolean;
    registeredAgents: number;
    agentHealth: { [agentId: string]: any };
  }> {
    const agentHealth: { [agentId: string]: any } = {};
    
    for (const [id, agent] of this.agents) {
      try {
        agentHealth[id] = await agent.healthCheck();
      } catch (error) {
        agentHealth[id] = { status: 'error', error: error instanceof Error ? error.message : String(error) };
      }
    }

    return {
      isRunning: this.isRunning,
      registeredAgents: this.agents.size,
      agentHealth
    };
  }

  // ============= 消息路由和结果聚合集成方法 =============

  /**
   * 广播场景分析结果给所有Agent
   */
  private async broadcastSceneAnalysis(analysisResult: SceneAnalysisResult): Promise<void> {
    console.log('📡 [消息路由] 广播场景分析结果...');
    
    const message: AgentMessage = {
      id: `scene_analysis_${Date.now()}`,
      type: 'scene_analysis_result',
      payload: analysisResult,
      metadata: {
        timestamp: new Date(),
        sender: 'agent-bus',
        priority: 0.9
      }
    };

    const routingContext: RoutingContext = {
      originalMessage: message,
      sceneAnalysis: analysisResult,
      conversationId: 'current', // 这里应该传入实际的conversationId
      availableAgents: this.getRegisteredAgents(),
      executionHistory: []
    };

    try {
      await messageRouter.routeMessage(message, routingContext);
    } catch (error) {
      console.warn('⚠️ [消息路由] 场景分析广播失败:', error);
    }
  }

  /**
   * 增强版阶段执行，集成消息路由
   */
  private async executePhaseWithRouting(
    phase: ExecutionPhase,
    request: GroupChatRequest,
    analysisResult: SceneAnalysisResult
  ): Promise<AgentResult[]> {
    const results: AgentResult[] = [];
    const startTime = Date.now();

    try {
      console.log(`⚡ [增强执行] 开始阶段: ${phase.name}，模式: ${phase.executionMode}`);

      switch (phase.executionMode) {
        case 'sequential':
          for (const agentExec of phase.agents) {
            const result = await this.executeAgentWithRouting(agentExec, request, analysisResult);
            if (result) results.push(result);
          }
          break;

        case 'parallel':
          const parallelPromises = phase.agents.map(agentExec => 
            this.executeAgentWithRouting(agentExec, request, analysisResult)
          );
          const parallelResults = await Promise.allSettled(parallelPromises);
          parallelResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value) {
              results.push(result.value);
            }
          });
          break;

        case 'pipeline':
          const pipelineContext = { request, analysisResult, previousResults: [] };
          for (const agentExec of phase.agents) {
            const result = await this.executeAgentWithRouting(agentExec, pipelineContext, analysisResult);
            if (result) {
              results.push(result);
              pipelineContext.previousResults.push(result);
            }
          }
          break;

        case 'conditional':
          for (const agentExec of phase.agents) {
            if (this.shouldExecuteAgent(agentExec, analysisResult)) {
              const result = await this.executeAgentWithRouting(agentExec, request, analysisResult);
              if (result) results.push(result);
            }
          }
          break;
      }

      const executionTime = Date.now() - startTime;
      console.log(`✅ [增强执行] 阶段 ${phase.name} 完成: ${results.length}个结果, 用时${executionTime}ms`);

    } catch (error) {
      console.error(`❌ [增强执行] 阶段 ${phase.name} 执行失败:`, error);
    }

    return results;
  }

  /**
   * 增强版Agent执行，集成消息路由
   */
  private async executeAgentWithRouting(
    agentExecution: any,
    input: any,
    analysisResult: SceneAnalysisResult
  ): Promise<AgentResult | null> {
    const agent = this.agents.get(agentExecution.agentId);
    if (!agent) {
      console.warn(`⚠️ Agent ${agentExecution.agentId} 未找到`);
      return null;
    }

    try {
      console.log(`🤖 [增强执行] 执行Agent: ${agent.id} (角色: ${agentExecution.expectedRole})`);
      
      const executionStartTime = Date.now();
      
      // 构建正确的执行输入数据结构
      const executionInput = {
        request: input, // GroupChatRequest
        analysisResult,
        availableAgents: input.availableAgents,
        expectedRole: agentExecution.expectedRole
      };


      // 直接执行Agent（使用正确的数据结构）
      const result = await agent.execute(executionInput);

      const executionTime = Date.now() - executionStartTime;

      if (result.success) {
        return result;
      }

      return null;
    } catch (error) {
      console.error(`❌ Agent ${agent.id} 执行失败:`, error);
      
      // 发送错误消息
      const errorMessage: AgentMessage = {
        id: `exec_error_${agent.id}_${Date.now()}`,
        type: 'execution_error',
        payload: {
          agentId: agent.id,
          error: error instanceof Error ? error.message : String(error)
        },
        metadata: {
          timestamp: new Date(),
          sender: agent.id,
          priority: 0.9
        }
      };

      const routingContext: RoutingContext = {
        originalMessage: errorMessage,
        sceneAnalysis: analysisResult,
        conversationId: input.request?.conversationId || 'unknown',
        availableAgents: this.getRegisteredAgents(),
        executionHistory: []
      };

      await messageRouter.routeMessage(errorMessage, routingContext);
      
      // 根据重试策略决定是否重试
      if (agentExecution.retryPolicy && agentExecution.retryPolicy.maxAttempts > 1) {
        console.log(`🔄 重试Agent: ${agent.id}`);
        await new Promise(resolve => setTimeout(resolve, agentExecution.retryPolicy.backoffMs));
        // 这里可以实现重试逻辑
      }
      
      return null;
    }
  }

  /**
   * 聚合Agent执行结果
   */
  private async aggregateResults(
    agentResults: AgentResult[],
    analysisResult: SceneAnalysisResult,
    request: GroupChatRequest,
    executionMetrics: ExecutionMetrics
  ): Promise<any> {
    console.log(`🔄 [结果聚合] 开始聚合 ${agentResults.length} 个Agent结果`);

    const aggregationContext: AggregationContext = {
      sceneAnalysis: analysisResult,
      conversationId: request.conversationId,
      originalUserMessage: request.userMessage,
      executionMetrics,
      qualityRequirements: {
        minimumScore: 0.7,
        requireCoherence: true,
        requireCompleteness: true,
        requireRelevance: true,
        maxLength: 500,
        minLength: 20
      }
    };

    try {
      const aggregationResult = await resultAggregator.aggregateResults(agentResults, aggregationContext);
      
      // 发送聚合完成消息
      const aggregationMessage: AgentMessage = {
        id: `aggregation_complete_${Date.now()}`,
        type: 'aggregation_completed',
        payload: {
          result: aggregationResult,
          originalRequest: request
        },
        metadata: {
          timestamp: new Date(),
          sender: 'result-aggregator',
          priority: 0.7
        }
      };

      const routingContext: RoutingContext = {
        originalMessage: aggregationMessage,
        sceneAnalysis: analysisResult,
        conversationId: request.conversationId,
        availableAgents: this.getRegisteredAgents(),
        executionHistory: []
      };

      await messageRouter.routeMessage(aggregationMessage, routingContext);

      return aggregationResult;
    } catch (error) {
      console.error('❌ [结果聚合] 聚合失败:', error);
      
      // 返回简单的回退聚合结果
      return {
        success: agentResults.length > 0,
        finalResponses: agentResults
          .filter(r => r.success && r.data)
          .map(r => ({
            agentName: 'agent',
            content: r.data.content || '响应内容',
            timestamp: new Date(),
            confidence: 0.6
          })),
        qualityScore: 0.6,
        confidence: 0.6,
        metadata: {
          strategy: 'fallback',
          totalAgents: agentResults.length,
          successfulAgents: agentResults.filter(r => r.success).length,
          aggregationTime: 0,
          qualityBreakdown: {
            coherence: 0.6,
            completeness: 0.6,
            relevance: 0.6,
            diversity: 0.6,
            emotional_alignment: 0.6
          }
        }
      };
    }
  }
}

// ============= 导出默认实例 =============

// 创建全局Agent总线实例
const agentBus = new IntelligentAgentBus();

export default agentBus;