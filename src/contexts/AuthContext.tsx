'use client'

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

// Define User interface
interface User {
  id: string
  email: string
  name: string | null
  role: string
  plan: string
  createdAt: string
  updatedAt: string
}

// Define Auth Context interface
interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (token: string, userData: User) => void
  logout: () => void
  updateUser: (userData: Partial<User>) => void
  checkAuth: () => Promise<boolean>
}

// Create Auth Context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode
}

// JWT Token validation helper
const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return Date.now() >= payload.exp * 1000
  } catch {
    return true
  }
}

// Auth Provider Component
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Computed property for authentication status
  const isAuthenticated = !!user && !!token

  // Initialize auth state from localStorage and cookies
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try localStorage first, then cookies
        let storedToken = localStorage.getItem('auth_token')
        let storedUser = localStorage.getItem('user')
        
        // If not in localStorage, check cookies
        if (!storedToken) {
          const cookies = document.cookie.split(';')
          const tokenCookie = cookies.find(c => c.trim().startsWith('auth_token='))
          if (tokenCookie) {
            storedToken = tokenCookie.split('=')[1]
          }
        }

        if (storedToken) {
          // Check if token is expired
          if (isTokenExpired(storedToken)) {
            // Token expired, clear storage
            localStorage.removeItem('auth_token')
            localStorage.removeItem('user')
            document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
            setIsLoading(false)
            return
          }

          // If we have user data, use it; otherwise verify with server to get user data
          if (storedUser) {
            const userData = JSON.parse(storedUser)
            setToken(storedToken)
            setUser(userData)
          }

          // Verify token with server and get/update user data
          const isValid = await verifyTokenWithServer(storedToken)
          if (!isValid) {
            // Server rejected token, logout user
            logout()
            return
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        // Clear potentially corrupted data
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  // Verify token with server
  const verifyTokenWithServer = async (authToken: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        // Update user data if server returns updated info
        if (data.user) {
          setUser(data.user)
          setToken(authToken) // Ensure token is set
          localStorage.setItem('user', JSON.stringify(data.user))
        }
        return true
      }

      return false
    } catch (error) {
      console.error('Token verification error:', error)
      return false
    }
  }

  // Check authentication status
  const checkAuth = async (): Promise<boolean> => {
    if (!token) return false

    if (isTokenExpired(token)) {
      logout()
      return false
    }

    const isValid = await verifyTokenWithServer(token)
    if (!isValid) {
      logout()
      return false
    }

    return true
  }

  // Login function
  const login = (authToken: string, userData: User) => {
    setToken(authToken)
    setUser(userData)
    localStorage.setItem('auth_token', authToken)
    localStorage.setItem('user', JSON.stringify(userData))
    
    // Note: Cookie is now set server-side by the login API
    // No need to set it manually here anymore
  }

  // Logout function
  const logout = async () => {
    try {
      // Call server logout endpoint to clear cookie
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Logout API error:', error)
      // Continue with logout even if API fails
    }

    // Clear local state and storage
    setToken(null)
    setUser(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    
    // Clear cookie as fallback (in case API didn't work)
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    
    // Redirect to login page
    router.push('/auth/login')
    toast.info('您已成功退出登录')
  }

  // Update user data
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
    }
  }

  // Context value
  const contextValue: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated,
    login,
    logout,
    updateUser,
    checkAuth,
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  )
}

// Custom hook to use Auth Context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext