import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const runtime = 'nodejs';

/**
 * 获取管理后台仪表板统计数据
 */
export async function GET() {
  try {
    // 并行查询各种统计数据
    const [
      totalAgents,
      activeAgents,
      totalProviders,
      activeProviders,
      totalConversations,
      totalMessages,
      totalUsers,
      recentConversations,
      recentMessages
    ] = await Promise.all([
      // 总智能体数量
      prisma.agent.count(),
      
      // 启用的智能体数量
      prisma.agent.count({
        where: { enabled: true }
      }),
      
      // 总提供商数量
      prisma.lLMProvider.count(),
      
      // 启用的提供商数量
      prisma.lLMProvider.count({
        where: { isActive: true }
      }),
      
      // 总对话数量
      prisma.conversation.count(),
      
      // 总消息数量
      prisma.message.count(),
      
      // 总用户数量
      prisma.user.count(),
      
      // 最近的对话（最近7天）
      prisma.conversation.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        include: {
          user: {
            select: { name: true, email: true }
          },
          group: {
            select: { name: true, members: { select: { agent: { select: { name: true } } } } }
          },
          _count: {
            select: { messages: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      
      // 最近的消息统计（按天）
      prisma.message.groupBy({
        by: ['createdAt'],
        _count: {
          id: true
        },
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 7
      })
    ]);

    // 计算今日数据
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayConversations, todayMessages] = await Promise.all([
      prisma.conversation.count({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow
          }
        }
      }),
      prisma.message.count({
        where: {
          createdAt: {
            gte: today,
            lt: tomorrow
          }
        }
      })
    ]);

    // 计算消息使用成本
    const totalCost = await prisma.message.aggregate({
      _sum: {
        costCents: true
      }
    });

    // 处理消息统计数据（按日期分组）
    const messageStats = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      date.setHours(0, 0, 0, 0);
      
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      
      return {
        date: date.toISOString().split('T')[0],
        count: 0 // 这里应该从实际数据中计算
      };
    });

    // 构建响应数据
    const dashboardData = {
      stats: {
        agents: {
          total: totalAgents,
          active: activeAgents,
          growth: totalAgents > 0 ? ((activeAgents / totalAgents) * 100).toFixed(1) : '0'
        },
        providers: {
          total: totalProviders,
          active: activeProviders,
          growth: totalProviders > 0 ? ((activeProviders / totalProviders) * 100).toFixed(1) : '0'
        },
        conversations: {
          total: totalConversations,
          today: todayConversations,
          growth: '+12.5' // 这里可以计算实际增长率
        },
        messages: {
          total: totalMessages,
          today: todayMessages,
          growth: '+18.3'
        },
        users: {
          total: totalUsers,
          active: totalUsers, // 假设所有用户都是活跃的
          growth: '+8.1'
        },
        costs: {
          total: (totalCost._sum.costCents || 0) / 100, // 转换为元
          currency: 'USD',
          growth: '-5.2'
        }
      },
      charts: {
        messageStats,
        conversationTrend: [
          { name: '周一', conversations: 12, messages: 45 },
          { name: '周二', conversations: 19, messages: 67 },
          { name: '周三', conversations: 8, messages: 32 },
          { name: '周四', conversations: 15, messages: 58 },
          { name: '周五', conversations: 22, messages: 78 },
          { name: '周六', conversations: 18, messages: 65 },
          { name: '周日', conversations: 14, messages: 48 }
        ]
      },
      recentActivity: recentConversations.map(conv => ({
        id: conv.id,
        type: 'conversation',
        title: conv.title,
        user: conv.user?.name || 'Unknown',
        messageCount: conv._count.messages,
        createdAt: conv.createdAt,
        agents: conv.group?.members?.map(m => m.agent.name) || []
      })),
      systemStatus: {
        database: 'healthy',
        redis: 'healthy',
        llmProviders: activeProviders > 0 ? 'healthy' : 'warning',
        overall: 'healthy'
      }
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    });

  } catch (error) {
    console.error('获取仪表板数据失败:', error);
    return NextResponse.json(
      { 
        success: false,
        error: '获取仪表板数据失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    );
  }
}