# 多厂家 LLM API 集成指南

## 📋 概述

AI 朋友圈项目现已支持多个 LLM 服务提供商的 API 集成，实现了灵活的配置管理和统一的调用接口。

## 🏗️ 架构设计

### 核心组件

1. **类型定义** (`src/types/llm.ts`)

   - LLM 提供商类型定义
   - 统一的消息和响应接口
   - 配置和适配器接口

2. **服务层** (`src/lib/llm-service.ts`)

   - 统一的 LLM 服务入口
   - 适配器管理和调用
   - 错误处理和重试机制

3. **配置管理** (`src/lib/llm-config.ts`)

   - 环境变量管理
   - 模型配置和验证
   - 成本计算支持

4. **适配器模式** (`src/lib/adapters/`)

   - 基础适配器类
   - 各厂家具体实现
   - 统一的流式和非流式接口

5. **编排器** (`src/lib/orchestrator.ts`)
   - 多智能体对话流程控制
   - 真实 API 调用集成
   - 事件驱动的流式输出

## 🎯 支持的提供商

### 已实现

- ✅ **OpenAI** - GPT-4、GPT-3.5 系列
- ✅ **DeepSeek** - DeepSeek Chat、Coder 系列

### 待实现（已有框架）

- 🟡 **Anthropic** - Claude 3.5 系列
- 🟡 **Google** - Gemini 1.5 系列
- 🟡 **豆包** - 字节跳动 AI 系列
- 🟡 **xAI** - Grok 系列

## ⚙️ 配置步骤

### 1. 环境变量设置

创建 `.env.local` 文件：

```bash
# OpenAI
OPENAI_API_KEY=sk-...

# DeepSeek
DEEPSEEK_API_KEY=sk-...

# 其他提供商（可选）
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=AIza...
DOUBAO_API_KEY=...
XAI_API_KEY=xai-...
```

### 2. 智能体配置

在数据库中配置智能体：

```sql
INSERT INTO "Agent" (id, name, provider, roleTag, "order", prompt, enabled) VALUES
('agent-1', '共情者', 'anthropic', 'EMPATHY', 1, '你是一个富有同理心的AI助手...', true),
('agent-2', '建议者', 'openai', 'PRACTICAL', 2, '你是一个实用的问题解决专家...', true),
('agent-3', '关怀者', 'deepseek', 'FOLLOWUP', 3, '你是一个温暖的关怀者...', true);
```

### 3. 流程配置

配置对话流程：

```sql
INSERT INTO "Flow" (id, name, mode, steps, enabled) VALUES
('flow-1', '共情流程', 'empathy',
'[{"roleTag":"EMPATHY","provider":"anthropic","maxTokens":1000},{"roleTag":"PRACTICAL","provider":"openai","maxTokens":1500},{"roleTag":"FOLLOWUP","provider":"deepseek","maxTokens":800}]',
true);
```

## 🔧 使用方式

### 基本调用

```typescript
import llmService from "@/lib/llm-service";
import LLMConfigManager from "@/lib/llm-config";

// 获取配置
const config = LLMConfigManager.getConfigForAgent("EMPATHY");

// 流式调用
const response = await llmService.streamChat(config, messages, (chunk) => {
  console.log("收到内容:", chunk.content);
});
```

### 编排器使用

```typescript
import Orchestrator from "@/lib/orchestrator";

// 运行完整对话流程
await Orchestrator.runOrchestration(conversationId, userMessage, (event) => {
  // 处理流式事件
  switch (event.type) {
    case "ai_chunk":
      // 显示AI回复内容
      break;
    case "step_completed":
      // 步骤完成
      break;
  }
});
```

## 🖥️ 管理界面

访问 `/admin` 页面查看：

- ✅ 各提供商配置状态
- 📊 可用模型列表
- ⚠️ 配置错误信息
- 📝 配置指南

## 🔄 扩展新提供商

### 1. 创建适配器

```typescript
// src/lib/adapters/new-provider-adapter.ts
import { BaseLLMAdapter } from "./base-adapter";

export default class NewProviderAdapter extends BaseLLMAdapter {
  provider = "newprovider" as const;

  async streamChat(config, messages, onChunk) {
    // 实现流式调用
  }

  async chat(config, messages) {
    // 实现非流式调用
  }
}
```

### 2. 注册适配器

```typescript
// src/lib/llm-service.ts
import NewProviderAdapter from './adapters/new-provider-adapter';

constructor() {
  this.adapters.set('newprovider', new NewProviderAdapter());
}
```

### 3. 更新配置

```json
// config/llm-providers.json
{
  "providers": {
    "newprovider": {
      "name": "新提供商",
      "baseUrl": "https://api.newprovider.com/v1",
      "models": [...]
    }
  }
}
```

## 📊 成本监控

系统支持成本跟踪：

- 💰 每次调用的 token 使用量
- 📈 基于模型定价的成本计算
- 🚨 预算超限告警

## 🚀 生产部署

### 环境变量

```bash
# 必需的API密钥
OPENAI_API_KEY=...
DEEPSEEK_API_KEY=...

# 可选配置
ENABLE_COST_TRACKING=true
COST_ALERT_THRESHOLD=100
LOG_LEVEL=info
```

### 验证配置

```bash
# 检查配置状态
curl http://localhost:3000/api/admin/config-status
```

## 🐛 故障排除

### 常见问题

1. **API 密钥错误**

   - 检查环境变量设置
   - 验证密钥格式和权限

2. **模型不可用**

   - 确认模型名称正确
   - 检查 API 额度是否充足

3. **流式输出中断**
   - 检查网络连接
   - 确认超时设置

### 调试方法

```typescript
// 启用详细日志
process.env.LOG_LEVEL = "debug";

// 验证系统配置
const validation = await Orchestrator.validateConfiguration();
console.log(validation);
```

## 📚 下一步

- [ ] 完善 Anthropic 适配器实现
- [ ] 添加 Google Gemini 支持
- [ ] 实现智能模型选择
- [ ] 添加成本优化策略
- [ ] 支持自定义提示词模板

---

这个架构为 AI 朋友圈提供了强大而灵活的多厂家 LLM 集成能力，可以根据不同场景选择最适合的模型，同时保持统一的开发体验。
