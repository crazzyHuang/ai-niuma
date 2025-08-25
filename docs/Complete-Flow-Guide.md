# AI 朋友圈完整流程指南

从用户发起对话到 AI 回复的完整技术路径解析

## 🗺️ 流程总览

```
用户输入 → API调用 → 数据库存储 → AI编排 → 模型调用 → 流式返回 → 前端显示
```

## 📋 详细流程拆解

### 1. 用户发起对话 🚀

#### 步骤 1：创建对话

**用户操作**: 访问首页 → 填写对话主题 → 点击"开始对话"

**前端代码**: `src/app/page.tsx` 第 16-43 行

```typescript
const handleCreateConversation = async () => {
  const response = await fetch("/api/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title: title.trim(),
      mode: "empathy", // 默认共情模式
    }),
  });
  const data = await response.json();
  router.push(`/chat/${data.id}`); // 跳转到聊天页面
};
```

**后端处理**: `src/app/api/conversations/route.ts`

```typescript
export async function POST(request: NextRequest) {
  const { title, mode } = await request.json();

  // 1. 找到默认用户
  const user = await prisma.user.findUnique({
    where: { email: "test@example.com" },
  });

  // 2. 创建对话记录
  const conversation = await prisma.conversation.create({
    data: {
      userId: user.id,
      title, // "工作压力很大"
      mode, // "empathy"
    },
  });

  return NextResponse.json({ id: conversation.id });
}
```

**数据库变化**:

```sql
-- conversations 表新增一条记录
INSERT INTO conversations (id, userId, title, mode, createdAt)
VALUES ('conv_123', 'user_1', '工作压力很大', 'empathy', NOW());
```

---

### 2. 用户发送消息 💬

#### 步骤 2：发送用户消息

**用户操作**: 在聊天页面输入消息 → 点击发送

**前端代码**: `src/app/chat/[id]/page.tsx` 第 138-184 行

