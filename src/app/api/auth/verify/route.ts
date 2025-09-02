import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { APIResponseHelper } from '@/types/api'

const prisma = new PrismaClient()

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null

    if (!token) {
      return NextResponse.json(
        APIResponseHelper.error('未提供认证令牌', 'API error'),
        { status: 401 }
      )
    }

    // Verify JWT token
    const JWT_SECRET = process.env.JWT_SECRET
    if (!JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set')
      return NextResponse.json(
        APIResponseHelper.error('服务器配置错误', 'API error'),
        { status: 500 }
      )
    }

    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return NextResponse.json(
        APIResponseHelper.error('认证令牌已过期，请重新登录', 'API error'),
        { status: 401 }
      )
      } else if (error instanceof jwt.JsonWebTokenError) {
        return NextResponse.json(
        APIResponseHelper.error('无效的认证令牌', 'API error'),
        { status: 401 }
      )
      } else {
        throw error
      }
    }

    // Get user from database to ensure user still exists and get latest data
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        APIResponseHelper.error('用户不存在', 'API error'),
        { status: 401 }
      )
    }

    // Check if email in token matches user email (in case email was changed)
    if (user.email !== decoded.email) {
      return NextResponse.json(
        APIResponseHelper.error('认证令牌无效，请重新登录', 'API error'),
        { status: 401 }
      )
    }

    // Return success response with updated user data
    return NextResponse.json(
      APIResponseHelper.success(user, '认证令牌有效')
    )

  } catch (error) {
    console.error('Token verification error:', error)
    
    // Handle database connection errors
    if (error instanceof Error && error.message.includes('connection')) {
      return NextResponse.json(
        APIResponseHelper.error('数据库连接错误，请稍后重试', 'API error'),
        { status: 503 }
      )
    }

    return NextResponse.json(
        APIResponseHelper.error('服务器内部错误，请稍后重试', 'API error'),
        { status: 500 }
      )
  } finally {
    await prisma.$disconnect()
  }
}
