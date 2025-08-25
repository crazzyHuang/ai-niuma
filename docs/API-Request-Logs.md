# 厂家 API 请求日志详解

开发环境下的完整请求和响应日志示例

## 🎯 请求发起位置

### 核心代码位置：

- **文件**: `src/lib/adapters/openai-adapter.ts`
- **方法**: `streamChat()` 和 `chat()`
- **行数**: 第 23-61 行（流式）/ 第 76-128 行（非流式）

### 调用链路：

```
用户发送消息
  ↓
编排器 (orchestrator.ts)
  ↓
LLM服务 (llm-service.ts)
  ↓
魔搭适配器 (modelscope-adapter-simple.ts)
  ↓
OpenAI适配器 (openai-adapter.ts) ← 🔥 真正的HTTP请求在这里
  ↓
魔搭社区API
```

## 📝 完整请求日志示例

### 1. 请求开始日志

```bash
🚀 LLM API 请求开始:
📍 URL: https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
🔑 Headers: {
  "Content-Type": "application/json",
  "Authorization": "Bearer sk-abc1234567..."
}
📦 Request Body: {
  "model": "qwen-turbo",
  "messages": [
    {
      "role": "system",
      "content": "你是一个富有同理心的AI助手，名叫小暖。你的主要任务是理解和感受用户的情感，提供温暖的共情回应。\n\n你的特点：\n- 温暖、耐心、善于倾听\n- 能够敏锐地感受到用户的情绪变化\n- 用温和的语言表达理解和关怀..."
    },
    {
      "role": "user",
      "content": "最近工作压力很大，经常加班到很晚"
    }
  ],
  "temperature": 0.8,
  "max_tokens": 1000,
  "stream": true
}
```

### 2. 响应成功日志

```bash
✅ LLM API 响应成功:
⏱️ 响应时间: 1250ms
📊 Status: 200
🔄 开始处理流式响应...
```

### 3. 流式数据处理日志

```bash
🔄 流式块 #1: {
  content: "我",
  length: 1
}

🔄 流式块 #2: {
  content: "能",
  length: 1
}

🔄 流式块 #3: {
  content: "感受到",
  length: 3
}

📝 后续块将不再显示详情...

🛑 完成原因: stop

🏁 流式响应完成:
📊 总块数: 245
📝 总内容长度: 156
⏱️ 总耗时: 3200ms
💰 最终 Token 使用: {
  promptTokens: 89,
  completionTokens: 52,
  totalTokens: 141
}
```

## 📄 实际 API 响应格式

### 流式响应示例

```
data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","model":"qwen-turbo","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","model":"qwen-turbo","choices":[{"index":0,"delta":{"content":"我"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","model":"qwen-turbo","choices":[{"index":0,"delta":{"content":"能"},"finish_reason":null}]}

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","model":"qwen-turbo","choices":[{"index":0,"delta":{"content":"感受到"},"finish_reason":null}]}

...更多内容块...

data: {"id":"chatcmpl-xxx","object":"chat.completion.chunk","model":"qwen-turbo","choices":[{"index":0,"delta":{},"finish_reason":"stop"}],"usage":{"prompt_tokens":89,"completion_tokens":52,"total_tokens":141}}

data: [DONE]
```

### 非流式响应示例

```json
{
  "id": "chatcmpl-xxx",
  "object": "chat.completion",
  "created": 1703123456,
  "model": "qwen-turbo",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "我能感受到你现在工作压力确实很大。长时间的加班不仅会让身体疲惫，也会给心理带来负担。你愿意和我聊聊具体是什么工作让你感到压力这么大吗？我想更好地理解你的情况。"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 89,
    "completion_tokens": 52,
    "total_tokens": 141
  }
}
```

## 🚨 错误日志示例

### API 密钥错误

```bash
❌ LLM API 错误:
📍 URL: https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
🔢 Status: 401
📄 Error: {
  "error": {
    "message": "Invalid API key provided",
    "type": "invalid_request_error",
    "code": "invalid_api_key"
  }
}
```

### 模型不存在错误

```bash
❌ LLM API 错误:
📍 URL: https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
🔢 Status: 400
📄 Error: {
  "error": {
    "message": "The model 'qwen-invalid' does not exist",
    "type": "invalid_request_error",
    "code": "model_not_found"
  }
}
```

### 配额不足错误

```bash
❌ LLM API 错误:
📍 URL: https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions
🔢 Status: 429
📄 Error: {
  "error": {
    "message": "Rate limit reached for requests",
    "type": "rate_limit_error",
    "code": "rate_limit_exceeded"
  }
}
```

## 🔍 如何查看这些日志

### 1. 确保开发环境

```bash
# .env.local
NODE_ENV=development
```

### 2. 启动项目

```bash
pnpm dev
```

### 3. 发起对话

- 访问 http://localhost:3000
- 创建对话并发送消息
- 查看终端输出

### 4. 日志位置

- **服务器端日志**: 终端控制台
- **浏览器端日志**: 浏览器开发者工具 Console

## 💡 调试技巧

### 1. 只看 API 请求日志

```bash
pnpm dev | grep "🚀\|❌\|✅"
```

### 2. 检查 Token 使用情况

```bash
pnpm dev | grep "💰"
```

### 3. 监控响应时间

```bash
pnpm dev | grep "⏱️"
```

### 4. 查看错误详情

```bash
pnpm dev | grep "❌" -A 5
```

## 📊 性能指标参考

### 正常响应指标

- **响应时间**: 1000-3000ms
- **流式块数**: 50-300 块
- **Token 使用**:
  - 输入: 50-200 tokens
  - 输出: 50-500 tokens
  - 总计: 100-700 tokens

### 异常情况

- **响应时间 > 5000ms**: 网络或服务器问题
- **Token 使用异常高**: 提示词过长或回复过长
- **流式块数异常**: 可能存在网络问题

## 🎯 总结

通过这些详细的日志，你可以：

1. **精确定位问题**: 知道请求是否成功发送
2. **监控性能**: 查看响应时间和 Token 使用
3. **调试错误**: 详细的错误信息帮助快速定位问题
4. **优化成本**: 监控 Token 使用情况

所有的 HTTP 请求都在 `src/lib/adapters/openai-adapter.ts` 的 `fetch()` 调用中发起，现在有了完整的日志记录！
