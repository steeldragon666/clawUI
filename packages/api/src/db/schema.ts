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
export const platformEnum = pgEnum('platform', ['twitter', 'linkedin', 'facebook', 'instagram', 'tiktok']);
export const contentStatusEnum = pgEnum('content_status', ['draft', 'review', 'approved', 'scheduled', 'published', 'rejected']);

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

// Platform Accounts
export const platformAccounts = pgTable('platform_accounts', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  platform: platformEnum('platform').notNull(),
  accountName: varchar('account_name', { length: 255 }).notNull(),
  oauthTokens: jsonb('oauth_tokens').default({}).notNull(),
  rateLimitState: jsonb('rate_limit_state').default({}).notNull(),
  postingSchedule: jsonb('posting_schedule').default({}).notNull(),
  lastRefresh: timestamp('last_refresh', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_platform_accounts_tenant').on(table.tenantId),
]);

// Content Items
export const contentItems = pgTable('content_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').references(() => tenants.id).notNull(),
  taskId: uuid('task_id').references(() => tasks.id),
  platform: platformEnum('platform').notNull(),
  contentBody: text('content_body').notNull(),
  mediaUrls: jsonb('media_urls').default([]).notNull(),
  hashtags: jsonb('hashtags').default([]).notNull(),
  mentions: jsonb('mentions').default([]).notNull(),
  version: integer('version').default(1).notNull(),
  status: contentStatusEnum('status').default('draft').notNull(),
  approvedBy: varchar('approved_by', { length: 255 }),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  publishedAt: timestamp('published_at', { withTimezone: true }),
  engagement: jsonb('engagement').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  index('idx_content_tenant').on(table.tenantId),
  index('idx_content_status').on(table.status),
  index('idx_content_scheduled').on(table.scheduledAt),
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
