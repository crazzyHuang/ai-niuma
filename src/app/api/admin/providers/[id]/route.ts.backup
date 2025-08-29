import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const runtime = 'nodejs';

/**
 * 获取单个LLM提供商
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const provider = await prisma.lLMProvider.findUnique({
      where: { id },
      include: {
        models: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            code: true,
            contextLength: true,
            maxTokens: true,
            capabilities: true,
            isActive: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            agents: true
          }
        }
      }
    });

    if (!provider) {
      return NextResponse.json(
        { 
          success: false,
          error: '提供商不存在'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: provider.id,
        name: provider.name,
        code: provider.code,
        baseUrl: provider.baseUrl,
        isActive: provider.isActive,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
        models: provider.models,
        creator: provider.creator,
        agentCount: provider._count.agents
      }
    });

  } catch (error) {
    console.error('获取提供商失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '获取提供商失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * 更新LLM提供商
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const {
      name,
      code,
      baseUrl,
      apiKey,
      isActive = true
    } = body;

    // 验证必填字段
    if (!name || !code || !baseUrl) {
      return NextResponse.json(
        { 
          success: false,
          error: '缺少必填字段',
          details: '名称、代码和基础URL都是必填的'
        },
        { status: 400 }
      );
    }

    // 检查提供商是否存在
    const existingProvider = await prisma.lLMProvider.findUnique({
      where: { id }
    });

    if (!existingProvider) {
      return NextResponse.json(
        { 
          success: false,
          error: '提供商不存在'
        },
        { status: 404 }
      );
    }

    // 检查代码是否与其他提供商冲突
    if (code !== existingProvider.code) {
      const codeConflict = await prisma.lLMProvider.findFirst({
        where: { 
          code,
          id: { not: id }
        }
      });

      if (codeConflict) {
        return NextResponse.json(
          { 
            success: false,
            error: '提供商代码已存在',
            details: `提供商代码 "${code}" 已被其他提供商使用`
          },
          { status: 400 }
        );
      }
    }

    // 构建更新数据
    const updateData: any = {
      name,
      code,
      baseUrl,
      isActive
    };

    // 只在提供API密钥时更新
    if (apiKey && apiKey.trim()) {
      updateData.apiKey = apiKey;
    }

    const provider = await prisma.lLMProvider.update({
      where: { id },
      data: updateData,
      include: {
        models: {
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            code: true,
            contextLength: true,
            maxTokens: true,
            capabilities: true,
            isActive: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            agents: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: '提供商更新成功',
      data: {
        id: provider.id,
        name: provider.name,
        code: provider.code,
        baseUrl: provider.baseUrl,
        isActive: provider.isActive,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
        models: provider.models,
        creator: provider.creator,
        agentCount: provider._count.agents
      }
    });

  } catch (error) {
    console.error('更新提供商失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '更新提供商失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * 删除LLM提供商
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // 检查提供商是否存在
    const existingProvider = await prisma.lLMProvider.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            agents: true,
            models: true
          }
        }
      }
    });

    if (!existingProvider) {
      return NextResponse.json(
        { 
          success: false,
          error: '提供商不存在'
        },
        { status: 404 }
      );
    }

    // 检查是否有关联的智能体
    if (existingProvider._count.agents > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: '无法删除提供商',
          details: `该提供商被 ${existingProvider._count.agents} 个智能体使用，请先移除关联后再删除`
        },
        { status: 400 }
      );
    }

    // 删除提供商（关联的模型会被级联删除）
    await prisma.lLMProvider.delete({
      where: { id }
    });

    return NextResponse.json({
      success: true,
      message: '提供商删除成功'
    });

  } catch (error) {
    console.error('删除提供商失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '删除提供商失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}