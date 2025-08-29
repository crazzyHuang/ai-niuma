/**
 * 诊断数据API路由
 * 
 * 提供系统诊断数据的RESTful接口
 */

import { NextRequest, NextResponse } from 'next/server';
import diagnosticService from '@/lib/diagnostic-service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // 解析查询参数
    const conversationId = searchParams.get('conversationId');
    const hasErrors = searchParams.get('hasErrors');
    const minQuality = searchParams.get('minQuality');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '50');

    // 构建过滤器
    const filters: any = {};
    
    if (conversationId) {
      filters.conversationId = conversationId;
    }
    
    if (hasErrors !== null) {
      filters.hasErrors = hasErrors === 'true';
    }
    
    if (minQuality) {
      filters.minQuality = parseFloat(minQuality);
    }
    
    if (startDate && endDate) {
      filters.timeRange = {
        start: new Date(startDate),
        end: new Date(endDate)
      };
    }

    // 获取诊断数据
    let diagnostics;
    
    if (Object.keys(filters).length > 0) {
      diagnostics = diagnosticService.searchDiagnostics(filters);
    } else {
      diagnostics = diagnosticService.getAllDiagnostics();
    }

    // 限制返回数量
    const limitedDiagnostics = diagnostics.slice(0, limit);

    return NextResponse.json(limitedDiagnostics);

  } catch (error) {
    console.error('获取诊断数据失败:', error);
    
    return NextResponse.json(
      { error: '获取诊断数据失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, ...params } = body;

    switch (action) {
      case 'start_diagnostic':
        const diagnosticId = await diagnosticService.startConversationDiagnostic(
          params.conversationId,
          params.userMessage
        );
        return NextResponse.json({ diagnosticId });

      case 'finish_diagnostic':
        const result = await diagnosticService.finishConversationDiagnostic(params.diagnosticId);
        return NextResponse.json(result);

      case 'record_analysis':
        diagnosticService.recordAnalysisPhase(
          params.diagnosticId,
          params.aiAnalysis,
          params.sceneAnalysis,
          params.executionPlan,
          params.analysisTime
        );
        return NextResponse.json({ success: true });

      case 'record_execution':
        diagnosticService.recordExecutionPhase(
          params.diagnosticId,
          params.selectedAgents,
          params.executionStrategy,
          params.phaseResults,
          params.totalExecutionTime
        );
        return NextResponse.json({ success: true });

      case 'record_aggregation':
        diagnosticService.recordAggregationPhase(
          params.diagnosticId,
          params.strategy,
          params.qualityScore,
          params.finalResponses,
          params.aggregationTime
        );
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: '未知的操作类型' }, { status: 400 });
    }

  } catch (error) {
    console.error('处理诊断请求失败:', error);
    
    return NextResponse.json(
      { error: '处理诊断请求失败', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}