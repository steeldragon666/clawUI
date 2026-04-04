# Agent Mission Control (AMC) — Design Specification

**Omniscient AI**
Multi-Tenant Agent Orchestration Platform
Version 1.0 — April 2026

---

## 1. Executive Summary

Agent Mission Control (AMC) is a real-time operations dashboard for managing a fleet of 50+ AI agents distributed across multiple mini-PC servers, serving 10-30 client companies with automated social media content creation, scheduling, and publishing across X (Twitter), LinkedIn, Facebook, and Instagram.

The system provides a single 50-inch always-on command surface with full observability into agent health, task pipelines, client content calendars, network throughput, and operational bottlenecks. It is designed as both an internal operations tool and a white-labelable client portal, creating two revenue streams from a single codebase.

### Primary Objectives

- **Fleet observability**: Real-time visibility into every agent's state, task, and performance across all servers
- **Multi-tenant automation**: Manage content pipelines for 10-30 companies simultaneously with isolated data and brand configurations
- **Live control**: Start, stop, reassign, and configure any agent from the dashboard without SSH access
- **Revenue enablement**: White-label client portal showing content calendars, engagement metrics, and approval workflows
- **Bottleneck detection**: Automatically surface capacity issues, rate limit warnings, and stalled pipelines before they affect delivery

### Audience

- **Human operators** (Aaron / ops team) — god-view on 50" screen
- **AI ops/engineer agents** — consume the same data for automated monitoring and intervention
- **Clients** — scoped white-label portal for their own content and metrics

---

## 2. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Frontend | React + Vite + TypeScript | SPA optimized for always-on display; richest ecosystem for data viz |
| Styling | Tailwind CSS + custom design tokens | Utility-first with cyberpunk token system |
| Data Viz | Recharts / Visx + D3 | Sparklines, Gantt charts, heatmaps |
| Real-time | WebSocket (Socket.IO) | Bidirectional: status push + command send |
| API | Node.js + Fastify | Lightweight, fast, built-in TypeScript support |
| Database | PostgreSQL + TimescaleDB | Single DB for relational + time-series; continuous aggregates for metrics |
| Command Queue | Redis Streams | Per-agent command queues, survives disconnects |
| Task Scheduler | Bull MQ (Redis-backed) | Content calendar execution, recurring tasks |
| Auth | JWT + row-level security (Postgres RLS) | Tenant isolation at the database level |

---

## 3. System Architecture

### 3.1 High-Level Architecture

Hub-and-spoke: central control plane + distributed agent workers on mini-PCs.

```
                         ┌─────────────────────────┐
                         │    50" DASHBOARD (SPA)   │
                         │    React + Vite          │
                         └──────────┬──────────────┘
                                    │ WebSocket (bidirectional)
                                    ▼
                         ┌─────────────────────────┐
                         │    CONTROL PLANE API     │
                         │    Fastify + Node.js     │
                         │                          │
                         │  ┌─────────┐ ┌────────┐  │
                         │  │Postgres │ │ Redis  │  │
                         │  │+Timescale│ │Streams │  │
                         │  └─────────┘ └────────┘  │
                         └──────────┬──────────────┘
                                    │ HTTP heartbeat + Redis commands
                      ┌─────────────┼─────────────┐
                      ▼             ▼              ▼
               ┌────────────┐ ┌────────────┐ ┌────────────┐
               │ Mini-PC 01 │ │ Mini-PC 02 │ │ Mini-PC 03 │
               │ greenhouse │ │ biz-auto   │ │ biz-auto   │
               │            │ │ Acme Corp  │ │ BrandX     │
               │ Agent A    │ │ Agent D    │ │ Agent G    │
               │ Agent B    │ │ Agent E    │ │ Agent H    │
               │ Agent C    │ │ Agent F    │ │ Agent I    │
               └────────────┘ └────────────┘ └────────────┘
```

### 3.2 Communication Flow

```
Agent (mini-PC)                 Control Plane API              Dashboard (50")
─────────────────               ─────────────────              ──────────────
     │                                │                              │
     │── heartbeat POST (30s) ───────►│                              │
     │   {status, cpu, mem,           │── WS broadcast ────────────►│
     │    task_counter, queue_depth}   │   (fan-out to all clients)  │
     │                                │                              │
     │                                │◄── WS command ──────────────│
     │                                │    (pause agent-12)          │
     │◄── Redis Stream command ──────│                              │
     │    (queued if offline)         │                              │
     │                                │                              │
     │── task_complete event ────────►│── update pipeline ──────────►│
     │                                │   + persist to Postgres      │
```

