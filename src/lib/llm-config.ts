import { LLMConfig, LLMProvider, AgentConfig } from '@/types/llm';
import prisma from './db';

/**
 * LLM配置管理器 - 基于数据库配置
 */
export class LLMConfigManager {

  /**
   * 获取默认配置 - 从数据库获取
   */
  static async getConfig(): Promise<LLMConfig> {
    // 获取第一个活跃的Provider和Model
    const provider = await prisma.lLMProvider.findFirst({
      where: { isActive: true },
      include: {
        models: {
          where: { isActive: true },
          take: 1
        }
      }
    });

    if (!provider || !provider.models[0]) {
      throw new Error('No active LLM provider/model found in database');
    }

    const model = provider.models[0];

    return {
      provider: provider.code as LLMProvider,
      model: model.code,
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl,
      temperature: parseFloat(process.env.DEFAULT_LLM_TEMPERATURE || '0.8'),
      maxTokens: model.maxTokens || 2000,
      timeout: parseInt(process.env.DEFAULT_LLM_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.DEFAULT_LLM_RETRY_ATTEMPTS || '3'),
    };
  }

  /**
   * 根据角色标签获取LLM配置
   */
  static async getConfigForAgent(roleTag: string): Promise<LLMConfig> {
    // 查找Agent及其关联的Model和Provider
    const agent = await prisma.agent.findFirst({
      where: { roleTag, enabled: true },
      include: {
        model: {
          include: {
            provider: true
          }
        }
      }
    });

    console.log(`🔍 [LLMConfigManager] getConfigForAgent(${roleTag}):`, {
      agentFound: !!agent,
      modelFound: !!agent?.model,
      providerFound: !!agent?.model?.provider,
      agentModelId: agent?.modelId,
      modelCode: agent?.model?.code,
      providerCode: agent?.model?.provider?.code
    });

    if (!agent || !agent.model || !agent.model.provider) {
      // 回退到默认配置
      console.warn(`Agent ${roleTag} not found or not properly configured, using default config`);
      return this.getConfig();
    }

    const model = agent.model;
    const provider = agent.model.provider;

    const llmConfig = {
      provider: provider.code as LLMProvider,
      model: model.code,
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl,
      temperature: agent.temperature,
      maxTokens: agent.maxTokens,
      timeout: parseInt(process.env.DEFAULT_LLM_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.DEFAULT_LLM_RETRY_ATTEMPTS || '3'),
    };

    console.log(`🔧 [LLMConfigManager] Generated config for ${roleTag}:`, {
      provider: llmConfig.provider,
      providerType: typeof llmConfig.provider,
      model: llmConfig.model,
      hasApiKey: !!llmConfig.apiKey,
      baseURL: llmConfig.baseURL
    });

    return llmConfig;
  }

  /**
   * 构建LLM配置 - 从数据库获取Provider信息
   */
  static async buildLLMConfig(
    providerCode: string, 
    modelCode: string, 
    options: Partial<LLMConfig> = {}
  ): Promise<LLMConfig> {
    const provider = await prisma.lLMProvider.findFirst({
      where: { code: providerCode, isActive: true },
      include: {
        models: {
          where: { code: modelCode, isActive: true },
          take: 1
        }
      }
    });

    if (!provider || !provider.models[0]) {
      throw new Error(`Provider ${providerCode} or model ${modelCode} not found`);
    }

    const model = provider.models[0];

    return {
      provider: provider.code as LLMProvider,
      model: model.code,
      apiKey: provider.apiKey,
      baseURL: provider.baseUrl,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || model.maxTokens,
      timeout: options.timeout || 30000,
      retryAttempts: options.retryAttempts || 3,
      ...options,
    };
  }

  /**
   * 获取API密钥 - 从数据库获取
   */
  static async getAPIKey(providerCode: string): Promise<string> {
    const provider = await prisma.lLMProvider.findFirst({
      where: { code: providerCode, isActive: true }
    });

    if (!provider || !provider.apiKey) {
      throw new Error(`API key not found for provider: ${providerCode}`);
    }

    return provider.apiKey;
  }

  /**
   * 获取基础URL - 从数据库获取
   */
  static async getBaseUrl(providerCode: string): Promise<string | undefined> {
    const provider = await prisma.lLMProvider.findFirst({
      where: { code: providerCode, isActive: true }
    });
    return provider?.baseUrl;
  }

  /**
   * 获取所有可用的提供商 - 从数据库获取
   */
  static async getAvailableProviders(): Promise<Array<{ id: string; name: string; models: string[] }>> {
    const providers = await prisma.lLMProvider.findMany({
      where: { isActive: true },
      include: {
        models: {
          where: { isActive: true }
        }
      }
    });

    return providers.map(provider => ({
      id: provider.code,
      name: provider.name,
      models: provider.models.map(model => model.code)
    }));
  }

  /**
   * 获取指定提供商的模型列表 - 从数据库获取
   */
  static async getModelsForProvider(providerCode: string): Promise<string[]> {
    const provider = await prisma.lLMProvider.findFirst({
      where: { code: providerCode, isActive: true },
      include: {
        models: {
          where: { isActive: true }
        }
      }
    });
    return provider?.models.map(model => model.code) || [];
  }

  /**
   * 验证配置是否完整 - 检查数据库配置
   */
  static async validateConfiguration(): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      // 检查是否有活跃的Provider
      const activeProviders = await prisma.lLMProvider.findMany({
        where: { isActive: true },
        include: {
          models: {
            where: { isActive: true }
          }
        }
      });

      if (activeProviders.length === 0) {
        errors.push('No active LLM providers found in database');
      } else {
        // 检查每个Provider是否有API密钥和模型
        for (const provider of activeProviders) {
          if (!provider.apiKey) {
            errors.push(`Provider ${provider.name} is missing API key`);
          }
          if (provider.models.length === 0) {
            errors.push(`Provider ${provider.name} has no active models`);
          }
        }
      }
    } catch (error) {
      errors.push(`Database validation error: ${(error as Error).message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取模型的成本信息 - 从数据库获取
   */
  static async getModelCost(providerCode: string, modelCode: string): Promise<{ input: number; output: number } | null> {
    const model = await prisma.lLMModel.findFirst({
      where: {
        code: modelCode,
        provider: {
          code: providerCode
        },
        isActive: true
      }
    });

    if (!model || !model.pricing) {
      return null;
    }

    const pricing = model.pricing as any;
    return {
      input: pricing.input || 0,
      output: pricing.output || 0
    };
  }
}

export default LLMConfigManager;