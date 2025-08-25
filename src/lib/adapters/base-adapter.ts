import { LLMConfig, LLMMessage, LLMResponse, LLMStreamChunk, LLMProviderAdapter, LLMProvider } from '@/types/llm';

/**
 * 基础适配器类，提供通用功能
 */
export abstract class BaseLLMAdapter implements LLMProviderAdapter {
  abstract provider: LLMProvider;

  /**
   * 流式聊天 - 子类必须实现
   */
  abstract streamChat(
    config: LLMConfig,
    messages: LLMMessage[],
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<LLMResponse>;

  /**
   * 非流式聊天 - 子类必须实现
   */
  abstract chat(config: LLMConfig, messages: LLMMessage[]): Promise<LLMResponse>;

  /**
   * 获取可用模型 - 子类必须实现
   */
  abstract getAvailableModels(apiKey: string): Promise<string[]>;

  /**
   * 验证配置 - 基础实现，子类可以重写
   */
  validateConfig(config: LLMConfig): boolean {
    if (!config.apiKey) {
      console.error(`API key is required for ${this.provider}`);
      return false;
    }

    if (!config.model) {
      console.error(`Model is required for ${this.provider}`);
      return false;
    }

    return true;
  }

  /**
   * 构建请求头 - 通用方法
   */
  protected buildHeaders(config: LLMConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    };
  }

  /**
   * 处理API错误 - 通用方法
   */
  protected handleAPIError(error: any, provider: string): never {
    if (error.response) {
      // API 返回错误状态码
      throw new Error(`${provider} API Error: ${error.response.status} - ${error.response.data?.error?.message || 'Unknown error'}`);
    } else if (error.request) {
      // 网络错误
      throw new Error(`${provider} Network Error: ${error.message}`);
    } else {
      // 其他错误
      throw new Error(`${provider} Error: ${error.message}`);
    }
  }

  /**
   * 重试机制 - 通用方法
   */
  protected async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }

        // 指数退避
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
      }
    }

    throw lastError!;
  }

  /**
   * 格式化消息 - 通用方法，子类可以重写
   */
  protected formatMessages(messages: LLMMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
  }

  /**
   * 解析使用量信息 - 通用方法，子类可以重写
   */
  protected parseUsage(usage: any): { promptTokens: number; completionTokens: number; totalTokens: number } {
    return {
      promptTokens: usage?.prompt_tokens || 0,
      completionTokens: usage?.completion_tokens || 0,
      totalTokens: usage?.total_tokens || 0
    };
  }
}
