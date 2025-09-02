/**
 * 📬 消息路由系统
 * 
 * 实现Agent间智能消息传递和路由功能
 * 支持点对点、广播、条件路由等多种模式
 */

import { BaseAgent, AgentMessage, NextAction } from './intelligent-agent-bus';
import { SceneAnalysisResult } from './agents/scene-analyzer-agent';

// ============= 路由配置接口 =============

export interface RoutingRule {
  id: string;
  priority: number; // 0-1，优先级
  conditions: RoutingCondition[];
  targets: RoutingTarget[];
  transformations?: MessageTransformation[];
  middleware?: string[]; // 中间件处理链
}

export interface RoutingCondition {
  type: 'sender' | 'message_type' | 'payload_field' | 'scene_type' | 'agent_capability' | 'custom';
  operator: 'equals' | 'contains' | 'matches' | 'gt' | 'lt' | 'in' | 'custom';
  value: any;
  customValidator?: (message: AgentMessage, context: RoutingContext) => boolean;
}

export interface RoutingTarget {
  type: 'single' | 'multiple' | 'broadcast' | 'conditional';
  agentIds?: string[];
  agentSelector?: (availableAgents: BaseAgent[], context: RoutingContext) => BaseAgent[];
  deliveryMode: 'immediate' | 'delayed' | 'scheduled';
  delayMs?: number;
}

export interface MessageTransformation {
  type: 'filter' | 'augment' | 'convert' | 'validate';
  transformer: (message: AgentMessage, context: RoutingContext) => AgentMessage | null;
}

export interface RoutingContext {
  originalMessage: AgentMessage;
  sceneAnalysis?: SceneAnalysisResult;
  conversationId: string;
  availableAgents: BaseAgent[];
  executionHistory: RoutingExecution[];
}

export interface RoutingExecution {
  messageId: string;
  ruleId: string;
  timestamp: Date;
  success: boolean;
  deliveredTo: string[];
  executionTime: number;
  errors?: string[];
}

// ============= 消息路由器主类 =============

export class MessageRouter {
  private routingRules: Map<string, RoutingRule> = new Map();
  private middleware: Map<string, MessageMiddleware> = new Map();
  private executionHistory: RoutingExecution[] = [];
  private messageQueue: QueuedMessage[] = [];
  private isProcessing: boolean = false;

  constructor() {
    this.initializeDefaultRules();
    this.initializeDefaultMiddleware();
    console.log('📬 消息路由系统初始化完成');
  }

  /**
   * 初始化默认路由规则
   */
  private initializeDefaultRules(): void {
    // 场景分析结果广播规则
    this.addRoutingRule({
      id: 'scene_analysis_broadcast',
      priority: 0.9,
      conditions: [{
        type: 'message_type',
        operator: 'equals',
        value: 'scene_analysis_result'
      }],
      targets: [{
        type: 'broadcast',
        deliveryMode: 'immediate'
      }],
      middleware: ['scene_enrichment', 'priority_adjustment']
    });

    // 质量评估路由规则
    this.addRoutingRule({
      id: 'quality_assessment_routing',
      priority: 0.8,
      conditions: [{
        type: 'message_type',
        operator: 'equals',
        value: 'response_batch'
      }],
      targets: [{
        type: 'single',
        agentSelector: (agents) => agents.filter(a => a.capabilities.includes('quality_assessment')),
        deliveryMode: 'immediate'
      }]
    });

    // 执行结果聚合规则
    this.addRoutingRule({
      id: 'execution_result_aggregation',
      priority: 0.7,
      conditions: [{
        type: 'message_type',
        operator: 'equals',
        value: 'execution_completed'
      }],
      targets: [{
        type: 'single',
        agentSelector: (agents) => agents.filter(a => a.capabilities.includes('result_aggregation')),
        deliveryMode: 'immediate'
      }]
    });

    // 错误恢复路由
    this.addRoutingRule({
      id: 'error_recovery_routing',
      priority: 0.6,
      conditions: [{
        type: 'message_type',
        operator: 'equals',
        value: 'execution_error'
      }],
      targets: [{
        type: 'single',
        agentSelector: (agents) => agents.filter(a => a.capabilities.includes('error_recovery')),
        deliveryMode: 'delayed',
        delayMs: 1000
      }]
    });

    // 执行请求直接路由规则
    this.addRoutingRule({
      id: 'execution_request_direct',
      priority: 0.95, // 高优先级，确保优先匹配
      conditions: [{
        type: 'message_type',
        operator: 'equals',
        value: 'execution_request'
      }],
      targets: [{
        type: 'single',
        agentSelector: (agents, context) => {
          // 从消息元数据中获取目标Agent ID
          const targetAgentId = context.originalMessage.metadata?.recipient;
          return targetAgentId ? agents.filter(a => a.id === targetAgentId) : [];
        },
        deliveryMode: 'immediate'
      }]
    });

    console.log(`📋 默认路由规则已加载: ${this.routingRules.size} 个规则`);
  }

