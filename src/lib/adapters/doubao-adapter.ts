import { LLMConfig, LLMMessage, LLMResponse, LLMStreamChunk, LLMProvider } from '@/types/llm';
import { BaseLLMAdapter } from './base-adapter';

export default class DoubaoAdapter extends BaseLLMAdapter {
  provider: LLMProvider = 'doubao';

  async streamChat(
    config: LLMConfig,
    messages: LLMMessage[],
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<LLMResponse> {
    // TODO: 实现豆包流式API调用
    throw new Error('Doubao streaming not implemented yet');
  }

  async chat(config: LLMConfig, messages: LLMMessage[]): Promise<LLMResponse> {
    // TODO: 实现豆包API调用
    throw new Error('Doubao chat not implemented yet');
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    return ['doubao-pro-4k', 'doubao-lite-4k'];
  }
}
