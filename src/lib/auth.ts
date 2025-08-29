import jwt from 'jsonwebtoken'
import { NextRequest } from 'next/server'
import prisma from './db'

export interface AuthUser {
  userId: string
  email: string
  name: string | null
  role: string
  plan: string
}

/**
 * Verify authentication from request headers
 * Extracts JWT token from Authorization header and validates it
 * Returns user data if valid, throws error if invalid
 */
export async function verifyAuth(request?: NextRequest): Promise<AuthUser | null> {
  try {
    let token: string | null = null

    if (request) {
      // Extract token from Authorization header
      const authHeader = request.headers.get('authorization')
      token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
      
      // If no Bearer token, check for cookie
      if (!token) {
        const cookieHeader = request.headers.get('cookie')
        if (cookieHeader) {
          const cookies = cookieHeader.split(';')
          const authCookie = cookies.find(c => c.trim().startsWith('auth_token='))
          if (authCookie) {
            token = authCookie.split('=')[1]
          }
        }
      }
    }

    if (!token) {
      return null
    }

    // Verify JWT token
    const JWT_SECRET = process.env.JWT_SECRET
    if (!JWT_SECRET) {
      throw new Error('JWT_SECRET environment variable is not set')
    }

    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError || error instanceof jwt.JsonWebTokenError) {
        return null
      }
      throw error
    }

    // Get user from database to ensure user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        plan: true,
      },
    })

    if (!user) {
      return null
    }

    // Check if email in token matches user email
    if (user.email !== decoded.email) {
      return null
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      plan: user.plan,
    }

  } catch (error) {
    console.error('Auth verification error:', error)
    return null
  }
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: { id: string; email: string; role: string }): string {
  const JWT_SECRET = process.env.JWT_SECRET
  if (!JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is not set')
  }

  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

/**
 * Check if user has required role
 */
export function hasRole(user: AuthUser | null, requiredRole: string): boolean {
  if (!user) return false
  return user.role === requiredRole || user.role === 'admin'
}