# 数据库模式修复指南

解决 `metadata` 字段不存在和 `promptTokens` 未定义的问题

## 🐛 遇到的问题

### 1. 数据库字段错误

```
Unknown argument `metadata`. Available options are marked with ?.
```

### 2. Token 使用量读取错误

```
Cannot read properties of undefined (reading 'promptTokens')
```

## ✅ 修复方案

### 1. **数据库字段映射修复**

**之前** (错误的 metadata 结构):

```typescript
const aiMessage = await prisma.message.create({
  data: {
    convId: conversationId,
    role: "ai",
    content: response.content,
    metadata: {
      // ❌ 这个字段不存在
      agent: roleTag,
      agentName: agent.name,
      model: response.model,
      usage: response.usage,
      cost: cost,
    },
  },
});
```

**现在** (正确的字段映射):

```typescript
const aiMessage = await prisma.message.create({
  data: {
    convId: conversationId,
    role: "ai",
    content: response.content,
    agentId: roleTag, // ✅ 使用实际存在的字段
    step: roleTag, // ✅ 使用实际存在的字段
    tokens: response.usage?.totalTokens || 0, // ✅ 安全访问
    costCents: Math.round(cost * 100), // ✅ 转换为分
  },
});
```

### 2. **成本计算函数修复**

**之前** (不安全的属性访问):

```typescript
private static calculateCost(response: any): number {
  const { usage } = response;
  const inputCost = (usage.promptTokens / 1000) * 0.5;  // ❌ promptTokens 可能不存在
  // ...
}
```

**现在** (安全的属性访问):

```typescript
private static calculateCost(usage: any, provider: string, model: string): number {
  if (!usage) {
    console.warn('⚠️ 没有使用量信息，成本设为0');
    return 0;
  }

  // 安全地获取token数量，支持多种命名格式
  const promptTokens = usage.promptTokens || usage.prompt_tokens || 0;
  const completionTokens = usage.completionTokens || usage.completion_tokens || 0;

  // ...
}
```

### 3. **前端数据获取修复**

**之前** (错误的 metadata 访问):

```typescript
agent: msg.metadata?.agent || "未知"; // ❌ metadata不存在
```

**现在** (正确的字段访问):

```typescript
agent: msg.agentId || msg.step || "未知"; // ✅ 使用实际字段
```

## 🏗️ 数据库模式结构

根据 `prisma/schema.prisma`，Message 模型的实际字段是：

```prisma
model Message {
  id        String       @id @default(cuid())
  convId    String
  role      String       // user | ai
  agentId   String?      // ✅ Agent标识
  step      String?      // ✅ 步骤标识
  content   String
  tokens    Int          @default(0)  // ✅ Token使用量
  costCents Int          @default(0)  // ✅ 成本(分)
  createdAt DateTime     @default(now())
  conv      Conversation @relation(fields: [convId], references: [id])
}
```

## 🔧 Usage 对象结构支持

为了兼容不同 LLM 提供商的返回格式，支持多种命名：

```typescript
// OpenAI 格式
{
  prompt_tokens: 100,
  completion_tokens: 200,
  total_tokens: 300
}

// 或者驼峰命名格式
{
  promptTokens: 100,
  completionTokens: 200,
  totalTokens: 300
}
```

## 💰 成本计算逻辑

```typescript
// 输入价格: $0.0005 per 1K tokens
// 输出价格: $0.0015 per 1K tokens

const inputCost = (promptTokens / 1000) * 0.0005;
const outputCost = (completionTokens / 1000) * 0.0015;
const totalCost = inputCost + outputCost;

// 存储时转换为分 (cents)
costCents: Math.round(totalCost * 100);
```

## 🧪 测试验证

修复后的日志应该显示：

```bash
🎭 执行Agent: EMPATHY
⚙️ Agent配置 [EMPATHY]: { name: "共情者小暖", ... }
🚀 开始LLM调用 [EMPATHY] (非流式)
💰 计算成本: { provider: "modelscope", model: "qwen-turbo", promptTokens: 50, completionTokens: 100 }
💰 成本详情: { inputCost: "0.000025", outputCost: "0.000150", totalCost: "0.000175" }
💾 AI消息已保存 [EMPATHY]: msg_xyz123
✅ LLM调用完成 [EMPATHY], 内容长度: 150
```

## 🚀 验证步骤

1. **启动项目**: `pnpm dev`
2. **发送消息**: 创建对话并发送任意消息
3. **检查日志**: 确保没有 `metadata` 或 `promptTokens` 错误
4. **查看数据库**: 验证消息正确保存到数据库

现在系统应该可以正常工作，不再出现字段不存在的错误！ ✅
