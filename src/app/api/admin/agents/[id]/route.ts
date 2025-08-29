import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { APIResponseHelper } from '@/types/api'

export const runtime = 'nodejs';

/**
 * 获取单个智能体
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const agent = await prisma.agent.findUnique({
      where: { id },
      include: {
        model: {
          include: {
            provider: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    if (!agent) {
      return NextResponse.json(
        { 
          success: false,
          error: '智能体不存在'
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: agent.id,
        name: agent.name,
        code: agent.roleTag,
        description: agent.description,
        avatar: agent.avatar,
        color: agent.color,
        temperature: agent.temperature,
        maxTokens: agent.maxTokens,
        prompt: agent.prompt,
        isActive: agent.enabled,
        order: agent.order,
        createdAt: agent.createdAt,
        updatedAt: agent.updatedAt,
        model: agent.model ? {
          id: agent.model.id,
          name: agent.model.name,
          code: agent.model.code,
          provider: {
            name: agent.model.provider.name,
            code: agent.model.provider.code
          }
        } : null,
        creator: agent.creator
      }
    });

  } catch (error) {
    console.error('获取智能体失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '获取智能体失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * 更新智能体
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    const {
      name,
      code, // roleTag
      description,
      avatar,
      color,
      temperature,
      maxTokens,
      prompt,
      modelId,
      isActive,
      order
    } = body;

    // 检查智能体是否存在
    const existingAgent = await prisma.agent.findUnique({
      where: { id }
    });

    if (!existingAgent) {
      return NextResponse.json(
        { 
          success: false,
          error: '智能体不存在'
        },
        { status: 404 }
      );
    }

    // 如果要更新roleTag，检查是否重复
    if (code && code !== existingAgent.roleTag) {
      const duplicateAgent = await prisma.agent.findUnique({
        where: { roleTag: code }
      });

      if (duplicateAgent) {
        return NextResponse.json(
          { 
            success: false,
            error: '代码标识已存在',
            details: `智能体代码 "${code}" 已被使用`
          },
          { status: 400 }
        );
      }
    }

    // 更新智能体
    const updatedAgent = await prisma.agent.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(code !== undefined && { roleTag: code }),
        ...(description !== undefined && { description }),
        ...(avatar !== undefined && { avatar }),
        ...(color !== undefined && { color }),
        ...(temperature !== undefined && { temperature }),
        ...(maxTokens !== undefined && { maxTokens }),
        ...(prompt !== undefined && { prompt }),
        ...(modelId !== undefined && { modelId }),
        ...(isActive !== undefined && { enabled: isActive }),
        ...(order !== undefined && { order }),
        updatedAt: new Date()
      },
      include: {
        model: {
          include: {
            provider: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: '智能体更新成功',
      data: {
        id: updatedAgent.id,
        name: updatedAgent.name,
        code: updatedAgent.roleTag,
        description: updatedAgent.description,
        avatar: updatedAgent.avatar,
        color: updatedAgent.color,
        temperature: updatedAgent.temperature,
        maxTokens: updatedAgent.maxTokens,
        prompt: updatedAgent.prompt,
        isActive: updatedAgent.enabled,
        order: updatedAgent.order,
        createdAt: updatedAgent.createdAt,
        updatedAt: updatedAgent.updatedAt,
        model: updatedAgent.model ? {
          id: updatedAgent.model.id,
          name: updatedAgent.model.name,
          code: updatedAgent.model.code,
          provider: {
            name: updatedAgent.model.provider.name,
            code: updatedAgent.model.provider.code
          }
        } : null,
        creator: updatedAgent.creator
      }
    });

  } catch (error) {
    console.error('更新智能体失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '更新智能体失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * 删除智能体
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 检查智能体是否存在
    const existingAgent = await prisma.agent.findUnique({
      where: { id }
    });

    if (!existingAgent) {
      return NextResponse.json(
        { 
          success: false,
          error: '智能体不存在'
        },
        { status: 404 }
      );
    }

    // 检查是否有关联的消息记录
    const messageCount = await prisma.message.count({
      where: { agentId: existingAgent.roleTag }
    });

    if (messageCount > 0) {
      // 如果有消息记录，只禁用而不删除
      await prisma.agent.update({
        where: { id },
        data: { 
          enabled: false,
          updatedAt: new Date()
        }
      });

      return NextResponse.json({
        success: true,
        message: '智能体已禁用（因为存在历史消息记录）',
        data: { id, disabled: true }
      });
    } else {
      // 如果没有消息记录，可以安全删除
      await prisma.agent.delete({
        where: { id }
      });

      return NextResponse.json({
        success: true,
        message: '智能体删除成功',
        data: { id, deleted: true }
      });
    }

  } catch (error) {
    console.error('删除智能体失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '删除智能体失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}