```typescript
const handleSubmit = async (e: React.FormEvent) => {
  const userMessage = input.trim();

  // 1. 立即显示用户消息（乐观更新）
  setMessages((prev) => [
    ...prev,
    {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    },
  ]);

  // 2. 发送到后端
  const response = await fetch(
    `/api/conversations/${conversationId}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: userMessage }),
    }
  );

  // 3. 建立SSE连接等待AI回复
  setTimeout(() => connectSSE(), 500);
};
```

**后端处理**: `src/app/api/conversations/[id]/messages/route.ts`

```typescript
export async function POST(request: NextRequest, { params }) {
  const { text } = await request.json();
  const { id: conversationId } = await params;

  // 1. 验证对话存在
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  // 2. 保存用户消息
  const userMessage = await prisma.message.create({
    data: {
      convId: conversationId,
      role: "user",
      content: text,
    },
  });

  return NextResponse.json({ ok: true });
}
```

**数据库变化**:

```sql
-- messages 表新增用户消息
INSERT INTO messages (id, convId, role, content, createdAt)
VALUES ('msg_456', 'conv_123', 'user', '最近工作压力很大，经常加班到很晚', NOW());
```

---

### 3. AI 编排开始 🤖

#### 步骤 3：建立 SSE 连接，触发 AI 编排

**前端代码**: `src/app/chat/[id]/page.tsx` 第 39-127 行

```typescript
const connectSSE = () => {
  // 建立Server-Sent Events连接
  eventSourceRef.current = new EventSource(
    `/api/conversations/${conversationId}/events`
  );

  eventSourceRef.current.onmessage = (event) => {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case "step_started":
        console.log("开始执行步骤:", data.step);
        break;
      case "ai_message_started":
        // 添加AI消息占位符
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: "ai",
            content: "",
            agentId: data.agent,
            isStreaming: true,
          },
        ]);
        break;
      case "ai_chunk":
        // 实时更新AI回复内容
        setMessages((prev) => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage?.isStreaming) {
            lastMessage.content += data.text; // 逐字追加
          }
          return newMessages;
        });
        break;
    }
  };
};
```

**后端处理**: `src/app/api/conversations/[id]/events/route.ts`

```typescript
export async function GET(request: NextRequest, { params }) {
  const { id: conversationId } = await params;

  // 1. 验证对话存在
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
  });

  // 2. 获取最新用户消息
  const latestUserMessage = await prisma.message.findFirst({
    where: { convId: conversationId, role: "user" },
    orderBy: { createdAt: "desc" },
  });

  // 3. 创建流式响应
  const stream = new ReadableStream({
    start(controller) {
      const writeSSEEvent = (event) => {
        controller.enqueue(`data: ${JSON.stringify(event)}\n\n`);
      };

      // 🔥 开始AI编排
      Orchestrator.runOrchestration(
        conversationId,
        latestUserMessage.content,
        writeSSEEvent
      );
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
```

---

### 4. AI 编排执行 🎭

#### 步骤 4：多 Agent 流程执行

**核心逻辑**: `src/lib/orchestrator.ts`

```typescript
export class Orchestrator {
  static async runOrchestration(conversationId, userMessageContent, onEvent) {
    // 1. 获取对话模式（如'empathy'）
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    // 2. 获取流程配置
    if (AgentConfigManager.isSingleProviderMode()) {
      // 从配置文件获取：empathy → [EMPATHY, PRACTICAL, FOLLOWUP]
      const flowConfig = AgentConfigManager.getFlowConfig(conversation.mode);
      steps = flowConfig.steps; // ['EMPATHY', 'PRACTICAL', 'FOLLOWUP']
    }

    let previousSummary = userMessageContent;

    // 3. 依次执行每个Agent
    for (const roleTag of steps) {
      // EMPATHY → PRACTICAL → FOLLOWUP

      // 3.1 获取Agent配置
      const { agent, llmConfig } = AgentConfigManager.getAgentConfig(roleTag);
      /*
      agent = {
        roleTag: 'EMPATHY',
        name: '共情者小暖',
        systemPrompt: '你是一个富有同理心的AI助手...',
        temperature: 0.8
      }
      llmConfig = {
        provider: 'modelscope',
        model: 'qwen-turbo',
        apiKey: 'sk-xxx',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1'
      }
      */

      // 3.2 发送步骤开始事件
      onEvent({ type: "step_started", step: roleTag });
      onEvent({ type: "ai_message_started", agent: roleTag });

      // 3.3 构建消息
      const messages = [
        {
          role: "system",
          content: agent.systemPrompt, // Agent的提示词
        },
        {
          role: "user",
          content: previousSummary, // 用户消息或上一个Agent的回复
        },
      ];

      // 3.4 🔥 调用LLM服务
      const response = await llmService.streamChat(
        llmConfig,
        messages,
        (chunk) => {
          // 实时发送AI回复片段
          onEvent({ type: "ai_chunk", text: chunk.content });
        }
      );

      // 3.5 保存AI消息到数据库
      await prisma.message.create({
        data: {
          convId: conversationId,
          role: "ai",
          agentId: roleTag,
          content: response.content,
          tokens: response.usage.totalTokens,
        },
      });

      // 3.6 更新下一轮的输入
      previousSummary = response.content;
    }
  }
}
```

---

### 5. LLM 服务调用 🧠

#### 步骤 5：模型 API 调用

**服务层**: `src/lib/llm-service.ts`

```typescript
class LLMService {
  async streamChat(config, messages, onChunk) {
    // 1. 获取对应的适配器
    const adapter = this.getAdapter(config.provider); // modelscope

    // 2. 调用适配器
    return adapter.streamChat(config, messages, onChunk);
  }
}
```

**魔搭适配器**: `src/lib/adapters/modelscope-adapter-simple.ts`

```typescript
export default class ModelScopeAdapter extends OpenAIAdapter {
  async streamChat(config, messages, onChunk) {
    // 1. 设置魔搭端点
    const modifiedConfig = {
      ...config,
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    };

    // 2. 调用父类OpenAI逻辑
    return super.streamChat(modifiedConfig, messages, onChunk);
  }
}
```

**OpenAI 适配器**: `src/lib/adapters/openai-adapter.ts`

```typescript
export default class OpenAIAdapter {
  async streamChat(config, messages, onChunk) {
    // 1. 构建API请求
    const requestBody = {
      model: config.model,        // 'qwen-turbo'
      messages: messages,         // 系统提示词 + 用户消息
      temperature: 0.8,          // 来自Agent配置
      max_tokens: 1000,
      stream: true               // 流式输出
    };

    // 2. 发送请求到魔搭API
    const response = await fetch(
      'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    // 3. 处理流式响应
    const reader = response.body.getReader();
    let content = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const lines = new TextDecoder().decode(value).split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') break;

          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content;

          if (delta) {
            content += delta;
            onChunk({ content: delta, isComplete: false });  // 🔥 实时回调
          }
        }
      }
    }

    return { content, usage: {...}, model: 'qwen-turbo' };
  }
}
```

---

### 6. 前端实时显示 📱

#### 步骤 6：流式内容显示

**前端接收**: `src/app/chat/[id]/page.tsx`

```typescript
// SSE事件处理
eventSourceRef.current.onmessage = (event) => {
  const data = JSON.parse(event.data);

  if (data.type === "ai_chunk") {
    // 实时更新最后一条AI消息
    setMessages((prev) => {
      const newMessages = [...prev];
      const lastMessage = newMessages[newMessages.length - 1];

      if (lastMessage?.role === "ai" && lastMessage.isStreaming) {
        lastMessage.content += data.text; // 追加新内容
      }

      return newMessages;
    });
  }
};
```

**视觉效果**:

```
用户: 最近工作压力很大，经常加班到很晚

AI (共情者小暖): 我
AI (共情者小暖): 我能
AI (共情者小暖): 我能感
AI (共情者小暖): 我能感受到你现在的压力...
[继续逐字显示]

AI (建议者小智): 基于你的情况，我建议...
[第二个Agent开始回复]

AI (关怀者小爱): 希望我的建议能对你有所帮助...
[第三个Agent完成整个流程]
```

---

## 🔄 完整数据流

### 数据库记录变化

```sql
-- 1. 创建对话
conversations: conv_123 | user_1 | "工作压力很大" | "empathy"

-- 2. 用户消息
messages: msg_456 | conv_123 | "user" | "最近工作压力很大..."

-- 3. AI回复1 (共情者)
messages: msg_789 | conv_123 | "ai" | "EMPATHY" | "我能感受到你现在的压力..."

-- 4. AI回复2 (建议者)
messages: msg_101 | conv_123 | "ai" | "PRACTICAL" | "基于你的情况，我建议..."

-- 5. AI回复3 (关怀者)
messages: msg_112 | conv_123 | "ai" | "FOLLOWUP" | "希望我的建议能对你有所帮助..."
```

### API 调用序列

```
1. POST /api/conversations → 创建对话
2. POST /api/conversations/conv_123/messages → 保存用户消息
3. GET /api/conversations/conv_123/events → 建立SSE连接
4. AI编排开始执行:
   - Agent1调用: https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
   - Agent2调用: https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
   - Agent3调用: https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
5. SSE流式返回结果到前端
```

---

## 🎯 关键配置文件

### 流程配置: `config/single-provider-agents.json`

```json
{
  "provider": "modelscope",
  "model": "qwen-turbo",
  "flows": [
    {
      "mode": "empathy",
      "steps": ["EMPATHY", "PRACTICAL", "FOLLOWUP"] // 🔥 决定执行顺序
    }
  ]
}
```

### 环境配置: `.env.local`

```bash
MODELSCOPE_API_KEY="sk-xxx"  # 🔑 魔搭API密钥
DATABASE_URL="postgresql://..." # 数据库连接
```

---

## 🚀 总结

**完整路径**:

1. **用户输入** → 前端表单
2. **创建对话** → API 保存到数据库
3. **发送消息** → API 保存用户消息
4. **建立 SSE** → 流式连接
5. **AI 编排** → 根据配置依次调用多个 Agent
6. **模型调用** → 魔搭 API 返回流式内容
7. **实时显示** → 前端逐字显示 AI 回复

**核心组件**:

- **前端**: React + SSE 实时通信
- **后端**: Next.js API Routes + Prisma
- **AI 服务**: 编排器 + 适配器模式
- **外部 API**: 魔搭社区兼容 OpenAI 格式

现在这个流程清楚了吗？有哪个环节还需要我详细解释？
