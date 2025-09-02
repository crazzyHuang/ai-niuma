import { toast } from 'sonner';

/**
 * 企业级HTTP客户端
 * 提供统一的请求处理、错误处理、认证管理等功能
 */

// 请求配置接口
export interface RequestConfig extends RequestInit {
  params?: Record<string, any>;
  timeout?: number;
  retry?: number;
  retryDelay?: number;
  skipAuth?: boolean;
  skipErrorToast?: boolean;
  cacheTime?: number;
  withCredentials?: boolean;
}

// 响应接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  details?: string;
  message?: string;
  metadata?: any;
}

// 错误类型
export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: string,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// 请求缓存
class RequestCache {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private defaultTTL = 5 * 60 * 1000; // 5分钟

  get(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    if (Date.now() - cached.timestamp > this.defaultTTL) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  set(key: string, data: any, ttl?: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // 自动清理过期缓存
    if (ttl) {
      setTimeout(() => this.cache.delete(key), ttl);
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

// HTTP客户端类
export class HttpClient {
  private baseURL: string;
  private defaultHeaders: HeadersInit;
  private cache = new RequestCache();
  private pendingRequests = new Map<string, AbortController>();

  constructor(baseURL = '', defaultHeaders: HeadersInit = {}) {
    this.baseURL = baseURL;
    this.defaultHeaders = defaultHeaders;
  }

  /**
   * 获取认证Token
   */
  private getAuthToken(): string | null {
    // 优先从localStorage获取（客户端）
    if (typeof window !== 'undefined') {
      return localStorage.getItem('auth_token');
    }
    return null;
  }

  /**
   * 构建完整URL
   */
  private buildURL(endpoint: string, params?: Record<string, any>): string {
    const url = new URL(endpoint, this.baseURL || window.location.origin);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  }

  /**
   * 准备请求Headers
   */
  private prepareHeaders(config: RequestConfig): Headers {
    const headers = new Headers(this.defaultHeaders);
    
    // 添加默认Content-Type
    if (!headers.has('Content-Type') && config.body) {
      headers.set('Content-Type', 'application/json');
    }
    
    // 添加认证Token
    if (!config.skipAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
    
    // 合并自定义headers
    if (config.headers) {
      const customHeaders = new Headers(config.headers);
      customHeaders.forEach((value, key) => {
        headers.set(key, value);
      });
    }
    
    return headers;
  }

  /**
   * 处理响应
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    // 处理204 No Content
    if (response.status === 204) {
      return { success: true, data: null as any };
    }

    const contentType = response.headers.get('content-type');
    
    // 处理JSON响应
    if (contentType?.includes('application/json')) {
      const data = await response.json();
      
      // 处理错误响应
      if (!response.ok) {
        throw new ApiError(
          response.status,
          data.error || data.message || '请求失败',
          data.details,
          data
        );
      }
      
      return data;
    }
    
    // 处理文本响应
    if (contentType?.includes('text/')) {
      const text = await response.text();
      if (!response.ok) {
        throw new ApiError(response.status, text);
      }
      return { success: true, data: text as any };
    }
    
    // 处理Blob响应
    if (response.ok) {
      const blob = await response.blob();
      return { success: true, data: blob as any };
    }
    
    throw new ApiError(response.status, '请求失败');
  }

  /**
   * 处理错误
   */
  private handleError(error: any, config: RequestConfig): never {
    // 处理取消请求
    if (error.name === 'AbortError') {
      throw new ApiError(0, '请求已取消');
    }

    // 处理网络错误
    if (!window.navigator.onLine) {
      if (!config.skipErrorToast) {
        toast.error('网络连接已断开');
      }
      throw new ApiError(0, '网络连接已断开');
    }

    // 处理API错误
    if (error instanceof ApiError) {
      // 401认证失效
      if (error.status === 401) {
        if (!config.skipErrorToast) {
          toast.error('登录已过期，请重新登录');
        }
        // 清除认证信息
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        // 重定向到登录页
        window.location.href = '/auth/login?redirect=' + encodeURIComponent(window.location.pathname);
      }
      // 403权限不足
      else if (error.status === 403) {
        if (!config.skipErrorToast) {
          toast.error('权限不足');
        }
      }
      // 其他错误
      else if (!config.skipErrorToast) {
        toast.error(error.message);
      }
      
      throw error;
    }

    // 处理其他错误
    if (!config.skipErrorToast) {
      toast.error('请求失败，请稍后重试');
    }
    throw new ApiError(0, error.message || '请求失败', undefined, error);
  }

  /**
   * 执行请求（带重试）
   */
  private async executeRequest<T>(
    url: string,
    config: RequestConfig,
    retryCount = 0
  ): Promise<ApiResponse<T>> {
    const { retry = 0, retryDelay = 1000, timeout = 30000 } = config;
    
    // 创建AbortController用于超时和取消
    const controller = new AbortController();
    const requestKey = `${config.method}-${url}`;
    
    // 存储controller以便取消
    this.pendingRequests.set(requestKey, controller);
    
    // 设置超时
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const response = await fetch(url, {
        ...config,
        headers: this.prepareHeaders(config),
        signal: controller.signal,
        credentials: config.withCredentials ? 'include' : 'same-origin'
      });
      
      clearTimeout(timeoutId);
      this.pendingRequests.delete(requestKey);
      
      return await this.handleResponse<T>(response);
    } catch (error) {
      clearTimeout(timeoutId);
      this.pendingRequests.delete(requestKey);
      
      // 重试逻辑
      if (retryCount < retry && !(error instanceof ApiError && error.status === 401)) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (retryCount + 1)));
        return this.executeRequest<T>(url, config, retryCount + 1);
      }
      
      return this.handleError(error, config);
    }
  }

  /**
   * GET请求
   */
  async get<T = any>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const url = this.buildURL(endpoint, config.params);
    
    // 检查缓存
    if (config.cacheTime) {
      const cached = this.cache.get(url);
      if (cached) return cached;
    }
    
    const result = await this.executeRequest<T>(url, {
      ...config,
      method: 'GET'
    });
    
    // 缓存结果
    if (config.cacheTime && result.success) {
      this.cache.set(url, result, config.cacheTime);
    }
    
    return result;
  }

