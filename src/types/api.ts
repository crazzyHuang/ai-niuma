/**
 * 统一的API响应格式类型定义
 * 
 * 所有API端点必须遵循这个格式，确保前后端数据解析一致性
 */

// 成功响应格式
export interface APISuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  metadata?: {
    total?: number;
    page?: number;
    limit?: number;
    [key: string]: any;
  };
}

// 错误响应格式  
export interface APIErrorResponse {
  success: false;
  error: string;
  details?: string;
  code?: string;
}

// 统一响应类型
export type APIResponse<T = any> = APISuccessResponse<T> | APIErrorResponse;

/**
 * API响应工具函数
 */
export class APIResponseHelper {
  /**
   * 创建成功响应
   */
  static success<T>(data: T, message?: string, metadata?: any): APISuccessResponse<T> {
    const response: APISuccessResponse<T> = {
      success: true,
      data
    };
    
    if (message) response.message = message;
    if (metadata) response.metadata = metadata;
    
    return response;
  }

  /**
   * 创建错误响应
   */
  static error(error: string, details?: string, code?: string): APIErrorResponse {
    const response: APIErrorResponse = {
      success: false,
      error
    };
    
    if (details) response.details = details;
    if (code) response.code = code;
    
    return response;
  }

  /**
   * 检查响应是否成功
   */
  static isSuccess<T>(response: APIResponse<T>): response is APISuccessResponse<T> {
    return response.success === true;
  }

  /**
   * 检查响应是否失败
   */
  static isError<T>(response: APIResponse<T>): response is APIErrorResponse {
    return response.success === false;
  }
}

/**
 * 统一的前端API调用工具
 */
export class APIClient {
  /**
   * 统一的fetch封装
   */
  static async request<T = any>(
    url: string, 
    options?: RequestInit
  ): Promise<APIResponse<T>> {
    try {
      const response = await fetch(url, options);
      const data = await response.json() as APIResponse<T>;
      
      // 确保响应格式正确
      if (typeof data !== 'object' || !('success' in data)) {
        return APIResponseHelper.error(
          'Invalid API response format',
          'API response does not follow the standard format'
        );
      }
      
      return data;
    } catch (error) {
      return APIResponseHelper.error(
        'Network error',
        error instanceof Error ? error.message : 'Unknown network error'
      );
    }
  }

  /**
   * GET请求
   */
  static async get<T = any>(url: string): Promise<APIResponse<T>> {
    return this.request<T>(url, { method: 'GET' });
  }

  /**
   * POST请求
   */
  static async post<T = any>(url: string, data?: any): Promise<APIResponse<T>> {
    return this.request<T>(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * PUT请求
   */
  static async put<T = any>(url: string, data?: any): Promise<APIResponse<T>> {
    return this.request<T>(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    });
  }

  /**
   * DELETE请求
   */
  static async delete<T = any>(url: string): Promise<APIResponse<T>> {
    return this.request<T>(url, { method: 'DELETE' });
  }

  /**
   * PATCH请求
   */
  static async patch<T = any>(url: string, data?: any): Promise<APIResponse<T>> {
    return this.request<T>(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: data ? JSON.stringify(data) : undefined
    });
  }
}