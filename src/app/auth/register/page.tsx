'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Eye, EyeOff, Mail, Lock, User, UserPlus, Check, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

interface RegisterFormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

interface FormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

interface PasswordStrength {
  score: number
  feedback: string[]
  color: string
}

export default function RegisterPage() {
  const router = useRouter()
  const { login } = useAuth()
  const [formData, setFormData] = useState<RegisterFormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Email validation
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  // Password strength validation
  const checkPasswordStrength = (password: string): PasswordStrength => {
    const checks = {
      length: password.length >= 8,
      lowercase: /[a-z]/.test(password),
      uppercase: /[A-Z]/.test(password),
      numbers: /\d/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    }

    const score = Object.values(checks).filter(Boolean).length
    const feedback: string[] = []

    if (!checks.length) feedback.push('至少8位字符')
    if (!checks.lowercase) feedback.push('包含小写字母')
    if (!checks.uppercase) feedback.push('包含大写字母')
    if (!checks.numbers) feedback.push('包含数字')
    if (!checks.special) feedback.push('包含特殊字符')

    let color = 'text-red-500'
    if (score >= 4) color = 'text-green-500'
    else if (score >= 3) color = 'text-yellow-500'

    return { score, feedback, color }
  }

  // Real-time validation
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'name':
        if (!value.trim()) return '姓名不能为空'
        if (value.trim().length < 2) return '姓名至少需要2个字符'
        break
      case 'email':
        if (!value) return '邮箱地址不能为空'
        if (!validateEmail(value)) return '请输入有效的邮箱地址'
        break
      case 'password':
        if (!value) return '密码不能为空'
        if (value.length < 6) return '密码至少需要6位字符'
        break
      case 'confirmPassword':
        if (!value) return '请确认密码'
        if (value !== formData.password) return '两次密码输入不一致'
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

    // Also validate confirm password when password changes
    if (name === 'password' && formData.confirmPassword) {
      const confirmError = formData.confirmPassword !== value ? '两次密码输入不一致' : undefined
      setErrors(prev => ({
        ...prev,
        confirmPassword: confirmError
      }))
    }
  }

  // Validate entire form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}
    
    newErrors.name = validateField('name', formData.name)
    newErrors.email = validateField('email', formData.email)
    newErrors.password = validateField('password', formData.password)
    newErrors.confirmPassword = validateField('confirmPassword', formData.confirmPassword)
    
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

    const passwordStrength = checkPasswordStrength(formData.password)
    if (passwordStrength.score < 3) {
      toast.error('密码强度不足，请使用更强的密码')
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email,
          password: formData.password,
        }),
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('注册成功！正在为您登录...')
        
        // Use AuthContext login method to update global state
        login(data.data.token, data.data.user)
        
        // Wait a bit longer for cookie to be set, then redirect
        setTimeout(() => {
          console.log('Redirecting to /chat after registration...')
          window.location.replace('/chat')
        }, 500)
      } else {
        toast.error(data.error || '注册失败，请稍后重试')
      }
    } catch (error) {
      console.error('Register error:', error)
      toast.error('网络错误，请检查网络连接')
    } finally {
      setIsLoading(false)
    }
  }

  const passwordStrength = formData.password ? checkPasswordStrength(formData.password) : null

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">创建账户</h2>
        <p className="text-gray-600">开始您的AI助手之旅</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name Field */}
        <div className="space-y-2">
          <Label htmlFor="name">姓名</Label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="请输入您的姓名"
              value={formData.name}
              onChange={handleInputChange}
              className={`pl-10 ${errors.name ? 'border-red-500 focus:border-red-500' : ''}`}
              disabled={isLoading}
            />
          </div>
          {errors.name && (
            <p className="text-sm text-red-500">{errors.name}</p>
          )}
        </div>

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
              placeholder="请设置密码"
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
          
          {/* Password Strength Indicator */}
          {passwordStrength && (
            <div className="mt-2 space-y-2">
              <div className="flex items-center space-x-2">
                <div className="flex-1 bg-gray-200 rounded-full h-1">
                  <div 
                    className={`h-1 rounded-full transition-all duration-300 ${
                      passwordStrength.score >= 4 ? 'bg-green-500' : 
                      passwordStrength.score >= 3 ? 'bg-yellow-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  />
                </div>
                <span className={`text-xs font-medium ${passwordStrength.color}`}>
                  {passwordStrength.score >= 4 ? '强' : passwordStrength.score >= 3 ? '中' : '弱'}
                </span>
              </div>
              {passwordStrength.feedback.length > 0 && (
                <div className="space-y-1">
                  {passwordStrength.feedback.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2 text-xs">
                      <X className="h-3 w-3 text-red-500" />
                      <span className="text-gray-600">{item}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Confirm Password Field */}
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">确认密码</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="请再次输入密码"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              className={`pl-10 pr-10 ${errors.confirmPassword ? 'border-red-500 focus:border-red-500' : ''}`}
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
              disabled={isLoading}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-sm text-red-500">{errors.confirmPassword}</p>
          )}
          {formData.confirmPassword && !errors.confirmPassword && (
            <div className="flex items-center space-x-2 text-xs">
              <Check className="h-3 w-3 text-green-500" />
              <span className="text-green-600">密码匹配</span>
            </div>
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
              注册中...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <UserPlus className="w-4 h-4 mr-2" />
              立即注册
            </div>
          )}
        </Button>
      </form>

      {/* Login Link */}
      <div className="text-center text-sm">
        <span className="text-gray-600">已有账户？ </span>
        <Link
          href="/auth/login"
          className="text-blue-600 hover:text-blue-700 font-medium hover:underline"
        >
          立即登录
        </Link>
      </div>

      {/* Terms */}
      <div className="text-center text-xs text-gray-500">
        注册即表示您同意我们的
        <Link href="/terms" className="text-blue-600 hover:underline mx-1">服务条款</Link>
        和
        <Link href="/privacy" className="text-blue-600 hover:underline mx-1">隐私政策</Link>
      </div>
    </div>
  )
}