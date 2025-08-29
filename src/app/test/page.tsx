/**
 * 🧪 系统测试页面
 * 
 * 专门用于测试系统流转的页面
 */

import SystemTestPage from '@/components/SystemTestPage';

export default function TestPage() {
  return <SystemTestPage />;
}

export const metadata = {
  title: '系统测试 - AI Agent Bus 流转测试',
  description: '发送测试消息，实时观察AI Agent Bus系统的内部处理流程',
};