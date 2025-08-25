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

  // 重写 streamChat 以使用魔搭的端点
  async streamChat(
    config: LLMConfig,
    messages: LLMMessage[],
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<LLMResponse> {
    // 设置魔搭的兼容端点
    const modifiedConfig = {
      ...config,
      baseUrl: config.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    };

    // 调用父类的 streamChat 方法
    return super.streamChat(modifiedConfig, messages, onChunk);
  }

  // 重写 chat 以使用魔搭的端点
  async chat(config: LLMConfig, messages: LLMMessage[]): Promise<LLMResponse> {
    // 设置魔搭的兼容端点
    const modifiedConfig = {
      ...config,
      baseUrl: config.baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1'
    };

    // 调用父类的 chat 方法
    return super.chat(modifiedConfig, messages);
  }
}
