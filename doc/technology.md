# AI 朋友圈 MVP 技术实现指南

## 1. 项目目标

本文档旨在指导完成 "AI 朋友圈" 项目的第一个可运行版本。

### 核心目标
搭建起整个应用骨架，并实现一个完整的、端到端的"消息-处理-响应"链路。

### MVP 核心功能点
- **项目初始化**：搭建 Next.js 全栈项目，并集成所有核心依赖
- **数据模型**：使用 Prisma 定义数据模型，并完成数据库初始化与数据填充 (Seeding)
- **核心 API**：实现会话创建、消息发送和 SSE (Server-Sent Events) 事件流接口
- **编排器原型**：实现一个模拟的 (Mocked) 编排引擎，它能按预设流程顺序执行，并通过 SSE 返回模拟的 AI 响应
- **基础前端**：创建一个基础的聊天界面，能够发送消息并实时接收、渲染 SSE 事件流

### 注意事项
在 MVP 阶段，我们不会真实调用任何大语言模型 (LLM) 的 API。所有 AI Agent 的响应都将是预设的模拟数据，目的是为了验证整个技术链路的通畅。

## 2. 步骤一：项目初始化与环境配置

### 2.1 初始化项目

创建 Next.js 应用：
```bash
npx create-next-app@latest ai-friends-circle --typescript --tailwind --eslint
```

进入项目目录：
```bash
cd ai-friends-circle
```

安装核心依赖：
```bash
npm install prisma @prisma/client
npm install -D prisma
npm install @radix-ui/react-icons lucide-react
npm install redis
```

初始化 shadcn/ui：
```bash
npx shadcn-ui@latest init
```
(根据提示选择默认选项即可)

安装需要的 shadcn/ui 组件：
```bash
npx shadcn@latest add button card input scroll-area separator avatar alert toast
```
-- The toast component is deprecated. Use the sonner component instead.

### 2.2 配置本地开发环境

在项目根目录创建 `docker-compose.yml` 文件，用于管理本地的 Postgres 和 Redis 服务。

**docker-compose.yml 内容：**
```yaml
version: '3.8'
services:
  postgres:
    image: postgres:15
    restart: always
    environment:
      POSTGRES_USER: user
      POSTGRES_PASSWORD: password
      POSTGRES_DB: aifriends
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    restart: always
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

启动服务：
```bash
docker-compose up -d
```

### 2.3 初始化 Prisma

执行初始化命令：
```bash
npx prisma init
```

修改 `.env` 文件：该文件由 prisma init 生成，用于配置数据库连接字符串。
```env
DATABASE_URL="postgresql://user:password@localhost:5432/aifriends?schema=public"
REDIS_URL="redis://localhost:6379"
# 未来添加模型 API Keys
# OPENAI_API_KEY=...
```

将 `.env` 添加到 `.gitignore`。

## 3. 步骤二：数据库模型与数据填充

### 3.1 定义 Prisma Schema

打开 `prisma/schema.prisma` 文件，粘贴以下模型定义。这与您方案中的设计完全一致。

**prisma/schema.prisma 内容：**
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String         @id @default(cuid())
  email         String         @unique
  name          String?
  plan          String         @default("free")
  createdAt     DateTime       @default(now())
  conversations Conversation[]
}

model Conversation {
  id          String       @id @default(cuid())
  userId      String
  user        User         @relation(fields: [userId], references: [id])
  title       String
  mode        String // empathy | plan | compare | study | code ...
  budgetCents Int          @default(500)
  createdAt   DateTime     @default(now())
  messages    Message[]
  deployments Deployment[]
}

model Message {
  id        String       @id @default(cuid())
  convId    String
  role      String // user | ai
  agentId   String?
  step      String? // Corresponds to roleTag like PLAN, EMPATHY
  content   String
  tokens    Int          @default(0)
  costCents Int          @default(0)
  createdAt DateTime     @default(now())
  conv      Conversation @relation(fields: [convId], references: [id])
}

model Agent {
  id       String  @id @default(cuid())
  name     String
  provider String // openai | anthropic | google | deepseek | doubao | xai
  roleTag  String  @unique // PLAN | AUGMENT | EMPATHY ...
  order    Int
  prompt   String
  enabled  Boolean @default(true)
}

model Flow {
  id      String  @id @default(cuid())
  name    String
  mode    String  @unique
  steps   Json // [{roleTag, provider, maxTokens, limitChars,...}]
  enabled Boolean @default(true)
}

model Artifact {
  id     String @id @default(cuid())
  convId String
  type   String // zip | file | link
  url    String
  meta   Json?
}

model Deployment {
  id        String       @id @default(cuid())
  convId    String
  conv      Conversation @relation(fields: [convId], references: [id])
  provider  String // vercel | railway
  status    String // pending | building | success | failed
  url       String?
  logsUrl   String?
  meta      Json?
  createdAt DateTime     @default(now())
}
```

