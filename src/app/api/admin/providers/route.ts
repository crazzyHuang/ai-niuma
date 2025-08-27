import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const runtime = 'nodejs';

/**
 * 获取所有LLM提供商
 */
export async function GET() {
  try {
    // 使用原始SQL查询以避免Prisma schema不匹配问题，并获取关联的models
    const result = await prisma.$queryRaw`
      SELECT 
        p.id, p.name, p.code, p."baseUrl", p."isActive", p."createdAt", p."updatedAt",
        p."createdBy", u.name as creator_name, u.email as creator_email,
        COALESCE(
          JSON_AGG(
            CASE 
              WHEN m.id IS NOT NULL THEN 
                JSON_BUILD_OBJECT(
                  'id', m.id,
                  'name', m.name, 
                  'code', m.code,
                  'contextLength', m."contextLength",
                  'maxTokens', m."maxTokens",
                  'capabilities', m.capabilities,
                  'isActive', m."isActive"
                )
              ELSE NULL
            END
          ) FILTER (WHERE m.id IS NOT NULL), 
          '[]'::json
        ) as models,
        COALESCE(agent_count.count, 0) as agent_count
      FROM "LLMProvider" p
      LEFT JOIN "User" u ON p."createdBy" = u.id
      LEFT JOIN "LLMModel" m ON p.id = m."providerId" AND m."isActive" = true
      LEFT JOIN (
        SELECT m."providerId", COUNT(a.id) as count
        FROM "LLMModel" m
        LEFT JOIN "Agent" a ON m.id = a."modelId" AND a.enabled = true
        GROUP BY m."providerId"
      ) agent_count ON p.id = agent_count."providerId"
      WHERE p."isActive" = true
      GROUP BY p.id, p.name, p.code, p."baseUrl", p."isActive", p."createdAt", p."updatedAt",
               p."createdBy", u.name, u.email, agent_count.count
      ORDER BY p.name ASC
    ` as any[];

    return NextResponse.json({
      success: true,
      data: result.map(provider => ({
        id: provider.id,
        name: provider.name,
        code: provider.code,
        baseUrl: provider.baseUrl,
        isActive: provider.isActive,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
        models: provider.models || [],
        creator: provider.creator_name ? {
          id: provider.createdBy,
          name: provider.creator_name,
          email: provider.creator_email
        } : null,
        agentCount: Number(provider.agent_count || 0)
      }))
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
 * 创建新提供商
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      code,
      baseUrl,
      apiKey,
      isActive = true,
      userId // 创建者ID，实际项目中从session获取
    } = body;

    // 验证必填字段
    if (!name || !code || !baseUrl || !apiKey) {
      return NextResponse.json(
        { 
          success: false,
          error: '缺少必填字段',
          details: '名称、代码、基础URL和API密钥都是必填的'
        },
        { status: 400 }
      );
    }

    // 检查代码是否已存在
    const existingProvider = await prisma.lLMProvider.findUnique({
      where: { code }
    });

    if (existingProvider) {
      return NextResponse.json(
        { 
          success: false,
          error: '提供商代码已存在',
          details: `提供商代码 "${code}" 已被使用`
        },
        { status: 400 }
      );
    }

    // 创建提供商（需要一个默认用户ID）
    const defaultUserId = userId || 'system'; // 实际应用中应该从认证中获取

    // 确保有默认用户
    let creator;
    try {
      creator = await prisma.user.findFirst({
        where: { role: 'admin' }
      });
      
      if (!creator) {
        // 创建默认管理员用户
        creator = await prisma.user.create({
          data: {
            email: 'admin@system.com',
            name: 'System Admin',
            role: 'admin'
          }
        });
      }
    } catch (userError) {
      console.error('创建默认用户失败:', userError);
      return NextResponse.json(
        { 
          success: false,
          error: '系统用户配置错误'
        },
        { status: 500 }
      );
    }

    const provider = await prisma.lLMProvider.create({
      data: {
        name,
        code,
        baseUrl,
        apiKey,
        isActive,
        createdBy: creator.id
      },
      include: {
        models: true,
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
      message: '提供商创建成功',
      data: {
        id: provider.id,
        name: provider.name,
        code: provider.code,
        baseUrl: provider.baseUrl,
        isActive: provider.isActive,
        createdAt: provider.createdAt,
        updatedAt: provider.updatedAt,
        models: [],
        creator: provider.creator,
        agentCount: 0
      }
    });

  } catch (error) {
    console.error('创建提供商失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '创建提供商失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}