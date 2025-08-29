import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { APIResponseHelper } from '@/types/api'

export const runtime = 'nodejs';

/**
 * 创建测试LLM提供商
 */
export async function POST() {
  try {
    // 先确保有用户
    let user = await prisma.user.findFirst({
      where: { role: 'admin' }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: 'admin@test.com',
          name: 'Test Admin',
          role: 'admin'
        }
      });
    }

    // 使用原始SQL创建测试提供商，包含所有必需字段
    await prisma.$executeRaw`
      INSERT INTO "LLMProvider" (id, name, code, "baseUrl", "apiKey", model, "isActive", "createdBy", "createdAt", "updatedAt")
      VALUES 
        ('deepseek-provider-1', 'DeepSeek', 'deepseek', 'https://api.deepseek.com/v1', 'test-deepseek-key', 'deepseek-chat', true, ${user.id}, NOW(), NOW()),
        ('openai-provider-1', 'OpenAI', 'openai', 'https://api.openai.com/v1', 'test-openai-key', 'gpt-4o-mini', true, ${user.id}, NOW(), NOW())
    `;

    // 查询创建的数据
    const providers = await prisma.$queryRaw`
      SELECT * FROM "LLMProvider" WHERE code IN ('deepseek', 'openai')
    ` as any[];

    return NextResponse.json({
      success: true,
      message: '测试提供商创建成功',
      data: providers
    });

  } catch (error) {
    console.error('创建测试提供商失败:', error);
    return NextResponse.json({
      success: false,
      error: '创建测试提供商失败',
      details: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 });
  }
}