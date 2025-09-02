import { useState, useEffect, useCallback, useRef } from 'react';
import type { ApiResponse } from '@/lib/http-client';
import { toast } from 'sonner';

/**
 * 通用API Hook
 * 提供loading、error、data状态管理和请求生命周期控制
 */

export interface UseApiOptions {
  immediate?: boolean; // 是否立即执行
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  showErrorToast?: boolean;
  showSuccessToast?: boolean;
  successMessage?: string;
}

export interface UseApiResult<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
  execute: (...args: any[]) => Promise<void>;
  reset: () => void;
}

/**
 * 基础API Hook
 */
export function useApi<T = any>(
  apiFunction: (...args: any[]) => Promise<ApiResponse<T>>,
  options: UseApiOptions = {}
): UseApiResult<T> {
  const {
    immediate = false,
    onSuccess,
    onError,
    showErrorToast = false,
    showSuccessToast = false,
    successMessage
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  const isMounted = useRef(true);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const execute = useCallback(async (...args: any[]) => {
    setLoading(true);
    setError(null);

    try {
      const response = await apiFunction(...args);
      
      if (!isMounted.current) return;

      if (response.success) {
        setData(response.data || null);
        
        if (showSuccessToast) {
          toast.success(successMessage || response.message || '操作成功');
        }
        
        onSuccess?.(response.data);
      } else {
        const err = new Error(response.error || '请求失败');
        setError(err);
        
        if (showErrorToast) {
          toast.error(response.error || '请求失败');
        }
        
        onError?.(err);
      }
    } catch (err) {
      if (!isMounted.current) return;
      
      const error = err as Error;
      setError(error);
      
      if (showErrorToast) {
        toast.error(error.message || '请求失败');
      }
      
      onError?.(error);
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [apiFunction, onSuccess, onError, showErrorToast, showSuccessToast, successMessage]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [immediate]);

  return { data, error, loading, execute, reset };
}

/**
 * 分页API Hook
 */
export interface UsePaginatedApiOptions<T> extends UseApiOptions {
  pageSize?: number;
  initialPage?: number;
}

export interface UsePaginatedApiResult<T> extends UseApiResult<T[]> {
  page: number;
  pageSize: number;
  hasMore: boolean;
  loadMore: () => Promise<void>;
  refresh: () => Promise<void>;
  setPage: (page: number) => void;
}

export function usePaginatedApi<T = any>(
  apiFunction: (params: { page: number; limit: number }) => Promise<ApiResponse<T[]>>,
  options: UsePaginatedApiOptions<T> = {}
): UsePaginatedApiResult<T> {
  const { pageSize = 20, initialPage = 1, ...restOptions } = options;
  
  const [page, setPage] = useState(initialPage);
  const [hasMore, setHasMore] = useState(true);
  const [allData, setAllData] = useState<T[]>([]);

  const fetchPage = useCallback(async (pageNum: number, append = false) => {
    const response = await apiFunction({ page: pageNum, limit: pageSize });
    
    if (response.success) {
      const newData = response.data || [];
      
      if (append) {
        setAllData(prev => [...prev, ...newData]);
      } else {
        setAllData(newData);
      }
      
      setHasMore(newData.length === pageSize);
      return response;
    }
    
    return response;
  }, [apiFunction, pageSize]);

  const api = useApi(
    () => fetchPage(page, page > 1),
    { ...restOptions, immediate: false }
  );

  const loadMore = useCallback(async () => {
    if (!hasMore || api.loading) return;
    
    const nextPage = page + 1;
    setPage(nextPage);
    await api.execute();
  }, [page, hasMore, api.loading, api.execute]);

  const refresh = useCallback(async () => {
    setPage(1);
    setAllData([]);
    setHasMore(true);
    await fetchPage(1, false);
  }, [fetchPage]);

  useEffect(() => {
    if (options.immediate) {
      api.execute();
    }
  }, [page]);

  return {
    ...api,
    data: allData,
    page,
    pageSize,
    hasMore,
    loadMore,
    refresh,
    setPage
  };
}

/**
 * 轮询API Hook
 */
export interface UsePollingApiOptions extends UseApiOptions {
  interval?: number; // 轮询间隔（毫秒）
  enabled?: boolean; // 是否启用轮询
}

export function usePollingApi<T = any>(
  apiFunction: () => Promise<ApiResponse<T>>,
  options: UsePollingApiOptions = {}
): UseApiResult<T> {
  const { interval = 5000, enabled = true, ...restOptions } = options;
  const intervalRef = useRef<NodeJS.Timeout>();

  const api = useApi(apiFunction, restOptions);

  useEffect(() => {
    if (enabled && interval > 0) {
      intervalRef.current = setInterval(() => {
        api.execute();
      }, interval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, interval, api.execute]);

  return api;
}

/**
 * 防抖API Hook
 */
export interface UseDebouncedApiOptions extends UseApiOptions {
  delay?: number; // 防抖延迟（毫秒）
}

export function useDebouncedApi<T = any>(
  apiFunction: (...args: any[]) => Promise<ApiResponse<T>>,
  options: UseDebouncedApiOptions = {}
): UseApiResult<T> {
  const { delay = 500, ...restOptions } = options;
  const timeoutRef = useRef<NodeJS.Timeout>();

  const api = useApi(apiFunction, { ...restOptions, immediate: false });

  const debouncedExecute = useCallback((...args: any[]) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    return new Promise<void>((resolve) => {
      timeoutRef.current = setTimeout(async () => {
        await api.execute(...args);
        resolve();
      }, delay);
    });
  }, [api.execute, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ...api,
    execute: debouncedExecute
  };
}

export default useApi;