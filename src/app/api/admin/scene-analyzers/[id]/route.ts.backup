import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import prisma from '@/lib/db';

/**
 * 更新场景分析器配置
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      description,
      providerId,
      modelId,
      temperature,
      maxTokens,
      systemPrompt,
      isActive
    } = body;

    // 如果设置为活跃，先将其他的设为非活跃
    if (isActive) {
      await prisma.sceneAnalyzer.updateMany({
        where: { 
          isActive: true,
          id: { not: id }
        },
        data: { isActive: false }
      });
    }

    const updatedAnalyzer = await prisma.sceneAnalyzer.update({
      where: { id },
      data: {
        name,
        description,
        providerId,
        modelId,
        temperature,
        maxTokens,
        systemPrompt,
        isActive,
        updatedAt: new Date()
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

    console.log('✅ 场景分析器更新成功:', updatedAnalyzer.name);
    return NextResponse.json(updatedAnalyzer);

  } catch (error) {
    console.error('Error updating scene analyzer:', error);
    return NextResponse.json(
      { error: 'Failed to update scene analyzer' },
      { status: 500 }
    );
  }
}

/**
 * 删除场景分析器配置
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    await prisma.sceneAnalyzer.delete({
      where: { id }
    });

    console.log('✅ 场景分析器删除成功:', id);
    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error deleting scene analyzer:', error);
    return NextResponse.json(
      { error: 'Failed to delete scene analyzer' },
      { status: 500 }
    );
  }
}