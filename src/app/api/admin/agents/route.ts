import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const runtime = 'nodejs';

/**
 * 获取所有智能体
 */
export async function GET() {
  try {
    // 使用原始SQL查询，避免Prisma schema不匹配问题，并关联模型和提供商信息
    const agents = await prisma.$queryRaw`
      SELECT 
        a.id, a.name, a."roleTag", a.description, a.avatar, a.color,
        a.temperature, a."maxTokens", a.prompt, a.enabled, a."order",
        a."updatedAt", a.provider, a."modelId",
        u.id as creator_id, u.name as creator_name, u.email as creator_email,
        m.id as model_id, m.name as model_name, m.code as model_code,
        m."contextLength", m."maxTokens" as model_max_tokens, m.capabilities,
        p.id as provider_id, p.name as provider_name, p.code as provider_code
      FROM "Agent" a
      LEFT JOIN "User" u ON a."createdBy" = u.id
      LEFT JOIN "LLMModel" m ON a."modelId" = m.id
      LEFT JOIN "LLMProvider" p ON m."providerId" = p.id
      WHERE a.enabled = true
      ORDER BY a."order" ASC
    ` as any[];

    return NextResponse.json({
      success: true,
      data: agents.map((agent: any) => ({
        id: agent.id,
        name: agent.name,
        code: agent.roleTag,
        description: agent.description,
        avatar: agent.avatar,
        color: agent.color,
        temperature: Number(agent.temperature),
        maxTokens: Number(agent.maxTokens),
        prompt: agent.prompt,
        isActive: Boolean(agent.enabled),
        order: Number(agent.order),
        createdAt: agent.updatedAt || new Date(),
        updatedAt: agent.updatedAt,
        provider: agent.provider,
        modelId: agent.modelId,
        model: agent.model_id ? {
          id: agent.model_id,
          name: agent.model_name,
          code: agent.model_code,
          contextLength: agent.contextLength,
          maxTokens: agent.model_max_tokens,
          capabilities: agent.capabilities,
          provider: {
            id: agent.provider_id,
            name: agent.provider_name,
            code: agent.provider_code
          }
        } : null,
        creator: agent.creator_id ? {
          id: agent.creator_id,
          name: agent.creator_name,
          email: agent.creator_email
        } : null
      }))
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
 * 创建新智能体
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      code, // roleTag
      description,
      avatar,
      color = '#3B82F6',
      temperature = 0.8,
      maxTokens = 1000,
      prompt,
      modelId,
      isActive = true,
      order,
      userId // 创建者ID，实际项目中从session获取
    } = body;

    // 验证必填字段
    if (!name || !code || !prompt) {
      return NextResponse.json(
        { 
          success: false,
          error: '缺少必填字段',
          details: '名称、代码标识和提示词都是必填的'
        },
        { status: 400 }
      );
    }

    // 检查roleTag是否已存在
    const existingAgent = await prisma.agent.findUnique({
      where: { roleTag: code }
    });

    if (existingAgent) {
      return NextResponse.json(
        { 
          success: false,
          error: '代码标识已存在',
          details: `智能体代码 "${code}" 已被使用`
        },
        { status: 400 }
      );
    }

    // 确保有创建者用户
    let creator = null;
    if (userId && userId !== 'system') {
      creator = await prisma.user.findUnique({
        where: { id: userId }
      });
    }
    
    // 如果没有有效用户，创建或找到系统用户
    if (!creator) {
      creator = await prisma.user.findFirst({
        where: { role: 'admin' }
      });
      
      if (!creator) {
        creator = await prisma.user.create({
          data: {
            email: 'admin@system.com',
            name: 'System Admin',
            role: 'admin'
          }
        });
      }
    }

    // 如果没有指定order，设置为最大order + 1
    let finalOrder = order;
    if (!finalOrder) {
      const lastAgent = await prisma.agent.findFirst({
        orderBy: { order: 'desc' }
      });
      finalOrder = (lastAgent?.order || 0) + 1;
    }

    // 使用原始SQL创建智能体，避免Prisma schema不匹配问题
    const agentId = `agent-${Date.now()}-${Math.random().toString(36).substring(2)}`;
    
    await prisma.$executeRaw`
      INSERT INTO "Agent" (
        id, name, provider, "roleTag", "order", prompt, description, avatar, 
        color, temperature, "maxTokens", "modelId", enabled, "createdBy", "updatedAt"
      ) VALUES (
        ${agentId}, ${name}, 'system', ${code}, ${finalOrder}, ${prompt}, 
        ${description}, ${avatar}, ${color}, ${temperature}, ${maxTokens}, 
        ${modelId}, ${isActive}, ${creator.id}, NOW()
      )
    `;

    // 查询创建的智能体及其关联信息
    const agent = await prisma.$queryRaw`
      SELECT 
        a.id, a.name, a."roleTag", a.description, a.avatar, a.color,
        a.temperature, a."maxTokens", a.prompt, a.enabled, a."order",
        a."updatedAt", a.provider, a."modelId",
        u.id as creator_id, u.name as creator_name, u.email as creator_email,
        m.id as model_id, m.name as model_name, m.code as model_code,
        m."contextLength", m."maxTokens" as model_max_tokens, m.capabilities,
        p.id as provider_id, p.name as provider_name, p.code as provider_code
      FROM "Agent" a
      LEFT JOIN "User" u ON a."createdBy" = u.id
      LEFT JOIN "LLMModel" m ON a."modelId" = m.id
      LEFT JOIN "LLMProvider" p ON m."providerId" = p.id
      WHERE a.id = ${agentId}
    ` as any[];

    const agentData = agent[0];

    return NextResponse.json({
      success: true,
      message: '智能体创建成功',
      data: {
        id: agentData.id,
        name: agentData.name,
        code: agentData.roleTag,
        description: agentData.description,
        avatar: agentData.avatar,
        color: agentData.color,
        temperature: Number(agentData.temperature),
        maxTokens: Number(agentData.maxTokens),
        prompt: agentData.prompt,
        isActive: Boolean(agentData.enabled),
        order: Number(agentData.order),
        createdAt: new Date(),
        updatedAt: agentData.updatedAt,
        modelId: agentData.modelId,
        model: agentData.model_id ? {
          id: agentData.model_id,
          name: agentData.model_name,
          code: agentData.model_code,
          contextLength: agentData.contextLength,
          maxTokens: agentData.model_max_tokens,
          capabilities: agentData.capabilities,
          provider: {
            id: agentData.provider_id,
            name: agentData.provider_name,
            code: agentData.provider_code
          }
        } : null,
        creator: agentData.creator_id ? {
          id: agentData.creator_id,
          name: agentData.creator_name,
          email: agentData.creator_email
        } : null
      }
    });

  } catch (error) {
    console.error('创建智能体失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '创建智能体失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}