  /**
   * 初始化默认中间件
   */
  private initializeDefaultMiddleware(): void {
    // 场景增强中间件
    this.addMiddleware('scene_enrichment', new SceneEnrichmentMiddleware());
    
    // 优先级调整中间件
    this.addMiddleware('priority_adjustment', new PriorityAdjustmentMiddleware());
    
    // 消息验证中间件
    this.addMiddleware('message_validation', new MessageValidationMiddleware());
    
    // 性能监控中间件
    this.addMiddleware('performance_monitoring', new PerformanceMonitoringMiddleware());

    console.log(`🔧 默认中间件已加载: ${this.middleware.size} 个中间件`);
  }

  /**
   * 路由消息到目标Agent
   */
  async routeMessage(
    message: AgentMessage, 
    context: RoutingContext
  ): Promise<RoutingExecution[]> {
    console.log(`📬 [消息路由] 开始路由消息: ${message.id}`);

    const executions: RoutingExecution[] = [];
    const startTime = Date.now();

    try {
      // 第一步：找到匹配的路由规则
      const matchingRules = await this.findMatchingRules(message, context);
      console.log(`🎯 [消息路由] 找到 ${matchingRules.length} 个匹配规则`);

      if (matchingRules.length === 0) {
        console.warn('⚠️ [消息路由] 没有找到匹配的路由规则，使用默认路由');
        const defaultExecution = await this.executeDefaultRouting(message, context);
        if (defaultExecution) executions.push(defaultExecution);
        return executions;
      }

      // 第二步：按优先级排序并执行路由规则
      matchingRules.sort((a, b) => b.priority - a.priority);

      for (const rule of matchingRules) {
        try {
          console.log(`⚡ [消息路由] 执行路由规则: ${rule.id}`);
          const execution = await this.executeRoutingRule(rule, message, context);
          executions.push(execution);

          // 如果是高优先级规则且执行成功，可以选择跳过其他规则
          if (rule.priority > 0.8 && execution.success) {
            console.log(`✅ [消息路由] 高优先级规则执行成功，跳过其他规则`);
            break;
          }
        } catch (error) {
          console.error(`❌ [消息路由] 路由规则 ${rule.id} 执行失败:`, error);
          executions.push({
            messageId: message.id,
            ruleId: rule.id,
            timestamp: new Date(),
            success: false,
            deliveredTo: [],
            executionTime: Date.now() - startTime,
            errors: [error instanceof Error ? error.message : String(error)]
          });
        }
      }

      // 记录执行历史
      this.executionHistory.push(...executions);

      console.log(`✅ [消息路由] 路由完成: ${executions.length} 次执行`);
      return executions;

    } catch (error) {
      console.error('❌ [消息路由] 路由失败:', error);
      return [{
        messageId: message.id,
        ruleId: 'error',
        timestamp: new Date(),
        success: false,
        deliveredTo: [],
        executionTime: Date.now() - startTime,
        errors: [error instanceof Error ? error.message : String(error)]
      }];
    }
  }

  /**
   * 队列化消息处理
   */
  async queueMessage(message: AgentMessage, context: RoutingContext): Promise<void> {
    const queuedMessage: QueuedMessage = {
      message,
      context,
      timestamp: new Date(),
      attempts: 0,
      maxAttempts: 3
    };

    this.messageQueue.push(queuedMessage);
    console.log(`📥 [消息队列] 消息已入队: ${message.id}, 队列长度: ${this.messageQueue.length}`);

    // 触发队列处理
    this.processQueue();
  }

