/**
 * 系统日志API路由
 */

import { NextRequest, NextResponse } from 'next/server';
import diagnosticService from '@/lib/diagnostic-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level') as 'error' | 'warning' | 'info' | undefined;
    const component = searchParams.get('component');
    const limit = parseInt(searchParams.get('limit') || '100');

    let logBuffer = diagnosticService.getLogBuffer();

    // 按级别过滤
    if (level) {
      logBuffer = logBuffer.filter(log => log.level === level);
    }

    // 按组件过滤
    if (component) {
      logBuffer = logBuffer.filter(log => log.component === component);
    }

    // 限制返回数量
    const limitedLogs = logBuffer.slice(0, limit);

    return NextResponse.json(limitedLogs);
    
  } catch (error) {
    console.error('获取系统日志失败:', error);
    
    return NextResponse.json(
      { error: '获取系统日志失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}