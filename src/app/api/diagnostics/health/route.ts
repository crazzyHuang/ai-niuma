/**
 * 系统健康状态API路由
 */

import { NextResponse } from 'next/server';
import diagnosticService from '@/lib/diagnostic-service';

export async function GET() {
  try {
    const systemHealth = await diagnosticService.getSystemHealth();
    
    return NextResponse.json(systemHealth);
    
  } catch (error) {
    console.error('获取系统健康状态失败:', error);
    
    return NextResponse.json(
      { error: '获取系统健康状态失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}