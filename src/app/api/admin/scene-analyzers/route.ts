import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/db';

/**
 * 获取所有场景分析器配置
 */
export async function GET(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sceneAnalyzers = await prisma.sceneAnalyzer.findMany({
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true
          }
        },
        model: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(sceneAnalyzers);
  } catch (error) {
    console.error('Error fetching scene analyzers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch scene analyzers' },
      { status: 500 }
    );
  }
}

/**
 * 创建新的场景分析器配置
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      name,
      description,
      providerId,
      modelId,
      temperature = 0.3,
      maxTokens = 2000,
      systemPrompt,
      isActive = false
    } = body;

    if (!name || !providerId || !modelId || !systemPrompt) {
      return NextResponse.json(
        { error: 'Missing required fields: name, providerId, modelId, systemPrompt' },
        { status: 400 }
      );
    }

    // 如果设置为活跃，先将其他的设为非活跃
    if (isActive) {
      await prisma.sceneAnalyzer.updateMany({
        where: { isActive: true },
        data: { isActive: false }
      });
    }

    const sceneAnalyzer = await prisma.sceneAnalyzer.create({
      data: {
        name,
        description,
        providerId,
        modelId,
        temperature,
        maxTokens,
        systemPrompt,
        isActive,
        createdBy: user.userId
      },
      include: {
        provider: {
          select: {
            id: true,
            name: true,
            code: true,
            isActive: true
          }
        },
        model: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        }
      }
    });

    console.log('✅ 场景分析器创建成功:', sceneAnalyzer.name);
    return NextResponse.json(sceneAnalyzer, { status: 201 });

  } catch (error) {
    console.error('Error creating scene analyzer:', error);
    return NextResponse.json(
      { error: 'Failed to create scene analyzer' },
      { status: 500 }
    );
  }
}