# AI 朋友圈 — Next.js 全栈技术方案 & 场景流程库（V1.1）

> 技术栈按你的偏好：**Next.js 14 (App Router) + TypeScript + shadcn/ui + Node（Server Actions/Route Handlers）+ Prisma + Postgres + Redis**。统一编排的多智能体接力，内置“场景识别 → 流程选择 → 节点接力”。

---

## 1. 产品范围更新（不局限代码生成）
**目标：** 覆盖常见非技术与日常生活/工作场景，自动判断意图并调度对应“接力流程”。

### 1.1 场景分类（初版）
- **询价/比价**（电商、工具、SaaS、服务报价）
- **信息查询/速读**（百科/摘要/法规查阅/会议纪要）
- **计划与执行**（健身计划、学习计划、旅行行程）
- **生活关怀/情绪支持**（共情→建议→轻任务）
- **教育辅导**（题解讲解、学习路径、练习生成与批改）
- **工作助理**（OKR/周报/邮件草拟/会议纪要→行动项）
- **代码/技术**（方案→补充→可运行样例→部署）

> 安全提示：**医疗、法律、财务**给出非专业免责声明与就医/咨询建议；避免具体诊断或投资建议。

### 1.2 场景→流程映射（Flow Library v1）
- **询价/比价**：`PLAN`(范围界定) → `GATHER`(抓要点/价位/渠道) → `COMPARE`(表格对比) → `ADVISE`(购买建议)
- **信息查询/速读**：`PLAN` → `SEARCH`(关键要点&来源) → `SYNTH`(结构化摘要) → `VERIFY`(引用与反证)
- **计划与执行**：`PLAN` → `STRUCTURE`(时间/里程碑) → `CUSTOMIZE`(个性化约束) → `CHECKLIST`(清单) → `NUDGE`(提醒建议)
- **生活关怀**：`EMPATHY` → `PRACTICAL`(可做的3-5件小事) → `FOLLOWUP`(第二天关心/打卡提示)
- **教育辅导**：`ASSESS`(水平/目标) → `EXPLAIN` → `PRACTICE`(题目与提示) → `FEEDBACK`(批改与下一步)
- **工作助理**：`SUMMARIZE` → `ACTION`(行动项) → `DRAFT`(邮件/周报) → `REVIEW`
- **代码/技术**：`PLAN` → `AUGMENT` → `FEASIBILITY` → `CODE` → `DEPLOY`

---

## 2. 架构设计（Next.js 全栈）
```
[ Next.js App Router ]
  ├─ UI (shadcn/ui)  ── Chat/Flows/Settings
  ├─ Route Handlers (app/api/*)  ── SSE/REST
  ├─ Server Actions  ── low-latency ops
  ├─ Auth (next-auth)  ── OAuth/email
  └─ Edge/Node runtimes 按需划分（SSE 用 Node）
        │
        ▼
[ Orchestrator (lib/orchestrator) ]
  ├─ Intent Classifier (rules+LLM)  
  ├─ Flow Engine (steps JSON)
  ├─ Prompt Runtime (preamble + vars)
  ├─ Token/Cost Guard
  └─ Event Bus (SSE events)
        │
        ├─ Model Adapters (OpenAI/Anthropic/Google/DeepSeek/豆包/xAI)
        └─ Workers (queue): code pack/deploy, scraping
          
[ Data ]
  ├─ Postgres (Prisma)
  ├─ Redis (session/context/locks)
  └─ Object Store (R2/S3) artifacts
```

### 2.1 关键选型
- **SSE**：`app/api/conversations/[id]/events/route.ts`（Node runtime），前端 `EventSource` 订阅。
- **shadcn/ui**：`Card/Badge/Avatar/ScrollArea/Separator/Alert/ResizablePanel/Toast/Dialog` 等。
- **Prisma**：数据模型与迁移；`prisma/seed` 填充默认流程与代理人。
- **Redis**：会话摘要、上条回答摘要、幂等锁（避免重复部署）。
- **队列**：Q1 用 Redis Stream/Delayed jobs；后续切 BullMQ/Cloud Tasks。
- **部署**：Vercel（前后端）+ 外部部署适配器（可触发 Railway/Vercel 项目创建）。

---