  /**
   * 处理消息队列
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log(`🔄 [消息队列] 开始处理队列, ${this.messageQueue.length} 个消息`);

    while (this.messageQueue.length > 0) {
      const queuedMessage = this.messageQueue.shift()!;
      
      try {
        queuedMessage.attempts++;
        const executions = await this.routeMessage(queuedMessage.message, queuedMessage.context);
        
        const hasErrors = executions.some(exec => !exec.success);
        if (hasErrors && queuedMessage.attempts < queuedMessage.maxAttempts) {
          // 重新入队等待重试
          queuedMessage.timestamp = new Date();
          this.messageQueue.push(queuedMessage);
          console.log(`🔄 [消息队列] 消息重试: ${queuedMessage.message.id}, 尝试次数: ${queuedMessage.attempts}`);
        }
        
      } catch (error) {
        console.error(`❌ [消息队列] 处理消息失败: ${queuedMessage.message.id}`, error);
        
        if (queuedMessage.attempts < queuedMessage.maxAttempts) {
          queuedMessage.timestamp = new Date();
          this.messageQueue.push(queuedMessage);
        }
      }

      // 短暂延迟避免过载
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    this.isProcessing = false;
    console.log('✅ [消息队列] 队列处理完成');
  }

  /**
   * 查找匹配的路由规则
   */
  private async findMatchingRules(
    message: AgentMessage, 
    context: RoutingContext
  ): Promise<RoutingRule[]> {
    const matchingRules: RoutingRule[] = [];

    for (const [ruleId, rule] of this.routingRules) {
      try {
        const isMatch = await this.evaluateRuleConditions(rule.conditions, message, context);
        if (isMatch) {
          matchingRules.push(rule);
        }
      } catch (error) {
        console.warn(`⚠️ 规则 ${ruleId} 评估失败:`, error);
      }
    }

    return matchingRules;
  }

  /**
   * 评估路由规则条件
   */
  private async evaluateRuleConditions(
    conditions: RoutingCondition[],
    message: AgentMessage,
    context: RoutingContext
  ): boolean {
    // 所有条件都必须满足（AND逻辑）
    for (const condition of conditions) {
      const isConditionMet = await this.evaluateCondition(condition, message, context);
      if (!isConditionMet) {
        return false;
      }
    }
    return true;
  }

  /**
   * 评估单个条件
   */
  private async evaluateCondition(
    condition: RoutingCondition,
    message: AgentMessage,
    context: RoutingContext
  ): boolean {
    let actualValue: any;

    // 获取实际值
    switch (condition.type) {
      case 'sender':
        actualValue = message.metadata.sender;
        break;
      case 'message_type':
        actualValue = message.type;
        break;
      case 'payload_field':
        actualValue = this.getNestedValue(message.payload, condition.value as string);
        break;
      case 'scene_type':
        actualValue = context.sceneAnalysis?.sceneType;
        break;
      case 'agent_capability':
        // 检查是否有具备特定能力的Agent
        actualValue = context.availableAgents.some(agent => 
          agent.capabilities.includes(condition.value)
        );
        break;
      case 'custom':
        if (condition.customValidator) {
          return condition.customValidator(message, context);
        }
        return false;
      default:
        return false;
    }

    // 评估条件
    switch (condition.operator) {
      case 'equals':
        return actualValue === condition.value;
      case 'contains':
        return String(actualValue).includes(String(condition.value));
      case 'matches':
        return new RegExp(condition.value).test(String(actualValue));
      case 'gt':
        return Number(actualValue) > Number(condition.value);
      case 'lt':
        return Number(actualValue) < Number(condition.value);
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(actualValue);
      default:
        return false;
    }
  }

