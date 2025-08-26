'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  MessageSquare,
  Settings,
  Database,
  Bot,
  FileText,
  Network,
  UsersRound
} from 'lucide-react';

const adminModules = [
  {
    title: '智能体管理',
    description: '创建、编辑和配置AI智能体',
    icon: Bot,
    href: '/admin/agents',
    color: 'bg-blue-500',
    features: ['增删改查', '提示词配置', '参数设置']
  },
  {
    title: '提示词管理',
    description: '管理公共和个性化的提示词模板',
    icon: FileText,
    href: '/admin/prompts',
    color: 'bg-green-500',
    features: ['模板库', '分类管理', '一键美化']
  },
  {
    title: 'LLM提供商',
    description: '配置和管理AI模型提供商',
    icon: Network,
    href: '/admin/providers',
    color: 'bg-purple-500',
    features: ['多厂家支持', 'API密钥管理', '模型配置']
  },
  {
    title: '群聊配置',
    description: '创建和管理智能体群聊组合',
    icon: UsersRound,
    href: '/admin/groups',
    color: 'bg-orange-500',
    features: ['成员选择', '对话模式', '优先级设置']
  },
  {
    title: '系统监控',
    description: '查看系统运行状态和统计',
    icon: Database,
    href: '/admin/monitoring',
    color: 'bg-red-500',
    features: ['性能监控', '使用统计', '错误日志']
  }
];

export default function AdminPage() {
  const [stats] = useState({
    totalAgents: 5,
    totalPrompts: 15,
    totalConversations: 128,
    activeUsers: 12
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">AI朋友圈管理后台</h1>
              <p className="mt-2 text-gray-600">管理系统中的智能体、提示词和对话配置</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="text-green-600 border-green-600">
                系统正常
              </Badge>
              <Button asChild>
                <Link href="/">返回前台</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Bot className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">智能体数量</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalAgents}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <FileText className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">提示词模板</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalPrompts}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <MessageSquare className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">对话总数</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalConversations}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-orange-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">活跃用户</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeUsers}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Modules */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminModules.map((module) => {
            const IconComponent = module.icon;
            return (
              <Card key={module.href} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${module.color}`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{module.title}</CardTitle>
                      <CardDescription className="text-sm">{module.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {module.features.map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                  <Button asChild className="w-full">
                    <Link href={module.href}>
                      进入管理
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">快捷操作</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Settings className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">系统配置</p>
                    <p className="text-sm text-blue-700">调整系统参数和默认设置</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <Database className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">数据管理</p>
                    <p className="text-sm text-green-700">备份、导入和导出数据</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50 border-purple-200">
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <MessageSquare className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium text-purple-900">对话测试</p>
                    <p className="text-sm text-purple-700">测试智能体对话效果</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