## 3. 目录结构（建议）
```
/ (repo)
├─ app/
│  ├─ page.tsx (会话列表/入口)
│  ├─ chat/[id]/page.tsx
│  ├─ api/
│  │   ├─ conversations/route.ts (POST create)
│  │   ├─ conversations/[id]/messages/route.ts (POST user msg)
│  │   ├─ conversations/[id]/events/route.ts (GET SSE)
│  │   ├─ deployments/[id]/route.ts (GET status)
│  │   └─ deploy/route.ts (POST manual deploy)
│  └─ settings/*
├─ components/
│  ├─ chat/
│  │   ├─ MessageBubble.tsx
│  │   ├─ TypingDots.tsx
│  │   ├─ AgentAvatar.tsx
│  │   ├─ CodeBlock.tsx
│  │   └─ DeployCard.tsx
│  ├─ flows/FlowPicker.tsx
│  └─ ui/* (shadcn)
├─ lib/
│  ├─ orchestrator/
│  │   ├─ engine.ts
│  │   ├─ classifier.ts
│  │   ├─ prompts.ts
│  │   ├─ summarizer.ts
│  │   ├─ budget.ts
│  │   └─ events.ts
│  ├─ adapters/
│  │   ├─ openai.ts  ├─ anthropic.ts  ├─ google.ts  ├─ deepseek.ts  ├─ doubao.ts  ├─ xai.ts
│  ├─ deploy/
│  │   ├─ vercel.ts  └─ railway.ts
│  ├─ db.ts (Prisma)
│  ├─ redis.ts
│  └─ logger.ts
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
├─ flows/
│  ├─ library.json (内置流程集合)
│  └─ *.flow.json (可拆分维护)
└─ .env.example
```

---

## 4. 数据模型（Prisma v1）
```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  name         String?
  plan         String   @default("free")
  createdAt    DateTime @default(now())
  conversations Conversation[]
}

model Conversation {
  id           String   @id @default(cuid())
  userId       String
  title        String
  mode         String   // empathy | plan | compare | study | code ...
  budgetCents  Int      @default(500)
  createdAt    DateTime @default(now())
  messages     Message[]
  deployments  Deployment[]
}

model Message {
  id           String   @id @default(cuid())
  convId       String
  role         String   // user | ai
  agentId      String?
  step         String?
  content      String
  tokens       Int      @default(0)
  costCents    Int      @default(0)
  createdAt    DateTime @default(now())
}

model Agent {
  id           String   @id @default(cuid())
  name         String
  provider     String   // openai | anthropic | google | deepseek | doubao | xai
  roleTag      String   // PLAN | AUGMENT | EMPATHY ...
  order        Int
  prompt       String
  enabled      Boolean  @default(true)
}

model Flow {
  id           String   @id @default(cuid())
  name         String
  mode         String
  steps        Json     // [{roleTag, provider, maxTokens, limitChars,...}]
  enabled      Boolean  @default(true)
}

model Artifact {
  id           String   @id @default(cuid())
  convId       String
  type         String   // zip | file | link
  url          String
  meta         Json?
}

model Deployment {
  id           String   @id @default(cuid())
  convId       String
  provider     String   // vercel | railway
  status       String   // pending | building | success | failed
  url          String?
  logsUrl      String?
  meta         Json?
  createdAt    DateTime @default(now())
}
```

---

## 5. API 设计（Next.js Route Handlers）
### 5.1 创建会话
`POST /api/conversations`
- 入参：`{ title?: string, mode?: string, agents?: string[] }`
- 返回：`{ id, title, mode }`

### 5.2 发送消息（触发接力）
`POST /api/conversations/[id]/messages`
- 入参：`{ text: string }`
- 行为：写入user消息→Orchestrator启动→向SSE推送事件
- 返回：`{ ok: true }`

### 5.3 订阅事件（SSE）
`GET /api/conversations/[id]/events`
- 事件：
  - `ai_message_started` `{agent, step}`
  - `ai_chunk` `{text}`
  - `ai_message_completed` `{messageId}`
  - `step_started` `{step}`
  - `step_failed` `{step, error}`
  - `deploy_started` `{provider}`
  - `deploy_completed` `{status, url}`

### 5.4 手动部署（可选）
`POST /api/deploy`
- 入参：`{ convId: string, artifactId?: string, provider?: 'vercel'|'railway' }`

### 5.5 查询部署
`GET /api/deployments/[id]`

---

