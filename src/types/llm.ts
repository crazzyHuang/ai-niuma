// LLM 相关类型定义

export type LLMProvider = 
  | 'openai' 
  | 'anthropic' 
  | 'google' 
  | 'deepseek' 
  | 'doubao' 
  | 'xai'
  | 'modelscope'
  | 'custom';

export interface LLMConfig {
  provider: LLMProvider;
  apiKey: string;
  baseUrl?: string; // 自定义API端点
  model: string;
  maxTokens?: number;
  temperature?: number;
  timeout?: number; // 超时时间（毫秒）
  retryAttempts?: number; // 重试次数
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMStreamChunk {
  content: string;
  isComplete: boolean;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: 'stop' | 'length' | 'error';
}

export interface AgentConfig {
  roleTag: string;
  provider: LLMProvider;
  model: string;
  systemPrompt: string;
  maxTokens?: number;
  temperature?: number;
  enabled: boolean;
}

export interface LLMProviderAdapter {
  provider: LLMProvider;
  
  // 流式聊天
  streamChat(
    config: LLMConfig,
    messages: LLMMessage[],
    onChunk: (chunk: LLMStreamChunk) => void
  ): Promise<LLMResponse>;
  
  // 非流式聊天
  chat(
    config: LLMConfig,
    messages: LLMMessage[]
  ): Promise<LLMResponse>;
  
  // 验证配置
  validateConfig(config: LLMConfig): boolean;
  
  // 获取模型列表
  getAvailableModels(apiKey: string): Promise<string[]>;
}
