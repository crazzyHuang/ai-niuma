'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, Upload } from 'lucide-react';

// 导入API服务
import { authService } from '@/services/api/auth.service';
import { adminService } from '@/services/api/admin.service';
import { conversationService } from '@/services/api/conversation.service';

// 导入Hooks
import { useApi, usePaginatedApi, usePollingApi, useDebouncedApi } from '@/hooks/useApi';

/**
 * API使用示例组件
 * 展示如何使用统一的网络请求工具
 */
export function ApiUsageExample() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // 示例1: 基础API调用 - 登录
  const loginApi = useApi(
    () => authService.login({ email, password }),
    {
      showSuccessToast: true,
      showErrorToast: true,
      onSuccess: (data) => {
        console.log('登录成功:', data);
        // 登录成功后跳转
        window.location.href = '/chat';
      }
    }
  );

  // 示例2: 分页API - 获取对话列表
  const conversationsApi = usePaginatedApi(
    (params) => conversationService.list(params),
    {
      pageSize: 10,
      immediate: true
    }
  );

  // 示例3: 轮询API - 获取仪表板数据
  const dashboardApi = usePollingApi(
    () => adminService.getDashboard(),
    {
      interval: 30000, // 30秒轮询一次
      enabled: true,
      immediate: true
    }
  );

  // 示例4: 防抖API - 搜索
  const searchApi = useDebouncedApi(
    (keyword: string) => conversationService.list({ search: keyword }),
    {
      delay: 500,
      onSuccess: (data) => {
        console.log('搜索结果:', data);
      }
    }
  );

  // 示例5: 直接调用服务方法
  const handleDirectCall = async () => {
    try {
      // 获取所有Agents
      const response = await adminService.agents.list();
      if (response.success) {
        console.log('Agents列表:', response.data);
      }
    } catch (error) {
      console.error('获取失败:', error);
    }
  };

  // 示例6: 文件上传
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { http } = await import('@/lib/http-client');
      const response = await http.upload(
        '/api/upload',
        formData,
        {},
        (progress) => {
          console.log(`上传进度: ${progress}%`);
        }
      );

      if (response.success) {
        console.log('上传成功:', response.data);
      }
    } catch (error) {
      console.error('上传失败:', error);
    }
  };

  // 示例7: 取消请求
  const handleCancelRequest = () => {
    conversationService.cancelRequest('conversation-id');
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">API使用示例</h1>

      {/* 示例1: 基础API调用 */}
      <Card>
        <CardHeader>
          <CardTitle>基础API调用 - 登录</CardTitle>
          <CardDescription>使用useApi Hook进行登录请求</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="email">邮箱</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div>
            <Label htmlFor="password">密码</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
            />
          </div>
          <Button
            onClick={() => loginApi.execute()}
            disabled={loginApi.loading}
          >
            {loginApi.loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            登录
          </Button>
          {loginApi.error && (
            <p className="text-sm text-red-500">错误: {loginApi.error.message}</p>
          )}
        </CardContent>
      </Card>

      {/* 示例2: 分页API */}
      <Card>
        <CardHeader>
          <CardTitle>分页API - 对话列表</CardTitle>
          <CardDescription>使用usePaginatedApi Hook获取分页数据</CardDescription>
        </CardHeader>
        <CardContent>
          {conversationsApi.loading && !conversationsApi.data ? (
            <div className="flex justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {conversationsApi.data?.map((conversation) => (
                  <div key={conversation.id} className="p-2 border rounded">
                    <p className="font-medium">{conversation.title}</p>
                    <p className="text-sm text-gray-500">{conversation.mode}</p>
                  </div>
                ))}
              </div>
              {conversationsApi.hasMore && (
                <Button
                  onClick={conversationsApi.loadMore}
                  disabled={conversationsApi.loading}
                  className="mt-4 w-full"
                >
                  {conversationsApi.loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    '加载更多'
                  )}
                </Button>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* 示例3: 轮询API */}
      <Card>
        <CardHeader>
          <CardTitle>轮询API - 仪表板数据</CardTitle>
          <CardDescription>使用usePollingApi Hook定时获取数据</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardApi.data && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">总用户数</p>
                <p className="text-2xl font-bold">{dashboardApi.data.stats.totalUsers}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">总对话数</p>
                <p className="text-2xl font-bold">{dashboardApi.data.stats.totalConversations}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">总消息数</p>
                <p className="text-2xl font-bold">{dashboardApi.data.stats.totalMessages}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">总智能体数</p>
                <p className="text-2xl font-bold">{dashboardApi.data.stats.totalAgents}</p>
              </div>
            </div>
          )}
          <Button
            onClick={() => dashboardApi.execute()}
            variant="outline"
            className="mt-4"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            手动刷新
          </Button>
        </CardContent>
      </Card>

      {/* 示例4: 防抖API */}
      <Card>
        <CardHeader>
          <CardTitle>防抖API - 搜索</CardTitle>
          <CardDescription>使用useDebouncedApi Hook实现搜索防抖</CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="输入搜索关键词..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              searchApi.execute(e.target.value);
            }}
          />
          {searchApi.loading && (
            <p className="mt-2 text-sm text-gray-500">搜索中...</p>
          )}
          {searchApi.data && (
            <p className="mt-2 text-sm">
              找到 {searchApi.data.length} 个结果
            </p>
          )}
        </CardContent>
      </Card>

      {/* 示例5: 直接调用 */}
      <Card>
        <CardHeader>
          <CardTitle>直接调用服务方法</CardTitle>
          <CardDescription>不使用Hook，直接调用服务方法</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDirectCall}>
            获取Agents列表
          </Button>
        </CardContent>
      </Card>

      {/* 示例6: 文件上传 */}
      <Card>
        <CardHeader>
          <CardTitle>文件上传</CardTitle>
          <CardDescription>使用http.upload方法上传文件</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="file-upload" className="cursor-pointer">
            <div className="flex items-center gap-2 p-4 border-2 border-dashed rounded-lg hover:bg-gray-50">
              <Upload className="h-5 w-5" />
              <span>点击选择文件</span>
            </div>
            <Input
              id="file-upload"
              type="file"
              className="hidden"
              onChange={handleFileUpload}
            />
          </Label>
        </CardContent>
      </Card>

      {/* 示例7: 取消请求 */}
      <Card>
        <CardHeader>
          <CardTitle>取消请求</CardTitle>
          <CardDescription>取消正在进行的请求</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCancelRequest} variant="destructive">
            取消请求
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default ApiUsageExample;