## 6. 编排核心（Orchestrator）
### 6.1 意图识别（Classifier）
- **轻量规则**优先：关键词 + 句式（如“多少钱/报价/配置/比较/体检/旅行/课程/题目”）
- **LLM 兜底**：`CLASSIFY` 提示，输出 `mode` + 置信度 + 可选 flow 名称
- **跨场景开关**：若置信度低 → 询问用户选择或给出候选

### 6.2 上下文与摘要
- 每步传入：`用户原文` + `上一条AI摘要(<=120字)` + `会话摘要(<=80字)`
- 由 `summarizer.ts` 执行压缩，减少 token 成本

### 6.3 预算与限额
- 每会话预算（默认 ¥5-¥10），`budget.ts` 记录每步 token 与成本；超限即停并提示

### 6.4 流程定义（示例）
```json
{
  "name": "compare-buying",
  "mode": "compare",
  "steps": [
    { "roleTag": "PLAN", "provider": "openai", "limitChars": 180 },
    { "roleTag": "GATHER", "provider": "google", "limitChars": 220 },
    { "roleTag": "COMPARE", "provider": "deepseek", "limitChars": 220 },
    { "roleTag": "ADVISE", "provider": "anthropic", "limitChars": 160 }
  ]
}
```

---

## 7. Prompt 库（片段示例）
### 通用前置
- 「你是 **AI 朋友圈** 中的 `{roleTag}`。阅读 *用户原文* 与 *上一位的摘要*，**接力而不是重复**，在 `{limit}` 字内输出。语气自然，避免奉承。」

### 询价/比价
- **PLAN**：「厘清需求：预算/品牌偏好/用途/时间线。列出 3 个必须与 2 个可选指标。」
- **GATHER**：「基于需求，给出 3-5 个候选与主流渠道、典型价格区间与优缺点。」
- **COMPARE**：「将候选以 3-5 行要点对比（性能/价格/售后/风险），尽量结构化。」
- **ADVISE**：「结合用户偏好，给出 1-2 个明确推荐与理由；给出风险提示。」

### 信息查询/速读
- **SEARCH**：「列出 3-5 个高质量来源，并抽取关键信息（附来源名）。」
- **SYNTH**：「把要点合成 4-6 条结论，标注不确定点。」
- **VERIFY**：「指出可能的反例或争议，并给出交叉验证的做法。」

### 计划与执行
- **STRUCTURE**：「按周拆分目标与里程碑，限定总时长 X 周。」
- **CHECKLIST**：「输出今日可执行清单（≤5项），每项 15-45 分钟。」
- **NUDGE**：「语气像朋友，提供第二天提醒文案。」

### 生活关怀
- **EMPATHY**：「先理解与共情，再问 1 个小问题了解更多，不评价。」
- **PRACTICAL**：「给 3 条可立即尝试的小建议（休息/饮食/节奏），避免医疗判断。」
- **FOLLOWUP**：「提供一条温柔的第二天问候模板。」

### 教育辅导
- **ASSESS**：「识别水平，问 1 个定位题。」
- **EXPLAIN**：「用类比+步骤化解释，控制在 150-200 字。」
- **PRACTICE**：「2-3 道练习，附提示而非直接答案。」
- **FEEDBACK**：「根据作答给针对性建议。」

### 代码/技术（保留）
- **CODE**：「输出最小可运行模板（限制体量），剩余用 TODO 占位说明。」

---

## 8. 前端 UX 要点（shadcn/ui）
- **聊天列表**：`ScrollArea` + 虚拟列表；头像用不同 AI 品牌色边框（不露商标图）
- **“正在输入”**：`TypingDots` 逐步出现，按队列顺序
- **消息气泡**：`MessageBubble` 支持 `roleTag` 小徽标（PLAN/COMPARE...）
- **代码与表格**：`CodeBlock`（复制按钮）与轻量 `Table`
- **流程可视化**：顶部 `Steps`（当前/已完成/失败）
- **部署卡片**：`DeployCard` 显示进度、重试与链接
- **模式切换**：`FlowPicker` 可选“自动识别/手动指定”

---

## 9. 安全与合规
- **敏感场景**：医疗/法律/财务 → 自动附加免责声明；必要时建议线下专业咨询
- **内容过滤**：输出前过一层轻量规则 + LLM 审核（尽量本地化规则优先）
- **隐私**：消息与日志脱敏；导出/删除功能；API Key 加密

---

