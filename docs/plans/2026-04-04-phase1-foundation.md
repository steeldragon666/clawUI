# Phase 1: Foundation — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Stand up the full-stack skeleton — monorepo with Fastify API, Postgres+TimescaleDB schema, WebSocket gateway, Redis Streams, and React dashboard shell with the Terminal Neon design system. By end of Phase 1, the 50" screen shows a live dashboard shell receiving mock heartbeat data.

**Architecture:** Monorepo with `packages/api` (Fastify + Node.js), `packages/web` (React + Vite), and `packages/shared` (TypeScript types shared between both). PostgreSQL + TimescaleDB for persistence, Redis for command queues and pub/sub, Socket.IO for bidirectional real-time.

**Tech Stack:** TypeScript throughout, Fastify, React 19, Vite, Tailwind CSS v4, Socket.IO, PostgreSQL, TimescaleDB, Redis, Drizzle ORM, pnpm workspaces.

---

## Task 1: Monorepo Scaffolding

**Files:**
- Create: `package.json` (root workspace config)
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/api/package.json`
- Create: `packages/api/tsconfig.json`
- Create: `packages/api/src/index.ts`
- Create: `packages/web/package.json`
- Create: `packages/web/tsconfig.json`
- Create: `packages/web/vite.config.ts`
- Create: `packages/web/index.html`
- Create: `packages/web/src/main.tsx`
- Create: `packages/web/src/App.tsx`
- Create: `.gitignore`
- Create: `.env.example`

**Step 1: Initialize root workspace**

`package.json` (root):
```json
{
  "name": "omniscient-amc",
  "private": true,
  "scripts": {
    "dev": "pnpm -r --parallel dev",
    "dev:api": "pnpm --filter @omniscient/api dev",
    "dev:web": "pnpm --filter @omniscient/web dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "test": "pnpm -r test",
    "db:migrate": "pnpm --filter @omniscient/api db:migrate",
    "db:seed": "pnpm --filter @omniscient/api db:seed"
  },
  "engines": {
    "node": ">=20"
  }
}
```

`pnpm-workspace.yaml`:
```yaml
packages:
  - "packages/*"
```

`tsconfig.base.json`:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

`.gitignore`:
```
node_modules/
dist/
.env
*.local
.turbo/
```

`.env.example`:
```bash
# Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/omniscient_amc

# Redis
REDIS_URL=redis://localhost:6379

# API
API_PORT=3001
API_HOST=0.0.0.0

# WebSocket
WS_CORS_ORIGIN=http://localhost:5173

# JWT
JWT_SECRET=change-me-in-production
```

**Step 2: Create shared package**

`packages/shared/package.json`:
```json
{
  "name": "@omniscient/shared",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "tsc --noEmit",
    "test": "echo 'no tests yet'"
  },
  "devDependencies": {
    "typescript": "^5.7.0"
  }
}
```

`packages/shared/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

`packages/shared/src/index.ts`:
```typescript
export * from './types/agent';
export * from './types/heartbeat';
export * from './types/task';
export * from './types/server';
export * from './types/tenant';
export * from './types/commands';
export * from './types/events';
```

**Step 3: Create API package**

`packages/api/package.json`:
```json
{
  "name": "@omniscient/api",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "lint": "tsc --noEmit",
    "test": "vitest",
    "db:migrate": "drizzle-kit migrate",
    "db:generate": "drizzle-kit generate",
    "db:seed": "tsx src/db/seed.ts"
  },
  "dependencies": {
    "@omniscient/shared": "workspace:*",
    "fastify": "^5.2.0",
    "@fastify/cors": "^11.0.0",
    "@fastify/websocket": "^11.0.0",
    "socket.io": "^4.8.0",
    "drizzle-orm": "^0.39.0",
    "postgres": "^3.4.0",
    "ioredis": "^5.6.0",
    "zod": "^3.24.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "tsx": "^4.19.0",
    "vitest": "^3.1.0",
    "drizzle-kit": "^0.30.0",
    "@types/node": "^22.0.0"
  }
}
```

`packages/api/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

`packages/api/src/index.ts`:
```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

const PORT = parseInt(process.env.API_PORT || '3001');
const HOST = process.env.API_HOST || '0.0.0.0';

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: process.env.WS_CORS_ORIGIN || 'http://localhost:5173',
});

// Health check
fastify.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });

    // Socket.IO on same server
    const io = new Server(fastify.server, {
      cors: { origin: process.env.WS_CORS_ORIGIN || 'http://localhost:5173' },
    });

    io.on('connection', (socket) => {
      fastify.log.info(`Dashboard connected: ${socket.id}`);
      socket.on('disconnect', () => {
        fastify.log.info(`Dashboard disconnected: ${socket.id}`);
      });
    });

    fastify.log.info(`Omniscient AMC API running on http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

**Step 4: Create web package**

`packages/web/package.json`:
```json
{
  "name": "@omniscient/web",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "tsc --noEmit",
    "test": "vitest",
    "preview": "vite preview"
  },
  "dependencies": {
    "@omniscient/shared": "workspace:*",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "socket.io-client": "^4.8.0"
  },
  "devDependencies": {
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@vitejs/plugin-react": "^4.4.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.5.0",
    "tailwindcss": "^4.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "typescript": "^5.7.0",
    "vite": "^6.2.0",
    "vitest": "^3.1.0"
  }
}
```

`packages/web/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

`packages/web/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3001',
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
```

`packages/web/index.html`:
```html
<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Omniscient AI — Agent Mission Control</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.tsx"></script>
</body>
</html>
```

`packages/web/src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`packages/web/src/App.tsx`:
```tsx
export function App() {
  return (
    <div className="min-h-screen bg-void text-primary font-sans">
      <h1 className="text-neon-cyan font-mono text-2xl p-8">
        OMNISCIENT AI — AGENT MISSION CONTROL
      </h1>
      <p className="px-8 text-secondary">System initializing...</p>
    </div>
  );
}
```

**Step 5: Install dependencies and verify**

Run: `pnpm install`
Run: `pnpm dev:web` — verify Vite starts on :5173
Run: `pnpm dev:api` — verify Fastify starts on :3001

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold monorepo with api, web, and shared packages"
```

---

## Task 2: Shared TypeScript Types

**Files:**
- Create: `packages/shared/src/types/agent.ts`
- Create: `packages/shared/src/types/heartbeat.ts`
- Create: `packages/shared/src/types/task.ts`
- Create: `packages/shared/src/types/server.ts`
- Create: `packages/shared/src/types/tenant.ts`
- Create: `packages/shared/src/types/commands.ts`
- Create: `packages/shared/src/types/events.ts`

**Step 1: Define all shared types**

`packages/shared/src/types/agent.ts`:
```typescript
export type AgentStatus = 'idle' | 'working' | 'degraded' | 'error' | 'stalled' | 'unreachable' | 'dead' | 'paused';

export type AgentRole =
  | 'email-filter'
  | 'social-post'
  | 'seo-optimize'
  | 'content-gen'
  | 'blog-writer'
  | 'sensor-monitor'
  | 'climate-control'
  | 'irrigation'
  | 'engagement-monitor'
  | 'ops-engineer'
  | 'custom';

export interface Agent {
  id: string;
  serverId: string;
  tenantId: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  currentTaskId: string | null;
  config: Record<string, unknown>;
  lastHeartbeat: string | null;
  createdAt: string;
  updatedAt: string;
}
```

`packages/shared/src/types/heartbeat.ts`:
```typescript
import type { AgentStatus } from './agent';

export interface HeartbeatPayload {
  agentId: string;
  serverId: string;
  tenantId: string;
  timestamp: string;
  status: Extract<AgentStatus, 'idle' | 'working' | 'degraded' | 'error'>;
  cpuPercent: number;
  memoryPercent: number;
  currentTaskId: string | null;
  taskCounter: number;
  queueDepth: number;
  meta?: Record<string, unknown>;
}

export interface HeartbeatRecord extends HeartbeatPayload {
  time: string;
}
```

