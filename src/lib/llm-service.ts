import { LLMConfig, LLMMessage, LLMResponse, LLMStreamChunk, LLMProviderAdapter, LLMProvider } from '@/types/llm';
import OpenAIAdapter from './adapters/openai-adapter';
import AnthropicAdapter from './adapters/anthropic-adapter';
import DeepSeekAdapter from './adapters/deepseek-adapter';
import DoubaoAdapter from './adapters/doubao-adapter';
import GoogleAdapter from './adapters/google-adapter';
import XAIAdapter from './adapters/xai-adapter';
import ModelScopeAdapter from './adapters/modelscope-adapter-simple';

class LLMService {
  private adapters: Map<LLMProvider, LLMProviderAdapter> = new Map();

  constructor() {
    // 注册所有适配器
    this.adapters.set('openai', new OpenAIAdapter());
    this.adapters.set('anthropic', new AnthropicAdapter());
    this.adapters.set('deepseek', new DeepSeekAdapter());
    this.adapters.set('doubao', new DoubaoAdapter());
    this.adapters.set('google', new GoogleAdapter());
    this.adapters.set('xai', new XAIAdapter());
    this.adapters.set('modelscope', new ModelScopeAdapter());
  }

  /**
   * 获取适配器
   */
  private getAdapter(provider: LLMProvider): LLMProviderAdapter {
    const adapter = this.adapters.get(provider);
    if (!adapter) {
      throw new Error(`Unsupported LLM provider: ${provider}`);
    }
    return adapter;
  }

  /**
   * 流式聊天
   */
  async streamChat(
    config: LLMConfig,
    messages: LLMMessage[],
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<LLMResponse> {
    const adapter = this.getAdapter(config.provider);
    
    // 验证配置
    if (!adapter.validateConfig(config)) {
      throw new Error(`Invalid configuration for provider: ${config.provider}`);
    }

    return adapter.streamChat(config, messages, onChunk);
  }

  /**
   * 非流式聊天
   */
  async chat(config: LLMConfig, messages: LLMMessage[]): Promise<LLMResponse> {
    const adapter = this.getAdapter(config.provider);
    
    // 验证配置
    if (!adapter.validateConfig(config)) {
      throw new Error(`Invalid configuration for provider: ${config.provider}`);
    }

    return adapter.chat(config, messages);
  }

  /**
   * 验证配置
   */
  validateConfig(config: LLMConfig): boolean {
    try {
      const adapter = this.getAdapter(config.provider);
      return adapter.validateConfig(config);
    } catch {
      return false;
    }
  }

  /**
   * 获取可用模型
   */
  async getAvailableModels(provider: LLMProvider, apiKey: string): Promise<string[]> {
    const adapter = this.getAdapter(provider);
    return adapter.getAvailableModels(apiKey);
  }

  /**
   * 获取所有支持的提供商
   */
  getSupportedProviders(): LLMProvider[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * 计算成本（美分）
   */
  calculateCost(provider: LLMProvider, model: string, usage: { promptTokens: number; completionTokens: number }): number {
    // 这里可以从配置文件读取价格信息
    // 暂时返回0，实际实现时从 llm-providers.json 读取
    return 0;
  }
}

// 单例实例
export const llmService = new LLMService();
export default llmService;
