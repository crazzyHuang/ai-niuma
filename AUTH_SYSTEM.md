# AI牛马认证系统

## 🎯 功能特性

完整的用户认证系统，包含以下功能：

### ✅ 已实现功能

1. **用户注册** (`/auth/register`)
   - 邮箱格式验证
   - 实时密码强度检查
   - 用户名长度验证
   - 密码确认匹配验证
   - 重复邮箱检查

2. **用户登录** (`/auth/login`)
   - 邮箱密码验证
   - JWT token 生成
   - 自动登录状态持久化
   - 错误处理和用户反馈

3. **认证状态管理**
   - React Context 全局状态管理
   - localStorage 持久化存储
   - Token 自动过期检查
   - 服务端 token 验证

4. **路由保护**
   - Next.js 中间件路由守卫
   - 自动重定向未认证用户
   - 已认证用户访问 auth 页面时重定向
   - API 路由权限验证

5. **用户界面**
   - 响应式设计适配移动端
   - 实时表单验证和错误提示
   - 加载状态和错误状态处理
   - 密码可视性切换
   - 用户头像和下拉菜单

## 🗃️ 数据库结构

```sql
-- User 表已添加 password 字段
ALTER TABLE "User" ADD COLUMN "password" TEXT NOT NULL;
```

## 🔐 安全措施

1. **密码加密**: 使用 bcrypt 加密，salt rounds = 12
2. **JWT 认证**: 7天过期时间，包含用户ID、邮箱和角色
3. **输入验证**: 前端和后端双重验证
4. **HTTPS**: 生产环境强制使用 HTTPS
5. **环境变量**: 敏感信息使用环境变量存储

## 📁 文件结构

```
src/
├── app/
│   ├── auth/
│   │   ├── layout.tsx          # 认证页面布局
│   │   ├── login/
│   │   │   └── page.tsx        # 登录页面
│   │   └── register/
│   │       └── page.tsx        # 注册页面
│   ├── api/auth/
│   │   ├── login/
│   │   │   └── route.ts        # 登录API
│   │   ├── register/
│   │   │   └── route.ts        # 注册API
│   │   └── verify/
│   │       └── route.ts        # Token验证API
│   └── layout.tsx              # 包含AuthProvider的根布局
├── contexts/
│   └── AuthContext.tsx         # 认证状态管理
├── hooks/
│   └── useAuth.ts              # 认证Hook
└── middleware.ts               # 路由保护中间件
```

## 🎮 演示账户

```
邮箱: demo@example.com
密码: demo123
```

## 🚀 使用方法

### 1. 环境变量配置

确保 `.env` 文件包含：
```bash
DATABASE_URL="postgresql://user:password@localhost:5432/aifriends?schema=public"
JWT_SECRET="your-secret-key-change-in-production"
```

### 2. 数据库迁移

```bash
npx prisma migrate dev
```

### 3. 创建测试用户

```bash
node scripts/create-test-user.js
```

### 4. 启动开发服务器

```bash
pnpm dev
```

## 🌐 页面路由

- `/` - 首页（未登录显示欢迎页面，已登录重定向到聊天）
- `/auth/login` - 登录页面
- `/auth/register` - 注册页面
- `/chat` - 聊天页面（需要登录）
- `/admin` - 管理页面（需要登录）

## 🔧 API 端点

- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `GET /api/auth/verify` - Token 验证

## 📱 用户体验特性

1. **响应式设计**: 完美适配桌面、平板和手机
2. **实时验证**: 表单输入时即时反馈
3. **密码强度指示器**: 可视化密码安全等级
4. **用户友好的错误信息**: 清晰的中文提示
5. **加载状态**: 优雅的加载动画和状态提示
6. **记住登录状态**: 7天免登录

## 🛡️ 安全最佳实践

1. ✅ 密码哈希加密存储
2. ✅ JWT Token 过期检查
3. ✅ 服务端 Token 验证
4. ✅ CSRF 保护（通过 SameSite cookies）
5. ✅ 输入验证和消毒
6. ✅ 错误信息不泄露敏感信息
7. ✅ 生产环境环境变量保护

## 🔄 扩展计划

- [ ] 忘记密码功能
- [ ] 邮箱验证
- [ ] 两步验证 (2FA)
- [ ] OAuth 第三方登录
- [ ] 用户个人资料管理
- [ ] 密码重置
- [ ] 登录历史记录

## 🐛 故障排除

### 常见问题

1. **数据库连接错误**: 检查 `DATABASE_URL` 环境变量
2. **JWT 错误**: 确认 `JWT_SECRET` 环境变量已设置
3. **登录失败**: 验证邮箱和密码是否正确
4. **页面不重定向**: 清除浏览器缓存和 localStorage

### 调试命令

```bash
# 查看数据库连接
npx prisma db pull

# 重置数据库
npx prisma migrate reset

# 生成 Prisma Client
npx prisma generate
```