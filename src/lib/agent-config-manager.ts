import { LLMConfig, LLMProvider } from '@/types/llm';
import LLMConfigManager from './llm-config';
import prisma from './db';

export interface AgentDefinition {
  roleTag: string;
  name: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
  order: number;
}

export interface FlowDefinition {
  name: string;
  mode: string;
  steps: string[];
  randomOrder?: boolean;
  dynamic?: boolean;
}

/**
 * Agent配置管理器 - 完全基于数据库
 */
export class AgentConfigManager {
  /**
   * 获取Agent配置 (从数据库)
   */
  static async getAgentConfig(roleTag: string): Promise<{
    agent: AgentDefinition;
    llmConfig: LLMConfig;
  }> {
    // 从数据库获取智能体
    const dbAgent = await prisma.agent.findFirst({
      where: { 
        roleTag,
        enabled: true 
      }
    });

    if (!dbAgent) {
      throw new Error(`Agent not found: ${roleTag}`);
    }

    // 构建AgentDefinition
    const agent: AgentDefinition = {
      roleTag: dbAgent.roleTag,
      name: dbAgent.name,
      systemPrompt: dbAgent.prompt,
      temperature: dbAgent.temperature,
      maxTokens: dbAgent.maxTokens,
      order: dbAgent.order,
    };

    // 获取LLM配置
    const llmConfig = await LLMConfigManager.getConfigForAgent(roleTag);
    
    console.log(`🔧 [AgentConfigManager] Agent: ${roleTag}, LLM Config:`, {
      provider: llmConfig.provider,
      model: llmConfig.model,
      hasApiKey: !!llmConfig.apiKey,
      baseURL: llmConfig.baseURL
    });

    return {
      agent,
      llmConfig
    };
  }

  /**
   * 获取Agent配置 (同步版本 - 已废弃，请使用getAgentConfig)
   */
  static async getAgentConfigSync(roleTag: string): Promise<{
    agent: AgentDefinition;
    llmConfig: LLMConfig;
  }> {
    console.warn('getAgentConfigSync is deprecated, use getAgentConfig instead');
    return this.getAgentConfig(roleTag);
  }

  /**
   * 检查是否使用单一提供商模式 - 简化版本
   */
  static isSingleProviderMode(): boolean {
    // 简化：始终返回false，使用数据库模式
    return false;
  }

  /**
   * 获取所有可用的智能体
   */
  static async getAllAgents(): Promise<AgentDefinition[]> {
    const dbAgents = await prisma.agent.findMany({
      where: { enabled: true },
      orderBy: { order: 'asc' }
    });

    return dbAgents.map(agent => ({
      roleTag: agent.roleTag,
      name: agent.name,
      systemPrompt: agent.prompt,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      order: agent.order,
    }));
  }

  /**
   * 获取流程配置 - 简化版本
   */
  static getFlowConfig(mode: string): FlowDefinition | null {
    // 简化的默认流程配置
    const defaultFlows: Record<string, FlowDefinition> = {
      smart: {
        name: '智能模式',
        mode: 'smart',
        steps: ['SMART'],
        dynamic: true,
      },
      natural: {
        name: '自然模式',
        mode: 'natural',
        steps: ['NATURAL'],
        randomOrder: true,
      },
      empathy: {
        name: '共情模式',
        mode: 'empathy',
        steps: ['EMPATHY'],
      },
    };

    return defaultFlows[mode] || null;
  }

  /**
   * 获取所有流程配置
   */
  static getAllFlows(): FlowDefinition[] {
    return [
      {
        name: '智能模式',
        mode: 'smart',
        steps: ['SMART'],
        dynamic: true,
      },
      {
        name: '自然模式',
        mode: 'natural',
        steps: ['NATURAL'],
        randomOrder: true,
      },
      {
        name: '共情模式',
        mode: 'empathy',
        steps: ['EMPATHY'],
      },
    ];
  }

  /**
   * 验证配置
   */
  static async validateConfiguration(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    try {
      // 检查是否有可用的智能体
      const agents = await prisma.agent.findMany({
        where: { enabled: true }
      });

      if (agents.length === 0) {
        errors.push('No enabled agents found in database');
      }

      // 检查LLM配置
      const llmValidation = await LLMConfigManager.validateConfiguration();
      errors.push(...llmValidation.errors);

    } catch (error) {
      errors.push(`Database connection error: ${(error as Error).message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default AgentConfigManager;