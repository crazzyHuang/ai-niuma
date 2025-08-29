import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import intelligentOrchestrator from '@/lib/intelligent-orchestrator';
import { APIResponseHelper } from '@/types/api'

export const runtime = 'nodejs';

/**
 * 流式对话API (Server-Sent Events)
 * 使用新的智能Agent总线系统，支持真正智能的群聊体验
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const { searchParams } = new URL(request.url);
    const userMessage = searchParams.get('message');

    if (!userMessage) {
      return new NextResponse('Missing message parameter', { status: 400 });
    }

    // 验证对话是否存在
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return new NextResponse('Conversation not found', { status: 404 });
    }

    // 创建可读流
    const stream = new ReadableStream({
      async start(controller) {
        try {
          console.log(`🎯 [流式API] 开始处理消息: ${userMessage.substring(0, 50)}...`);

          // 运行智能编排器
          await intelligentOrchestrator.runIntelligentOrchestration(
            conversationId,
            userMessage,
            (event: any) => {
              try {
                console.log(`📡 [流式API] 发送事件: ${event.type}`, event.agent || '');

                // 统一的事件处理 - 智能编排器发送的事件已经标准化
                const eventData = {
                  ...event,
                  timestamp: event.timestamp || new Date()
                };

                controller.enqueue(`data: ${JSON.stringify(eventData)}\n\n`);

              } catch (error) {
                console.error('❌ [流式API] 发送事件失败:', error);
              }
            }
          );

          console.log(`✅ [流式API] 处理完成: ${conversationId}`);

        } catch (error) {
          console.error('❌ [流式API] 处理失败:', error);
          controller.enqueue(`data: ${JSON.stringify({
            type: 'orchestration_failed',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
          })}\n\n`);
        } finally {
          controller.close();
        }
      },
    });

    // 返回SSE响应
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    });

  } catch (error) {
    console.error('API error:', error);
    return new NextResponse(
      JSON.stringify({
        error: '处理消息时出错',
        details: error instanceof Error ? error.message : '未知错误'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}