  /**
   * 执行路由规则
   */
  private async executeRoutingRule(
    rule: RoutingRule,
    message: AgentMessage,
    context: RoutingContext
  ): Promise<RoutingExecution> {
    const startTime = Date.now();
    const execution: RoutingExecution = {
      messageId: message.id,
      ruleId: rule.id,
      timestamp: new Date(),
      success: false,
      deliveredTo: [],
      executionTime: 0,
      errors: []
    };

    try {
      // 第一步：应用消息转换
      let processedMessage = message;
      if (rule.transformations) {
        for (const transformation of rule.transformations) {
          const transformed = transformation.transformer(processedMessage, context);
          if (transformed) {
            processedMessage = transformed;
          }
        }
      }

      // 第二步：应用中间件
      if (rule.middleware) {
        for (const middlewareName of rule.middleware) {
          const middleware = this.middleware.get(middlewareName);
          if (middleware) {
            processedMessage = await middleware.process(processedMessage, context);
          }
        }
      }

      // 第三步：执行路由目标
      for (const target of rule.targets) {
        const targetAgents = await this.selectTargetAgents(target, context);
        
        for (const targetAgent of targetAgents) {
          try {
            await this.deliverMessage(processedMessage, targetAgent, target.deliveryMode, target.delayMs);
            execution.deliveredTo.push(targetAgent.id);
          } catch (deliveryError) {
            execution.errors?.push(`Delivery to ${targetAgent.id} failed: ${deliveryError}`);
          }
        }
      }

      execution.success = execution.deliveredTo.length > 0;
      execution.executionTime = Date.now() - startTime;

    } catch (error) {
      execution.errors?.push(error instanceof Error ? error.message : String(error));
      execution.executionTime = Date.now() - startTime;
    }

    return execution;
  }

  /**
   * 选择目标Agent
   */
  private async selectTargetAgents(
    target: RoutingTarget, 
    context: RoutingContext
  ): Promise<BaseAgent[]> {
    switch (target.type) {
      case 'single':
        if (target.agentIds && target.agentIds.length > 0) {
          const agent = context.availableAgents.find(a => a.id === target.agentIds![0]);
          return agent ? [agent] : [];
        }
        if (target.agentSelector) {
          const selected = target.agentSelector(context.availableAgents, context);
          return selected.slice(0, 1); // 只返回第一个
        }
        return [];

      case 'multiple':
        if (target.agentIds) {
          return context.availableAgents.filter(a => target.agentIds!.includes(a.id));
        }
        if (target.agentSelector) {
          return target.agentSelector(context.availableAgents, context);
        }
        return [];

      case 'broadcast':
        return context.availableAgents;

      case 'conditional':
        // 基于条件动态选择
        if (target.agentSelector) {
          return target.agentSelector(context.availableAgents, context);
        }
        return [];

      default:
        return [];
    }
  }

  /**
   * 投递消息到目标Agent
   */
  private async deliverMessage(
    message: AgentMessage,
    targetAgent: BaseAgent,
    deliveryMode: string,
    delayMs?: number
  ): Promise<void> {
    const deliverFn = async () => {
      console.log(`📨 [消息投递] 投递到 ${targetAgent.id}: ${message.type}`);
      
      // 这里可以实现实际的消息投递逻辑
      // 例如调用targetAgent的某个方法，或者将消息放入Agent的消息队列
      // 当前简化实现，仅记录日志
      
      // 如果Agent有onMessage方法，调用它
      if ('onMessage' in targetAgent && typeof targetAgent.onMessage === 'function') {
        await (targetAgent as any).onMessage(message);
      }
    };

    switch (deliveryMode) {
      case 'immediate':
        await deliverFn();
        break;
      case 'delayed':
        setTimeout(deliverFn, delayMs || 1000);
        break;
      case 'scheduled':
        // 实现调度投递（这里简化为延迟投递）
        setTimeout(deliverFn, delayMs || 5000);
        break;
      default:
        await deliverFn();
    }
  }

  /**
   * 默认路由处理
   */
  private async executeDefaultRouting(
    message: AgentMessage,
    context: RoutingContext
  ): Promise<RoutingExecution> {
    console.log('🔄 [消息路由] 执行默认路由策略');
    
    // 简单的默认路由：发送给第一个可用Agent
    const targetAgent = context.availableAgents[0];
    
    if (!targetAgent) {
      return {
        messageId: message.id,
        ruleId: 'default',
        timestamp: new Date(),
        success: false,
        deliveredTo: [],
        executionTime: 0,
        errors: ['No available agents for default routing']
      };
    }

    await this.deliverMessage(message, targetAgent, 'immediate');

    return {
      messageId: message.id,
      ruleId: 'default',
      timestamp: new Date(),
      success: true,
      deliveredTo: [targetAgent.id],
      executionTime: 0
    };
  }

