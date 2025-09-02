import { LLMConfig, LLMMessage, LLMResponse, LLMStreamChunk, LLMProvider } from '@/types/llm';
import OpenAIAdapter from './openai-adapter';

/**
 * BigModel (智谱AI) 适配器
 * 兼容 OpenAI API 格式
 */
export default class BigModelAdapter extends OpenAIAdapter {
  provider: LLMProvider = 'bigmodel';

  /**
   * 流式聊天 - 重用 OpenAI 的实现，但使用 BigModel 的基础 URL
   */
  async streamChat(
    config: LLMConfig,
    messages: LLMMessage[],
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<LLMResponse> {
    // BigModel 默认使用智谱AI的API地址
    const bigModelConfig = {
      ...config,
      baseUrl: config.baseUrl || 'https://open.bigmodel.cn/api/paas/v4'
    };
    
    // 调用父类 OpenAI 适配器的 streamChat 方法
    return super.streamChat(bigModelConfig, messages, onChunk);
  }

  /**
   * 非流式聊天 - 重用 OpenAI 的实现，但使用 BigModel 的基础 URL
   */
  async chat(config: LLMConfig, messages: LLMMessage[]): Promise<LLMResponse> {
    // BigModel 默认使用智谱AI的API地址
    const bigModelConfig = {
      ...config,
      baseUrl: config.baseUrl || 'https://open.bigmodel.cn/api/paas/v4'
    };
    
    // 调用父类 OpenAI 适配器的 chat 方法
    return super.chat(bigModelConfig, messages);
  }

  /**
   * 验证配置
   */
  validateConfig(config: LLMConfig): boolean {
    if (!config.apiKey) {
      console.error('BigModel API key is required');
      return false;
    }
    
    if (!config.model) {
      console.error('BigModel model name is required');
      return false;
    }

    // 常见的 BigModel 模型名称验证
    const validModels = [
      'glm-4',
      'glm-4-0520',
      'glm-4-air',
      'glm-4-airx',
      'glm-4-flash',
      'glm-3-turbo',
      'chatglm_turbo',
      'chatglm_pro',
      'chatglm_std',
      'chatglm_lite'
    ];

    // 允许任何模型名称，但给出警告
    if (!validModels.some(model => config.model.toLowerCase().includes(model))) {
      console.warn(`Model "${config.model}" may not be a valid BigModel model. Common models include: ${validModels.join(', ')}`);
    }
    
    return true;
  }

  /**
   * 获取可用模型列表
   */
  async getAvailableModels(apiKey: string): Promise<string[]> {
    // BigModel 常用模型列表
    return [
      'glm-4',           // 最新的 GLM-4 模型
      'glm-4-0520',      // GLM-4 特定版本
      'glm-4-air',       // 轻量级版本
      'glm-4-airx',      // 增强轻量级版本
      'glm-4-flash',     // 快速版本
      'glm-3-turbo',     // GLM-3 Turbo
      'chatglm_turbo',   // ChatGLM Turbo
      'chatglm_pro',     // ChatGLM Pro
      'chatglm_std',     // ChatGLM 标准版
      'chatglm_lite'     // ChatGLM 轻量版
    ];
  }

  /**
   * 构建请求头 - 重写以适配 BigModel 的特定需求
   */
  protected buildHeaders(config: LLMConfig): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
      'Accept': 'text/event-stream', // BigModel 支持 SSE
    };
  }
}