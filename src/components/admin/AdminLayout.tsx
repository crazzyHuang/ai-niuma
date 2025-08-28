'use client';

import { useState, Suspense } from 'react';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';
import { AdminDashboard } from './AdminDashboard';
import dynamic from 'next/dynamic';
import { 
  FileText, 
  UsersRound, 
  MessageSquare, 
  Activity, 
  Settings 
} from 'lucide-react';

// 动态导入页面组件  
const AgentsPage = dynamic(() => import('@/app/admin/agents/page'), { 
  ssr: false,
  loading: () => <div className="p-6 text-center">加载中...</div>
});
const ProvidersPage = dynamic(() => import('@/app/admin/providers/page'), { 
  ssr: false,
  loading: () => <div className="p-6 text-center">加载中...</div>
});

interface AdminLayoutProps {
  children?: React.ReactNode;
}

export type AdminPage = 'dashboard' | 'agents' | 'providers' | 'prompts' | 'groups' | 'conversations' | 'monitoring' | 'settings';

export function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState<AdminPage>('dashboard');

  const renderContent = () => {
    switch (currentPage) {
      case 'dashboard':
        return <AdminDashboard />;
      case 'agents':
        return <AgentsPage />;
      case 'providers':
        return <ProvidersPage />;
      case 'prompts':
        return (
          <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">提示词管理</h3>
              <p className="text-gray-500">该功能正在开发中，敬请期待</p>
            </div>
          </div>
        );
      case 'groups':
        return (
          <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <UsersRound className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">群聊管理</h3>
              <p className="text-gray-500">该功能正在开发中，敬请期待</p>
            </div>
          </div>
        );
      case 'conversations':
        return (
          <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">对话管理</h3>
              <p className="text-gray-500">该功能正在开发中，敬请期待</p>
            </div>
          </div>
        );
      case 'monitoring':
        return (
          <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Activity className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">系统监控</h3>
              <p className="text-gray-500">该功能正在开发中，敬请期待</p>
            </div>
          </div>
        );
      case 'settings':
        return (
          <div className="p-6 flex flex-col items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <Settings className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">系统设置</h3>
              <p className="text-gray-500">该功能正在开发中，敬请期待</p>
            </div>
          </div>
        );
      default:
        return children || <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* 侧边栏 */}
      <AdminSidebar 
        collapsed={sidebarCollapsed} 
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
      />
      
      {/* 主要内容区域 */}
      <div className={`transition-all duration-300 ${sidebarCollapsed ? 'ml-16' : 'ml-64'}`}>
        {/* 顶部导航栏 */}
        <AdminHeader 
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
          currentPage={currentPage}
        />
        
        {/* 页面内容 */}
        <main className="p-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}