import { http } from '@/lib/http-client';
import type { ApiResponse } from '@/lib/http-client';

/**
 * 管理后台API服务
 */

// Agent类型定义
export interface Agent {
  id: string;
  name: string;
  code: string;
  description?: string;
  color: string;
  temperature: number;
  maxTokens: number;
  prompt?: string;
  isActive: boolean;
  modelId?: string;
  model?: any;
}

// Provider类型定义
export interface Provider {
  id: string;
  name: string;
  code: string;
  baseUrl: string;
  isActive: boolean;
  models: Model[];
  agentCount: number;
}

// Model类型定义
export interface Model {
  id: string;
  name: string;
  code: string;
  providerId: string;
  contextLength: number;
  maxTokens: number;
  capabilities: string[];
  isActive: boolean;
  agentCount: number;
}

// SceneAnalyzer类型定义
export interface SceneAnalyzer {
  id: string;
  name: string;
  type: string;
  providerId: string;
  modelId: string;
  config: any;
  isActive: boolean;
  isDefault: boolean;
}

// Dashboard数据类型
export interface DashboardData {
  stats: {
    totalUsers: number;
    totalAgents: number;
    totalConversations: number;
    totalMessages: number;
    totalProviders: number;
    totalSceneAnalyzers: number;
  };
  recentActivity: any[];
}

class AdminService {
  /**
   * 获取仪表板数据
   */
  async getDashboard(): Promise<ApiResponse<DashboardData>> {
    return http.get<DashboardData>('/api/admin/dashboard', {
      cacheTime: 60000 // 缓存1分钟
    });
  }

  /**
   * Agent管理
   */
  agents = {
    // 获取所有Agents
    list: async (): Promise<ApiResponse<Agent[]>> => {
      return http.get<Agent[]>('/api/admin/agents');
    },

    // 获取单个Agent
    get: async (id: string): Promise<ApiResponse<Agent>> => {
      return http.get<Agent>(`/api/admin/agents/${id}`);
    },

    // 创建Agent
    create: async (data: Partial<Agent>): Promise<ApiResponse<Agent>> => {
      return http.post<Agent>('/api/admin/agents', data);
    },

    // 更新Agent
    update: async (id: string, data: Partial<Agent>): Promise<ApiResponse<Agent>> => {
      return http.put<Agent>(`/api/admin/agents/${id}`, data);
    },

    // 删除Agent
    delete: async (id: string): Promise<ApiResponse<void>> => {
      return http.delete(`/api/admin/agents/${id}`);
    },

    // 切换Agent状态
    toggle: async (id: string): Promise<ApiResponse<Agent>> => {
      return http.patch<Agent>(`/api/admin/agents/${id}/toggle`);
    }
  };

  /**
   * Provider管理
   */
  providers = {
    // 获取所有Providers
    list: async (): Promise<ApiResponse<Provider[]>> => {
      return http.get<Provider[]>('/api/admin/providers', {
        cacheTime: 300000 // 缓存5分钟
      });
    },

    // 创建Provider
    create: async (data: {
      name: string;
      code: string;
      baseUrl: string;
      apiKey: string;
      isActive: boolean;
    }): Promise<ApiResponse<Provider>> => {
      return http.post<Provider>('/api/admin/providers', data);
    },

    // 更新Provider
    update: async (id: string, data: Partial<Provider>): Promise<ApiResponse<Provider>> => {
      return http.put<Provider>(`/api/admin/providers/${id}`, data);
    },

    // 删除Provider
    delete: async (id: string): Promise<ApiResponse<void>> => {
      return http.delete(`/api/admin/providers/${id}`);
    }
  };

  /**
   * Model管理
   */
  models = {
    // 获取Provider的Models
    list: async (providerId?: string): Promise<ApiResponse<Model[]>> => {
      return http.get<Model[]>('/api/admin/models', {
        params: { providerId }
      });
    },

    // 创建Model
    create: async (data: Partial<Model>): Promise<ApiResponse<Model>> => {
      return http.post<Model>('/api/admin/models', data);
    },

    // 导入预设Models
    importPresets: async (providerId: string): Promise<ApiResponse<Model[]>> => {
      return http.patch<Model[]>('/api/admin/models', { providerId });
    }
  };

  /**
   * SceneAnalyzer管理
   */
  sceneAnalyzers = {
    // 获取所有SceneAnalyzers
    list: async (): Promise<ApiResponse<SceneAnalyzer[]>> => {
      return http.get<SceneAnalyzer[]>('/api/admin/scene-analyzers');
    },

    // 创建SceneAnalyzer
    create: async (data: Partial<SceneAnalyzer>): Promise<ApiResponse<SceneAnalyzer>> => {
      return http.post<SceneAnalyzer>('/api/admin/scene-analyzers', data);
    },

    // 更新SceneAnalyzer
    update: async (id: string, data: Partial<SceneAnalyzer>): Promise<ApiResponse<SceneAnalyzer>> => {
      return http.put<SceneAnalyzer>(`/api/admin/scene-analyzers/${id}`, data);
    },

    // 删除SceneAnalyzer
    delete: async (id: string): Promise<ApiResponse<void>> => {
      return http.delete(`/api/admin/scene-analyzers/${id}`);
    },

    // 设为默认
    setDefault: async (id: string): Promise<ApiResponse<void>> => {
      return http.patch(`/api/admin/scene-analyzers/${id}/default`);
    }
  };
}

// 导出单例
export const adminService = new AdminService();
export default adminService;