# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
```bash
# Start development server with Turbopack
pnpm dev

# Build production version with Turbopack  
pnpm build

# Start production server
pnpm start

# Lint code
pnpm lint
```

### Database (Prisma)
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev --name [migration-name]

# View database with Studio
npx prisma studio

# Reset database (destructive)
npx prisma migrate reset

# Seed database
npx prisma db seed
```

### Docker Services
```bash
# Start PostgreSQL + Redis services
docker-compose up -d

# Stop services
docker-compose down

# View service status
docker-compose ps

# View logs
docker-compose logs -f
```

## Architecture Overview

This is a **multi-AI agent chat application** built as a Next.js 15 full-stack application. The core concept is simulating a friend circle chat where multiple AI agents with different personalities respond to user messages in sequence.

### Latest Updates (2025-01-29)

**🧠 AI-Driven Emotion and Intent Analysis System (Just Completed)**
- **Replaced hardcoded keyword matching** with intelligent AI-driven analysis for emotion, intent, and topic detection
- **Hybrid analysis approach**: AI analysis with hardcoded fallback for reliability and performance
- **Smart caching system** with 30-minute cache timeout for frequently analyzed messages
- **Comprehensive analysis dimensions**: Primary emotion, intensity, detailed emotion breakdown, intent classification, topic extraction
- **Mixed confidence validation**: AI results validated against traditional keyword matching for improved accuracy

**Key Components:**
- `AIEmotionAnalyzer` (`src/lib/ai-emotion-analyzer.ts`) - Core AI analysis service with structured LLM API calls
- Enhanced `SceneAnalyzerAgent` with AI integration and hybrid analysis capabilities
- Updated `Orchestrator` with intelligent emotion/topic analysis for better agent selection
- Background analysis system for cache optimization without blocking execution

**🚌 Agent Bus System Implementation (Completed)**
- **Implemented V2 Agent Bus Architecture** - Advanced intelligent Agent coordination with message routing and result aggregation
- **Added IntelligentAgentBus** (`src/lib/intelligent-agent-bus.ts`) - Central coordination system for specialized Agents
- **Message Routing System** (`src/lib/message-router.ts`) - Sophisticated Agent-to-Agent communication with routing rules
- **Result Aggregation System** (`src/lib/result-aggregator.ts`) - Multi-strategy intelligent result combination and quality assessment
- **Intelligent Scheduler** (`src/lib/intelligent-scheduler.ts`) - Advanced execution planning with 6 different strategies

**Agent Bus System Components:**
- `IntelligentAgentBus` - Core bus for Agent registration, discovery, and coordination
- `BaseAgent` - Abstract base class with unified LLM interface and health monitoring
- `SceneAnalyzerAgent` - Intelligent scene analysis, emotion detection, topic extraction
- `ChatExecutorAgent` - Smart chatbot selection and group chat coordination
- `IntelligentOrchestrator` - Event-driven orchestration using the Agent bus

**🔄 Previous Updates (2025-01-28)**

**Major Architecture Migration: JSON Config → Database-Driven System**
- **Removed all JSON configuration files** and migrated to fully database-driven architecture
- **Added complete authentication system** with JWT tokens and middleware protection
- **Implemented conversation management** including delete functionality with confirmation UI
- **Fixed streaming chat issues** by resolving SSE event format mismatches between frontend and backend
- **Enhanced user experience** with WeChat-style message display (agent names above bubbles)

**Key Technical Improvements:**
- All Agent and LLM Provider configurations now stored in PostgreSQL database
- Dynamic configuration loading replaces static JSON files
- Proper user session management with protected routes
- Cascade deletion for conversations and related messages
- Responsive message UI with proper spacing and alignment

### Key Components

**Orchestrator Systems**:

**Legacy Orchestrator** (`src/lib/orchestrator.ts`):
- Traditional sequential execution system (EMPATHY → PRACTICAL → FOLLOWUP, etc.)
- Supports both streaming and non-streaming modes
- Basic emotion/topic analysis for agent selection
- Still active for backward compatibility

**New Agent Bus System** (`src/lib/intelligent-agent-bus.ts` + `src/lib/intelligent-orchestrator.ts`):
- **IntelligentAgentBus**: Claude Code-inspired architecture with specialized Agent coordination
- **Advanced Scene Analysis**: Deep context understanding and intelligent agent selection
- **Pluggable Agent Architecture**: Easy to add new specialized Agents
- **Event-Driven Orchestration**: Real-time streaming with sophisticated event handling

**Agent Configuration** (`src/lib/agent-config-manager.ts`):
- **Fully database-driven configuration** - no longer uses JSON config files
- All agent configurations stored in PostgreSQL with dynamic loading
- Each agent has distinct personality, system prompt, parameters, and linked LLM models
- Supports hot-reloading of agent configurations through admin interface

**LLM Service Layer** (`src/lib/llm-service.ts`):
- Adapter pattern for multiple LLM providers (OpenAI, Anthropic, DeepSeek, ModelScope, etc.)
- Unified interface for both streaming and non-streaming chat
- Provider-specific adapters in `src/lib/adapters/`
- **Database-driven provider configuration** with API keys, base URLs, and model settings

**Database Schema** (Prisma):
- Core models: User, Conversation, Message, Agent, LLMProvider, LLMModel, Flow
- **Complete authentication system** with User model and JWT session management
- **Dynamic agent-model-provider relationships** for flexible LLM configuration
- Message threading with agent attribution and cost tracking
- Cascade deletion support for data integrity

### Agent Flow System

The application supports multiple conversation flows:
- **empathy**: Basic care flow (EMPATHY → PRACTICAL → FOLLOWUP)
- **analysis**: Deep analysis (ANALYST → PRACTICAL → CREATIVE) 
- **complete**: Full support (all 5 agents in sequence)
- **smart**: Dynamic agent selection based on user emotion/topic
- **natural**: Randomized agent order

**All configuration now stored in database** - no JSON files required.

Each agent has been optimized with:
- Short, natural responses (30-80 characters)
- Distinct personalities (empathy, practical advice, encouragement, etc.)
- Conversation continuity (agents respond to previous messages)
- **WeChat-style message display** with agent names above bubbles

### API Architecture

**🚨 统一接口返回格式规范**:
所有API端点必须遵循统一的响应格式，确保前后端数据解析一致性：

```typescript
// 成功响应格式
interface APISuccessResponse<T = any> {
  success: true;
  data: T;
  message?: string;
  metadata?: {
    total?: number;
    page?: number;
    limit?: number;
    [key: string]: any;
  };
}

