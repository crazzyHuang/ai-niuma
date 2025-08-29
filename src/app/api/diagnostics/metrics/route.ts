/**
 * 系统实时指标API路由
 */

import { NextResponse } from 'next/server';
import diagnosticService from '@/lib/diagnostic-service';
import { APIResponseHelper } from '@/types/api'

export async function GET() {
  try {
    const liveMetrics = diagnosticService.getLiveMetrics();
    
    return NextResponse.json(
        APIResponseHelper.success(liveMetrics)
      );
    
  } catch (error) {
    console.error('获取实时指标失败:', error);
    
    return NextResponse.json(
        APIResponseHelper.success({ error: '获取实时指标失败', details: error instanceof Error ? error.message : String(error)
      ) },
      { status: 500 }
    );
  }
}