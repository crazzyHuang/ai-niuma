import { http } from '@/lib/http-client';
import type { ApiResponse } from '@/lib/http-client';

/**
 * 认证服务API
 */

// 用户类型
export interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

// 登录请求参数
export interface LoginRequest {
  email: string;
  password: string;
}

// 登录响应
export interface LoginResponse {
  token: string;
  user: User;
}

// 注册请求参数
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

// 注册响应
export interface RegisterResponse {
  token: string;
  user: User;
}

class AuthService {
  /**
   * 用户登录
   */
  async login(data: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    const response = await http.post<LoginResponse>('/api/auth/login', data, {
      skipAuth: true,
      skipErrorToast: false
    });
    
    // 登录成功后保存token
    if (response.success && response.data) {
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response;
  }

  /**
   * 用户注册
   */
  async register(data: RegisterRequest): Promise<ApiResponse<RegisterResponse>> {
    const response = await http.post<RegisterResponse>('/api/auth/register', data, {
      skipAuth: true,
      skipErrorToast: false
    });
    
    // 注册成功后保存token
    if (response.success && response.data) {
      localStorage.setItem('auth_token', response.data.token);
      localStorage.setItem('user', JSON.stringify(response.data.user));
    }
    
    return response;
  }

  /**
   * 验证Token
   */
  async verify(): Promise<ApiResponse<User>> {
    return http.get<User>('/api/auth/verify', {
      skipErrorToast: true
    });
  }

  /**
   * 退出登录
   */
  async logout(): Promise<void> {
    try {
      await http.post('/api/auth/logout', null, {
        skipErrorToast: true
      });
    } finally {
      // 清除本地存储
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      // 清除所有缓存
      http.clearCache();
      // 跳转到登录页
      window.location.href = '/auth/login';
    }
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): User | null {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      return JSON.parse(userStr);
    } catch {
      return null;
    }
  }

  /**
   * 检查是否已登录
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  /**
   * 获取Token
   */
  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }
}

// 导出单例
export const authService = new AuthService();
export default authService;