`packages/shared/src/types/task.ts`:
```typescript
export type TaskStatus = 'queued' | 'active' | 'approval' | 'done' | 'failed' | 'cancelled';
export type TaskType = 'social-post' | 'email-batch' | 'seo-audit' | 'blog-draft' | 'content-gen' | 'sensor-read' | 'engagement-pull' | 'custom';

export interface Task {
  id: string;
  tenantId: string;
  agentId: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  estimatedDuration: number | null;
  actualDuration: number | null;
  retryCount: number;
  maxRetries: number;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown> | null;
  executionLog: string | null;
  cost: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}
```

`packages/shared/src/types/server.ts`:
```typescript
export type ServerStatus = 'online' | 'degraded' | 'offline';

export interface Server {
  id: string;
  tenantId: string | null;
  hostname: string;
  ipAddress: string;
  region: string;
  status: ServerStatus;
  specs: {
    cpuCores?: number;
    memoryGb?: number;
    diskGb?: number;
    os?: string;
  };
  lastSeen: string | null;
  createdAt: string;
}
```

`packages/shared/src/types/tenant.ts`:
```typescript
export type SlaTier = 'basic' | 'professional' | 'enterprise';

export interface Tenant {
  id: string;
  companyName: string;
  brandVoiceRules: Record<string, unknown>;
  approvalWorkflow: 'auto' | 'manual' | 'hybrid';
  slaTier: SlaTier;
  pricingTier: string;
  platforms: string[];
  createdAt: string;
  updatedAt: string;
}
```

`packages/shared/src/types/commands.ts`:
```typescript
export type AgentCommandType =
  | 'pause'
  | 'resume'
  | 'cancel_task'
  | 'reassign_task'
  | 'update_config'
  | 'force_sync'
  | 'graceful_shutdown'
  | 'restart';

export interface AgentCommand {
  id: string;
  agentId: string;
  type: AgentCommandType;
  payload?: Record<string, unknown>;
  issuedBy: string;
  issuedAt: string;
  acknowledgedAt?: string;
}

export interface BulkCommand {
  agentIds: string[];
  type: AgentCommandType;
  payload?: Record<string, unknown>;
  issuedBy: string;
}
```

`packages/shared/src/types/events.ts`:
```typescript
import type { AgentStatus } from './agent';
import type { TaskStatus } from './task';
import type { HeartbeatPayload } from './heartbeat';
import type { AgentCommand } from './commands';

// Server → Client events (dashboard receives)
export interface ServerToClientEvents {
  'agent:heartbeat': (data: HeartbeatPayload) => void;
  'agent:status_change': (data: { agentId: string; from: AgentStatus; to: AgentStatus; reason?: string }) => void;
  'task:status_change': (data: { taskId: string; from: TaskStatus; to: TaskStatus; agentId?: string }) => void;
  'task:created': (data: { taskId: string; tenantId: string; type: string; priority: number }) => void;
  'alert:new': (data: AlertEvent) => void;
  'metrics:update': (data: MetricsSnapshot) => void;
}

// Client → Server events (dashboard sends)
export interface ClientToServerEvents {
  'agent:command': (data: AgentCommand) => void;
  'task:dispatch': (data: { tenantId: string; type: string; agentId?: string; priority: number; inputs: Record<string, unknown> }) => void;
  'task:priority_change': (data: { taskId: string; priority: number }) => void;
}

export type AlertSeverity = 'error' | 'warning' | 'info';

export interface AlertEvent {
  id: string;
  severity: AlertSeverity;
  source: string;
  agentId?: string;
  serverId?: string;
  tenantId?: string;
  message: string;
  details?: string;
  timestamp: string;
}

export interface MetricsSnapshot {
  tasksCompleted24h: number;
  successRate24h: number;
  avgDuration24h: number;
  retryRate24h: number;
  completionsPerHour: number[];
  byRole: Record<string, { completed: number; total: number; successRate: number }>;
}
```

**Step 2: Verify types compile**

Run: `cd packages/shared && npx tsc --noEmit`
Expected: No errors.

**Step 3: Commit**

```bash
git add packages/shared/src/types/
git commit -m "feat: define shared TypeScript types for agents, tasks, heartbeats, commands, events"
```

---

## Task 3: Database Schema (Drizzle ORM)

**Files:**
- Create: `packages/api/src/db/schema.ts`
- Create: `packages/api/src/db/index.ts`
- Create: `packages/api/drizzle.config.ts`

**Step 1: Define the Drizzle schema**

`packages/api/src/db/schema.ts`:
```typescript
import { pgTable, uuid, text, varchar, integer, real, timestamp, jsonb, pgEnum, index } from 'drizzle-orm/pg-core';

// Enums
export const agentStatusEnum = pgEnum('agent_status', ['idle', 'working', 'degraded', 'error', 'stalled', 'unreachable', 'dead', 'paused']);
export const agentRoleEnum = pgEnum('agent_role', ['email-filter', 'social-post', 'seo-optimize', 'content-gen', 'blog-writer', 'sensor-monitor', 'climate-control', 'irrigation', 'engagement-monitor', 'ops-engineer', 'custom']);
export const taskStatusEnum = pgEnum('task_status', ['queued', 'active', 'approval', 'done', 'failed', 'cancelled']);
export const taskTypeEnum = pgEnum('task_type', ['social-post', 'email-batch', 'seo-audit', 'blog-draft', 'content-gen', 'sensor-read', 'engagement-pull', 'custom']);
export const serverStatusEnum = pgEnum('server_status', ['online', 'degraded', 'offline']);
export const slaTierEnum = pgEnum('sla_tier', ['basic', 'professional', 'enterprise']);
export const approvalWorkflowEnum = pgEnum('approval_workflow', ['auto', 'manual', 'hybrid']);
export const alertSeverityEnum = pgEnum('alert_severity', ['error', 'warning', 'info']);

// Tenants
export const tenants = pgTable('tenants', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyName: varchar('company_name', { length: 255 }).notNull(),
  brandVoiceRules: jsonb('brand_voice_rules').default({}).notNull(),
  approvalWorkflow: approvalWorkflowEnum('approval_workflow').default('hybrid').notNull(),
  slaTier: slaTierEnum('sla_tier').default('basic').notNull(),
  pricingTier: varchar('pricing_tier', { length: 50 }).default('starter').notNull(),
  platforms: jsonb('platforms').default([]).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// Servers
export const servers = pgTable('servers', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  hostname: varchar('hostname', { length: 255 }).notNull(),
  ipAddress: varchar('ip_address', { length: 45 }).notNull(),
  region: varchar('region', { length: 100 }).default('local').notNull(),
  status: serverStatusEnum('status').default('offline').notNull(),
  specs: jsonb('specs').default({}).notNull(),
  lastSeen: timestamp('last_seen', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// Agents
export const agents = pgTable('agents', {
  id: uuid('id').primaryKey().defaultRandom(),
  serverId: uuid('server_id').references(() => servers.id).notNull(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: agentRoleEnum('role').notNull(),
  status: agentStatusEnum('status').default('idle').notNull(),
  currentTaskId: uuid('current_task_id'),
  config: jsonb('config').default({}).notNull(),
  lastHeartbeat: timestamp('last_heartbeat', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_agents_server').on(table.serverId),
  index('idx_agents_tenant').on(table.tenantId),
  index('idx_agents_status').on(table.status),
]);

// Tasks
export const tasks = pgTable('tasks', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  agentId: uuid('agent_id').references(() => agents.id),
  type: taskTypeEnum('type').notNull(),
  status: taskStatusEnum('status').default('queued').notNull(),
  priority: integer('priority').default(3).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description').default('').notNull(),
  estimatedDuration: integer('estimated_duration'),
  actualDuration: integer('actual_duration'),
  retryCount: integer('retry_count').default(0).notNull(),
  maxRetries: integer('max_retries').default(3).notNull(),
  inputs: jsonb('inputs').default({}).notNull(),
  outputs: jsonb('outputs'),
  executionLog: text('execution_log'),
  cost: real('cost'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => [
  index('idx_tasks_tenant').on(table.tenantId),
  index('idx_tasks_agent').on(table.agentId),
  index('idx_tasks_status').on(table.status),
  index('idx_tasks_priority').on(table.priority),
]);

// Heartbeats (will be a TimescaleDB hypertable — raw SQL migration for that)
export const heartbeats = pgTable('heartbeats', {
  time: timestamp('time', { withTimezone: true }).defaultNow().notNull(),
  agentId: uuid('agent_id').notNull(),
  tenantId: uuid('tenant_id').notNull(),
  status: agentStatusEnum('status').notNull(),
  cpuPercent: real('cpu_percent').notNull(),
  memoryPercent: real('memory_percent').notNull(),
  taskCounter: integer('task_counter').notNull(),
  queueDepth: integer('queue_depth').notNull(),
  currentTaskId: uuid('current_task_id'),
  payload: jsonb('payload'),
}, (table) => [
  index('idx_heartbeats_agent').on(table.agentId),
  index('idx_heartbeats_tenant').on(table.tenantId),
]);

// Alerts
export const alerts = pgTable('alerts', {
  id: uuid('id').primaryKey().defaultRandom(),
  severity: alertSeverityEnum('severity').notNull(),
  source: varchar('source', { length: 255 }).notNull(),
  agentId: uuid('agent_id').references(() => agents.id),
  serverId: uuid('server_id').references(() => servers.id),
  tenantId: uuid('tenant_id').references(() => tenants.id),
  message: text('message').notNull(),
  details: text('details'),
  acknowledged: timestamp('acknowledged', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_alerts_severity').on(table.severity),
  index('idx_alerts_created').on(table.createdAt),
]);
```

