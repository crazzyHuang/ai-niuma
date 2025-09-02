import { http } from '@/lib/http-client';
import type { ApiResponse } from '@/lib/http-client';

/**
 * 对话相关API服务
 */

// 消息类型
export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  agentId?: string;
  step?: string;
  timestamp: string;
  createdAt: string;
}

// 对话类型
export interface Conversation {
  id: string;
  userId: string;
  title: string;
  mode: string;
  selectedAgents?: string[];
  groupId?: string;
  budgetCents: number;
  createdAt: string;
  updatedAt: string;
  messages?: Message[];
}

// 创建对话请求
export interface CreateConversationRequest {
  title: string;
  mode: string;
  selectedAgents?: string[];
  groupId?: string;
}

// 发送消息请求
export interface SendMessageRequest {
  content: string;
  conversationId: string;
}

class ConversationService {
  /**
   * 获取用户的对话列表
   */
  async list(params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ApiResponse<Conversation[]>> {
    return http.get<Conversation[]>('/api/conversations', {
      params,
      cacheTime: 30000 // 缓存30秒
    });
  }

  /**
   * 获取单个对话详情
   */
  async get(id: string): Promise<ApiResponse<Conversation>> {
    return http.get<Conversation>(`/api/conversations/${id}`);
  }

  /**
   * 创建新对话
   */
  async create(data: CreateConversationRequest): Promise<ApiResponse<Conversation>> {
    // 创建对话时清除列表缓存
    http.clearCache();
    return http.post<Conversation>('/api/conversations', data);
  }

  /**
   * 更新对话
   */
  async update(id: string, data: Partial<Conversation>): Promise<ApiResponse<Conversation>> {
    http.clearCache();
    return http.put<Conversation>(`/api/conversations/${id}`, data);
  }

  /**
   * 删除对话
   */
  async delete(id: string): Promise<ApiResponse<void>> {
    http.clearCache();
    return http.delete(`/api/conversations/${id}`);
  }

  /**
   * 获取对话的消息历史
   */
  async getMessages(conversationId: string, params?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<Message[]>> {
    return http.get<Message[]>(`/api/conversations/${conversationId}/messages`, {
      params
    });
  }

  /**
   * 发送消息（非流式）
   */
  async sendMessage(conversationId: string, content: string): Promise<ApiResponse<Message>> {
    return http.post<Message>(`/api/conversations/${conversationId}/messages`, {
      content
    });
  }

  /**
   * 创建流式对话连接
   * 注意：流式对话使用EventSource，不通过http-client
   */
  createStreamConnection(conversationId: string, message: string): EventSource {
    const token = localStorage.getItem('auth_token');
    const url = `/api/conversations/${conversationId}/stream?message=${encodeURIComponent(message)}`;
    
    // EventSource不支持自定义headers，token通过cookie传递
    return new EventSource(url);
  }

  /**
   * 清除对话缓存
   */
  clearCache(): void {
    http.clearCache();
  }

  /**
   * 取消正在进行的请求
   */
  cancelRequest(conversationId: string): void {
    // 取消消息发送请求
    http.cancel(`/api/conversations/${conversationId}/messages`, 'POST');
    // 取消消息获取请求
    http.cancel(`/api/conversations/${conversationId}/messages`, 'GET');
  }
}

// 导出单例
export const conversationService = new ConversationService();
export default conversationService;