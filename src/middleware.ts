import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

// Define protected routes that require authentication
const PROTECTED_ROUTES = [
  '/chat',
  '/admin',
  '/config',
  '/api/conversations',
  '/api/admin',
]

// Define auth routes that authenticated users shouldn't access
const AUTH_ROUTES = [
  '/auth/login',
  '/auth/register',
]

// Define public API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify',
  '/api/auth/logout',
  '/api/test-agent-bus', // 测试接口
]

// Check if the path matches any of the patterns
function matchesRoute(pathname: string, routes: string[]): boolean {
  return routes.some(route => {
    if (route.endsWith('*')) {
      // Handle wildcard routes
      return pathname.startsWith(route.slice(0, -1))
    }
    return pathname === route || pathname.startsWith(route + '/')
  })
}

// Verify JWT token
function verifyToken(token: string): any {
  try {
    const JWT_SECRET = process.env.JWT_SECRET
    if (!JWT_SECRET) {
      console.error('JWT_SECRET not configured in middleware')
      throw new Error('JWT_SECRET not configured')
    }
    
    return jwt.verify(token, JWT_SECRET)
  } catch (error) {
    // Log JWT errors only in development
    if (process.env.NODE_ENV === 'development') {
      console.error('JWT verification error:', error instanceof Error ? error.message : error)
    }
    return null
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Get token from cookie or header
  let token: string | null = null
  
  // Try to get token from Authorization header (for API requests)
  const authHeader = request.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7)
  }
  
  // Try to get token from cookie (for browser requests)
  if (!token) {
    token = request.cookies.get('auth_token')?.value || null
  }

  // Verify token if present
  const decodedToken = token ? verifyToken(token) : null
  const isAuthenticated = !!decodedToken

  // Debug logging in development only
  if (process.env.NODE_ENV === 'development') {
    if (pathname.startsWith('/auth/login') || pathname.startsWith('/chat')) {
      console.log(`Middleware debug for ${pathname}:`)
      console.log('- Token from cookie:', token ? 'present' : 'null')
      console.log('- Is authenticated:', isAuthenticated)
    }
  }

  // Handle protected routes
  if (matchesRoute(pathname, PROTECTED_ROUTES)) {
    if (!isAuthenticated) {
      // Redirect to login page for unauthenticated users
      const loginUrl = new URL('/auth/login', request.url)
      
      // Add return URL for redirect after login
      if (pathname !== '/') {
        loginUrl.searchParams.set('redirect', pathname)
      }
      
      return NextResponse.redirect(loginUrl)
    }

    // Check admin routes
    if (pathname.startsWith('/admin') && decodedToken?.role !== 'admin') {
      // Redirect non-admin users to chat page
      return NextResponse.redirect(new URL('/chat', request.url))
    }

    // Add user info to request headers for API routes
    if (pathname.startsWith('/api/')) {
      const requestHeaders = new Headers(request.headers)
      requestHeaders.set('x-user-id', decodedToken.userId)
      requestHeaders.set('x-user-email', decodedToken.email)
      requestHeaders.set('x-user-role', decodedToken.role)

      return NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      })
    }
  }

  // Handle auth routes
  if (matchesRoute(pathname, AUTH_ROUTES)) {
    if (isAuthenticated) {
      // Redirect authenticated users away from auth pages
      const redirectUrl = request.nextUrl.searchParams.get('redirect')
      const targetUrl = redirectUrl && redirectUrl.startsWith('/') ? redirectUrl : '/chat'
      return NextResponse.redirect(new URL(targetUrl, request.url))
    }
  }

  // Handle API routes
  if (pathname.startsWith('/api/') && !matchesRoute(pathname, PUBLIC_API_ROUTES)) {
    if (!isAuthenticated) {
      return NextResponse.json(
        { message: '未授权访问，请先登录' },
        { status: 401 }
      )
    }

    // Add user info to request headers
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-user-id', decodedToken.userId)
    requestHeaders.set('x-user-email', decodedToken.email)
    requestHeaders.set('x-user-role', decodedToken.role)

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    })
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
  runtime: 'nodejs', // Use Node.js runtime instead of Edge to support crypto module
}