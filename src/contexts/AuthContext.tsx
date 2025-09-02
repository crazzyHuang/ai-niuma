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

  // Initialize auth state from localStorage
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Get token and user from localStorage
        const storedToken = localStorage.getItem('auth_token')
        const storedUser = localStorage.getItem('user')

        if (storedToken) {
          // Check if token is expired
          if (isTokenExpired(storedToken)) {
            // Token expired, clear storage
            localStorage.removeItem('auth_token')
            localStorage.removeItem('user')
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
        const result = await response.json()
        // Update user data if server returns updated info
        if (result.success && result.data) {
          setUser(result.data)
          setToken(authToken) // Ensure token is set
          localStorage.setItem('user', JSON.stringify(result.data))
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
  }

  // Logout function
  const logout = () => {
    // Clear local state and storage
    setToken(null)
    setUser(null)
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')

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
