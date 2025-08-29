/**
 * 测试Agent总线系统的API接口
 */

import { NextRequest, NextResponse } from 'next/server';
import intelligentOrchestrator from '@/lib/intelligent-orchestrator';

export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    console.log('🧪 [测试API] 检查Agent总线系统状态');

    // 获取系统健康状态
    const systemHealth = await intelligentOrchestrator.getSystemHealth();

    return NextResponse.json({
      success: true,
      message: '✅ Agent总线系统运行正常',
      data: systemHealth,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [测试API] 系统检查失败:', error);
    
    return NextResponse.json({
      success: false,
      message: '❌ Agent总线系统异常',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message = '你好，测试消息' } = body;

    console.log('🧪 [测试API] 测试群聊功能:', message);

    // 模拟一个测试对话
    const testRequest = {
      conversationId: 'test-conversation',
      userMessage: message,
      conversationHistory: [],
      availableAgents: [
        {
          id: 'test-agent-1',
          name: '测试助手',
          roleTag: 'EMPATHY',
          systemPrompt: '你是一个友善的测试助手，总是给予积极的回应。',
          color: '#3B82F6'
        },
        {
          id: 'test-agent-2', 
          name: '实用顾问',
          roleTag: 'PRACTICAL',
          systemPrompt: '你是一个实用的顾问，专门提供有用的建议和解决方案。',
          color: '#10B981'
        }
      ]
    };

    const events: any[] = [];

    // 直接测试Agent总线
    const agentBus = (await import('@/lib/intelligent-agent-bus')).default;
    const result = await agentBus.processGroupChatRequest(testRequest);

    return NextResponse.json({
      success: true,
      message: '✅ 群聊测试完成',
      data: {
        result,
        events,
        testMessage: message
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [测试API] 群聊测试失败:', error);
    
    return NextResponse.json({
      success: false,
      message: '❌ 群聊测试失败',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}