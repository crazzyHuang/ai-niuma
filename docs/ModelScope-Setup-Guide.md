# 魔搭社区配置指南

## 🎯 为什么选择魔搭

魔搭（ModelScope）是阿里云推出的 AI 模型平台，具有以下优势：

- ✅ **价格便宜** - 通义千问模型成本低，适合开发测试
- ✅ **模型优秀** - 通义千问在中文理解上表现出色
- ✅ **API 稳定** - 阿里云基础设施可靠
- ✅ **文档完善** - 中文文档齐全，容易上手
- ✅ **支持流式** - 完美支持实时对话体验
- ✅ **OpenAI 兼容** - 完全兼容 OpenAI API 调用方式，无需特殊适配

## 🔑 获取 API 密钥

### 1. 注册阿里云账号

访问：https://www.aliyun.com/ 注册账号

### 2. 开通通义千问服务

访问：https://dashscope.console.aliyun.com/

### 3. 获取 API 密钥

- 进入控制台：https://dashscope.console.aliyun.com/api-key
- 点击"创建 API-KEY"
- 复制生成的密钥（格式：sk-xxxxxxxxxx）

### 4. API 兼容性说明

魔搭社区完全兼容 OpenAI API 调用方式：

- **兼容端点**: `https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions`
- **标准格式**: 与 OpenAI 相同的请求/响应格式
- **流式支持**: 支持 Server-Sent Events (SSE) 流式输出

## ⚙️ 配置步骤

### 1. 环境变量配置

在项目根目录创建 `.env.local` 文件：

```bash
# 必需配置
DATABASE_URL="postgresql://username:password@localhost:5432/ai-niuma"

# 魔搭API密钥
MODELSCOPE_API_KEY="sk-你的真实魔搭密钥"

# 开发配置
NODE_ENV=development
LOG_LEVEL=debug
```

### 2. 验证配置

启动项目后，访问管理页面检查配置状态：

```bash
# 启动项目
pnpm dev

# 访问配置页面
http://localhost:3000/config

# 访问管理页面
http://localhost:3000/admin
```

## 🤖 单一厂家多 Agent 方案

### 当前配置

项目默认使用**单一厂家模式**，通过不同的提示词实现 5 个不同角色的 Agent：

#### 1. 共情者小暖 (EMPATHY)

- **角色**：理解和感受用户情感
- **特点**：温暖、耐心、善于倾听
- **temperature**: 0.8（感性回应）

#### 2. 建议者小智 (PRACTICAL)

- **角色**：提供实用解决方案
- **特点**：逻辑清晰、具体可行
- **temperature**: 0.3（理性分析）

#### 3. 关怀者小爱 (FOLLOWUP)

- **角色**：后续关怀和鼓励
- **特点**：正能量、支持性
- **temperature**: 0.6（温暖鼓励）

#### 4. 创意者小思 (CREATIVE)

- **角色**：创新思维和多角度思考
- **特点**：活跃思维、独特视角
- **temperature**: 0.9（创意发散）

#### 5. 分析师小明 (ANALYST)

- **角色**：深度分析问题本质
- **特点**：逻辑严密、系统分析
- **temperature**: 0.2（理性客观）

### 对话流程

系统提供 4 种预设流程：

1. **基础关怀流程** (`empathy`)

   - 共情 → 建议 → 关怀

2. **深度分析流程** (`analysis`)

   - 分析 → 建议 → 创意

3. **完整支持流程** (`complete`)

   - 共情 → 分析 → 建议 → 创意 → 关怀

4. **快速建议流程** (`quick`)
   - 建议 → 关怀

## 🔧 自定义配置

### 修改 Agent 提示词

编辑 `config/single-provider-agents.json`：

```json
{
  "agents": [
    {
      "roleTag": "EMPATHY",
      "name": "共情者小暖",
      "systemPrompt": "你的自定义提示词...",
      "temperature": 0.8,
      "maxTokens": 1000,
      "order": 1
    }
  ]
}
```

### 修改对话流程

```json
{
  "flows": [
    {
      "name": "自定义流程",
      "mode": "custom",
      "steps": ["EMPATHY", "PRACTICAL"]
    }
  ]
}
```

### 切换模式

访问 `/config` 页面可以在线切换：

- **单一厂家模式**：一个厂家多个 Agent（推荐开发）
- **多厂家模式**：不同 Agent 使用不同厂家（生产环境）

## 💰 成本预估

魔搭通义千问价格（2024 年）：

| 模型       | 输入价格        | 输出价格        | 适用场景   |
| ---------- | --------------- | --------------- | ---------- |
| qwen-turbo | ¥0.8/千 tokens  | ¥2.0/千 tokens  | 日常对话   |
| qwen-plus  | ¥4.0/千 tokens  | ¥12.0/千 tokens | 复杂任务   |
| qwen-max   | ¥20.0/千 tokens | ¥60.0/千 tokens | 高质量输出 |

**估算**：一次完整对话（5 个 Agent）约消耗 5000 tokens，成本约 ¥0.01-0.03

## 🚀 使用示例

### 1. 创建对话

```bash
curl -X POST http://localhost:3000/api/conversations \
  -H "Content-Type: application/json" \
  -d '{"title": "工作压力很大", "mode": "empathy"}'
```

### 2. 发送消息

```bash
curl -X POST http://localhost:3000/api/conversations/{id}/messages \
  -H "Content-Type: application/json" \
  -d '{"text": "最近工作压力很大，经常加班到很晚"}'
```

### 3. 接收 AI 回复

访问 SSE 端点获取实时流式回复：

```
http://localhost:3000/api/conversations/{id}/events
```

## 🔍 调试和监控

### 查看配置状态

```bash
curl http://localhost:3000/api/config/current
```

### 查看提供商状态

```bash
curl http://localhost:3000/api/admin/config-status
```

### 日志调试

```bash
# 启用详细日志
LOG_LEVEL=debug pnpm dev
```

## ❓ 常见问题

### Q: API 密钥无效

**A**: 检查密钥格式是否正确，确保已开通通义千问服务

### Q: 请求超时

**A**: 检查网络连接，可能需要配置代理

### Q: 模型回复质量不佳

**A**: 调整提示词和 temperature 参数

### Q: 成本过高

**A**: 使用 qwen-turbo 模型，减少 maxTokens 设置

## 🔄 升级到多厂家

当你需要生产环境时，可以：

1. 配置多个厂家的 API 密钥
2. 在 `/config` 页面切换到多厂家模式
3. 在数据库中配置 Agent 和 Flow
4. 享受各厂家模型的专长优势

---

这样配置后，你就拥有了一个功能完整、成本可控的 AI 朋友圈系统！🎉
