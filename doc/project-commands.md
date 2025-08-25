# AI 朋友圈项目 - 命令参考指南

## 📋 项目状态概览

### ✅ 已完成设置
- [x] Next.js 项目初始化 (TypeScript + Tailwind CSS)
- [x] Docker 服务配置 (PostgreSQL + Redis)
- [x] Prisma 数据库配置和迁移
- [x] shadcn/ui 组件库设置
- [x] 种子数据填充

### 🚧 待实现功能
- [ ] 后端 API 接口 (会话创建、消息发送、SSE)
- [ ] 编排器引擎 (模拟 AI 响应)
- [ ] 前端聊天界面
- [ ] 实时消息流处理

## 🛠️ 核心命令

### Docker 服务管理
```bash
# 启动所有服务 (PostgreSQL + Redis)
docker-compose up -d

# 查看服务状态
docker-compose ps

# 停止所有服务
docker-compose down

# 查看服务日志
docker-compose logs -f

# 重启特定服务
docker-compose restart postgres
docker-compose restart redis
```

### 数据库管理 (Prisma)
```bash
# 生成 Prisma 客户端
npx prisma generate

# 运行数据库迁移
npx prisma migrate dev --name [migration-name]

# 查看数据库状态
npx prisma studio

# 重置数据库 (⚠️ 会删除所有数据)
npx prisma migrate reset

# 填充种子数据
npx prisma db seed

# 查看数据库结构
npx prisma db push --preview-feature
```

### 项目开发
```bash
# 启动开发服务器
npm run dev
# 或使用 pnpm
pnpm dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start

# 代码检查
npm run lint
```

### 包管理 (使用 pnpm)
```bash
# 安装依赖
pnpm install

# 添加依赖
pnpm add [package-name]

# 添加开发依赖
pnpm add -D [package-name]

# 运行脚本
pnpm run [script-name]
```

## 🔧 服务端口和连接

### 本地服务端口
- **Next.js 开发服务器**: http://localhost:3000
- **PostgreSQL 数据库**: localhost:5432
- **Redis 缓存**: localhost:6379
- **Prisma Studio**: http://localhost:5555 (运行 `npx prisma studio` 后)

### 数据库连接信息
```env
DATABASE_URL="postgresql://user:password@localhost:5432/aifriends?schema=public"
REDIS_URL="redis://localhost:6379"
```

## 📁 项目结构

```
ai-niuma/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/            # API 路由
│   │   ├── chat/           # 聊天页面
│   │   └── globals.css     # 全局样式
│   ├── components/         # React 组件
│   │   └── ui/            # shadcn/ui 组件
│   └── lib/               # 工具库
│       ├── db.ts          # Prisma 客户端
│       └── redis.ts       # Redis 客户端
├── prisma/
│   ├── schema.prisma      # 数据库模式
│   ├── seed.ts           # 种子数据
│   └── migrations/       # 数据库迁移
├── docker-compose.yml    # Docker 服务配置
├── prisma.config.ts      # Prisma 配置
└── .env                  # 环境变量
```

## 🚀 开发工作流程

### 1. 启动项目
```bash
# 1. 确保 Docker 服务运行
docker-compose up -d

# 2. 启动开发服务器
pnpm dev
```

### 2. 数据库操作
```bash
# 查看当前数据
npx prisma studio

# 添加新迁移
npx prisma migrate dev --name add-new-feature

# 更新种子数据后重新填充
npx prisma db seed
```

### 3. 添加新功能
```bash
# 添加新的 shadcn/ui 组件
npx shadcn@latest add [component-name]

# 添加新的依赖
pnpm add [package-name]
```

## 🐛 常见问题解决

### Docker 相关问题
```bash
# 检查 Docker 是否运行
docker --version

# 检查 Docker Compose
docker-compose --version

# 如果端口被占用，修改 docker-compose.yml 中的端口
ports:
  - "5433:5432"  # 修改为其他端口
```

### 数据库连接问题
```bash
# 检查数据库服务状态
docker-compose ps

# 查看数据库日志
docker-compose logs postgres

# 测试数据库连接
npx prisma db push --preview-feature
```

### Prisma 相关问题
```bash
# 重新生成 Prisma 客户端
npx prisma generate

# 检查 Prisma 配置
npx prisma validate

# 查看 Prisma 版本
npx prisma --version
```

## 📚 重要文件说明

### 环境变量 (.env)
```env
# 数据库连接
DATABASE_URL="postgresql://user:password@localhost:5432/aifriends?schema=public"

# Redis 连接
REDIS_URL="redis://localhost:6379"

# 未来添加的 API Keys
# OPENAI_API_KEY=your-key-here
```

### Prisma 配置 (prisma.config.ts)
```typescript
import { defineConfig } from 'prisma/config';

export default defineConfig({
  // Prisma 配置设置
});
```

### Docker 服务配置 (docker-compose.yml)
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: aifriends
    ports:
      - "5432:5432"

  redis:
    image: redis:7
    ports:
      - "6379:6379"
```

## 🚀 应用程序测试

### 快速启动
```bash
# 1. 启动 Docker 服务
docker-compose up -d

# 2. 启动开发服务器
pnpm dev

# 3. 打开浏览器访问 http://localhost:3000
```

### 测试聊天功能
1. **创建对话**: 在首页输入对话主题，点击"开始对话"
2. **发送消息**: 在聊天页面输入消息并发送
3. **查看响应**: 观察 AI 的流式响应（共情者 → 建议师 → 关怀师）
4. **实时更新**: 消息会实时显示，支持打字机效果

### 查看数据
```bash
# 查看 Prisma Studio（数据库可视化工具）
npx prisma studio

# 查看所有对话
npx prisma studio --browser=none --port=5555
```

## 🎯 项目完成状态

### ✅ 已完成
- [x] 完整的用户界面（首页 + 聊天页面）
- [x] 后端 API (创建会话、发送消息、SSE 流)
- [x] 模拟 AI 响应工作流（3 个智能体）
- [x] 实时消息流和乐观更新
- [x] 响应式设计和现代化 UI
- [x] 完整的数据库集成
- [x] Docker 环境配置

### 🔄 核心功能演示
1. **对话创建**: 用户可以在首页创建新对话
2. **消息发送**: 支持实时消息发送和显示
3. **AI 响应**: 模拟 3 个 AI 智能体的协作响应
4. **流式输出**: 支持逐字显示的打字机效果
5. **数据持久化**: 所有消息和对话都保存在数据库中

## 📈 项目亮点

- **现代化架构**: Next.js 15 + TypeScript + Tailwind CSS
- **实时通信**: Server-Sent Events 实现实时消息
- **类型安全**: 完整的 TypeScript 类型定义
- **用户体验**: 流畅的界面和交互设计
- **开发友好**: 清晰的项目结构和详细文档

## 🔗 重要链接

- [Next.js 文档](https://nextjs.org/docs)
- [Prisma 文档](https://www.prisma.io/docs)
- [shadcn/ui 文档](https://ui.shadcn.com/)
- [Tailwind CSS 文档](https://tailwindcss.com/docs)
- [Docker Compose 文档](https://docs.docker.com/compose/)

## 📝 开发笔记

- 使用 pnpm 作为包管理器
- 代码风格遵循 ESLint 配置
- 数据库使用 Prisma ORM
- UI 使用 shadcn/ui + Tailwind CSS
- 状态管理使用 React hooks
- API 使用 Next.js App Router

---

**最后更新**: 2025-08-25
**项目状态**: 基础设施完成，准备实现业务逻辑