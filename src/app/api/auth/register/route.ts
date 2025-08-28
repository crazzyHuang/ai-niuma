import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json()

    // Input validation
    if (!name || !email || !password) {
      return NextResponse.json(
        { message: '姓名、邮箱和密码不能为空' },
        { status: 400 }
      )
    }

    // Name validation
    if (name.trim().length < 2) {
      return NextResponse.json(
        { message: '姓名至少需要2个字符' },
        { status: 400 }
      )
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: '请输入有效的邮箱地址' },
        { status: 400 }
      )
    }

    // Password strength validation
    if (password.length < 6) {
      return NextResponse.json(
        { message: '密码至少需要6位字符' },
        { status: 400 }
      )
    }

    // Advanced password strength check
    const hasLowercase = /[a-z]/.test(password)
    const hasUppercase = /[A-Z]/.test(password)
    const hasNumbers = /\d/.test(password)
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password)
    const strengthScore = [hasLowercase, hasUppercase, hasNumbers, hasSpecial].filter(Boolean).length

    if (password.length < 8 || strengthScore < 3) {
      return NextResponse.json(
        { message: '密码强度不足，请包含大小写字母、数字和特殊字符，且不少于8位' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    })

    if (existingUser) {
      return NextResponse.json(
        { message: '该邮箱地址已被注册，请使用其他邮箱或直接登录' },
        { status: 409 }
      )
    }

    // Hash password
    const saltRounds = 12
    const hashedPassword = await bcrypt.hash(password, saltRounds)

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'user',
        plan: 'free',
      },
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

    // Generate JWT token
    const JWT_SECRET = process.env.JWT_SECRET
    if (!JWT_SECRET) {
      console.error('JWT_SECRET environment variable is not set')
      return NextResponse.json(
        { message: '服务器配置错误' },
        { status: 500 }
      )
    }

    const token = jwt.sign(
      { 
        userId: newUser.id, 
        email: newUser.email,
        role: newUser.role 
      },
      JWT_SECRET,
      { 
        expiresIn: '7d' // Token expires in 7 days
      }
    )

    // Return success response with user data and token
    return NextResponse.json({
      message: '注册成功',
      token,
      user: newUser,
    }, { status: 201 })

  } catch (error) {
    console.error('Registration error:', error)
    
    // Handle Prisma unique constraint errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint failed')) {
        return NextResponse.json(
          { message: '该邮箱地址已被注册，请使用其他邮箱' },
          { status: 409 }
        )
      }
      
      if (error.message.includes('connection')) {
        return NextResponse.json(
          { message: '数据库连接错误，请稍后重试' },
          { status: 503 }
        )
      }
    }

    return NextResponse.json(
      { message: '服务器内部错误，请稍后重试' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}