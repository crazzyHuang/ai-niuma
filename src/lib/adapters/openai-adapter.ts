import { LLMConfig, LLMMessage, LLMResponse, LLMStreamChunk, LLMProvider } from '@/types/llm';
import { BaseLLMAdapter } from './base-adapter';

export default class OpenAIAdapter extends BaseLLMAdapter {
  provider: LLMProvider = 'openai';

  async streamChat(
    config: LLMConfig,
    messages: LLMMessage[],
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<LLMResponse> {
    const url = `${config.baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
    
    const requestBody = {
      model: config.model,
      messages: this.formatMessages(messages),
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 2000,
      stream: true,
    };

    return this.withRetry(async () => {
      // 🔍 开发环境日志：请求参数
      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 LLM API 请求开始:');
        console.log('📍 URL:', url);
        console.log('🔑 Headers:', {
          ...this.buildHeaders(config),
          'Authorization': `Bearer ${config.apiKey.slice(0, 10)}...` // 隐藏完整密钥
        });
        console.log('📦 Request Body:', JSON.stringify(requestBody, null, 2));
      }

      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(config),
        body: JSON.stringify(requestBody),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ LLM API 错误:');
          console.error('📍 URL:', url);
          console.error('🔢 Status:', response.status);
          console.error('📄 Error:', errorText);
        }
        throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ LLM API 响应成功:');
        console.log('⏱️ 响应时间:', `${responseTime}ms`);
        console.log('📊 Status:', response.status);
        console.log('🔄 开始处理流式响应...');
      }

      return this.processStream(response, onChunk);
    }, config.retryAttempts || 3);
  }

  async chat(config: LLMConfig, messages: LLMMessage[]): Promise<LLMResponse> {
    const url = `${config.baseUrl || 'https://api.openai.com/v1'}/chat/completions`;
    
    const requestBody = {
      model: config.model,
      messages: this.formatMessages(messages),
      temperature: config.temperature || 0.7,
      max_tokens: config.maxTokens || 2000,
      stream: false,
    };

    return this.withRetry(async () => {
      // 🔍 开发环境日志：请求参数
      if (process.env.NODE_ENV === 'development') {
        console.log('🚀 LLM API 请求开始 (非流式):');
        console.log('📍 URL:', url);
        console.log('🔑 Headers:', {
          ...this.buildHeaders(config),
          'Authorization': `Bearer ${config.apiKey.slice(0, 10)}...`
        });
        console.log('📦 Request Body:', JSON.stringify(requestBody, null, 2));
      }

      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'POST',
        headers: this.buildHeaders(config),
        body: JSON.stringify(requestBody),
      });

      const responseTime = Date.now() - startTime;

      if (!response.ok) {
        const errorText = await response.text();
        if (process.env.NODE_ENV === 'development') {
          console.error('❌ LLM API 错误:');
          console.error('📍 URL:', url);
          console.error('🔢 Status:', response.status);
          console.error('📄 Error:', errorText);
        }
        throw new Error(`OpenAI API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (process.env.NODE_ENV === 'development') {
        console.log('✅ LLM API 响应成功:');
        console.log('⏱️ 响应时间:', `${responseTime}ms`);
        console.log('📊 Status:', response.status);
        console.log('📄 Response Data:', JSON.stringify(data, null, 2));
        console.log('💰 Token 使用:', {
          prompt: data.usage?.prompt_tokens || 0,
          completion: data.usage?.completion_tokens || 0,
          total: data.usage?.total_tokens || 0
        });
      }
      
      return {
        content: data.choices[0].message.content,
        usage: this.parseUsage(data.usage),
        model: data.model,
        finishReason: data.choices[0].finish_reason || 'stop'
      };
    }, config.retryAttempts || 3);
  }

  async getAvailableModels(apiKey: string): Promise<string[]> {
    const url = 'https://api.openai.com/v1/models';
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`OpenAI API Error: ${response.status}`);
    }

    const data = await response.json();
    return data.data
      .filter((model: any) => model.id.includes('gpt'))
      .map((model: any) => model.id);
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
    let chunkCount = 0;
    const startTime = Date.now();

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
              if (process.env.NODE_ENV === 'development') {
                const totalTime = Date.now() - startTime;
                console.log('🏁 流式响应完成:');
                console.log('📊 总块数:', chunkCount);
                console.log('📝 总内容长度:', content.length);
                console.log('⏱️ 总耗时:', `${totalTime}ms`);
                console.log('💰 最终 Token 使用:', usage);
              }
              onChunk({ content: '', isComplete: true, usage });
              break;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              
              if (delta?.content) {
                content += delta.content;
                chunkCount++;
                
                if (process.env.NODE_ENV === 'development' && chunkCount <= 3) {
                  console.log(`🔄 流式块 #${chunkCount}:`, {
                    content: delta.content,
                    length: delta.content.length
                  });
                } else if (process.env.NODE_ENV === 'development' && chunkCount === 4) {
                  console.log('📝 后续块将不再显示详情...');
                }
                
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
                if (process.env.NODE_ENV === 'development') {
                  console.log('🛑 完成原因:', finishReason);
                }
              }

              if (parsed.usage) {
                usage = this.parseUsage(parsed.usage);
              }
            } catch (e) {
              if (process.env.NODE_ENV === 'development') {
                console.warn('⚠️ 解析流式数据失败:', data.slice(0, 100));
              }
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