`packages/api/src/db/index.ts`:
```typescript
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/omniscient_amc';

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

`packages/api/drizzle.config.ts`:
```typescript
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/omniscient_amc',
  },
});
```

**Step 2: Create TimescaleDB migration**

Create: `packages/api/drizzle/0001_timescale_setup.sql`

```sql
-- Convert heartbeats to a TimescaleDB hypertable
-- Run AFTER the initial Drizzle migration creates the table
SELECT create_hypertable('heartbeats', 'time', if_not_exists => TRUE);

-- Continuous aggregate: completions per hour (last 7 days)
CREATE MATERIALIZED VIEW IF NOT EXISTS hourly_task_completions
WITH (timescaledb.continuous) AS
SELECT
  time_bucket('1 hour', completed_at) AS bucket,
  tenant_id,
  count(*) AS completed_count,
  avg(actual_duration) AS avg_duration,
  count(*) FILTER (WHERE status = 'done') AS success_count,
  count(*) FILTER (WHERE status = 'failed') AS failure_count
FROM tasks
WHERE completed_at IS NOT NULL
GROUP BY bucket, tenant_id;
```

**Step 3: Generate migration and verify**

Run: `cd packages/api && npx drizzle-kit generate`
Expected: Migration files generated in `drizzle/` folder.

**Step 4: Commit**

```bash
git add packages/api/src/db/ packages/api/drizzle.config.ts packages/api/drizzle/
git commit -m "feat: database schema with Drizzle ORM — tenants, servers, agents, tasks, heartbeats, alerts"
```

---

## Task 4: Seed Data (Mock Servers, Agents, Tenants)

**Files:**
- Create: `packages/api/src/db/seed.ts`

**Step 1: Write seed script**

`packages/api/src/db/seed.ts`:
```typescript
import { db } from './index';
import { tenants, servers, agents, tasks } from './schema';
import dotenv from 'dotenv';

dotenv.config();

