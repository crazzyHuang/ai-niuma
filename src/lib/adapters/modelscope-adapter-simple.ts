import { LLMConfig, LLMMessage, LLMResponse, LLMStreamChunk, LLMProvider } from '@/types/llm';
import OpenAIAdapter from './openai-adapter';

/**
 * 魔搭社区适配器（简化版）
 * 由于魔搭完全兼容 OpenAI API，直接继承 OpenAI 适配器
 */
export default class ModelScopeAdapter extends OpenAIAdapter {
  provider: LLMProvider = 'modelscope';

  async getAvailableModels(apiKey: string): Promise<string[]> {
    // 魔搭常用模型列表
    return [
      'deepseek-ai/DeepSeek-V3.1'
    ];
  }

  // 重写 streamChat 以使用数据库配置的端点
  async streamChat(
    config: LLMConfig,
    messages: LLMMessage[],
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<LLMResponse> {
    // 使用数据库配置的baseUrl，如果没有则使用默认的ModelScope社区版端点
    const modifiedConfig = {
      ...config,
      baseUrl: config.baseUrl || 'https://api-inference.modelscope.cn/v1'
    };

    console.log(`🔧 [ModelScopeAdapter] Using baseUrl: ${modifiedConfig.baseUrl}`);
    
    // 调用父类的 streamChat 方法
    return super.streamChat(modifiedConfig, messages, onChunk);
  }

  // 重写 chat 以使用数据库配置的端点
  async chat(config: LLMConfig, messages: LLMMessage[]): Promise<LLMResponse> {
    // 使用数据库配置的baseUrl，如果没有则使用默认的ModelScope社区版端点
    const modifiedConfig = {
      ...config,
      baseUrl: config.baseUrl || 'https://api-inference.modelscope.cn/v1'
    };

    // 调用父类的 chat 方法
    return super.chat(modifiedConfig, messages);
  }
}