### 3.3 Heartbeat Protocol

Each agent sends a heartbeat every 30 seconds via HTTP POST.

**Payload:**
```json
{
  "agent_id": "uuid",
  "server_id": "uuid",
  "tenant_id": "uuid",
  "timestamp": "ISO-8601",
  "status": "idle | working | degraded | error",
  "cpu_percent": 58,
  "memory_percent": 41,
  "current_task_id": "uuid | null",
  "task_counter": 4412,
  "queue_depth": 3,
  "meta": {}
}
```

**Graduated Absence Detection:**

| Condition | Threshold | Action |
|-----------|-----------|--------|
| No heartbeat | 60 seconds | Status → AMBER (warning) |
| No heartbeat | 90 seconds | Status → RED (critical) |
| No heartbeat | 120 seconds | Status → DEAD, trigger auto-restart/escalation |
| Stall detected | 5+ heartbeats, same task_counter, status=working | Status → STALLED, separate alert |

**Absence detector** runs as a background worker every 15 seconds, checking `last_heartbeat` against thresholds. Agents cannot report their own death — the absence pattern catches silent failures, crashed processes, network partitions, and frozen threads.

### 3.4 Live Control Protocol

Commands sent via Redis Streams (one stream per agent). Commands queue when agents are unreachable and execute on reconnect.

**Supported Commands:**
- `pause` / `resume` — suspend/restart agent processing
- `cancel_task` — abort current task
- `reassign_task` — move task to different agent
- `update_config` — change API keys, posting schedules, tone settings per client
- `force_sync` — pull latest content queue
- `graceful_shutdown` — for maintenance windows
- `restart` — full agent restart

Bulk operations supported: pause all agents on server X, restart all agents with role Y.

---

## 4. Data Model

PostgreSQL with row-level security (RLS) enforcing tenant isolation. All tenant-scoped tables include `tenant_id` as the partition key for RLS policies.

### Core Tables

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────────┐
│    tenants        │     │    servers        │     │      agents          │
│──────────────────│     │──────────────────│     │──────────────────────│
│ id (UUID, PK)     │◄────│ tenant_id (FK)    │◄────│ server_id (FK)       │
│ company_name      │     │ hostname          │     │ agent_id (UUID, PK)  │
│ brand_voice_rules │     │ ip_address        │     │ role (enum)          │
│ approval_workflow │     │ region            │     │ status (enum)        │
│ sla_tier          │     │ specs (jsonb)     │     │ current_task_id      │
│ pricing_tier      │     │ last_seen         │     │ config (jsonb)       │
│ platforms (jsonb)  │     └──────────────────┘     │ last_heartbeat       │
└──────────────────┘                                 └──────────────────────┘

┌──────────────────────────┐     ┌──────────────────────────┐
│   heartbeats              │     │   tasks                   │
│   (TimescaleDB hypertable)│     │──────────────────────────│
│──────────────────────────│     │ id (UUID, PK)             │
│ time (timestamptz)        │     │ tenant_id (FK)            │
│ agent_id (FK)             │     │ agent_id (FK, nullable)   │
│ tenant_id (FK)            │     │ type (enum)               │
│ status (enum)             │     │ status (queued/active/    │
│ cpu_percent               │     │   approval/done/failed)   │
│ memory_percent            │     │ priority (1-5)            │
│ task_counter (monotonic)  │     │ estimated_duration        │
│ queue_depth               │     │ actual_duration           │
│ payload (jsonb)           │     │ retry_count               │
└──────────────────────────┘     │ inputs (jsonb)            │
                                  │ outputs (jsonb)           │
┌──────────────────────────┐     │ execution_log (text)      │
│  platform_accounts        │     │ cost                      │
│──────────────────────────│     │ created_at / completed_at │
│ tenant_id (FK)            │     └──────────────────────────┘
│ platform (enum)           │
│ oauth_tokens (encrypted)  │     ┌──────────────────────────┐
│ rate_limit_state (jsonb)  │     │  content_items            │
│ posting_schedule (jsonb)  │     │──────────────────────────│
│ last_refresh              │     │ id (UUID, PK)             │
└──────────────────────────┘     │ tenant_id (FK)            │
                                  │ task_id (FK)              │
                                  │ platform (enum)           │
                                  │ content_body (text)       │
                                  │ media_urls (jsonb)        │
                                  │ version (int)             │
                                  │ approval_status           │
                                  │ approved_by               │
                                  │ scheduled_at              │
                                  │ published_at              │
                                  │ engagement (jsonb)        │
                                  └──────────────────────────┘
