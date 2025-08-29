import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { APIResponseHelper } from '@/types/api'

export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      where: { enabled: true },
      orderBy: { order: 'asc' },
    });

    return NextResponse.json(
        APIResponseHelper.success(agents)
      );
  } catch (error) {
    console.error('Error fetching agents:', error);
    return NextResponse.json(
        APIResponseHelper.error('Failed to fetch agents', 'API error'),
        { status: 500 }
      );
  }
}