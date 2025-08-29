import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { APIResponseHelper } from '@/types/api'

export const runtime = 'nodejs';

/**
 * 简单的获取智能体 - 不包含关联查询
 */
export async function GET() {
  try {
    // 不包含任何include或复杂查询
    const agents = await prisma.agent.findMany({
      orderBy: {
        order: 'asc'
      }
    });

    console.log('Found agents:', agents);

    return NextResponse.json({
      success: true,
      count: agents.length,
      data: agents
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