### 3.2 创建数据库迁移

执行迁移命令：
```bash
npx prisma migrate dev --name init
```

此命令会创建数据库表结构。

### 3.3 填充种子数据 (Seeding)

创建 `prisma/seed.ts` 文件，用于填充默认的 User, Agent 和 Flow，以便我们测试。

**prisma/seed.ts 内容：**
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Create a default user
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
    },
  });

  // Create Agents
  await prisma.agent.upsert({ where: { roleTag: 'EMPATHY' }, update: {}, create: { name: '共情者', provider: 'mock', roleTag: 'EMPATHY', order: 1, prompt: '先理解与共情...' } });
  await prisma.agent.upsert({ where: { roleTag: 'PRACTICAL' }, update: {}, create: { name: '建议师', provider: 'mock', roleTag: 'PRACTICAL', order: 2, prompt: '给3条可立即尝试的小建议...' } });
  await prisma.agent.upsert({ where: { roleTag: 'FOLLOWUP' }, update: {}, create: { name: '关怀师', provider: 'mock', roleTag: 'FOLLOWUP', order: 3, prompt: '提供一条温柔的第二天问候模板...' } });

  // Create a Flow for "Living Care"
  await prisma.flow.upsert({
    where: { mode: 'empathy' },
    update: {},
    create: {
      name: '生活关怀流程',
      mode: 'empathy',
      enabled: true,
      steps: [
        { roleTag: 'EMPATHY', provider: 'mock' },
        { roleTag: 'PRACTICAL', provider: 'mock' },
        { roleTag: 'FOLLOWUP', provider: 'mock' },
      ],
    },
  });

  console.log('Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

配置并执行 Seeding：

修改 `package.json`，在 scripts 中添加：
```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

安装 ts-node:
```bash
npm install -D ts-node
```

执行 seed 命令:
```bash
npx prisma db seed
```

## 4. 步骤三：后端 API 接口实现

### 4.1 数据库和 Redis 客户端

创建 `lib/db.ts` 和 `lib/redis.ts`。

**lib/db.ts**
```typescript
import { PrismaClient } from '@prisma/client';

const prismaClientSingleton = () => {
  return new PrismaClient();
};

declare global {
  var prisma: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prisma ?? prismaClientSingleton();

export default prisma;

if (process.env.NODE_ENV !== 'production') globalThis.prisma = prisma;
```

**lib/redis.ts**
```typescript
import { createClient } from 'redis';

const redisClientSingleton = () => {
  return createClient({ url: process.env.REDIS_URL });
};

declare global {
  var redis: undefined | ReturnType<typeof redisClientSingleton>;
}

const redis = globalThis.redis ?? redisClientSingleton();

if (process.env.NODE_ENV !== 'production') globalThis.redis = redis;

// It's good practice to handle connection errors.
redis.on('error', (err) => console.log('Redis Client Error', err));

// You might need to connect explicitly depending on your usage pattern.
// await redis.connect();

export default redis;
```

### 4.2 API 1: 创建会话 (POST /api/conversations)

**文件路径**: `app/api/conversations/route.ts`

**核心逻辑**:
- 接收请求体 `{ title: string, mode: 'empathy' }`。（硬编码）
- 获取 userId（来自我们 seed 的用户）。
- 使用 Prisma 在 Conversation 表中创建一条新记录。
- 返回新创建的会话 `{ id, title, mode }`。

### 4.3 API 2: 发送消息 (POST /api/conversations/[id]/messages)

**文件路径**: `app/api/conversations/[id]/messages/route.ts`

**核心逻辑**:
- 从 URL 中获取会话 id。
- 接收请求体 `{ text: string }`。（硬编码）
- 获取 userId。
- 使用 Prisma 将用户消息存入 Message 表，关联到对应的会话。
- 异步触发编排器服务（详见步骤四）。
- 立即返回 `{ ok: true }`，表示消息已收到。

### 4.4 API 3: 订阅事件 (GET /api/conversations/[id]/events)

**文件路径**: `app/api/conversations/[id]/events/route.ts`

**核心逻辑**:
这是实现 SSE 的关键。此路由必须使用 Node.js runtime。在文件顶部添加 `export const runtime = 'nodejs';`。
- 返回一个 ReadableStream 响应。
- 创建一个 TransformStream，其 writable 端将由编排器写入事件，readable 端则作为响应体返回给前端。
- 关键：需要一种机制将特定会话 id 的 stream.writable.getWriter() 存起来（例如，存在一个全局 Map 或 Redis Pub/Sub 中），以便编排器可以找到它并写入数据。

## 5. 步骤四：编排器原型 (Orchestrator)

### 5.1 编排器文件

**文件路径**: `lib/orchestrator/engine.ts`

### 5.2 runOrchestration 函数

这是编排器的核心入口。

**lib/orchestrator/engine.ts**
```typescript
import prisma from '../db';
// Assume we have a way to get the SSE writer for a conversation
import { getSSEWriter, removeSSEWriter } from '../sse-manager'; // This is a conceptual module you need to create

// Helper to write SSE data
function writeSSEEvent(writer: WritableStreamDefaultWriter, event: object) {
  try {
    writer.write(`data: ${JSON.stringify(event)}\n\n`);
  } catch (e) {
    console.error('Error writing to SSE stream:', e);
  }
}

export async function runOrchestration(convId: string, userMessageContent: string) {
  const writer = getSSEWriter(convId);
  if (!writer) {
    console.error(`No SSE writer found for conversation ${convId}`);
    return;
  }

  try {
    const conversation = await prisma.conversation.findUnique({ where: { id: convId } });
    if (!conversation) throw new Error('Conversation not found');

    const flow = await prisma.flow.findUnique({ where: { mode: conversation.mode } });
    if (!flow || !Array.isArray(flow.steps)) throw new Error('Flow not found or steps are invalid');

    let previousSummary = userMessageContent;

    for (const step of (flow.steps as any[])) {
      const { roleTag } = step;

      // 1. Emit step_started event
      writeSSEEvent(writer, { type: 'step_started', step: roleTag });

      // 2. Emit ai_message_started event
      writeSSEEvent(writer, { type: 'ai_message_started', agent: roleTag, step: roleTag });
      await new Promise(res => setTimeout(res, 100)); // Small delay

      // --- MOCK LLM CALL ---
      const mockResponse = `你好，我是 [${roleTag}] 智能体。正在处理你的请求："${previousSummary.substring(0, 30)}..."。这是我的模拟回答。`;
      // --- END MOCK ---

      // 3. Stream mock response via ai_chunk
      for (const char of mockResponse) {
        await new Promise(res => setTimeout(res, 20)); // Simulate streaming delay
        writeSSEEvent(writer, { type: 'ai_chunk', text: char });
      }

      // 4. Save the full AI message to DB
      const aiMessage = await prisma.message.create({
        data: {
          convId: convId,
          role: 'ai',
          agentId: roleTag, // In reality, you'd fetch the agent ID
          step: roleTag,
          content: mockResponse,
        }
      });

      // 5. Emit ai_message_completed event
      writeSSEEvent(writer, { type: 'ai_message_completed', messageId: aiMessage.id });

      // 6. Update summary for the next step
      previousSummary = mockResponse;
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    writeSSEEvent(writer, { type: 'step_failed', step: 'orchestration', error: errorMessage });
  } finally {
    writer.close();
    removeSSEWriter(convId); // Clean up the writer
  }
}
```

## 6. 步骤五：基础前端界面

### 6.1 主聊天页面

**文件路径**: `app/chat/[id]/page.tsx`

设置为客户端组件: `'use client'`;

**核心逻辑**:
- 使用 useState 管理消息列表 messages 和输入框内容 input。
- 使用 useEffect 在组件加载时，根据会话 id 创建一个 EventSource 实例，连接到 `/api/conversations/[id]/events`。
- 监听 eventSource.onmessage 事件：解析 event.data (JSON)。根据事件类型（ai_message_started, ai_chunk, ai_message_completed 等）来更新 messages 状态数组。对于 ai_chunk，你需要找到正在流式传输的最后一条消息并追加 text。
- 实现一个 handleSubmit 函数，当用户提交表单时：调用 POST `/api/conversations/[id]/messages` API。将用户的消息乐观地 (optimistically) 添加到 messages 数组。清空输入框。

## 7. 环境变量总结

最后，请确保您的 `.env` 文件包含以下变量：

```env
# prisma/schema.prisma
DATABASE_URL="postgresql://user:password@localhost:5432/aifriends?schema=public"

# lib/redis.ts
REDIS_URL="redis://localhost:6379"
```

这份文档提供了从零开始构建项目骨架所需的所有指令和代码片段。请将此文档提供给 AI，它应该能够理解并逐步生成所需的代码文件。