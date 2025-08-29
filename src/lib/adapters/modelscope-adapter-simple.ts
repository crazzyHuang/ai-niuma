import { LLMConfig, LLMMessage, LLMResponse, LLMStreamChunk, LLMProvider } from '@/types/llm';
import OpenAIAdapter from './openai-adapter';

/**
 * 魔搭社区适配器（增强版）
 * 继承 OpenAI 适配器，增加了rate limiting处理和重试机制
 */
export default class ModelScopeAdapter extends OpenAIAdapter {
  provider: LLMProvider = 'modelscope';
  private retryCount = 0;
  private maxRetries = 2;
  private baseDelay = 2000; // 2秒基础延迟

  async getAvailableModels(apiKey: string): Promise<string[]> {
    // 魔搭常用模型列表
    return [
      'deepseek-ai/DeepSeek-V3.1'
    ];
  }

  // 重写 streamChat 以使用数据库配置的端点，并增加重试机制
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
    
    return this.executeWithRetry(
      () => super.streamChat(modifiedConfig, messages, onChunk),
      'streamChat'
    );
  }

  // 重写 chat 以使用数据库配置的端点，并增加重试机制
  async chat(config: LLMConfig, messages: LLMMessage[]): Promise<LLMResponse> {
    // 使用数据库配置的baseUrl，如果没有则使用默认的ModelScope社区版端点
    const modifiedConfig = {
      ...config,
      baseUrl: config.baseUrl || 'https://api-inference.modelscope.cn/v1'
    };

    return this.executeWithRetry(
      () => super.chat(modifiedConfig, messages),
      'chat'
    );
  }

  /**
   * 带重试机制的执行器 - 专门处理rate limiting
   */
  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          const delay = this.baseDelay * Math.pow(2, attempt - 1); // 指数退避
          console.log(`⏳ [ModelScopeAdapter] Rate limit hit, waiting ${delay}ms before retry ${attempt}/${this.maxRetries}...`);
          await this.sleep(delay);
        }

        const result = await operation();
        
        // 成功时重置重试计数
        this.retryCount = 0;
        return result;
        
      } catch (error) {
        lastError = error as Error;
        
        // 检查是否是429错误（rate limit）
        if (this.isRateLimitError(error)) {
          console.log(`🚫 [ModelScopeAdapter] Rate limit detected in ${operationName}, attempt ${attempt + 1}/${this.maxRetries + 1}`);
          
          if (attempt < this.maxRetries) {
            continue; // 继续重试
          } else {
            // 超过最大重试次数，返回友好错误消息
            throw new Error(`🚫 魔搭API请求频率过高，请稍后再试。建议：等待2-3分钟后重新测试，或考虑配置其他AI提供商作为备选。原始错误: ${lastError.message}`);
          }
        } else {
          // 非rate limit错误，直接抛出
          throw error;
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * 检查是否是rate limit错误
   */
  private isRateLimitError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorString = error?.toString?.()?.toLowerCase() || '';
    
    return (
      errorMessage.includes('429') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('request limit exceeded') ||
      errorString.includes('429') ||
      errorString.includes('rate limit') ||
      errorString.includes('request limit exceeded')
    );
  }

  /**
   * 延迟工具函数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
