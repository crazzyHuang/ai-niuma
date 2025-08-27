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

### Key Components

**Orchestrator System** (`src/lib/orchestrator.ts`):
- Central coordination system for multi-agent conversations
- Manages sequential execution of AI agents (EMPATHY → PRACTICAL → FOLLOWUP, etc.)
- Supports both streaming and non-streaming modes
- Handles intelligent agent selection based on user emotion/topic analysis

**Agent Configuration** (`src/lib/agent-config-manager.ts`):
- Supports two modes: single-provider (development) and multi-provider (production)  
- Single-provider mode uses `config/single-provider-agents.json`
- Multi-provider mode uses database configuration
- Each agent has distinct personality, system prompt, and parameters

**LLM Service Layer** (`src/lib/llm-service.ts`):
- Adapter pattern for multiple LLM providers (OpenAI, Anthropic, DeepSeek, etc.)
- Unified interface for both streaming and non-streaming chat
- Provider-specific adapters in `src/lib/adapters/`

**Database Schema** (Prisma):
- Core models: User, Conversation, Message, Agent, Flow
- Support for dynamic agent management and provider configuration
- Message threading with agent attribution and cost tracking

### Agent Flow System

The application supports multiple conversation flows:
- **empathy**: Basic care flow (EMPATHY → PRACTICAL → FOLLOWUP)
- **analysis**: Deep analysis (ANALYST → PRACTICAL → CREATIVE) 
- **complete**: Full support (all 5 agents in sequence)
- **smart**: Dynamic agent selection based on user emotion/topic
- **natural**: Randomized agent order

Configuration is in `config/single-provider-agents.json` for development, database for production.

Each agent has been optimized with:
- Short, natural responses (30-80 characters)
- Distinct personalities (empathy, practical advice, encouragement, etc.)
- Conversation continuity (agents respond to previous messages)

### API Architecture

**REST Endpoints**:
- `POST /api/conversations` - Create conversation
- `POST /api/conversations/[id]/chat` - Send message (non-streaming)
- `GET /api/conversations/[id]/stream` - SSE streaming endpoint
- `GET /api/conversations/[id]/messages` - Get message history

**Streaming Support**:
- Server-Sent Events for real-time chat experience
- Chunk-by-chunk message delivery with agent attribution
- Cancellation support for long-running orchestrations

## Development Patterns

### Multi-Agent Orchestration
When adding new agent types, update both:
1. Agent definition in `config/single-provider-agents.json` 
2. Flow configuration to include new agent roleTag
3. Consider emotion/topic analysis in `orchestrator.ts:selectAgentsDynamically()`

### LLM Provider Integration
To add new providers:
1. Create adapter in `src/lib/adapters/[provider]-adapter.ts`
2. Implement `LLMProviderAdapter` interface
3. Register in `src/lib/llm-service.ts` constructor
4. Add provider config to `config/llm-providers.json`

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

## Important Notes

- The project uses **pnpm** as package manager
- Development uses single ModelScope provider, production supports multiple
- Turbopack is enabled for faster development builds
- Agent personalities are carefully crafted for natural conversation flow
- Cost tracking is implemented per message with provider-specific pricing