```

---

## 5. Design System — "Terminal Neon"

### 5.1 Aesthetic Direction

A fusion of CRT terminal authenticity with neon-accented data density. NASA mission control rebuilt by a cyberpunk hacker collective. Dark, dense, information-rich, glowing at the points that matter. Restraint is key — neon highlights critical data, everything else recedes into the dark field.

**Emotional register:** Cold/Technical + Urgent/Kinetic. The dashboard should feel like a weapon. Precise, fast, zero decoration. Every pixel earns its place by conveying information.

**Signature detail:** Scanline overlay across all data panels with subtle CRT phosphor glow on active data, combined with amber neon pulse animations on elements requiring attention.

### 5.2 Color Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-void` | `#0a0a0f` | Page background |
| `--bg-panel` | `rgba(18,18,31,0.8)` | Panel backgrounds (glass morphism) |
| `--bg-card` | `#12121f` | Agent cards, task cards |
| `--border-subtle` | `rgba(255,255,255,0.06)` | Panel borders default |
| `--border-glow` | `rgba(0,240,255,0.3)` | Active panel borders |
| `--neon-cyan` | `#00f0ff` | Active/working state, primary accent |
| `--neon-magenta` | `#ff00aa` | Error state, critical alerts |
| `--neon-green` | `#00ff88` | Success, completion |
| `--neon-amber` | `#ffaa00` | Warning, stalled, needs attention |
| `--neon-red` | `#ff2244` | Down/dead state |
| `--text-primary` | `#e0e0e8` | Primary text |
| `--text-secondary` | `#6a6a7a` | Dimmed/secondary text |
| `--text-muted` | `#334455` | Idle/inactive text |

### 5.3 Agent Status Colors

| Status | Color | Visual Treatment |
|--------|-------|-----------------|
| Working | Cyan `#00f0ff` | Steady neon glow |
| Idle | Dim gray `#334455` | Subtle slow pulse |
| Stalled | Amber `#ffaa00` | Fast pulse (1.5s cycle) |
| Error | Magenta `#ff00aa` | Glow + border flash |
| Down/Unreachable | Red `#ff2244` | Flatline animation |
| Success (recent) | Green `#00ff88` | Brief flash then fade |

### 5.4 Typography

- **Headings:** JetBrains Mono or Space Mono — monospace for the terminal feel
- **Body/Data:** Inter or IBM Plex Sans — high legibility at distance on 50" screen
- **Numbers/Metrics:** Tabular numerals (JetBrains Mono) — columns align properly

### 5.5 Visual Effects

- **Scanline overlay:** `repeating-linear-gradient(0deg, ...)` with 1px dark lines at 3-5% opacity across data panels. CRT authenticity without hurting readability.
- **Neon glow:** Multi-layer `box-shadow` (10px/20px/30px) with decreasing opacity. Only on active elements — never on static ones.
- **Grid underlay:** 20px grid pattern at 2-3% opacity on page background. Depth and structure.
- **Pulse animation:** Amber glow pulse (1.5s ease-in-out infinite) on elements requiring attention.
- **Data flash:** 200ms amber flash on any data point that just updated. Draws the eye to changing values.
- **Glass morphism panels:** `backdrop-filter: blur(12px)` with panel background. 1px border at 10% white opacity.
- **Corner brackets:** HUD-style triangular corner brackets on primary panels (CSS borders or clip-path).

---

## 6. Screen Layout — 50-Inch Display

3840x2160 (4K) on a 50-inch display. Zero-scroll on primary view. All critical information visible without interaction.

