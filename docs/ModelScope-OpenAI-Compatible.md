# 魔搭社区 OpenAI 兼容模式使用指南

## 🚀 重大简化！

发现魔搭社区完全兼容 OpenAI API 调用方式后，我们的实现变得非常简单！

## 🔧 实现方式

### 1. 继承 OpenAI 适配器

```typescript
// src/lib/adapters/modelscope-adapter-simple.ts
import OpenAIAdapter from "./openai-adapter";

export default class ModelScopeAdapter extends OpenAIAdapter {
  provider: LLMProvider = "modelscope";

  // 只需要重写端点 URL
  async streamChat(config, messages, onChunk) {
    const modifiedConfig = {
      ...config,
      baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    };
    return super.streamChat(modifiedConfig, messages, onChunk);
  }
}
```

### 2. 完全兼容的调用方式

魔搭社区支持与 OpenAI 完全相同的：

#### 请求格式

```json
{
  "model": "qwen-turbo",
  "messages": [
    { "role": "system", "content": "你是一个助手" },
    { "role": "user", "content": "你好" }
  ],
  "temperature": 0.7,
  "max_tokens": 2000,
  "stream": true
}
```

#### 响应格式

```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "model": "qwen-turbo",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "你好！我是通义千问..."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 20,
    "total_tokens": 30
  }
}
```

#### 流式响应格式

```
data: {"choices":[{"delta":{"content":"你"}}]}
data: {"choices":[{"delta":{"content":"好"}}]}
data: [DONE]
```

## 🎯 优势对比

### 原实现（复杂）

- ❌ 需要适配魔搭特有的请求格式
- ❌ 需要处理不同的响应结构
- ❌ 要编写专门的流式处理逻辑
- ❌ 维护成本高

### 新实现（简单）

- ✅ 直接继承 OpenAI 适配器
- ✅ 只需修改 baseUrl
- ✅ 复用所有 OpenAI 的处理逻辑
- ✅ 代码量减少 80%+

## 🔗 API 端点说明

### 魔搭兼容端点

```
https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
```

### 认证方式

```
Authorization: Bearer sk-your-modelscope-api-key
```

### 支持的模型

| 模型名称             | 说明              | 适用场景         |
| -------------------- | ----------------- | ---------------- |
| qwen-turbo           | 通义千问-Turbo    | 日常对话，成本低 |
| qwen-plus            | 通义千问-Plus     | 复杂任务         |
| qwen-max             | 通义千问-Max      | 高质量输出       |
| qwen-max-1201        | 通义千问-Max 最新 | 最新能力         |
| qwen-max-longcontext | 长文本版本        | 长文档处理       |

## 🧪 测试示例

### Curl 测试

```bash
curl -X POST https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions \
  -H "Authorization: Bearer sk-your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen-turbo",
    "messages": [
      {"role": "user", "content": "你好，请介绍一下自己"}
    ],
    "temperature": 0.7
  }'
```

### JavaScript 测试

```javascript
const response = await fetch(
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  {
    method: "POST",
    headers: {
      Authorization: "Bearer sk-your-api-key",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "qwen-turbo",
      messages: [{ role: "user", content: "你好" }],
      stream: true,
    }),
  }
);
```

## 💡 开发建议

### 1. 模型选择

- **开发测试**: 使用 `qwen-turbo`（便宜）
- **生产环境**: 根据质量需求选择 `qwen-plus` 或 `qwen-max`

### 2. 参数调优

```typescript
const config = {
  model: "qwen-turbo",
  temperature: 0.8, // 共情Agent用高一点
  max_tokens: 1000, // 控制回复长度
  top_p: 0.8, // 可选，控制随机性
};
```

### 3. 错误处理

魔搭返回的错误格式与 OpenAI 一致：

```json
{
  "error": {
    "message": "Invalid API key",
    "type": "invalid_request_error"
  }
}
```

## 🎉 总结

通过使用魔搭的 OpenAI 兼容模式：

1. **开发效率提升** - 代码复用，快速接入
2. **维护成本降低** - 统一的错误处理和流程
3. **迁移成本为零** - 如果要换到 OpenAI，只需改 baseUrl
4. **功能完整性** - 所有 OpenAI 功能都支持

这就是为什么说**标准化 API** 的重要性！🚀
