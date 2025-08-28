'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Bot,
  Network,
  MessageSquare,
  Users,
  DollarSign,
  Activity,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowUpRight
} from 'lucide-react';
import Link from 'next/link';

interface DashboardData {
  stats: {
    agents: { total: number; active: number; growth: string };
    providers: { total: number; active: number; growth: string };
    conversations: { total: number; today: number; growth: string };
    messages: { total: number; today: number; growth: string };
    users: { total: number; active: number; growth: string };
    costs: { total: number; currency: string; growth: string };
  };
  recentActivity: Array<{
    id: string;
    type: string;
    title: string;
    user: string;
    messageCount: number;
    createdAt: string;
    agents: string[];
  }>;
  systemStatus: {
    database: string;
    redis: string;
    llmProviders: string;
    overall: string;
  };
}

export function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const response = await fetch('/api/admin/dashboard');
      if (response.ok) {
        const result = await response.json();
        setData(result.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-500">加载仪表板数据失败</p>
      </div>
    );
  }

  const StatCard = ({ 
    title, 
    value, 
    subValue, 
    growth, 
    icon: Icon, 
    color, 
    href 
  }: {
    title: string;
    value: string | number;
    subValue?: string;
    growth: string;
    icon: any;
    color: string;
    href?: string;
  }) => (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-lg ${color}`}>
              <Icon className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">{title}</p>
            </div>
          </div>
          {href && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={href}>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>
        <div className="mt-3">
          <p className="text-2xl font-bold">{value}</p>
          {subValue && (
            <p className="text-sm text-gray-500">{subValue}</p>
          )}
          <div className="flex items-center mt-1">
            {growth.startsWith('+') ? (
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
            ) : growth.startsWith('-') ? (
              <TrendingDown className="h-3 w-3 text-red-500 mr-1" />
            ) : null}
            <span className={`text-xs ${
              growth.startsWith('+') ? 'text-green-600' : 
              growth.startsWith('-') ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {growth}%
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">仪表板概览</h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">系统运行状态和关键指标监控</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <StatCard
          title="智能体"
          value={data.stats.agents.active}
          subValue={`总共 ${data.stats.agents.total} 个`}
          growth={data.stats.agents.growth}
          icon={Bot}
          color="bg-blue-500"
          href="/admin/agents"
        />
        <StatCard
          title="提供商"
          value={data.stats.providers.active}
          subValue={`总共 ${data.stats.providers.total} 个`}
          growth={data.stats.providers.growth}
          icon={Network}
          color="bg-purple-500"
          href="/admin/providers"
        />
        <StatCard
          title="对话总数"
          value={data.stats.conversations.total}
          subValue={`今日 ${data.stats.conversations.today} 个`}
          growth={data.stats.conversations.growth}
          icon={MessageSquare}
          color="bg-green-500"
          href="/admin/conversations"
        />
        <StatCard
          title="消息总数"
          value={data.stats.messages.total}
          subValue={`今日 ${data.stats.messages.today} 条`}
          growth={data.stats.messages.growth}
          icon={Activity}
          color="bg-orange-500"
        />
        <StatCard
          title="用户数量"
          value={data.stats.users.active}
          subValue={`活跃 ${data.stats.users.total} 个`}
          growth={data.stats.users.growth}
          icon={Users}
          color="bg-teal-500"
        />
        <StatCard
          title="使用成本"
          value={`$${data.stats.costs.total.toFixed(2)}`}
          subValue={data.stats.costs.currency}
          growth={data.stats.costs.growth}
          icon={DollarSign}
          color="bg-red-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 系统状态 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Activity className="h-5 w-5" />
              <span>系统状态</span>
            </CardTitle>
            <CardDescription>各个组件的运行状态</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { name: '数据库', status: data.systemStatus.database, description: 'PostgreSQL连接正常' },
              { name: '缓存', status: data.systemStatus.redis, description: 'Redis服务运行中' },
              { name: 'LLM提供商', status: data.systemStatus.llmProviders, description: `${data.stats.providers.active}个提供商可用` },
              { name: '总体状态', status: data.systemStatus.overall, description: '所有服务运行正常' }
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(item.status)}
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                </div>
                <Badge className={getStatusColor(item.status)}>
                  {item.status === 'healthy' ? '正常' : 
                   item.status === 'warning' ? '警告' : 
                   item.status === 'error' ? '错误' : '未知'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 最近活动 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <span>最近活动</span>
            </CardTitle>
            <CardDescription>最近的对话和系统活动</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentActivity.slice(0, 5).map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <MessageSquare className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{activity.title}</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{activity.user}</span>
                      <span>•</span>
                      <span>{activity.messageCount} 条消息</span>
                      <span>•</span>
                      <span>{new Date(activity.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              ))}
              <Button variant="outline" className="w-full" asChild>
                <Link href="/admin/conversations">查看所有活动</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 快速操作 */}
      <Card>
        <CardHeader>
          <CardTitle>快速操作</CardTitle>
          <CardDescription>常用的管理操作</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { title: '创建智能体', href: '/admin/agents', icon: Bot, color: 'bg-blue-500' },
              { title: '添加提供商', href: '/admin/providers', icon: Network, color: 'bg-purple-500' },
              { title: '管理提示词', href: '/admin/prompts', icon: MessageSquare, color: 'bg-green-500' },
              { title: '系统设置', href: '/admin/settings', icon: Activity, color: 'bg-orange-500' }
            ].map((action) => {
              const Icon = action.icon;
              return (
                <Button key={action.title} variant="outline" asChild className="h-20 flex-col space-y-2">
                  <Link href={action.href}>
                    <div className={`p-2 rounded-lg ${action.color}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <span className="text-sm">{action.title}</span>
                  </Link>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}