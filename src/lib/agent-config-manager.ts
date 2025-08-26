import { LLMConfig, LLMProvider } from '@/types/llm';
import LLMConfigManager from './llm-config';
import singleProviderConfig from '../../config/single-provider-agents.json';

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
 * Agent配置管理器
 * 支持单一厂家多Agent和多厂家模式
 */
export class AgentConfigManager {
  private static useSingleProvider = true; // 开发阶段使用单一厂家
  
  /**
   * 获取Agent配置
   */
  static getAgentConfig(roleTag: string): {
    agent: AgentDefinition;
    llmConfig: LLMConfig;
  } {
    if (this.useSingleProvider) {
      return this.getSingleProviderAgent(roleTag);
    } else {
      return this.getMultiProviderAgent(roleTag);
    }
  }

  /**
   * 单一厂家模式 - 从配置文件获取
   */
  private static getSingleProviderAgent(roleTag: string): {
    agent: AgentDefinition;
    llmConfig: LLMConfig;
  } {
    const agent = singleProviderConfig.agents.find(a => a.roleTag === roleTag);
    
    if (!agent) {
      throw new Error(`Agent with roleTag ${roleTag} not found in single provider config`);
    }

    const llmConfig = LLMConfigManager.buildLLMConfig(
      singleProviderConfig.provider as LLMProvider,
      singleProviderConfig.model,
      {
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
      }
    );

    return {
      agent: agent as AgentDefinition,
      llmConfig,
    };
  }

  /**
   * 多厂家模式 - 从数据库获取（生产环境）
   */
  private static getMultiProviderAgent(roleTag: string): {
    agent: AgentDefinition;
    llmConfig: LLMConfig;
  } {
    // 这里会从数据库获取配置
    // 暂时使用默认配置
    const llmConfig = LLMConfigManager.getConfigForAgent(roleTag);
    
    const agent: AgentDefinition = {
      roleTag,
      name: `Agent ${roleTag}`,
      systemPrompt: `你是一个AI助手，角色是${roleTag}。`,
      temperature: 0.7,
      maxTokens: 1000,
      order: 1,
    };

    return { agent, llmConfig };
  }

  /**
   * 获取流程配置
   */
  static getFlowConfig(mode: string): FlowDefinition | null {
    if (this.useSingleProvider) {
      return singleProviderConfig.flows.find(f => f.mode === mode) as FlowDefinition || null;
    } else {
      // 从数据库获取流程配置
      return null;
    }
  }

  /**
   * 获取所有可用的Agent
   */
  static getAllAgents(): AgentDefinition[] {
    if (this.useSingleProvider) {
      return singleProviderConfig.agents as AgentDefinition[];
    } else {
      // 从数据库获取
      return [];
    }
  }

  /**
   * 获取所有可用的流程
   */
  static getAllFlows(): FlowDefinition[] {
    if (this.useSingleProvider) {
      return singleProviderConfig.flows as FlowDefinition[];
    } else {
      // 从数据库获取
      return [];
    }
  }

  /**
   * 切换模式
   */
  static setSingleProviderMode(enabled: boolean) {
    this.useSingleProvider = enabled;
  }

  /**
   * 检查是否为单一厂家模式
   */
  static isSingleProviderMode(): boolean {
    return this.useSingleProvider;
  }

  /**
   * 获取当前使用的厂家信息
   */
  static getCurrentProvider(): { provider: LLMProvider; model: string } {
    if (this.useSingleProvider) {
      return {
        provider: singleProviderConfig.provider as LLMProvider,
        model: singleProviderConfig.model,
      };
    } else {
      return {
        provider: 'openai',
        model: 'gpt-4o-mini',
      };
    }
  }
}