## 10. 部署 & 运维
- **环境变量**：各提供商 API Key、数据库、Redis、对象存储
- **Vercel**：Next.js 托管，SSE 路由使用 `Node.js runtime`
- **监控**：
  - 基础：响应时间、SSE 中断率
  - 成本：每会话 token/费用、厂商分布
  - 质量：用户反馈标签（有用/一般/无用）
- **日志**：结构化 JSON，敏感字段打码

---

## 11. 里程碑与任务拆解（3 周 MVP）
### 第 1 周
- 项目框架搭建（Next.js/shadcn/ui/Prisma/Redis）
- 数据模型与迁移，seed 默认流程（生活关怀、询价、代码）
- 会话创建/消息发送 API，SSE 基础链路
- Orchestrator 雏形（顺序接力 + 上条摘要）

### 第 2 周
- 场景分类（规则+LLM 兜底）与流程选择
- Prompt 库接入，预算控制与速率限制
- UI：接力步骤可视化、消息气泡、输入框、Typing 动画
- 部署适配：Vercel 直连（仅代码流使用）

### 第 3 周
- 质量打磨：错误处理、重试、降级
- 体验：对比表、清单、提醒文案组件
- 监控面板与成本仪表
- 验收用例与灰度上线

---

## 12. 验收用例（关键场景）
1) **生活关怀**：
- 输入「最近身体不太好」→ EMPATHY→PRACTICAL→FOLLOWUP，3 条接力，内容不重复、语气自然。

2) **询价/比价**：
- 输入「2k-3k 预算买空气炸锅，重点省电」→ PLAN→GATHER→COMPARE→ADVISE；对比至少 3 款，输出结构化建议。

3) **教育辅导**：
- 输入「我想 4 周入门线代」→ ASSESS→EXPLAIN→PRACTICE→FEEDBACK；给出 4 周计划与首日任务。

4) **代码/部署**：
- 输入「0 基础建网站」→ 方案→补充→代码→部署链接（或下载包）。

---

## 13. 类型与接口（TS 摘要）
```ts
export type SSEvent =
  | { type: 'step_started'; step: string }
  | { type: 'ai_message_started'; agent: string; step: string }
  | { type: 'ai_chunk'; text: string }
  | { type: 'ai_message_completed'; messageId: string }
  | { type: 'deploy_started'; provider: string }
  | { type: 'deploy_completed'; status: 'success'|'failed'; url?: string };

export interface FlowStep {
  roleTag: string; // PLAN | EMPATHY | COMPARE ...
  provider: string; // openai | anthropic ...
  limitChars?: number;
  maxTokens?: number;
}

export interface FlowDef { name: string; mode: string; steps: FlowStep[] }
```

---

## 14. 样例：生活关怀流程演示（Prompt 组合）
- **系统**：你是 AI 朋友圈中的 `{roleTag}`。你的目标是像朋友一样接力上一条回答，避免重复，简短实用。
- **EMPATHY**：先表示理解，问 1 个开放式问题便于继续；≤120 字。
- **PRACTICAL**：基于上条，给 3 条可立刻尝试的小建议（10-30 分钟可完成），避免医疗判断；≤180 字。
- **FOLLOWUP**：生成明天早上 9 点的问候文案（1 句），附 1 个小检查项；≤60 字。

---

## 15. 风险与对策（与非代码场景相关）
- **事实性错误**：信息查询/比价步增加引用与“可不确定项”标注；提供来源名。
- **价值观与语气**：统一风格指南（像朋友，不奉承，不命令）。
- **意图识别误判**：用户可切换为手动流程；低置信度时给出 2-3 个建议流程供选。
- **成本与时延**：摘要+限字+并行可行的内部辅助步（仅对非接力部分）。

---

## 16. 后续增强（V1.5+）
- **可视化流程编辑器**（拖拽节点、条件分支）
- **个性化朋友圈角色**（语气/头像/口头禅/节奏）
- **提醒/打卡**（日历/Push，或与 Telegram/飞书 Bot 对接）
- **第三方插件**（电商/航旅/地图/日程）

---

> 本文档面向落地开发，可直接据此开 Sprint。如需要，我可以继续输出：
> 1) `schema.prisma` 完整文件与初始 seed；
> 2) `orchestrator/engine.ts` 与 `classifier.ts` 骨架；
> 3) shadcn 组件清单与样式约定；
> 4) Vercel & 环境变量模板；
> 5) 端到端本地启动手册。

