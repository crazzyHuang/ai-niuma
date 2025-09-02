'use client';

import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AuthLayoutProps {
  children: ReactNode;
  adminOnly?: boolean;
  fallback?: ReactNode;
}

/**
 * 统一的认证布局组件
 * 用于保护需要认证的页面，避免每个页面重复认证逻辑
 */
export function AuthLayout({
  children,
  adminOnly = false,
  fallback
}: AuthLayoutProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // 正在加载，用户状态未确定
  if (isLoading) {
    return fallback || (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // 用户未认证或用户数据为空
  if (!isAuthenticated || !user) {
    // 在客户端重定向到登录页，因为middleware应该已经处理了服务端重定向
    if (typeof window !== 'undefined') {
      // 防止循环重定向
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith('/auth/')) {
        window.location.href = `/auth/login?redirect=${encodeURIComponent(currentPath)}`;
      }
    }
    return null;
  }

  // 检查管理员权限（如果需要）
  if (adminOnly && user.role !== 'admin') {
    // 在客户端重定向到聊天页面，因为middleware应该已经处理了服务端重定向
    if (typeof window !== 'undefined') {
      window.location.href = '/chat';
    }
    return null;
  }

  // 用户认证通过，渲染页面内容
  return <>{children}</>;
}

/**
 * 登录页面布局 - 已登录用户将被重定向
 */
export function LoginLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // 已认证用户重定向到聊天页面
  if (isAuthenticated && typeof window !== 'undefined') {
    const redirect = new URLSearchParams(window.location.search).get('redirect') || '/chat';
    window.location.href = redirect;
    return null;
  }

  return <>{children}</>;
}