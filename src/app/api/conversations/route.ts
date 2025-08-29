import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { APIResponseHelper } from '@/types/api'

export async function GET(request: NextRequest) {
  try {
    // Get user ID from middleware headers
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        APIResponseHelper.error('Unauthorized', 'API error'),
        { status: 401 }
      );
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(
        APIResponseHelper.success(conversations)
      );
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
        APIResponseHelper.error('Failed to fetch conversations', 'API error'),
        { status: 500 }
      );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, mode, selectedAgents } = await request.json();
    
    if (!title || !mode) {
      return NextResponse.json(
        APIResponseHelper.error('Title and mode are required', 'API error'),
        { status: 400 }
      );
    }

    // Get user ID from middleware headers
    const userId = request.headers.get('x-user-id');
    
    if (!userId) {
      return NextResponse.json(
        APIResponseHelper.error('Unauthorized', 'API error'),
        { status: 401 }
      );
    }

    const conversation = await prisma.conversation.create({
      data: {
        userId,
        title,
        mode,
        selectedAgents: selectedAgents || [], // 保存用户选择的智能体
      },
    });

    return NextResponse.json(
        APIResponseHelper.success({
      id: conversation.id,
      title: conversation.title,
      mode: conversation.mode,
      selectedAgents: conversation.selectedAgents,
    })
      );
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
        APIResponseHelper.error('Failed to create conversation', 'API error'),
        { status: 500 }
      );
  }
}