// 错误响应格式  
interface APIErrorResponse {
  success: false;
  error: string;
  details?: string;
  code?: string;
}

// 统一响应类型
type APIResponse<T = any> = APISuccessResponse<T> | APIErrorResponse;
```

**实现规范**:
```typescript
// ✅ 正确的成功返回
return NextResponse.json({
  success: true,
  data: result,
  message: '操作成功'
});

// ✅ 正确的错误返回
return NextResponse.json({
  success: false,
  error: '操作失败',
  details: '具体错误信息'
}, { status: 400 });

// ❌ 错误示例 - 直接返回数据
return NextResponse.json(result); // 不允许

// ❌ 错误示例 - 不一致的字段名
return NextResponse.json({ 
  ok: true,  // 应该是 success
  result: data  // 应该是 data
});
```

**前端统一处理模式**:
```typescript
// ✅ 统一的API调用处理
const response = await fetch('/api/endpoint');
const result = await response.json() as APIResponse<DataType>;

if (result.success) {
  // 使用 result.data
  setData(result.data);
  if (result.message) {
    showSuccessMessage(result.message);
  }
} else {
  // 处理错误
  console.error('API Error:', result.error);
  showErrorMessage(result.error);
}

// 🚀 使用APIClient工具类（推荐）
import { APIClient, APIResponseHelper } from '@/types/api';

// GET请求
const result = await APIClient.get<DataType>('/api/endpoint');
if (APIResponseHelper.isSuccess(result)) {
  setData(result.data);
}

// POST请求
const result = await APIClient.post<DataType>('/api/endpoint', formData);
if (APIResponseHelper.isError(result)) {
  showError(result.error);
}
```

**API格式检查工具**:
```bash
# 验证所有API端点格式合规性
node scripts/verify-api-format.js

# 自动修复API格式问题
node scripts/fix-api-format.js

