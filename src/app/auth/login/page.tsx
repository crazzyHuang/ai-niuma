'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Eye, EyeOff, Mail, Lock, LogIn } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { LoginLayout } from '@/components/layout/AuthLayout'
import { APIClient, APIResponseHelper } from '@/types/api'

interface LoginFormData {
  email: string
  password: string
}

interface FormErrors {
  email?: string
  password?: string
}

export default function LoginPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    password: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Real-time validation
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'email':
        if (!value) return '邮箱地址不能为空'
        if (!validateEmail(value)) return '请输入有效的邮箱地址'
        break
      case 'password':
        if (!value) return '密码不能为空'
        if (value.length < 6) return '密码至少需要6位字符'
        break
    }
    return undefined
  }

  // Handle input change with real-time validation
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    
    // Real-time validation
    const error = validateField(name, value)
    setErrors(prev => ({
      ...prev,
      [name]: error
    }))
  }

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    newErrors.email = validateField('email', formData.email)
    newErrors.password = validateField('password', formData.password)
    
    setErrors(newErrors)
    return !Object.values(newErrors).some(error => error)
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) {
      toast.error('请检查表单输入')
      return
    }

    setIsLoading(true)

    try {
      const result = await APIClient.post('/api/auth/login', formData)

      if (APIResponseHelper.isSuccess(result)) {
        toast.success('登录成功！')

        // Use AuthContext login method to update global state
        login(result.data.token, result.data.user)

        // Wait and redirect to chat page
        setTimeout(() => {
          window.location.replace('/chat')
        }, 500)
      } else {
        toast.error(result.error || '登录失败，请稍后重试')
      }
    } catch (error) {
      console.error('Login error:', error)
      toast.error('网络错误，请检查网络连接')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <LoginLayout>
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">欢迎回来</h2>
        <p className="text-gray-600">请登录您的账户</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email Field */}
        <div className="space-y-2">
          <Label htmlFor="email">邮箱地址</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="请输入邮箱地址"
              value={formData.email}
              onChange={handleInputChange}
              className={`pl-10 ${errors.email ? 'border-red-500 focus:border-red-500' : ''}`}
              disabled={isLoading}
            />
          </div>
          {errors.email && (
            <p className="text-sm text-red-500">{errors.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div className="space-y-2">
          <Label htmlFor="password">密码</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="请输入密码"
              value={formData.password}
              onChange={handleInputChange}
              className={`pl-10 pr-10 ${errors.password ? 'border-red-500 focus:border-red-500' : ''}`}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              disabled={isLoading}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-sm text-red-500">{errors.password}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
              登录中...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <LogIn className="w-4 h-4 mr-2" />
              登录
            </div>
          )}
        </Button>
      </form>

      {/* Register Link */}
      <div className="text-center text-sm">
        <span className="text-gray-600">还没有账户？ </span>
        <Link
          href="/auth/register"
          className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
        >
          立即注册
        </Link>
      </div>

      {/* Demo Account Info */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-blue-800 font-medium mb-1">演示账户</p>
        <p className="text-xs text-blue-600">
          邮箱: demo@example.com<br />
          密码: demo123
        </p>
      </div>
    </div>
    </LoginLayout>
  )
}