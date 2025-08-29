import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { APIResponseHelper } from '@/types/api'

export const runtime = 'nodejs';

/**
 * 获取所有模型
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const providerId = searchParams.get('providerId');

    let query = `
      SELECT 
        m.id, m.name, m.code, m."providerId", m."contextLength", 
        m."maxTokens", m.capabilities, m."isActive", m."createdAt", m."updatedAt",
        p.name as provider_name, p.code as provider_code,
        COALESCE(agent_count.count, 0) as agent_count
      FROM "LLMModel" m
      LEFT JOIN "LLMProvider" p ON m."providerId" = p.id
      LEFT JOIN (
        SELECT "modelId", COUNT(*) as count 
        FROM "Agent" 
        WHERE enabled = true 
        GROUP BY "modelId"
      ) agent_count ON m.id = agent_count."modelId"
      WHERE m."isActive" = true
    `;
    
    if (providerId) {
      query += ` AND m."providerId" = '${providerId}'`;
    }
    
    query += ` ORDER BY p.name, m.name`;

    const models = await prisma.$queryRawUnsafe(query) as any[];

    return NextResponse.json({
      success: true,
      data: models.map(model => ({
        id: model.id,
        name: model.name,
        code: model.code,
        providerId: model.providerId,
        contextLength: model.contextLength,
        maxTokens: model.maxTokens,
        capabilities: model.capabilities,
        isActive: model.isActive,
        createdAt: model.createdAt,
        updatedAt: model.updatedAt,
        provider: {
          name: model.provider_name,
          code: model.provider_code
        },
        agentCount: Number(model.agent_count || 0)
      }))
    });

  } catch (error) {
    console.error('获取模型失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '获取模型失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * 创建新模型
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      code,
      providerId,
      contextLength = 4000,
      maxTokens = 1000,
      capabilities = ['chat'],
      isActive = true
    } = body;

    // 验证必填字段
    if (!name || !code || !providerId) {
      return NextResponse.json(
        { 
          success: false,
          error: '缺少必填字段',
          details: '名称、代码和提供商ID都是必填的'
        },
        { status: 400 }
      );
    }

    // 检查提供商是否存在
    const provider = await prisma.$queryRaw`
      SELECT id, name FROM "LLMProvider" WHERE id = ${providerId}
    ` as any[];

    if (provider.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: '提供商不存在',
          details: `找不到ID为 "${providerId}" 的提供商`
        },
        { status: 400 }
      );
    }

    // 检查代码是否已存在
    const existingModel = await prisma.$queryRaw`
      SELECT id FROM "LLMModel" WHERE code = ${code}
    ` as any[];

    if (existingModel.length > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: '模型代码已存在',
          details: `模型代码 "${code}" 已被使用`
        },
        { status: 400 }
      );
    }

    // 创建模型
    const modelId = `model-${Date.now()}-${Math.random().toString(36).substring(2)}`;

    await prisma.$executeRaw`
      INSERT INTO "LLMModel" (
        id, name, code, "providerId", "contextLength", "maxTokens", 
        capabilities, "isActive", "createdAt", "updatedAt"
      ) VALUES (
        ${modelId}, ${name}, ${code}, ${providerId}, ${contextLength}, 
        ${maxTokens}, ${capabilities}, ${isActive}, NOW(), NOW()
      )
    `;

    // 查询创建的模型
    const createdModel = await prisma.$queryRaw`
      SELECT 
        m.id, m.name, m.code, m."providerId", m."contextLength", 
        m."maxTokens", m.capabilities, m."isActive", m."createdAt", m."updatedAt",
        p.name as provider_name, p.code as provider_code
      FROM "LLMModel" m
      LEFT JOIN "LLMProvider" p ON m."providerId" = p.id
      WHERE m.id = ${modelId}
    ` as any[];

    const modelData = createdModel[0];

    return NextResponse.json({
      success: true,
      message: '模型创建成功',
      data: {
        id: modelData.id,
        name: modelData.name,
        code: modelData.code,
        providerId: modelData.providerId,
        contextLength: modelData.contextLength,
        maxTokens: modelData.maxTokens,
        capabilities: modelData.capabilities,
        isActive: modelData.isActive,
        createdAt: modelData.createdAt,
        updatedAt: modelData.updatedAt,
        provider: {
          name: modelData.provider_name,
          code: modelData.provider_code
        },
        agentCount: 0
      }
    });

  } catch (error) {
    console.error('创建模型失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '创建模型失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

/**
 * 批量导入常用模型
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerId } = body;

    if (!providerId) {
      return NextResponse.json(
        { 
          success: false,
          error: '缺少提供商ID'
        },
        { status: 400 }
      );
    }

    // 检查提供商是否存在
    const provider = await prisma.$queryRaw`
      SELECT id, name, code FROM "LLMProvider" WHERE id = ${providerId}
    ` as any[];

    if (provider.length === 0) {
      return NextResponse.json(
        { 
          success: false,
          error: '提供商不存在'
        },
        { status: 404 }
      );
    }

    // 预设的常用模型配置
    const presetModels = getPresetModels(provider[0].code);
    
    const createdModels = [];
    
    for (const modelConfig of presetModels) {
      try {
        // 检查是否已存在
        const existing = await prisma.$queryRaw`
          SELECT id FROM "LLMModel" WHERE code = ${modelConfig.code}
        ` as any[];

        if (existing.length === 0) {
          const modelId = `model-${Date.now()}-${Math.random().toString(36).substring(2)}`;
          
          await prisma.$executeRaw`
            INSERT INTO "LLMModel" (
              id, name, code, "providerId", "contextLength", "maxTokens", 
              capabilities, "isActive", "createdAt", "updatedAt"
            ) VALUES (
              ${modelId}, ${modelConfig.name}, ${modelConfig.code}, ${providerId}, 
              ${modelConfig.contextLength}, ${modelConfig.maxTokens}, 
              ${modelConfig.capabilities}, true, NOW(), NOW()
            )
          `;
          
          createdModels.push({
            id: modelId,
            ...modelConfig,
            providerId
          });
        }
      } catch (modelError) {
        console.error(`创建模型 ${modelConfig.name} 失败:`, modelError);
      }
    }

    return NextResponse.json({
      success: true,
      message: `成功导入 ${createdModels.length} 个模型`,
      data: createdModels
    });

  } catch (error) {
    console.error('批量导入模型失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '批量导入模型失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}

// 预设模型配置
function getPresetModels(providerCode: string) {
  const modelConfigs: Record<string, any[]> = {
    'openai': [
      {
        name: 'GPT-4o',
        code: 'gpt-4o',
        contextLength: 128000,
        maxTokens: 8000,
        capabilities: ['chat', 'vision', 'function-calling', 'reasoning']
      },
      {
        name: 'GPT-4o Mini',
        code: 'gpt-4o-mini',
        contextLength: 128000,
        maxTokens: 16000,
        capabilities: ['chat', 'vision', 'function-calling']
      },
      {
        name: 'GPT-3.5 Turbo',
        code: 'gpt-3.5-turbo',
        contextLength: 16000,
        maxTokens: 4000,
        capabilities: ['chat', 'function-calling']
      }
    ],
    'deepseek': [
      {
        name: 'DeepSeek Chat',
        code: 'deepseek-chat',
        contextLength: 32000,
        maxTokens: 4000,
        capabilities: ['chat', 'function-calling']
      },
      {
        name: 'DeepSeek Coder',
        code: 'deepseek-coder',
        contextLength: 16000,
        maxTokens: 4000,
        capabilities: ['chat', 'code']
      }
    ]
  };

  return modelConfigs[providerCode] || [];
}