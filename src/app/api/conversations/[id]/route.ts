import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { APIResponseHelper } from '@/types/api'

/**
 * 删除单个对话
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    
    // Get user ID from middleware headers
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        APIResponseHelper.error('Unauthorized', 'API error'),
        { status: 401 }
      );
    }

    // 验证对话是否存在且属于当前用户
    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId
      }
    });

    if (!conversation) {
      return NextResponse.json(
        APIResponseHelper.error('Conversation not found or unauthorized', 'API error'),
        { status: 404 }
      );
    }

    // 删除对话及其相关的消息（级联删除）
    await prisma.$transaction(async (tx) => {
      // 先删除相关的消息
      await tx.message.deleteMany({
        where: { convId: conversationId }
      });
      
      // 然后删除对话
      await tx.conversation.delete({
        where: { id: conversationId }
      });
    });

    return NextResponse.json({ 
      success: true,
      message: 'Conversation deleted successfully' 
    });

  } catch (error) {
    console.error('Error deleting conversation:', error);
    return NextResponse.json(
        APIResponseHelper.error('Failed to delete conversation', 'API error'),
        { status: 500 }
      );
  }
}

/**
 * 获取单个对话详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: conversationId } = await params;
    
    // Get user ID from middleware headers
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        APIResponseHelper.error('Unauthorized', 'API error'),
        { status: 401 }
      );
    }

    const conversation = await prisma.conversation.findFirst({
      where: {
        id: conversationId,
        userId
      }
    });

    if (!conversation) {
      return NextResponse.json(
        APIResponseHelper.error('Conversation not found', 'API error'),
        { status: 404 }
      );
    }

    return NextResponse.json(
        APIResponseHelper.success(conversation)
      );

  } catch (error) {
    console.error('Error fetching conversation:', error);
    return NextResponse.json(
        APIResponseHelper.error('Failed to fetch conversation', 'API error'),
        { status: 500 }
      );
  }
}