### 6.1 Primary View: Fleet Operations

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ░░ OMNISCIENT AI — AGENT MISSION CONTROL ░░    [Briefing] [Cmd+K]  [Time]│
├─────────────────────────────────────────┬───────────────────────────────────┤
│                                          │                                   │
│         LIVE AGENT GRID                  │      TASK PIPELINE / KANBAN       │
│    Cards grouped by server               │   Queued → In Progress →          │
│    Status color-coded                    │   Approval → Published            │
│    Inline controls (pause/kill/restart)  │   Backlog depth trend indicator   │
│    ~60% width, top 50% height           │   ~40% width, top 50% height     │
│                                          │                                   │
├─────────────────────────────────────────┴───────────────────────────────────┤
│                     CONTENT CALENDAR / SCHEDULE TIMELINE                     │
│          Multi-client Gantt view, 24-48h, drift overlay                     │
│          Full width, ~15% height                                            │
├──────────────────┬───────────────────┬──────────────────────────────────────┤
│   PERFORMANCE    │  INFRASTRUCTURE   │         ERROR & ALERT FEED           │
│   METRICS        │  HEALTH           │         Scrolling log                │
│                  │                   │         Filterable by severity       │
│  Sparklines      │  CPU/mem/disk     │         Actionable context           │
│  Success rates   │  per server       │                                      │
│  Trend by role   │  API rate limits  │         [ALL] [ERROR] [WARN] [INFO] │
│  ~25% width      │  Latency          │         ~50% width                  │
│                  │  ~25% width       │                                      │
└──────────────────┴───────────────────┴──────────────────────────────────────┘
```

### 6.2 Secondary Views (via nav rail)

| View | Purpose |
|------|---------|
| **Calendar** | Full-screen content calendar with approval sidebar. Filter by client, platform, date range |
| **Client Detail** | Single-tenant deep dive: their agents, content, metrics, approval queue |
| **Analytics** | Engagement charts, top content, growth trends, cost analysis |
| **Agent Detail** | Execution log, session replay, task history, resource consumption |
| **Settings** | Client management, agent provisioning, alert rules, escalation chains, API keys |

---

## 7. Feature Inventory

### 7.1 Primary View Panels

1. **Agent Fleet Grid** — live status cards grouped by server, cyberpunk status colors, inline controls
2. **Task Pipeline Kanban** — queued → in-progress → approval → published, backlog depth indicator
3. **Content Calendar Timeline** — multi-client Gantt with drift overlay, platform icons
4. **Performance Metrics** — sparklines, success rates, completions/hr trend, breakdown by role & client
5. **Infrastructure Health** — CPU/mem/disk per server, API rate limit consumption, latency
6. **Error & Alert Feed** — scrolling log, severity filter, actionable context per entry
7. **Status Bar** — global stats, clock, active alert count, morning briefing trigger

### 7.2 Secondary Views

8. **Calendar View** — full-screen content calendar with approval sidebar
9. **Client Detail** — single-tenant deep dive
10. **Analytics Dashboard** — engagement charts, top content, growth, cost
11. **Agent Detail** — execution log, session replay, resource consumption
12. **Settings** — client management, agent provisioning, alert rules, API keys

### 7.3 Daily Functions

13. **Morning Briefing** — auto-generated overnight summary: completions, failures, queued for today, offline agents
14. **One-Click Agent Controls** — pause, restart, reassign, kill (individual + bulk operations)
15. **Task Dispatch** — manually queue a task to specific agent or role with priority override
16. **Capacity Heatmap** — agent utilization by hour across the week, over/under-provisioned signals
17. **Command Palette (Cmd+K)** — fast-access to any operation, agent, client, or view
18. **Audit Trail** — full task history with session replay (prompts, responses, tools, decisions)

### 7.4 Content Pipeline

19. **Content Generation** — AI-generated drafts from briefs, templates, or brand voice rules
20. **Approval Workflow** — auto-approve low-risk content, human-in-the-loop for sensitive posts, SLA tracking
21. **Platform Scheduling** — platform-optimal timing per network, drag-to-reschedule
22. **Publishing** — unified PostContent interface, per-platform adapters
23. **Engagement Monitoring** — pull-back likes, comments, shares per post per platform

### 7.5 Intelligence Layer (Phase 4+)

24. **Auto-scaling agent allocation** — rules-based capacity adjustment
25. **Self-healing agent rotation** — auto-restart crashed agents, rotate stalled ones
26. **Automated reporting** — weekly/monthly PDFs per client
27. **Content A/B test tracking** — variant performance comparison

---

## 8. Backend API Contract

### 8.1 REST Endpoints

```
# Agents
GET    /api/agents                    — list all agents (filterable by server, tenant, status)
GET    /api/agents/:id                — agent detail with recent heartbeats
POST   /api/agents/:id/command        — send command (pause, resume, kill, restart, etc.)
POST   /api/agents/bulk-command       — bulk operation on multiple agents

# Tasks
GET    /api/tasks                     — list tasks (filterable by status, tenant, agent, priority)
POST   /api/tasks                     — create/dispatch task
PATCH  /api/tasks/:id                 — update task (reassign, change priority)
GET    /api/tasks/:id/audit           — full execution log + session replay data

# Heartbeats
POST   /api/heartbeat                 — agent heartbeat ingestion
GET    /api/heartbeats/:agent_id      — recent heartbeats for an agent

# Tenants
GET    /api/tenants                   — list all tenants
GET    /api/tenants/:id               — tenant detail with agents, tasks, content
PATCH  /api/tenants/:id               — update tenant config

