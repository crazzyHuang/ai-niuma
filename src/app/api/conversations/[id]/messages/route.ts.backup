import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const messages = await prisma.message.findMany({
      where: { convId: id },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: conversationId } = await params;
    const body = await request.json();
    const { content, role } = body;

    if (!content || !role) {
      return NextResponse.json({ error: 'Missing content or role' }, { status: 400 });
    }

    // 验证用户是否拥有这个对话
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId: user.userId,
      },
    });

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // 保存用户消息到数据库
    const userMessage = await prisma.message.create({
      data: {
        convId: conversationId,
        role: role,
        content: content,
        tokens: 0, // 用户消息不计算token
        costCents: 0, // 用户消息不产生费用
      },
    });

    console.log(`💾 用户消息已保存 [${conversationId}]:`, userMessage.id);

    return NextResponse.json(userMessage);

  } catch (error) {
    console.error('发送消息失败:', error);
    return NextResponse.json(
      { error: '发送消息失败' },
      { status: 500 }
    );
  }
}