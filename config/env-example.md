# 环境变量配置示例

## 配置文件名

在项目根目录创建文件：`.env.local`

## 完整配置示例

```bash
# 数据库配置（必需）
DATABASE_URL="postgresql://username:password@localhost:5432/ai-niuma"

# Redis配置（可选）
REDIS_URL="redis://localhost:6379"

# ====== AI 提供商 API 密钥 ======

# OpenAI（推荐配置）
OPENAI_API_KEY="sk-proj-abcdefghijklmnopqrstuvwxyz1234567890"
# OPENAI_BASE_URL="https://api.openai.com/v1"  # 可选，默认官方地址

# DeepSeek（推荐配置，性价比高）
DEEPSEEK_API_KEY="sk-1234567890abcdefghijklmnopqrstuvwxyz"

# Anthropic Claude（可选）
ANTHROPIC_API_KEY="sk-ant-api03-abcdefghijklmnopqrstuvwxyz1234567890"

# Google Gemini（可选）
GOOGLE_API_KEY="AIzaSyAbCdEfGhIjKlMnOpQrStUvWxYz1234567"

# 豆包/字节跳动（可选）
DOUBAO_API_KEY="your-doubao-api-key-here"
DOUBAO_BASE_URL="https://ark.cn-beijing.volces.com/api/v3"

# xAI Grok（可选）
XAI_API_KEY="xai-1234567890abcdefghijklmnopqrstuvwxyz"

# 魔搭社区/阿里云通义千问（推荐）
MODELSCOPE_API_KEY="sk-your-modelscope-api-key-here"

# ====== 应用配置 ======

# 环境
NODE_ENV="development"

# Next.js 配置
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"

# 日志级别
LOG_LEVEL="info"

# 成本监控（可选）
ENABLE_COST_TRACKING="true"
COST_ALERT_THRESHOLD="100"

# 缓存配置（可选）
ENABLE_RESPONSE_CACHE="true"
CACHE_TTL="3600"
```

## 最小配置（只需要这些就能运行）

```bash
# 数据库
DATABASE_URL="postgresql://username:password@localhost:5432/ai-niuma"

# 至少配置一个AI提供商（推荐魔搭，便宜好用）
MODELSCOPE_API_KEY="sk-your-real-modelscope-key"
# 或者
OPENAI_API_KEY="sk-your-real-openai-key"
# 或者
DEEPSEEK_API_KEY="sk-your-real-deepseek-key"
```

## 获取 API 密钥的地址

1. **魔搭社区**: https://dashscope.console.aliyun.com/api-key （推荐，便宜）
2. **OpenAI**: https://platform.openai.com/api-keys
3. **DeepSeek**: https://platform.deepseek.com/api_keys
4. **Anthropic**: https://console.anthropic.com/settings/keys
5. **Google**: https://aistudio.google.com/app/apikey
6. **豆包**: https://console.volcengine.com/ark
7. **xAI**: https://console.x.ai/
