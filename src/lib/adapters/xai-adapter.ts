import { LLMConfig, LLMMessage, LLMResponse, LLMStreamChunk, LLMProvider } from '@/types/llm';
import { BaseLLMAdapter } from './base-adapter';

export default class XAIAdapter extends BaseLLMAdapter {
  provider: LLMProvider = 'xai';

  async streamChat(
    config: LLMConfig,
    messages: LLMMessage[],
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<LLMResponse> {
    // TODO: 实现xAI流式API调用
    throw new Error('xAI streaming not implemented yet');
  }

  async chat(config: LLMConfig, messages: LLMMessage[]): Promise<LLMResponse> {
    // TODO: 实现xAI API调用
    throw new Error('xAI chat not implemented yet');
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    return ['grok-beta'];
  }
}