# Content
GET    /api/content                   — list content items (filterable by tenant, platform, status)
POST   /api/content                   — create content item
PATCH  /api/content/:id               — update content (edit, approve, schedule)
GET    /api/content/:id/versions      — content version history

# Metrics
GET    /api/metrics/performance       — aggregated performance metrics (24h, 7d)
GET    /api/metrics/infrastructure    — server health metrics
GET    /api/metrics/engagement        — post engagement metrics per tenant

# Servers
GET    /api/servers                   — list all servers with health status
GET    /api/servers/:id               — server detail with agents and resources
```

### 8.2 WebSocket Events

```
# Server → Client (dashboard receives)
agent:heartbeat          — real-time heartbeat data
agent:status_change      — state transitions (idle→working, working→error, etc.)
task:status_change       — task pipeline updates
task:created             — new task queued
alert:new                — new error/warning/info alert
content:status_change    — content pipeline updates (draft→approved→published)
metrics:update           — periodic metrics refresh

# Client → Server (dashboard sends)
agent:command            — send command to agent
task:dispatch            — create and assign task
task:priority_change     — change task priority
content:approve          — approve content item
content:reject           — reject content with feedback
```

---

## 9. Social Platform Integration

Unified `PostContent` interface — each platform adapter implements the same contract.

```typescript
interface PostContent {
  tenantId: string;
  platform: 'twitter' | 'linkedin' | 'facebook' | 'instagram' | 'tiktok';
  contentBody: string;
  mediaUrls?: string[];
  hashtags?: string[];
  mentions?: string[];
  scheduledAt: Date;
}

interface PlatformAdapter {
  authenticate(account: PlatformAccount): Promise<void>;
  publish(content: PostContent): Promise<PublishResult>;
  getEngagement(postId: string): Promise<EngagementMetrics>;
  checkRateLimit(): Promise<RateLimitStatus>;
  refreshToken(account: PlatformAccount): Promise<void>;
}
```

**Platform-specific considerations:**
- **X/Twitter**: API v2 rate tiers, media upload flow, thread support
- **LinkedIn**: Organization vs personal posting, article vs post distinction
- **Meta (FB/IG)**: Graph API approval process, Instagram media requirements
- **TikTok**: Content publishing API restrictions, video format requirements

New platforms (Threads, Bluesky) require one adapter implementation — all agents can post there immediately.

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-3)
- Control plane API (Fastify + PostgreSQL + TimescaleDB)
- Heartbeat protocol + absence/stall detection
- WebSocket real-time gateway
- Redis Streams command queue
- Dashboard shell: nav rail, layout grid, status bar
- Design system: tokens, typography, base components, scanline overlay

### Phase 2: Operations (Weeks 4-6)
- Agent fleet grid with live status cards
- Task pipeline Kanban board
- Agent detail flyout with log viewer
- Server health monitoring panel
- Error & alert feed with severity filtering
- Bulk agent operations
- Command palette (Cmd+K)

### Phase 3: Social Automation (Weeks 7-10)
- Multi-tenant client management + Postgres RLS
- Social platform API adapters (X, LinkedIn, Facebook, Instagram)
- Content pipeline: generation → review → schedule → publish
- Content calendar with drag-to-reschedule
- Approval workflow with SLA tracking
- Scheduling engine (Bull MQ) with platform-optimal timing

### Phase 4: Intelligence (Weeks 11-14)
- Engagement analytics dashboard
- Automated reporting (weekly/monthly PDFs per client)
- Auto-scaling agent allocation rules
- Self-healing agent rotation
- Content A/B test tracking
- Client-facing white-label portal

### Phase 5: Scale (Weeks 15+)
- Competitor benchmarking per client
- Sentiment analysis on engagement
- Advanced analytics and trend detection
- Multi-region server support
- Plugin system for custom automations

---

## 11. Revenue Model

### Service Revenue (Social Media Management)
- Monthly retainer per client for content creation, scheduling, publishing
- Tiered pricing by volume: platforms, posts/week, engagement monitoring depth
- Premium add-ons: competitor monitoring, sentiment analysis, automated reporting, A/B testing
- Setup fee for onboarding: account connection, brand voice training, initial content calendar

### Platform Revenue (White-Label Portal)
- SaaS subscription for client portal access
- Per-seat pricing for client team members (approval workflow access)
- API access tier for programmatic content triggers / analytics pulls
- Enterprise tier: custom integrations, dedicated agent allocation, priority support

### Target Margins
60-75% per client after infrastructure costs. The mission control dashboard is an operational cost centre that pays for itself through efficiency — one operator managing 30 clients instead of a team per client.
