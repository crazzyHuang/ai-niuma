'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Bell,
  Menu,
  Search,
  User,
  Settings,
  LogOut,
  Moon,
  Sun
} from 'lucide-react';
import { AdminPage } from './AdminLayout';

interface AdminHeaderProps {
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  currentPage: AdminPage;
}

// 面包屑映射
const breadcrumbMap: Record<AdminPage, string> = {
  dashboard: '概览',
  agents: '智能体管理',
  providers: '提供商管理',
  prompts: '提示词管理',
  groups: '群聊管理',
  conversations: '对话管理',
  monitoring: '系统监控',
  settings: '系统设置'
};

export function AdminHeader({ sidebarCollapsed, onToggleSidebar, currentPage }: AdminHeaderProps) {
  const currentPageTitle = breadcrumbMap[currentPage] || '管理后台';

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-6">
      {/* 左侧：菜单切换和面包屑 */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleSidebar}
          className="md:hidden"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
          <span>管理后台</span>
          <span>/</span>
          <span className="font-medium text-gray-900 dark:text-white">
            {currentPageTitle}
          </span>
        </div>
      </div>

      {/* 右侧：搜索、通知、用户菜单 */}
      <div className="ml-auto flex items-center gap-4">
        {/* 搜索按钮 */}
        <Button variant="ghost" size="sm" className="hidden md:flex">
          <Search className="h-4 w-4" />
        </Button>

        {/* 通知 */}
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          <Badge 
            variant="destructive" 
            className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
          >
            3
          </Badge>
        </Button>

        {/* 系统状态 */}
        <Badge variant="outline" className="hidden md:flex text-green-600 border-green-600">
          <div className="mr-1 h-2 w-2 rounded-full bg-green-600" />
          系统正常
        </Badge>

        {/* 用户菜单 */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  A
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <div className="flex items-center justify-start gap-2 p-2">
              <div className="flex flex-col space-y-1 leading-none">
                <p className="font-medium">系统管理员</p>
                <p className="w-[200px] truncate text-sm text-muted-foreground">
                  admin@system.com
                </p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>个人资料</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>设置</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Moon className="mr-2 h-4 w-4" />
              <span>切换主题</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <LogOut className="mr-2 h-4 w-4" />
              <span>退出登录</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}