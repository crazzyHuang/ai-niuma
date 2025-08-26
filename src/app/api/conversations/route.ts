import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
  try {
    // Find the seeded test user
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Default user not found. Please run database seeding first.' },
        { status: 500 }
      );
    }

    const conversations = await prisma.conversation.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(conversations);
  } catch (error) {
    console.error('Error fetching conversations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title, mode } = await request.json();
    console.log('title', title);
    console.log('mode', mode);
    if (!title || !mode) {
      return NextResponse.json(
        { error: 'Title and mode are required' },
        { status: 400 }
      );
    }

    // Find the seeded test user
    const user = await prisma.user.findUnique({
      where: { email: 'test@example.com' },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Default user not found. Please run database seeding first.' },
        { status: 500 }
      );
    }

    const conversation = await prisma.conversation.create({
      data: {
        userId: user.id,
        title,
        mode,
      },
    });

    return NextResponse.json({
      id: conversation.id,
      title: conversation.title,
      mode: conversation.mode,
    });
  } catch (error) {
    console.error('Error creating conversation:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}