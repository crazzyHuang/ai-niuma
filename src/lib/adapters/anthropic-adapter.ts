import { LLMConfig, LLMMessage, LLMResponse, LLMStreamChunk, LLMProvider } from '@/types/llm';
import { BaseLLMAdapter } from './base-adapter';

export default class AnthropicAdapter extends BaseLLMAdapter {
  provider: LLMProvider = 'anthropic';

  protected buildHeaders(config: LLMConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    };
  }

  async streamChat(
    config: LLMConfig,
    messages: LLMMessage[],
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<LLMResponse> {
    // TODO: 实现Anthropic流式API调用
    throw new Error('Anthropic streaming not implemented yet');
  }

  async chat(config: LLMConfig, messages: LLMMessage[]): Promise<LLMResponse> {
    // TODO: 实现Anthropic API调用
    throw new Error('Anthropic chat not implemented yet');
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    // Anthropic的模型是固定的，不需要API调用
    return [
      'claude-3-5-sonnet-20241022',
      'claude-3-haiku-20240307',
      'claude-3-opus-20240229'
    ];
  }
}
