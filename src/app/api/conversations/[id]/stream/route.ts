import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import Orchestrator from '@/lib/orchestrator';

export const runtime = 'nodejs';

/**
 * 流式对话API (Server-Sent Events)
 * 支持实时显示每个agent的回复
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
          // 保存用户消息到数据库
          const userMessageRecord = await prisma.message.create({
            data: {
              convId: conversationId,
              role: 'user',
              content: userMessage,
            },
          });

          // 发送用户消息确认
          const userMessageData = {
            type: 'user_message',
            id: userMessageRecord.id,
            content: userMessageRecord.content,
            timestamp: userMessageRecord.createdAt,
          };
          controller.enqueue(`data: ${JSON.stringify(userMessageData)}\n\n`);

          // 运行流式编排
          await Orchestrator.runStreamOrchestration(
            conversationId,
            userMessage,
            (event: any) => {
              try {
                // 根据事件类型发送不同的数据
                switch (event.type) {
                  case 'step_started':
                    controller.enqueue(`data: ${JSON.stringify({
                      type: 'agent_start',
                      agent: event.step,
                      timestamp: new Date(),
                    })}\n\n`);
                    break;

                  case 'agent_chunk': // FlexibleChatManager sends 'agent_chunk', not 'ai_chunk'
                    controller.enqueue(`data: ${JSON.stringify({
                      type: 'chunk',
                      agent: event.agent,
                      content: event.content, // FlexibleChatManager sends 'content', not 'text'
                      timestamp: new Date(),
                    })}\n\n`);
                    break;

                  case 'agent_complete': // FlexibleChatManager sends 'agent_complete'
                    controller.enqueue(`data: ${JSON.stringify({
                      type: 'agent_complete',
                      agent: event.agent,
                      content: event.content, // FlexibleChatManager includes full content
                      timestamp: new Date(),
                    })}\n\n`);
                    break;

                  case 'conversation_complete': // FlexibleChatManager sends 'conversation_complete'
                    controller.enqueue(`data: ${JSON.stringify({
                      type: 'conversation_complete',
                      timestamp: new Date(),
                    })}\n\n`);
                    break;

                  case 'agent_error': // FlexibleChatManager sends 'agent_error'
                    controller.enqueue(`data: ${JSON.stringify({
                      type: 'agent_error',
                      agent: event.agent, // FlexibleChatManager sends 'agent', not 'step'
                      error: event.error,
                      timestamp: new Date(),
                    })}\n\n`);
                    break;
                    
                  default:
                    console.log('⚠️ Unhandled event type:', event.type, event);
                    break;
                }
              } catch (error) {
                console.error('Error sending event:', error);
              }
            }
          );

        } catch (error) {
          console.error('Stream error:', error);
          controller.enqueue(`data: ${JSON.stringify({
            type: 'error',
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