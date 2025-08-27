import { LLMConfig, LLMProvider } from '@/types/llm';
import LLMConfigManager from './llm-config';
import prisma from './db';
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
   * 获取Agent配置 (异步版本，支持数据库)
   */
  static async getAgentConfig(roleTag: string): Promise<{
    agent: AgentDefinition;
    llmConfig: LLMConfig;
  }> {
    if (this.useSingleProvider) {
      return this.getSingleProviderAgent(roleTag);
    } else {
      return await this.getDatabaseAgent(roleTag);
    }
  }

  /**
   * 获取Agent配置 (同步版本，向后兼容)
   */
  static getAgentConfigSync(roleTag: string): {
    agent: AgentDefinition;
    llmConfig: LLMConfig;
  } {
    if (this.useSingleProvider) {
      return this.getSingleProviderAgent(roleTag);
    } else {
      // 如果不是单一厂家模式但调用同步方法，回退到默认配置
      console.warn(`Warning: Using sync method for multi-provider mode. Falling back to default config for ${roleTag}`);
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
  private static async getDatabaseAgent(roleTag: string): Promise<{
    agent: AgentDefinition;
    llmConfig: LLMConfig;
  }> {
    try {
      const dbAgent = await prisma.agent.findUnique({
        where: { 
          roleTag,
          enabled: true 
        },
        include: {
          model: {
            include: {
              provider: true
            }
          }
        }
      });

      if (!dbAgent) {
        throw new Error(`Agent with roleTag ${roleTag} not found in database`);
      }

      // 构建Agent定义
      const agent: AgentDefinition = {
        roleTag: dbAgent.roleTag,
        name: dbAgent.name,
        systemPrompt: dbAgent.prompt,
        temperature: dbAgent.temperature,
        maxTokens: dbAgent.maxTokens,
        order: dbAgent.order,
      };

      // 构建LLM配置
      let llmConfig: LLMConfig;
      
      if (dbAgent.model && dbAgent.model.provider) {
        // 从数据库模型构建LLM配置
        llmConfig = LLMConfigManager.buildLLMConfig(
          dbAgent.model.provider.code as LLMProvider,
          dbAgent.model.code,
          {
            temperature: dbAgent.temperature,
            maxTokens: dbAgent.maxTokens,
          }
        );
      } else {
        // 如果没有关联模型，使用默认配置
        console.warn(`Agent ${roleTag} has no associated model, using default LLM config`);
        llmConfig = LLMConfigManager.getConfigForAgent(roleTag);
      }

      return { agent, llmConfig };

    } catch (error) {
      console.error(`Error loading agent ${roleTag} from database:`, error);
      // 回退到默认配置
      return this.getMultiProviderAgent(roleTag);
    }
  }

  /**
   * 多厂家模式回退方法 - 使用默认配置
   */
  private static getMultiProviderAgent(roleTag: string): {
    agent: AgentDefinition;
    llmConfig: LLMConfig;
  } {
    // 回退到默认配置
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
   * 获取流程配置 (异步版本，支持数据库)
   */
  static async getFlowConfig(mode: string): Promise<FlowDefinition | null> {
    if (this.useSingleProvider) {
      return singleProviderConfig.flows.find(f => f.mode === mode) as FlowDefinition || null;
    } else {
      return await this.getDatabaseFlow(mode);
    }
  }

  /**
   * 获取流程配置 (同步版本，向后兼容)
   */
  static getFlowConfigSync(mode: string): FlowDefinition | null {
    if (this.useSingleProvider) {
      return singleProviderConfig.flows.find(f => f.mode === mode) as FlowDefinition || null;
    } else {
      console.warn(`Warning: Using sync method for database flow config. Mode: ${mode}`);
      return null;
    }
  }

  /**
   * 从数据库获取流程配置
   */
  private static async getDatabaseFlow(mode: string): Promise<FlowDefinition | null> {
    try {
      const dbFlow = await prisma.flow.findUnique({
        where: { 
          mode,
          enabled: true 
        }
      });

      if (!dbFlow) {
        console.warn(`Flow with mode ${mode} not found in database`);
        return null;
      }

      // 解析steps JSON数据
      let steps: string[] = [];
      try {
        if (Array.isArray(dbFlow.steps)) {
          steps = (dbFlow.steps as any[]).map(step => 
            typeof step === 'string' ? step : step.roleTag
          );
        }
      } catch (error) {
        console.error(`Error parsing flow steps for ${mode}:`, error);
        return null;
      }

      return {
        name: dbFlow.name,
        mode: dbFlow.mode,
        steps,
        randomOrder: dbFlow.randomOrder,
        dynamic: dbFlow.dynamic
      };

    } catch (error) {
      console.error(`Error loading flow ${mode} from database:`, error);
      return null;
    }
  }

  /**
   * 获取所有可用的Agent (异步版本，支持数据库)
   */
  static async getAllAgents(): Promise<AgentDefinition[]> {
    if (this.useSingleProvider) {
      return singleProviderConfig.agents as AgentDefinition[];
    } else {
      return await this.getDatabaseAgents();
    }
  }

  /**
   * 获取所有可用的Agent (同步版本，向后兼容)
   */
  static getAllAgentsSync(): AgentDefinition[] {
    if (this.useSingleProvider) {
      return singleProviderConfig.agents as AgentDefinition[];
    } else {
      console.warn('Warning: Using sync method for database agents');
      return [];
    }
  }

  /**
   * 从数据库获取所有Agent
   */
  private static async getDatabaseAgents(): Promise<AgentDefinition[]> {
    try {
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

    } catch (error) {
      console.error('Error loading agents from database:', error);
      return [];
    }
  }

  /**
   * 获取所有可用的流程 (异步版本，支持数据库)
   */
  static async getAllFlows(): Promise<FlowDefinition[]> {
    if (this.useSingleProvider) {
      return singleProviderConfig.flows as FlowDefinition[];
    } else {
      return await this.getDatabaseFlows();
    }
  }

  /**
   * 获取所有可用的流程 (同步版本，向后兼容)
   */
  static getAllFlowsSync(): FlowDefinition[] {
    if (this.useSingleProvider) {
      return singleProviderConfig.flows as FlowDefinition[];
    } else {
      console.warn('Warning: Using sync method for database flows');
      return [];
    }
  }

  /**
   * 从数据库获取所有流程
   */
  private static async getDatabaseFlows(): Promise<FlowDefinition[]> {
    try {
      const dbFlows = await prisma.flow.findMany({
        where: { enabled: true },
        orderBy: { name: 'asc' }
      });

      return dbFlows.map(flow => {
        // 解析steps JSON数据
        let steps: string[] = [];
        try {
          if (Array.isArray(flow.steps)) {
            steps = (flow.steps as any[]).map(step => 
              typeof step === 'string' ? step : step.roleTag
            );
          }
        } catch (error) {
          console.error(`Error parsing flow steps for ${flow.mode}:`, error);
        }

        return {
          name: flow.name,
          mode: flow.mode,
          steps,
          randomOrder: flow.randomOrder,
          dynamic: flow.dynamic
        };
      });

    } catch (error) {
      console.error('Error loading flows from database:', error);
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
   * 切换到数据库模式
   */
  static enableDatabaseMode() {
    this.useSingleProvider = false;
    console.log('🔄 AgentConfigManager switched to database mode');
  }

  /**
   * 切换到JSON配置模式
   */
  static enableJsonMode() {
    this.useSingleProvider = true;
    console.log('🔄 AgentConfigManager switched to JSON config mode');
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