  // ============= 管理方法 =============

  /**
   * 添加路由规则
   */
  addRoutingRule(rule: RoutingRule): void {
    this.routingRules.set(rule.id, rule);
    console.log(`➕ [路由规则] 添加规则: ${rule.id}`);
  }

  /**
   * 移除路由规则
   */
  removeRoutingRule(ruleId: string): void {
    if (this.routingRules.delete(ruleId)) {
      console.log(`➖ [路由规则] 移除规则: ${ruleId}`);
    }
  }

  /**
   * 添加中间件
   */
  addMiddleware(name: string, middleware: MessageMiddleware): void {
    this.middleware.set(name, middleware);
    console.log(`➕ [中间件] 添加中间件: ${name}`);
  }

  /**
   * 获取路由统计
   */
  getRoutingStats(): {
    totalRules: number;
    totalExecutions: number;
    successRate: number;
    averageExecutionTime: number;
  } {
    const totalExecutions = this.executionHistory.length;
    const successfulExecutions = this.executionHistory.filter(e => e.success).length;
    const averageExecutionTime = totalExecutions > 0 
      ? this.executionHistory.reduce((sum, e) => sum + e.executionTime, 0) / totalExecutions 
      : 0;

    return {
      totalRules: this.routingRules.size,
      totalExecutions,
      successRate: totalExecutions > 0 ? successfulExecutions / totalExecutions : 0,
      averageExecutionTime
    };
  }

  // ============= 辅助方法 =============

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// ============= 支持接口和类型 =============

interface QueuedMessage {
  message: AgentMessage;
  context: RoutingContext;
  timestamp: Date;
  attempts: number;
  maxAttempts: number;
}

// ============= 中间件抽象类 =============

export abstract class MessageMiddleware {
  abstract process(message: AgentMessage, context: RoutingContext): Promise<AgentMessage>;
}

// ============= 具体中间件实现 =============

class SceneEnrichmentMiddleware extends MessageMiddleware {
  async process(message: AgentMessage, context: RoutingContext): Promise<AgentMessage> {
    // 基于场景分析丰富消息内容
    if (context.sceneAnalysis) {
      message.payload.sceneEnrichment = {
        sceneType: context.sceneAnalysis.sceneType,
        emotion: context.sceneAnalysis.emotion,
        confidence: context.sceneAnalysis.confidence,
        interactionStrategy: context.sceneAnalysis.interactionStrategy
      };
    }
    return message;
  }
}

class PriorityAdjustmentMiddleware extends MessageMiddleware {
  async process(message: AgentMessage, context: RoutingContext): Promise<AgentMessage> {
    // 基于场景分析调整消息优先级
    if (context.sceneAnalysis) {
      const urgencyLevel = context.sceneAnalysis.userIntent.urgencyLevel;
      if (urgencyLevel > 0.8) {
        message.metadata.priority = Math.min(message.metadata.priority * 1.5, 1.0);
      }
    }
    return message;
  }
}

class MessageValidationMiddleware extends MessageMiddleware {
  async process(message: AgentMessage, context: RoutingContext): Promise<AgentMessage> {
    // 验证消息格式和内容
    if (!message.id || !message.type) {
      throw new Error('Invalid message format: missing required fields');
    }
    return message;
  }
}

class PerformanceMonitoringMiddleware extends MessageMiddleware {
  async process(message: AgentMessage, context: RoutingContext): Promise<AgentMessage> {
    // 添加性能监控数据
    message.payload.performanceMetrics = {
      routingStartTime: Date.now(),
      contextSize: JSON.stringify(context).length,
      availableAgentCount: context.availableAgents.length
    };
    return message;
  }
}

// 导出默认实例
const messageRouter = new MessageRouter();
export default messageRouter;