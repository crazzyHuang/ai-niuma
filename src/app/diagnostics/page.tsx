/**
 * 🔍 系统诊断页面
 * 
 * 提供完整的系统监控和诊断界面
 */

import { DiagnosticDashboard } from '@/components/DiagnosticDashboard';

export default function DiagnosticsPage() {
  return <DiagnosticDashboard />;
}

export const metadata = {
  title: '系统诊断 - AI Agent Bus 监控',
  description: '实时监控AI Agent Bus系统运行状态和对话流程',
};