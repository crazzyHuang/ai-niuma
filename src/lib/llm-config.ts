import { LLMConfig, LLMProvider, AgentConfig } from '@/types/llm';
import providersConfig from '../../config/llm-providers.json';

/**
 * LLM配置管理器
 */
export class LLMConfigManager {
  /**
   * 根据角色标签获取LLM配置
   */
  static getConfigForAgent(roleTag: string): LLMConfig {
    const defaultConfig = providersConfig.defaultConfigs[roleTag as keyof typeof providersConfig.defaultConfigs];
    
    if (!defaultConfig) {
      // 如果没有配置，使用默认的共情配置
      const fallback = providersConfig.defaultConfigs.empathy;
      return this.buildLLMConfig(fallback.provider as LLMProvider, fallback.model, {
        temperature: fallback.temperature,
        maxTokens: fallback.maxTokens,
      });
    }

    return this.buildLLMConfig(defaultConfig.provider as LLMProvider, defaultConfig.model, {
      temperature: defaultConfig.temperature,
      maxTokens: defaultConfig.maxTokens,
    });
  }

  /**
   * 构建LLM配置
   */
  static buildLLMConfig(
    provider: LLMProvider, 
    model: string, 
    options: Partial<LLMConfig> = {}
  ): LLMConfig {
    const apiKey = this.getAPIKey(provider);
    const baseUrl = this.getBaseUrl(provider);

    return {
      provider,
      model,
      apiKey,
      baseUrl,
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 2000,
      timeout: options.timeout || 30000,
      retryAttempts: options.retryAttempts || 3,
      ...options,
    };
  }

  /**
   * 获取API密钥
   */
  private static getAPIKey(provider: LLMProvider): string {
    const envMap = {
      openai: 'OPENAI_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      google: 'GOOGLE_API_KEY',
      deepseek: 'DEEPSEEK_API_KEY',
      doubao: 'DOUBAO_API_KEY',
      xai: 'XAI_API_KEY',
      modelscope: 'MODELSCOPE_API_KEY',
      custom: 'CUSTOM_API_KEY',
    };

    const envKey = envMap[provider];
    const apiKey = process.env[envKey];

    if (!apiKey) {
      throw new Error(`API key not found for ${provider}. Please set ${envKey} environment variable.`);
    }

    return apiKey;
  }

  /**
   * 获取基础URL
   */
  private static getBaseUrl(provider: LLMProvider): string | undefined {
    const providerInfo = providersConfig.providers[provider as keyof typeof providersConfig.providers];
    return providerInfo?.baseUrl;
  }

  /**
   * 获取所有可用的提供商
   */
  static getAvailableProviders(): Array<{ id: LLMProvider; name: string; models: any[] }> {
    return Object.entries(providersConfig.providers).map(([id, config]) => ({
      id: id as LLMProvider,
      name: config.name,
      models: config.models,
    }));
  }

  /**
   * 获取指定提供商的模型列表
   */
  static getModelsForProvider(provider: LLMProvider): string[] {
    const providerInfo = providersConfig.providers[provider as keyof typeof providersConfig.providers];
    return providerInfo?.models.map(model => model.id) || [];
  }

  /**
   * 验证配置是否完整
   */
  static validateConfiguration(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // 检查必要的环境变量
    const requiredEnvVars = [
      'OPENAI_API_KEY',
      'DEEPSEEK_API_KEY',
      // 添加其他必需的API密钥
    ];

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        errors.push(`Missing environment variable: ${envVar}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * 获取模型的成本信息
   */
  static getModelCost(provider: LLMProvider, model: string): { input: number; output: number } | null {
    const providerInfo = providersConfig.providers[provider as keyof typeof providersConfig.providers];
    const modelInfo = providerInfo?.models.find(m => m.id === model);
    
    return modelInfo?.costPer1kTokens || null;
  }
}

export default LLMConfigManager;