async function seed() {
  console.log('Seeding Omniscient AMC database...');

  // Tenants
  const [acme] = await db.insert(tenants).values({
    companyName: 'Acme Corp',
    brandVoiceRules: { tone: 'professional', humor: 'light' },
    approvalWorkflow: 'hybrid',
    slaTier: 'professional',
    pricingTier: 'growth',
    platforms: ['twitter', 'linkedin', 'facebook'],
  }).returning();

  const [brandx] = await db.insert(tenants).values({
    companyName: 'BrandX',
    brandVoiceRules: { tone: 'casual', humor: 'heavy' },
    approvalWorkflow: 'auto',
    slaTier: 'basic',
    pricingTier: 'starter',
    platforms: ['twitter', 'instagram'],
  }).returning();

  const [greenhouse] = await db.insert(tenants).values({
    companyName: 'Internal — Greenhouse',
    brandVoiceRules: {},
    approvalWorkflow: 'auto',
    slaTier: 'enterprise',
    pricingTier: 'internal',
    platforms: [],
  }).returning();

  // Servers
  const [server1] = await db.insert(servers).values({
    tenantId: greenhouse.id,
    hostname: 'greenhouse-pi-01',
    ipAddress: '192.168.1.10',
    region: 'local',
    status: 'online',
    specs: { cpuCores: 4, memoryGb: 8, diskGb: 128, os: 'Ubuntu 24.04' },
  }).returning();

  const [server2] = await db.insert(servers).values({
    tenantId: acme.id,
    hostname: 'biz-auto-01',
    ipAddress: '192.168.1.20',
    region: 'local',
    status: 'online',
    specs: { cpuCores: 8, memoryGb: 16, diskGb: 256, os: 'Ubuntu 24.04' },
  }).returning();

  const [server3] = await db.insert(servers).values({
    tenantId: brandx.id,
    hostname: 'biz-auto-02',
    ipAddress: '192.168.1.30',
    region: 'local',
    status: 'online',
    specs: { cpuCores: 8, memoryGb: 16, diskGb: 256, os: 'Ubuntu 24.04' },
  }).returning();

  // Agents
  const agentDefs = [
    // Greenhouse agents
    { serverId: server1.id, tenantId: greenhouse.id, name: 'sensor-mon-01', role: 'sensor-monitor' as const, status: 'working' as const },
    { serverId: server1.id, tenantId: greenhouse.id, name: 'climate-ctrl-01', role: 'climate-control' as const, status: 'idle' as const },
    { serverId: server1.id, tenantId: greenhouse.id, name: 'irrigation-01', role: 'irrigation' as const, status: 'idle' as const },
    // Acme agents
    { serverId: server2.id, tenantId: acme.id, name: 'acme-email-01', role: 'email-filter' as const, status: 'working' as const },
    { serverId: server2.id, tenantId: acme.id, name: 'acme-social-01', role: 'social-post' as const, status: 'working' as const },
    { serverId: server2.id, tenantId: acme.id, name: 'acme-seo-01', role: 'seo-optimize' as const, status: 'error' as const },
    { serverId: server2.id, tenantId: acme.id, name: 'acme-content-01', role: 'content-gen' as const, status: 'idle' as const },
    // BrandX agents
    { serverId: server3.id, tenantId: brandx.id, name: 'brandx-social-01', role: 'social-post' as const, status: 'working' as const },
    { serverId: server3.id, tenantId: brandx.id, name: 'brandx-content-01', role: 'content-gen' as const, status: 'idle' as const },
  ];

  const insertedAgents = await db.insert(agents).values(agentDefs).returning();

  // Sample tasks
  const taskDefs = [
    { tenantId: acme.id, agentId: insertedAgents[3].id, type: 'email-batch' as const, status: 'active' as const, priority: 2 as const, title: 'Process morning inbox batch', description: 'Filter and respond to 50 incoming emails' },
    { tenantId: acme.id, agentId: insertedAgents[4].id, type: 'social-post' as const, status: 'active' as const, priority: 1 as const, title: 'Post Q2 update to LinkedIn', description: 'Publish Acme Corp quarterly update' },
    { tenantId: acme.id, agentId: null, type: 'blog-draft' as const, status: 'queued' as const, priority: 1 as const, title: 'Blog: AI Trends Q2 2026', description: 'Draft 1500-word blog post on AI trends' },
    { tenantId: brandx.id, agentId: insertedAgents[7].id, type: 'social-post' as const, status: 'active' as const, priority: 2 as const, title: 'Instagram carousel: Summer collection', description: 'Create and post 5-image carousel' },
    { tenantId: brandx.id, agentId: null, type: 'content-gen' as const, status: 'queued' as const, priority: 3 as const, title: 'Generate weekly content batch', description: 'Produce 10 posts for next week' },
    { tenantId: greenhouse.id, agentId: insertedAgents[0].id, type: 'sensor-read' as const, status: 'active' as const, priority: 2 as const, title: 'Hourly sensor reading', description: 'Read humidity, temperature, soil moisture' },
  ];

  await db.insert(tasks).values(taskDefs);

  console.log(`Seeded: ${3} tenants, ${3} servers, ${agentDefs.length} agents, ${taskDefs.length} tasks`);
  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
```

**Step 2: Run seed (requires DB running)**

Run: `cd packages/api && pnpm db:migrate && pnpm db:seed`

**Step 3: Commit**

```bash
git add packages/api/src/db/seed.ts
git commit -m "feat: seed script with 3 tenants, 3 servers, 9 agents, 6 tasks"
```

---

## Task 5: API Routes — Agents, Servers, Tasks, Heartbeats

**Files:**
- Create: `packages/api/src/routes/agents.ts`
- Create: `packages/api/src/routes/servers.ts`
- Create: `packages/api/src/routes/tasks.ts`
- Create: `packages/api/src/routes/heartbeat.ts`
- Create: `packages/api/src/routes/metrics.ts`
- Modify: `packages/api/src/index.ts` — register routes

**Step 1: Agent routes**

`packages/api/src/routes/agents.ts`:
```typescript
import { FastifyInstance } from 'fastify';
import { db } from '../db/index';
import { agents } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function agentRoutes(fastify: FastifyInstance) {
  // List all agents
  fastify.get('/api/agents', async (request) => {
    const { serverId, tenantId, status } = request.query as Record<string, string>;
    let query = db.select().from(agents);

    // Drizzle filtering applied via where clause chain
    const rows = await db.select().from(agents);
    let filtered = rows;
    if (serverId) filtered = filtered.filter(a => a.serverId === serverId);
    if (tenantId) filtered = filtered.filter(a => a.tenantId === tenantId);
    if (status) filtered = filtered.filter(a => a.status === status);

    return filtered;
  });

  // Get single agent
  fastify.get('/api/agents/:id', async (request) => {
    const { id } = request.params as { id: string };
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    if (!agent) return fastify.httpErrors.notFound('Agent not found');
    return agent;
  });

  // Send command to agent
  fastify.post('/api/agents/:id/command', async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as { type: string; payload?: Record<string, unknown> };

    // TODO: Push to Redis Stream for the agent
    return { agentId: id, command: body.type, status: 'queued' };
  });

  // Bulk command
  fastify.post('/api/agents/bulk-command', async (request) => {
    const body = request.body as { agentIds: string[]; type: string; payload?: Record<string, unknown> };

    // TODO: Push to Redis Streams for each agent
    return { agentIds: body.agentIds, command: body.type, status: 'queued', count: body.agentIds.length };
  });
}
```

`packages/api/src/routes/servers.ts`:
```typescript
import { FastifyInstance } from 'fastify';
import { db } from '../db/index';
import { servers, agents } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function serverRoutes(fastify: FastifyInstance) {
  fastify.get('/api/servers', async () => {
    return db.select().from(servers);
  });

  fastify.get('/api/servers/:id', async (request) => {
    const { id } = request.params as { id: string };
    const [server] = await db.select().from(servers).where(eq(servers.id, id));
    if (!server) return fastify.httpErrors.notFound('Server not found');

    const serverAgents = await db.select().from(agents).where(eq(agents.serverId, id));
    return { ...server, agents: serverAgents };
  });
}
```

`packages/api/src/routes/tasks.ts`:
```typescript
import { FastifyInstance } from 'fastify';
import { db } from '../db/index';
import { tasks } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function taskRoutes(fastify: FastifyInstance) {
  fastify.get('/api/tasks', async (request) => {
    const { status, tenantId, agentId } = request.query as Record<string, string>;
    const rows = await db.select().from(tasks);
    let filtered = rows;
    if (status) filtered = filtered.filter(t => t.status === status);
    if (tenantId) filtered = filtered.filter(t => t.tenantId === tenantId);
    if (agentId) filtered = filtered.filter(t => t.agentId === agentId);
    return filtered;
  });

  fastify.post('/api/tasks', async (request) => {
    const body = request.body as {
      tenantId: string; type: string; agentId?: string;
      priority?: number; title: string; description?: string;
      inputs?: Record<string, unknown>;
    };
    const [task] = await db.insert(tasks).values({
      tenantId: body.tenantId,
      type: body.type as any,
      agentId: body.agentId || null,
      priority: (body.priority || 3) as any,
      title: body.title,
      description: body.description || '',
      inputs: body.inputs || {},
    }).returning();
    return task;
  });

  fastify.patch('/api/tasks/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, any>;
    const [task] = await db.update(tasks).set(body).where(eq(tasks.id, id)).returning();
    if (!task) return fastify.httpErrors.notFound('Task not found');
    return task;
  });

  fastify.get('/api/tasks/:id/audit', async (request) => {
    const { id } = request.params as { id: string };
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return fastify.httpErrors.notFound('Task not found');
    return { task, executionLog: task.executionLog, inputs: task.inputs, outputs: task.outputs };
  });
}
```

`packages/api/src/routes/heartbeat.ts`:
```typescript
import { FastifyInstance } from 'fastify';
import { db } from '../db/index';
import { heartbeats, agents } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { HeartbeatPayload } from '@omniscient/shared';

export async function heartbeatRoutes(fastify: FastifyInstance) {
  // Ingest heartbeat from agent
  fastify.post('/api/heartbeat', async (request, reply) => {
    const body = request.body as HeartbeatPayload;

    // Write to hypertable
    await db.insert(heartbeats).values({
      time: new Date(body.timestamp),
      agentId: body.agentId,
      tenantId: body.tenantId,
      status: body.status,
      cpuPercent: body.cpuPercent,
      memoryPercent: body.memoryPercent,
      taskCounter: body.taskCounter,
      queueDepth: body.queueDepth,
      currentTaskId: body.currentTaskId,
      payload: body.meta || {},
    });

    // Update agent's last heartbeat + status
    await db.update(agents).set({
      lastHeartbeat: new Date(body.timestamp),
      status: body.status,
    }).where(eq(agents.id, body.agentId));

    // Broadcast to dashboard via Socket.IO (injected via fastify.io)
    const io = (fastify as any).io;
    if (io) {
      io.emit('agent:heartbeat', body);
    }

    return reply.status(204).send();
  });

  // Get recent heartbeats for an agent
  fastify.get('/api/heartbeats/:agentId', async (request) => {
    const { agentId } = request.params as { agentId: string };
    return db.select().from(heartbeats)
      .where(eq(heartbeats.agentId, agentId))
      .orderBy(heartbeats.time)
      .limit(100);
  });
}
```

`packages/api/src/routes/metrics.ts`:
```typescript
import { FastifyInstance } from 'fastify';
import { db } from '../db/index';
import { tasks, agents, heartbeats } from '../db/schema';
import { sql } from 'drizzle-orm';

export async function metricsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/metrics/performance', async () => {
    // 24h task stats
    const result = await db.execute(sql`
      SELECT
        count(*) FILTER (WHERE status = 'done' AND completed_at > now() - interval '24 hours') as completed_24h,
        count(*) FILTER (WHERE status = 'failed' AND completed_at > now() - interval '24 hours') as failed_24h,
        count(*) FILTER (WHERE completed_at > now() - interval '24 hours') as total_24h,
        avg(actual_duration) FILTER (WHERE completed_at > now() - interval '24 hours') as avg_duration_24h
      FROM tasks
    `);

    return result.rows?.[0] || { completed_24h: 0, failed_24h: 0, total_24h: 0, avg_duration_24h: 0 };
  });

  fastify.get('/api/metrics/infrastructure', async () => {
    // Latest heartbeat per agent for current resource usage
    const result = await db.execute(sql`
      SELECT DISTINCT ON (agent_id)
        agent_id, cpu_percent, memory_percent, status, time
      FROM heartbeats
      ORDER BY agent_id, time DESC
    `);

    return result.rows || [];
  });
}
```

**Step 2: Register routes in main server**

Update `packages/api/src/index.ts` to register all routes:

```typescript
import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { agentRoutes } from './routes/agents';
import { serverRoutes } from './routes/servers';
import { taskRoutes } from './routes/tasks';
import { heartbeatRoutes } from './routes/heartbeat';
import { metricsRoutes } from './routes/metrics';

