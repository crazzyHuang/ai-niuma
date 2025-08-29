import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import Orchestrator from '@/lib/orchestrator';
import { APIResponseHelper } from '@/types/api'

export const runtime = 'nodejs';

/**
 * 发送消息并获取AI回复 (非流式，微信群聊模式)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        APIResponseHelper.error('消息内容不能为空', 'API error'),
        { status: 400 }
      );
    }

    // 验证对话是否存在
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      return NextResponse.json(
        APIResponseHelper.error('对话不存在', 'API error'),
        { status: 404 }
      );
    }

    console.log('💬 收到聊天消息:', { conversationId, text: text.slice(0, 100) });

    // 1. 保存用户消息到数据库
    const userMessage = await prisma.message.create({
      data: {
        convId: conversationId,
        role: 'user',
        content: text,
      },
    });

    console.log('✅ 用户消息已保存:', userMessage.id);

    // 2. 运行AI编排，获取所有AI回复
    const aiMessages = await Orchestrator.runChatOrchestration(
      conversationId,
      text
    );

    console.log('🤖 AI编排完成，生成', aiMessages.length, '条回复');

    // 3. 返回结果
    return NextResponse.json({
      success: true,
      userMessage: {
        id: userMessage.id,
        content: userMessage.content,
        role: userMessage.role,
        createdAt: userMessage.createdAt,
      },
      aiMessages: aiMessages.map(msg => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        createdAt: msg.createdAt,
        agentId: msg.agentId,
        step: msg.step,
        tokens: msg.tokens,
        costCents: msg.costCents
      }))
    });

  } catch (error) {
    console.error('聊天API错误:', error);
    
    return NextResponse.json(
        APIResponseHelper.success({ 
        error: '处理消息时出错',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 })
      );
  }
}
