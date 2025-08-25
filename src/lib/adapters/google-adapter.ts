import { LLMConfig, LLMMessage, LLMResponse, LLMStreamChunk, LLMProvider } from '@/types/llm';
import { BaseLLMAdapter } from './base-adapter';

export default class GoogleAdapter extends BaseLLMAdapter {
  provider: LLMProvider = 'google';

  async streamChat(
    config: LLMConfig,
    messages: LLMMessage[],
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<LLMResponse> {
    // TODO: 实现Google Gemini流式API调用
    throw new Error('Google streaming not implemented yet');
  }

  async chat(config: LLMConfig, messages: LLMMessage[]): Promise<LLMResponse> {
    // TODO: 实现Google Gemini API调用
    throw new Error('Google chat not implemented yet');
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    return ['gemini-1.5-pro', 'gemini-1.5-flash'];
  }
}