dotenv.config();

const PORT = parseInt(process.env.API_PORT || '3001');
const HOST = process.env.API_HOST || '0.0.0.0';

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: process.env.WS_CORS_ORIGIN || 'http://localhost:5173',
});

// Health check
fastify.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// Register route modules
await fastify.register(agentRoutes);
await fastify.register(serverRoutes);
await fastify.register(taskRoutes);
await fastify.register(heartbeatRoutes);
await fastify.register(metricsRoutes);

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });

    // Socket.IO on same HTTP server
    const io = new Server(fastify.server, {
      cors: { origin: process.env.WS_CORS_ORIGIN || 'http://localhost:5173' },
    });

    // Make io accessible to routes
    (fastify as any).io = io;

    io.on('connection', (socket) => {
      fastify.log.info(`Dashboard connected: ${socket.id}`);
      socket.on('disconnect', () => {
        fastify.log.info(`Dashboard disconnected: ${socket.id}`);
      });
    });

    fastify.log.info(`Omniscient AMC API running on http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

**Step 3: Commit**

```bash
git add packages/api/src/routes/ packages/api/src/index.ts
git commit -m "feat: REST API routes — agents, servers, tasks, heartbeats, metrics"
```

---

## Task 6: Absence & Stall Detector (Background Worker)

**Files:**
- Create: `packages/api/src/workers/absence-detector.ts`

**Step 1: Implement the detector**

`packages/api/src/workers/absence-detector.ts`:
```typescript
import { db } from '../db/index';
import { agents, alerts } from '../db/schema';
import { sql, eq, and, lt, ne, inArray } from 'drizzle-orm';
import type { Server as SocketServer } from 'socket.io';

const AMBER_THRESHOLD_MS = 60_000;   // 60s
const RED_THRESHOLD_MS = 90_000;     // 90s
const DEAD_THRESHOLD_MS = 120_000;   // 120s
const STALL_HEARTBEAT_COUNT = 5;
const CHECK_INTERVAL_MS = 15_000;    // 15s

export function startAbsenceDetector(io: SocketServer) {
  console.log('[absence-detector] Starting — checks every 15s');

  setInterval(async () => {
    const now = new Date();

    try {
      // Fetch all non-offline agents with their last heartbeat
      const liveAgents = await db.select().from(agents)
        .where(and(
          ne(agents.status, 'dead'),
          ne(agents.status, 'paused'),
        ));

      for (const agent of liveAgents) {
        if (!agent.lastHeartbeat) continue;

        const gap = now.getTime() - new Date(agent.lastHeartbeat).getTime();

        if (gap >= DEAD_THRESHOLD_MS && agent.status !== 'dead') {
          await transitionAgent(agent.id, 'dead', `No heartbeat for ${Math.round(gap / 1000)}s`, io);
        } else if (gap >= RED_THRESHOLD_MS && agent.status !== 'unreachable' && agent.status !== 'dead') {
          await transitionAgent(agent.id, 'unreachable', `No heartbeat for ${Math.round(gap / 1000)}s — critical`, io);
        } else if (gap >= AMBER_THRESHOLD_MS && !['unreachable', 'dead', 'error', 'stalled'].includes(agent.status)) {
          await transitionAgent(agent.id, 'degraded', `No heartbeat for ${Math.round(gap / 1000)}s — warning`, io);
        }
      }

      // Stall detection: agents reporting "working" but task_counter not incrementing
      const stallCheck = await db.execute(sql`
        SELECT agent_id, 
               count(*) as beat_count,
               max(task_counter) - min(task_counter) as counter_delta
        FROM heartbeats
        WHERE time > now() - interval '${sql.raw(String(STALL_HEARTBEAT_COUNT * 30))} seconds'
          AND status = 'working'
        GROUP BY agent_id
        HAVING count(*) >= ${STALL_HEARTBEAT_COUNT}
          AND max(task_counter) - min(task_counter) = 0
      `);

      for (const row of (stallCheck.rows || []) as any[]) {
        const agentId = row.agent_id;
        const [current] = await db.select().from(agents).where(eq(agents.id, agentId));
        if (current && current.status !== 'stalled') {
          await transitionAgent(agentId, 'stalled', `task_counter frozen across ${row.beat_count} heartbeats`, io);
        }
      }
    } catch (err) {
      console.error('[absence-detector] Error:', err);
    }
  }, CHECK_INTERVAL_MS);
}

async function transitionAgent(
  agentId: string,
  newStatus: 'degraded' | 'unreachable' | 'dead' | 'stalled',
  reason: string,
  io: SocketServer,
) {
  const [current] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!current) return;

  const oldStatus = current.status;
  await db.update(agents).set({ status: newStatus, updatedAt: new Date() }).where(eq(agents.id, agentId));

  // Create alert
  const severity = newStatus === 'dead' || newStatus === 'unreachable' ? 'error' : 'warning';
  const [alert] = await db.insert(alerts).values({
    severity,
    source: 'absence-detector',
    agentId,
    serverId: current.serverId,
    tenantId: current.tenantId,
    message: `Agent ${current.name} → ${newStatus}: ${reason}`,
  }).returning();

  // Broadcast to dashboard
  io.emit('agent:status_change', { agentId, from: oldStatus, to: newStatus, reason });
  io.emit('alert:new', {
    id: alert.id,
    severity,
    source: 'absence-detector',
    agentId,
    message: alert.message,
    timestamp: alert.createdAt,
  });

  console.log(`[absence-detector] ${current.name}: ${oldStatus} → ${newStatus} (${reason})`);
}
```

**Step 2: Wire into main server startup**

Add to `packages/api/src/index.ts` after Socket.IO setup:

```typescript
import { startAbsenceDetector } from './workers/absence-detector';
// ... after io setup:
startAbsenceDetector(io);
```

**Step 3: Commit**

```bash
git add packages/api/src/workers/
git commit -m "feat: absence & stall detector — graduated 60/90/120s thresholds + frozen task_counter detection"
```

---

## Task 7: Mock Heartbeat Simulator (Development Tool)

**Files:**
- Create: `packages/api/src/dev/mock-heartbeats.ts`

**Step 1: Simulator that generates realistic heartbeat traffic**

`packages/api/src/dev/mock-heartbeats.ts`:
```typescript
import { db } from '../db/index';
import { agents } from '../db/schema';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = `http://localhost:${process.env.API_PORT || 3001}`;
const HEARTBEAT_INTERVAL_MS = 5_000; // 5s for dev (faster than prod 30s)

interface MockAgentState {
  id: string;
  serverId: string;
  tenantId: string;
  taskCounter: number;
  status: 'idle' | 'working' | 'degraded' | 'error';
  cpuBase: number;
  memBase: number;
}

