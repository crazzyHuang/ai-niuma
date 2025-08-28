'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Bot,
  FileText,
  Network,
  UsersRound,
  BarChart3,
  Settings,
  Home,
  MessageSquare,
  ChevronLeft,
  Activity
} from 'lucide-react';
import { AdminPage } from './AdminLayout';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  currentPage: AdminPage;
  onPageChange: (page: AdminPage) => void;
}

const navigationItems = [
  {
    title: '概览',
    key: 'dashboard' as AdminPage,
    icon: BarChart3,
    description: '系统概览和统计'
  },
  {
    title: '智能体',
    key: 'agents' as AdminPage,
    icon: Bot,
    description: '智能体管理'
  },
  {
    title: '提供商',
    key: 'providers' as AdminPage,
    icon: Network,
    description: 'LLM提供商配置'
  },
  {
    title: '提示词',
    key: 'prompts' as AdminPage,
    icon: FileText,
    description: '提示词模板管理'
  },
  {
    title: '群聊',
    key: 'groups' as AdminPage,
    icon: UsersRound,
    description: '智能体群聊配置'
  },
  {
    title: '对话',
    key: 'conversations' as AdminPage,
    icon: MessageSquare,
    description: '对话记录管理'
  },
  {
    title: '监控',
    key: 'monitoring' as AdminPage,
    icon: Activity,
    description: '系统监控'
  },
  {
    title: '设置',
    key: 'settings' as AdminPage,
    icon: Settings,
    description: '系统设置'
  }
];

export function AdminSidebar({ collapsed, onToggle, currentPage, onPageChange }: AdminSidebarProps) {
  return (
    <div className={cn(
      "fixed left-0 top-0 z-40 h-screen bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo区域 */}
      <div className="flex h-16 items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <button 
            onClick={() => onPageChange('dashboard')}
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <Bot className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold">AI管理</span>
          </button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className={cn(
            "h-4 w-4 transition-transform duration-200",
            collapsed && "rotate-180"
          )} />
        </Button>
      </div>

      {/* 导航菜单 */}
      <nav className="p-2 space-y-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentPage === item.key;
          
          return (
            <button
              key={item.key}
              onClick={() => onPageChange(item.key)}
              className={cn(
                "w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-left",
                isActive 
                  ? "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary" 
                  : "text-gray-700 dark:text-gray-300"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="truncate">{item.title}</p>
                  {!collapsed && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {item.description}
                    </p>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* 底部操作区域 */}
      <div className="absolute bottom-4 left-0 right-0 px-2">
        <Link
          href="/"
          className={cn(
            "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          )}
        >
          <Home className="h-5 w-5 flex-shrink-0" />
          {!collapsed && <span>返回前台</span>}
        </Link>
      </div>
    </div>
  );
}