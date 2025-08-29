import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const runtime = 'nodejs';

/**
 * 测试Prisma连接和模型访问
 */
export async function GET() {
  try {
    console.log('Testing Prisma connection...');
    
    // 测试基本连接
    await prisma.$connect();
    console.log('✅ Prisma connected');
    
    // 测试可用的模型
    const models = Object.keys(prisma).filter(key => 
      !key.startsWith('_') && 
      !key.startsWith('$') && 
      key !== 'constructor' &&
      typeof prisma[key] === 'object' &&
      prisma[key] && 
      prisma[key].findMany
    );
    
    console.log('Available models:', models);
    
    // 测试每个模型的查询
    const results: Record<string, any> = {};
    
    for (const modelName of models) {
      try {
        const count = await (prisma as any)[modelName].count();
        results[modelName] = { count, status: 'ok' };
      } catch (error) {
        results[modelName] = { 
          count: 0, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Prisma test completed',
      data: {
        prismaConnected: true,
        availableModels: models,
        modelTests: results
      }
    });
    
  } catch (error) {
    console.error('Prisma test failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Prisma test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}