# 查看修复统计
# ✅ 100%合规率 - 所有32个API文件都符合统一格式规范
# ✅ 100%导入率 - 所有文件都正确导入了APIResponseHelper  
# ✅ 58%统一格式使用率 - 156个返回语句中有90个使用了统一格式
```

**REST Endpoints**:
- `POST /api/conversations` - Create conversation
- `DELETE /api/conversations/[id]` - Delete conversation (with confirmation)
- `GET /api/conversations/[id]/stream` - SSE streaming endpoint (fixed event format)
- `GET /api/conversations/[id]/messages` - Get message history
- **Authentication endpoints**: `/api/auth/login`, `/api/auth/register`, `/api/auth/verify`, `/api/auth/logout`
- **Admin endpoints**: `/api/admin/agents`, `/api/admin/providers`, `/api/admin/dashboard`

**Streaming Support**:
- Server-Sent Events for real-time chat experience
- **Fixed event format compatibility** between frontend and backend
- Chunk-by-chunk message delivery with agent attribution
- Cancellation support for long-running orchestrations
- **WeChat-style real-time message display** with proper agent name positioning

## Development Patterns

### Agent Bus System Development
**Adding New Specialized Agents**:
1. **Extend BaseAgent** - Create new Agent class extending `BaseAgent` in `src/lib/agents/`
2. **Define capabilities** - Specify Agent capabilities array for bus discovery
3. **Implement execute()** - Core Agent logic with proper input validation and output formatting
4. **Register with Bus** - Add to `IntelligentOrchestrator` constructor for auto-registration
5. **Update interfaces** - Add appropriate input/output interfaces in agent file

**Agent Development Template**:
```typescript
export class NewAgent extends BaseAgent {
  readonly id = 'new-agent';
  readonly capabilities = ['specific_capability'];
  
  async execute(input: NewAgentInput): Promise<AgentResult> {
    // Validate input, call LLM, return formatted result
  }
}
```

### Legacy Multi-Agent Orchestration
When adding new agent types to the legacy system:
1. **Create agent in database** via admin interface or direct database insert
2. **Link agent to appropriate LLM model and provider**
3. Flow configuration to include new agent roleTag  
4. Consider emotion/topic analysis in `orchestrator.ts:selectAgentsDynamically()`

### LLM Provider Integration
To add new providers:
1. Create adapter in `src/lib/adapters/[provider]-adapter.ts`
2. Implement `LLMProviderAdapter` interface
3. Register in `src/lib/llm-service.ts` constructor
4. **Add provider to database** via admin interface with API keys and base URLs
5. **Create models** associated with the provider in database

### Database Migrations
Always use descriptive migration names and test with seed data:
```bash
npx prisma migrate dev --name add-agent-management
npx prisma db seed
```

### Component Structure
- Use shadcn/ui components in `src/components/ui/`
- Follow Next.js 15 App Router conventions
- Separate client/server components appropriately

## Environment Setup

Required environment variables:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/aifriends?schema=public"
REDIS_URL="redis://localhost:6379"
```

Development workflow:
1. Start Docker services: `docker-compose up -d`
2. Run migrations: `npx prisma migrate dev` 
3. Seed database: `npx prisma db seed`
4. Start development: `pnpm dev`

## Testing Strategy

- Test agent orchestration flows end-to-end
- Validate LLM adapter responses and error handling  
- Test streaming message delivery and cancellation
- Verify database constraints and relationships
- Test both single-provider and multi-provider modes

## Agent Bus System Status

### Current Implementation Status
**✅ Completed (80%)**:
- `IntelligentAgentBus` - Core bus architecture with agent registration and discovery
- `BaseAgent` - Standardized agent interface with LLM integration and health monitoring
- `IntelligentOrchestrator` - Event-driven orchestration with streaming support
- Core Agents: SceneAnalyzer, ChatExecutor, Creative, Analyst, QualityAssessor

**🚧 In Progress (60%)**:
- Advanced scene analysis and context understanding
- Intelligent agent selection algorithms
- Complex orchestration strategies

**❌ Pending**:
- Message routing and result aggregation system
- Performance monitoring and intelligent caching
- Multi-strategy scheduling engine
- Hot-pluggable agent architecture

### Known Issues to Fix
1. **Hard-coded LLM configuration** in BaseAgent - should read from database
2. **Basic scene analysis** - needs deeper context understanding per V1 requirements
3. **Simple agent selection** - needs intelligent scoring and matching algorithms
4. **Missing message routing** - Agent-to-Agent communication not implemented

## Important Notes

- The project uses **pnpm** as package manager - ALWAYS use pnpm for installing packages, not npm or yarn
- **Agent Bus System** is the future architecture - prefer it over legacy orchestrator for new features
- Development uses single ModelScope provider, production supports multiple
- Turbopack is enabled for faster development builds
- Agent personalities are carefully crafted for natural conversation flow
- Cost tracking is implemented per message with provider-specific pricing