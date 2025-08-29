import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'
import { APIResponseHelper } from '@/types/api'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    // Input validation
    if (!email || !password) {
      return NextResponse.json(
        APIResponseHelper.error('邮箱和密码不能为空', 'Email and password are required'),
        { status: 400 }
      )
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        APIResponseHelper.error('请输入有效的邮箱地址', 'Invalid email format'),
        { status: 400 }
      )
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        password: true,
        name: true,
        role: true,
        plan: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      return NextResponse.json(
        APIResponseHelper.error('邮箱或密码错误', 'Invalid credentials'),
        { status: 401 }
      )
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        APIResponseHelper.error('邮箱或密码错误', 'Invalid credentials'),
        { status: 401 }
      )
    }

    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET
    if (!JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set')
      return NextResponse.json(
        APIResponseHelper.error('服务器配置错误', 'JWT_SECRET not configured'),
        { status: 500 }
      )
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        email: user.email,
        role: user.role 
      },
      JWT_SECRET,
      { 
        expiresIn: '7d' // Token expires in 7 days
      }
    )

    // Prepare user data (exclude password)
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    }

    // Create response with token cookie
    const response = NextResponse.json(
      APIResponseHelper.success({
        token,
        user: userData,
      }, '登录成功')
    )

    // Set JWT token as HTTP-only cookie for security
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days in seconds
      path: '/',
    })

    return response

  } catch (error) {
    console.error('Login error:', error)
    
    // Handle Prisma-specific errors
    if (error instanceof Error && error.message.includes('connection')) {
      return NextResponse.json(
        APIResponseHelper.error('数据库连接错误，请稍后重试', 'Database connection failed'),
        { status: 503 }
      )
    }

    return NextResponse.json(
      APIResponseHelper.error('服务器内部错误，请稍后重试', error instanceof Error ? error.message : 'Unknown error'),
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}