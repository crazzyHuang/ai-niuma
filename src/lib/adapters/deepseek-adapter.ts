import { LLMConfig, LLMMessage, LLMResponse, LLMStreamChunk, LLMProvider } from '@/types/llm';
import { BaseLLMAdapter } from './base-adapter';

export default class DeepSeekAdapter extends BaseLLMAdapter {
  provider: LLMProvider = 'deepseek';

  async streamChat(
    config: LLMConfig,
    messages: LLMMessage[],
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<LLMResponse> {
    const url = `${config.baseUrl || 'https://api.deepseek.com/v1'}/chat/completions`;
    
    const requestBody = {
      model: config.model,
      messages: this.formatMessages(messages),
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 2000,
      stream: true,
    };

    return this.withRetry(async () => {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(config),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API Error: ${response.status} - ${await response.text()}`);
      }

      return this.processStream(response, onChunk);
    }, config.retryAttempts || 3);
  }

  async chat(config: LLMConfig, messages: LLMMessage[]): Promise<LLMResponse> {
    const url = `${config.baseUrl || 'https://api.deepseek.com/v1'}/chat/completions`;
    
    const requestBody = {
      model: config.model,
      messages: this.formatMessages(messages),
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 2000,
      stream: false,
    };

    return this.withRetry(async () => {
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(config),
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`DeepSeek API Error: ${response.status} - ${await response.text()}`);
      }

      const data = await response.json();
      
      return {
        content: data.choices[0].message.content,
        usage: this.parseUsage(data.usage),
        model: data.model,
        finishReason: data.choices[0].finish_reason || 'stop'
      };
    }, config.retryAttempts || 3);
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    const url = 'https://api.deepseek.com/v1/models';
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`DeepSeek API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.data.map((model: any) => model.id);
  }

  private async processStream(
    response: Response,
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<LLMResponse> {
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let content = '';
    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let model = '';
    let finishReason: 'stop' | 'length' | 'error' = 'stop';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              onChunk({ content: '', isComplete: true, usage });
              break;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              
              if (delta?.content) {
                content += delta.content;
                onChunk({ 
                  content: delta.content, 
                  isComplete: false 
                });
              }

              if (parsed.model) {
                model = parsed.model;
              }

              if (parsed.choices?.[0]?.finish_reason) {
                finishReason = parsed.choices[0].finish_reason;
              }

              if (parsed.usage) {
                usage = this.parseUsage(parsed.usage);
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return {
      content,
      usage,
      model,
      finishReason
    };
  }
}