async function startSimulator() {
  console.log('[mock-heartbeats] Loading agents from database...');

  const allAgents = await db.select().from(agents);
  if (allAgents.length === 0) {
    console.error('No agents found. Run db:seed first.');
    process.exit(1);
  }

  const states: MockAgentState[] = allAgents.map((a) => ({
    id: a.id,
    serverId: a.serverId,
    tenantId: a.tenantId,
    taskCounter: Math.floor(Math.random() * 1000),
    status: a.status as any || 'idle',
    cpuBase: 20 + Math.random() * 40,
    memBase: 30 + Math.random() * 30,
  }));

  console.log(`[mock-heartbeats] Simulating ${states.length} agents every ${HEARTBEAT_INTERVAL_MS / 1000}s`);

  setInterval(async () => {
    for (const state of states) {
      // Randomly advance state
      const roll = Math.random();
      if (roll < 0.05) {
        // 5% chance to toggle between idle and working
        state.status = state.status === 'idle' ? 'working' : 'idle';
      } else if (roll < 0.02) {
        state.status = 'error'; // 2% chance of error
      }

      if (state.status === 'working') {
        state.taskCounter += 1;
      }

      const payload = {
        agentId: state.id,
        serverId: state.serverId,
        tenantId: state.tenantId,
        timestamp: new Date().toISOString(),
        status: state.status,
        cpuPercent: Math.min(100, state.cpuBase + (Math.random() - 0.5) * 20),
        memoryPercent: Math.min(100, state.memBase + (Math.random() - 0.5) * 10),
        currentTaskId: null,
        taskCounter: state.taskCounter,
        queueDepth: Math.floor(Math.random() * 5),
      };

      try {
        await fetch(`${API_URL}/api/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        // API not ready yet, skip
      }
    }
  }, HEARTBEAT_INTERVAL_MS);
}

startSimulator();
```

Add script to `packages/api/package.json`:
```json
"dev:mock": "tsx src/dev/mock-heartbeats.ts"
```

And in root `package.json`:
```json
"dev:mock": "pnpm --filter @omniscient/api dev:mock"
```

**Step 2: Commit**

```bash
git add packages/api/src/dev/ packages/api/package.json package.json
git commit -m "feat: mock heartbeat simulator for development — 9 agents, 5s intervals"
```

---

## Task 8: Terminal Neon Design System (CSS + Tailwind)

**Files:**
- Create: `packages/web/src/styles/globals.css`
- Create: `packages/web/src/styles/animations.css`

**Step 1: Global styles with design tokens and Tailwind**

`packages/web/src/styles/globals.css`:
```css
@import 'tailwindcss';
@import './animations.css';

@theme {
  /* Background */
  --color-void: #0a0a0f;
  --color-panel: rgba(18, 18, 31, 0.8);
  --color-card: #12121f;
  --color-card-hover: #1a1a2e;

  /* Borders */
  --color-border-subtle: rgba(255, 255, 255, 0.06);
  --color-border-glow: rgba(0, 240, 255, 0.3);

  /* Neon accents */
  --color-neon-cyan: #00f0ff;
  --color-neon-magenta: #ff00aa;
  --color-neon-green: #00ff88;
  --color-neon-amber: #ffaa00;
  --color-neon-red: #ff2244;

  /* Text */
  --color-primary: #e0e0e8;
  --color-secondary: #6a6a7a;
  --color-muted: #334455;

  /* Typography */
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-sans: 'Inter', system-ui, sans-serif;

  /* Shadows (neon glow) */
  --shadow-cyan: 0 0 10px rgba(0, 240, 255, 0.3), 0 0 20px rgba(0, 240, 255, 0.15), 0 0 30px rgba(0, 240, 255, 0.08);
  --shadow-magenta: 0 0 10px rgba(255, 0, 170, 0.3), 0 0 20px rgba(255, 0, 170, 0.15), 0 0 30px rgba(255, 0, 170, 0.08);
  --shadow-green: 0 0 10px rgba(0, 255, 136, 0.3), 0 0 20px rgba(0, 255, 136, 0.15), 0 0 30px rgba(0, 255, 136, 0.08);
  --shadow-amber: 0 0 10px rgba(255, 170, 0, 0.3), 0 0 20px rgba(255, 170, 0, 0.15), 0 0 30px rgba(255, 170, 0, 0.08);
  --shadow-red: 0 0 10px rgba(255, 34, 68, 0.3), 0 0 20px rgba(255, 34, 68, 0.15), 0 0 30px rgba(255, 34, 68, 0.08);
}

/* Base */
body {
  background-color: var(--color-void);
  color: var(--color-primary);
  font-family: var(--font-sans);
  margin: 0;
  overflow: hidden; /* No scroll on 50" display */
}

/* Grid underlay */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.02) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
  background-size: 20px 20px;
  pointer-events: none;
  z-index: 0;
}

/* Scanline overlay */
.scanlines::after {
  content: '';
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 0, 0, 0.04) 2px,
    rgba(0, 0, 0, 0.04) 4px
  );
  pointer-events: none;
  z-index: 10;
}

/* Glass panel */
.glass-panel {
  background: var(--color-panel);
  backdrop-filter: blur(12px);
  border: 1px solid var(--color-border-subtle);
  border-radius: 4px;
  position: relative;
  overflow: hidden;
}

.glass-panel:hover {
  border-color: var(--color-border-glow);
}

/* HUD corner brackets */
.hud-corners {
  position: relative;
}

.hud-corners::before,
.hud-corners::after {
  content: '';
  position: absolute;
  width: 12px;
  height: 12px;
  border-color: var(--color-neon-cyan);
  border-style: solid;
  opacity: 0.5;
}

.hud-corners::before {
  top: -1px;
  left: -1px;
  border-width: 2px 0 0 2px;
}

.hud-corners::after {
  bottom: -1px;
  right: -1px;
  border-width: 0 2px 2px 0;
}

/* Neon glow utilities */
.glow-cyan { box-shadow: var(--shadow-cyan); }
.glow-magenta { box-shadow: var(--shadow-magenta); }
.glow-green { box-shadow: var(--shadow-green); }
.glow-amber { box-shadow: var(--shadow-amber); }
.glow-red { box-shadow: var(--shadow-red); }

/* Status indicator dot */
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot--working { background: var(--color-neon-cyan); box-shadow: var(--shadow-cyan); }
.status-dot--idle { background: var(--color-muted); animation: pulse-slow 3s ease-in-out infinite; }
.status-dot--stalled { background: var(--color-neon-amber); animation: pulse-fast 1.5s ease-in-out infinite; }
.status-dot--error { background: var(--color-neon-magenta); animation: flash-border 1s ease-in-out infinite; }
.status-dot--unreachable, .status-dot--dead { background: var(--color-neon-red); animation: flatline 2s linear infinite; }
.status-dot--paused { background: var(--color-secondary); }

/* Tabular numbers for metrics */
.tabular-nums {
  font-variant-numeric: tabular-nums;
  font-family: var(--font-mono);
}
```

`packages/web/src/styles/animations.css`:
```css
/* Pulse — slow (idle) */
@keyframes pulse-slow {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

/* Pulse — fast (needs attention) */
@keyframes pulse-fast {
  0%, 100% { opacity: 0.5; box-shadow: 0 0 5px rgba(255, 170, 0, 0.2); }
  50% { opacity: 1; box-shadow: 0 0 15px rgba(255, 170, 0, 0.6); }
}

/* Flash border (error) */
@keyframes flash-border {
  0%, 100% { box-shadow: 0 0 5px rgba(255, 0, 170, 0.3); }
  50% { box-shadow: 0 0 20px rgba(255, 0, 170, 0.8); }
}

/* Flatline (dead) */
@keyframes flatline {
  0% { opacity: 1; }
  49% { opacity: 1; }
  50% { opacity: 0.2; }
  100% { opacity: 0.2; }
}

/* Data flash — applied when a value changes */
@keyframes data-flash {
  0% { background-color: rgba(255, 170, 0, 0.3); }
  100% { background-color: transparent; }
}

.data-flash {
  animation: data-flash 200ms ease-out;
}

/* Neon text glow */
@keyframes text-glow {
  0%, 100% { text-shadow: 0 0 4px currentColor; }
  50% { text-shadow: 0 0 12px currentColor, 0 0 20px currentColor; }
}

/* Slide in from right (for alerts) */
@keyframes slide-in-right {
  from { transform: translateX(100%); opacity: 0; }
  to { transform: translateX(0); opacity: 1; }
}

.animate-slide-in {
  animation: slide-in-right 300ms ease-out;
}
```

**Step 2: Commit**

```bash
git add packages/web/src/styles/
git commit -m "feat: Terminal Neon design system — tokens, scanlines, HUD corners, glow effects, animations"
```

---

## Task 9: Dashboard Shell Layout

**Files:**
- Create: `packages/web/src/components/layout/DashboardShell.tsx`
- Create: `packages/web/src/components/layout/StatusBar.tsx`
- Create: `packages/web/src/components/layout/PanelFrame.tsx`
- Modify: `packages/web/src/App.tsx`

**Step 1: PanelFrame — reusable glass panel with HUD corners and scanlines**

`packages/web/src/components/layout/PanelFrame.tsx`:
```tsx
import type { ReactNode } from 'react';

interface PanelFrameProps {
  title: string;
  children: ReactNode;
  className?: string;
  headerRight?: ReactNode;
}

export function PanelFrame({ title, children, className = '', headerRight }: PanelFrameProps) {
  return (
    <div className={`glass-panel hud-corners scanlines flex flex-col ${className}`}>
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle">
        <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-neon-cyan">
          {title}
        </h2>
        {headerRight}
      </div>
      <div className="flex-1 overflow-hidden p-3">
        {children}
      </div>
    </div>
  );
}
```

**Step 2: StatusBar — top bar with branding, clock, global stats**

`packages/web/src/components/layout/StatusBar.tsx`:
```tsx
import { useEffect, useState } from 'react';

export function StatusBar() {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatted = time.toLocaleTimeString('en-GB', { hour12: false });
  const dateStr = time.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <header className="flex items-center justify-between px-4 py-2 border-b border-border-subtle bg-panel">
      <div className="flex items-center gap-3">
        <h1 className="font-mono text-sm font-bold tracking-wider text-neon-cyan">
          OMNISCIENT AI
        </h1>
        <span className="text-xs text-secondary font-mono">AGENT MISSION CONTROL</span>
      </div>

      <div className="flex items-center gap-6">
        {/* Placeholder global stats */}
        <div className="flex items-center gap-4 text-xs font-mono">
          <span className="text-neon-green">● 7 ONLINE</span>
          <span className="text-neon-amber">◉ 1 STALLED</span>
          <span className="text-neon-magenta">✖ 1 ERROR</span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-sm font-mono tabular-nums text-primary">{formatted}</span>
          <span className="text-[10px] font-mono text-secondary">{dateStr}</span>
        </div>
      </div>
    </header>
  );
}
```

**Step 3: DashboardShell — the main grid layout matching our 50" screen design**

`packages/web/src/components/layout/DashboardShell.tsx`:
```tsx
import type { ReactNode } from 'react';
import { StatusBar } from './StatusBar';
import { PanelFrame } from './PanelFrame';

export function DashboardShell() {
  return (
    <div className="h-screen w-screen flex flex-col bg-void relative z-10">
      <StatusBar />

      {/* Main grid — matches the 50" layout spec */}
      <div className="flex-1 grid grid-cols-[3fr_2fr] grid-rows-[1fr_auto_auto] gap-1 p-1 min-h-0">

        {/* Top-left: Agent Grid */}
        <PanelFrame title="Live Agent Grid" className="row-span-1">
          <div className="flex items-center justify-center h-full text-secondary text-sm font-mono">
            Agent cards will render here
          </div>
        </PanelFrame>

        {/* Top-right: Task Pipeline */}
        <PanelFrame title="Task Pipeline" className="row-span-1">
          <div className="flex items-center justify-center h-full text-secondary text-sm font-mono">
            Kanban columns will render here
          </div>
        </PanelFrame>

        {/* Middle: Schedule Timeline (full width) */}
        <PanelFrame title="Schedule Timeline" className="col-span-2 h-[140px]">
          <div className="flex items-center justify-center h-full text-secondary text-sm font-mono">
            Gantt timeline will render here
          </div>
        </PanelFrame>

        {/* Bottom row: 3 panels */}
        <div className="col-span-2 grid grid-cols-[1fr_1fr_2fr] gap-1 h-[220px]">
          <PanelFrame title="Performance Metrics">
            <div className="flex items-center justify-center h-full text-secondary text-sm font-mono">
              Sparklines here
            </div>
          </PanelFrame>

          <PanelFrame title="Infrastructure">
            <div className="flex items-center justify-center h-full text-secondary text-sm font-mono">
              Server health here
            </div>
          </PanelFrame>

          <PanelFrame title="Error & Alert Feed">
            <div className="flex items-center justify-center h-full text-secondary text-sm font-mono">
              Alert log here
            </div>
          </PanelFrame>
        </div>
      </div>
    </div>
  );
}
```

**Step 4: Update App.tsx**

`packages/web/src/App.tsx`:
```tsx
import { DashboardShell } from './components/layout/DashboardShell';

export function App() {
  return <DashboardShell />;
}
```

**Step 5: Verify**

Run: `pnpm dev:web`
Expected: Full-screen dark dashboard with 6 labeled panels, HUD corners, scanline effects, status bar with clock.

**Step 6: Commit**

```bash
git add packages/web/src/components/ packages/web/src/App.tsx
git commit -m "feat: dashboard shell layout — 6-panel grid, status bar, PanelFrame with HUD corners"
```

---

## Task 10: WebSocket Client + Connection Status

**Files:**
- Create: `packages/web/src/hooks/useSocket.ts`
- Create: `packages/web/src/context/SocketContext.tsx`
- Modify: `packages/web/src/components/layout/StatusBar.tsx` — show connection status

**Step 1: Socket hook**

`packages/web/src/hooks/useSocket.ts`:
```typescript
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@omniscient/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export function useSocket() {
  const socketRef = useRef<TypedSocket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket: TypedSocket = io(window.location.origin, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  return { socket: socketRef.current, connected };
}
```

`packages/web/src/context/SocketContext.tsx`:
```tsx
import { createContext, useContext, type ReactNode } from 'react';
import { useSocket } from '../hooks/useSocket';
import type { Socket } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@omniscient/shared';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

interface SocketContextValue {
  socket: TypedSocket | null;
  connected: boolean;
}

const SocketContext = createContext<SocketContextValue>({ socket: null, connected: false });

export function SocketProvider({ children }: { children: ReactNode }) {
  const value = useSocket();
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export function useSocketContext() {
  return useContext(SocketContext);
}
```

**Step 2: Wrap App with SocketProvider**

Update `packages/web/src/App.tsx`:
```tsx
import { DashboardShell } from './components/layout/DashboardShell';
import { SocketProvider } from './context/SocketContext';

export function App() {
  return (
    <SocketProvider>
      <DashboardShell />
    </SocketProvider>
  );
}
```

**Step 3: Add connection indicator to StatusBar**

Add to StatusBar, next to the clock:
```tsx
import { useSocketContext } from '../../context/SocketContext';

// Inside the component:
const { connected } = useSocketContext();

// In the JSX, before the clock:
<span className={`text-xs font-mono ${connected ? 'text-neon-green' : 'text-neon-red animate-pulse'}`}>
  {connected ? '● CONNECTED' : '○ DISCONNECTED'}
</span>
```

**Step 4: Commit**

```bash
git add packages/web/src/hooks/ packages/web/src/context/ packages/web/src/App.tsx packages/web/src/components/layout/StatusBar.tsx
git commit -m "feat: WebSocket client with typed events, SocketProvider context, connection status indicator"
```

---

## Task 11: Mock Data API (for frontend development without DB)

**Files:**
- Create: `packages/web/src/hooks/useAgents.ts`
- Create: `packages/web/src/hooks/useTasks.ts`
- Create: `packages/web/src/data/mock.ts`

This lets us build UI components immediately without a running database.

**Step 1: Mock data matching seed data shape**

`packages/web/src/data/mock.ts`:
```typescript
import type { Agent, Server, Task, HeartbeatPayload } from '@omniscient/shared';

export const MOCK_SERVERS: Server[] = [
  { id: 's1', tenantId: 't3', hostname: 'greenhouse-pi-01', ipAddress: '192.168.1.10', region: 'local', status: 'online', specs: { cpuCores: 4, memoryGb: 8, diskGb: 128, os: 'Ubuntu 24.04' }, lastSeen: new Date().toISOString(), createdAt: new Date().toISOString() },
  { id: 's2', tenantId: 't1', hostname: 'biz-auto-01', ipAddress: '192.168.1.20', region: 'local', status: 'online', specs: { cpuCores: 8, memoryGb: 16, diskGb: 256, os: 'Ubuntu 24.04' }, lastSeen: new Date().toISOString(), createdAt: new Date().toISOString() },
  { id: 's3', tenantId: 't2', hostname: 'biz-auto-02', ipAddress: '192.168.1.30', region: 'local', status: 'online', specs: { cpuCores: 8, memoryGb: 16, diskGb: 256, os: 'Ubuntu 24.04' }, lastSeen: new Date().toISOString(), createdAt: new Date().toISOString() },
];

export const MOCK_AGENTS: Agent[] = [
  { id: 'a1', serverId: 's1', tenantId: 't3', name: 'sensor-mon-01', role: 'sensor-monitor', status: 'working', currentTaskId: 'tk6', config: {}, lastHeartbeat: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'a2', serverId: 's1', tenantId: 't3', name: 'climate-ctrl-01', role: 'climate-control', status: 'stalled', currentTaskId: null, config: {}, lastHeartbeat: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'a3', serverId: 's1', tenantId: 't3', name: 'irrigation-01', role: 'irrigation', status: 'idle', currentTaskId: null, config: {}, lastHeartbeat: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'a4', serverId: 's2', tenantId: 't1', name: 'acme-email-01', role: 'email-filter', status: 'working', currentTaskId: 'tk1', config: {}, lastHeartbeat: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'a5', serverId: 's2', tenantId: 't1', name: 'acme-social-01', role: 'social-post', status: 'working', currentTaskId: 'tk2', config: {}, lastHeartbeat: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'a6', serverId: 's2', tenantId: 't1', name: 'acme-seo-01', role: 'seo-optimize', status: 'error', currentTaskId: null, config: {}, lastHeartbeat: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'a7', serverId: 's2', tenantId: 't1', name: 'acme-content-01', role: 'content-gen', status: 'idle', currentTaskId: null, config: {}, lastHeartbeat: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'a8', serverId: 's3', tenantId: 't2', name: 'brandx-social-01', role: 'social-post', status: 'working', currentTaskId: 'tk4', config: {}, lastHeartbeat: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'a9', serverId: 's3', tenantId: 't2', name: 'brandx-content-01', role: 'content-gen', status: 'idle', currentTaskId: null, config: {}, lastHeartbeat: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export const MOCK_TASKS: Task[] = [
  { id: 'tk1', tenantId: 't1', agentId: 'a4', type: 'email-batch', status: 'active', priority: 2, title: 'Process morning inbox batch', description: 'Filter and respond to 50 incoming emails', estimatedDuration: 1800, actualDuration: null, retryCount: 0, maxRetries: 3, inputs: {}, outputs: null, executionLog: null, cost: null, createdAt: new Date().toISOString(), startedAt: new Date().toISOString(), completedAt: null },
  { id: 'tk2', tenantId: 't1', agentId: 'a5', type: 'social-post', status: 'active', priority: 1, title: 'Post Q2 update to LinkedIn', description: 'Publish Acme Corp quarterly update', estimatedDuration: 300, actualDuration: null, retryCount: 0, maxRetries: 3, inputs: {}, outputs: null, executionLog: null, cost: null, createdAt: new Date().toISOString(), startedAt: new Date().toISOString(), completedAt: null },
  { id: 'tk3', tenantId: 't1', agentId: null, type: 'blog-draft', status: 'queued', priority: 1, title: 'Blog: AI Trends Q2 2026', description: 'Draft 1500-word blog post on AI trends', estimatedDuration: 1500, actualDuration: null, retryCount: 0, maxRetries: 3, inputs: {}, outputs: null, executionLog: null, cost: null, createdAt: new Date().toISOString(), startedAt: null, completedAt: null },
  { id: 'tk4', tenantId: 't2', agentId: 'a8', type: 'social-post', status: 'active', priority: 2, title: 'Instagram carousel: Summer collection', description: 'Create and post 5-image carousel', estimatedDuration: 900, actualDuration: null, retryCount: 0, maxRetries: 3, inputs: {}, outputs: null, executionLog: null, cost: null, createdAt: new Date().toISOString(), startedAt: new Date().toISOString(), completedAt: null },
  { id: 'tk5', tenantId: 't2', agentId: null, type: 'content-gen', status: 'queued', priority: 3, title: 'Generate weekly content batch', description: 'Produce 10 posts for next week', estimatedDuration: 3600, actualDuration: null, retryCount: 0, maxRetries: 3, inputs: {}, outputs: null, executionLog: null, cost: null, createdAt: new Date().toISOString(), startedAt: null, completedAt: null },
  { id: 'tk6', tenantId: 't3', agentId: 'a1', type: 'sensor-read', status: 'active', priority: 2, title: 'Hourly sensor reading', description: 'Read humidity, temperature, soil moisture', estimatedDuration: 120, actualDuration: null, retryCount: 0, maxRetries: 3, inputs: {}, outputs: null, executionLog: null, cost: null, createdAt: new Date().toISOString(), startedAt: new Date().toISOString(), completedAt: null },
];
```

**Step 2: Data hooks**

`packages/web/src/hooks/useAgents.ts`:
```typescript
import { useState, useEffect, useCallback } from 'react';
import { useSocketContext } from '../context/SocketContext';
import { MOCK_AGENTS, MOCK_SERVERS } from '../data/mock';
import type { Agent, Server, HeartbeatPayload } from '@omniscient/shared';

export function useAgents() {
  const { socket } = useSocketContext();
  const [agents, setAgents] = useState<Agent[]>(MOCK_AGENTS);
  const [servers, setServers] = useState<Server[]>(MOCK_SERVERS);

  useEffect(() => {
    if (!socket) return;

    socket.on('agent:heartbeat', (data: HeartbeatPayload) => {
      setAgents(prev => prev.map(a =>
        a.id === data.agentId
          ? { ...a, status: data.status, lastHeartbeat: data.timestamp }
          : a
      ));
    });

    socket.on('agent:status_change', (data) => {
      setAgents(prev => prev.map(a =>
        a.id === data.agentId
          ? { ...a, status: data.to }
          : a
      ));
    });

    return () => {
      socket.off('agent:heartbeat');
      socket.off('agent:status_change');
    };
  }, [socket]);

  const agentsByServer = servers.map(server => ({
    server,
    agents: agents.filter(a => a.serverId === server.id),
  }));

  return { agents, servers, agentsByServer };
}
```

`packages/web/src/hooks/useTasks.ts`:
```typescript
import { useState, useEffect } from 'react';
import { useSocketContext } from '../context/SocketContext';
import { MOCK_TASKS } from '../data/mock';
import type { Task } from '@omniscient/shared';

export function useTasks() {
  const { socket } = useSocketContext();
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);

  useEffect(() => {
    if (!socket) return;

    socket.on('task:status_change', (data) => {
      setTasks(prev => prev.map(t =>
        t.id === data.taskId ? { ...t, status: data.to } : t
      ));
    });

    socket.on('task:created', (data) => {
      // Placeholder — fetch full task from API
    });

    return () => {
      socket.off('task:status_change');
      socket.off('task:created');
    };
  }, [socket]);

  const queued = tasks.filter(t => t.status === 'queued');
  const active = tasks.filter(t => t.status === 'active');
  const approval = tasks.filter(t => t.status === 'approval');
  const done = tasks.filter(t => t.status === 'done');
  const failed = tasks.filter(t => t.status === 'failed');

  return { tasks, queued, active, approval, done, failed };
}
```

**Step 3: Commit**

```bash
git add packages/web/src/data/ packages/web/src/hooks/
git commit -m "feat: mock data + useAgents/useTasks hooks with real-time WebSocket updates"
```

---

## Summary: What Phase 1 Delivers

After completing all 11 tasks:

1. **Monorepo** — pnpm workspace with `api`, `web`, `shared` packages
2. **Shared types** — TypeScript interfaces for every domain entity + WebSocket events
3. **Database schema** — Drizzle ORM with Postgres + TimescaleDB hypertable for heartbeats
4. **Seed data** — 3 tenants, 3 servers, 9 agents, 6 tasks
5. **REST API** — full CRUD for agents, servers, tasks, heartbeats, metrics
6. **Heartbeat ingestion** — POST endpoint + WebSocket broadcast
7. **Absence/stall detector** — background worker with graduated 60/90/120s thresholds
8. **Mock heartbeat simulator** — dev tool generating realistic traffic
9. **Terminal Neon design system** — Tailwind tokens, scanlines, HUD corners, glow effects, animations
10. **Dashboard shell** — 6-panel grid layout matching the 50" screen spec
11. **WebSocket client** — typed Socket.IO with connection status indicator
12. **Mock data layer** — frontend-side mock data + real-time hooks for immediate UI development

The dashboard will be a fully styled, connected shell ready for Phase 2 to populate each panel with live components.