  /**
   * POST请求
   */
  async post<T = any>(endpoint: string, data?: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const url = this.buildURL(endpoint, config.params);
    
    return this.executeRequest<T>(url, {
      ...config,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * PUT请求
   */
  async put<T = any>(endpoint: string, data?: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const url = this.buildURL(endpoint, config.params);
    
    return this.executeRequest<T>(url, {
      ...config,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * PATCH请求
   */
  async patch<T = any>(endpoint: string, data?: any, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const url = this.buildURL(endpoint, config.params);
    
    return this.executeRequest<T>(url, {
      ...config,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * DELETE请求
   */
  async delete<T = any>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const url = this.buildURL(endpoint, config.params);
    
    return this.executeRequest<T>(url, {
      ...config,
      method: 'DELETE'
    });
  }

  /**
   * 上传文件
   */
  async upload<T = any>(
    endpoint: string,
    formData: FormData,
    config: RequestConfig = {},
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<T>> {
    const url = this.buildURL(endpoint, config.params);
    
    // 使用XMLHttpRequest以支持上传进度
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      // 上传进度
      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = (e.loaded / e.total) * 100;
            onProgress(progress);
          }
        });
      }
      
      // 完成处理
      xhr.addEventListener('load', async () => {
        try {
          const response = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(response);
          } else {
            reject(new ApiError(xhr.status, response.error || '上传失败', response.details));
          }
        } catch (error) {
          reject(new ApiError(xhr.status, '响应解析失败'));
        }
      });
      
      // 错误处理
      xhr.addEventListener('error', () => {
        reject(new ApiError(0, '网络错误'));
      });
      
      // 初始化请求
      xhr.open('POST', url);
      
      // 设置Headers
      const headers = this.prepareHeaders(config);
      headers.delete('Content-Type'); // 让浏览器自动设置boundary
      headers.forEach((value, key) => {
        xhr.setRequestHeader(key, value);
      });
      
      // 发送请求
      xhr.send(formData);
    });
  }

  /**
   * 取消请求
   */
  cancel(endpoint: string, method = 'GET'): void {
    const url = this.buildURL(endpoint);
    const requestKey = `${method}-${url}`;
    const controller = this.pendingRequests.get(requestKey);
    
    if (controller) {
      controller.abort();
      this.pendingRequests.delete(requestKey);
    }
  }

  /**
   * 取消所有请求
   */
  cancelAll(): void {
    this.pendingRequests.forEach(controller => controller.abort());
    this.pendingRequests.clear();
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// 创建默认实例
export const httpClient = new HttpClient();

// 导出便捷方法
export const http = {
  get: <T = any>(url: string, config?: RequestConfig) => httpClient.get<T>(url, config),
  post: <T = any>(url: string, data?: any, config?: RequestConfig) => httpClient.post<T>(url, data, config),
  put: <T = any>(url: string, data?: any, config?: RequestConfig) => httpClient.put<T>(url, data, config),
  patch: <T = any>(url: string, data?: any, config?: RequestConfig) => httpClient.patch<T>(url, data, config),
  delete: <T = any>(url: string, config?: RequestConfig) => httpClient.delete<T>(url, config),
  upload: <T = any>(url: string, formData: FormData, config?: RequestConfig, onProgress?: (progress: number) => void) => 
    httpClient.upload<T>(url, formData, config, onProgress),
  cancel: (url: string, method?: string) => httpClient.cancel(url, method),
  cancelAll: () => httpClient.cancelAll(),
  clearCache: () => httpClient.clearCache()
};

// 导出类型
export default httpClient;