import type { Agent, Task } from '@omniscient/shared';

// ---------------------------------------------------------------------------
// Inline types not yet in @omniscient/shared
// ---------------------------------------------------------------------------

export interface MockClient {
  id: string;
  name: string;
  platforms: string[];
  industry: string;
}

export interface MockAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info' | 'resolved';
  message: string;
  entityType: 'agent' | 'task' | 'server' | 'client' | 'system';
  entityId: string;
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ts(offsetMs: number): string {
  return new Date(Date.now() - offsetMs).toISOString();
}

function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

function seededInt(seed: number, min: number, max: number): number {
  // Deterministic pseudo-random spread — avoids Math.random() so snapshots are stable
  const val = ((seed * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;
  return Math.floor(min + val * (max - min + 1));
}

// ---------------------------------------------------------------------------
// 20 Clients
// ---------------------------------------------------------------------------

const CLIENT_DATA: Array<{ name: string; industry: string; platforms: string[] }> = [
  { name: 'Apex Digital',        industry: 'tech',                  platforms: ['x', 'linkedin', 'instagram'] },
  { name: 'Meridian Systems',    industry: 'tech',                  platforms: ['linkedin', 'x'] },
  { name: 'Vantage Cloud',       industry: 'tech',                  platforms: ['x', 'linkedin', 'facebook', 'instagram'] },
  { name: 'Crestline Software',  industry: 'tech',                  platforms: ['linkedin', 'facebook'] },
  { name: 'Harbor & Co.',        industry: 'retail',                platforms: ['instagram', 'facebook', 'x'] },
  { name: 'Summit Goods',        industry: 'retail',                platforms: ['instagram', 'facebook'] },
  { name: 'Pinnacle Market',     industry: 'retail',                platforms: ['facebook', 'instagram', 'x'] },
  { name: 'Riverside Traders',   industry: 'retail',                platforms: ['instagram', 'x'] },
  { name: 'Solstice Capital',    industry: 'finance',               platforms: ['linkedin', 'x'] },
  { name: 'Granite Wealth',      industry: 'finance',               platforms: ['linkedin', 'facebook'] },
  { name: 'Ironbridge Finance',  industry: 'finance',               platforms: ['linkedin', 'x', 'instagram'] },
  { name: 'Oakhurst Advisors',   industry: 'finance',               platforms: ['linkedin'] },
  { name: 'Bellwether Hotels',   industry: 'hospitality',           platforms: ['instagram', 'facebook', 'x'] },
  { name: 'Cascade Resorts',     industry: 'hospitality',           platforms: ['instagram', 'facebook'] },
  { name: 'Drift & Stay',        industry: 'hospitality',           platforms: ['instagram', 'x', 'linkedin'] },
  { name: 'Thornfield Suites',   industry: 'hospitality',           platforms: ['facebook', 'instagram'] },
  { name: 'Halcyon Consulting',  industry: 'professional services', platforms: ['linkedin', 'x'] },
  { name: 'Stratos Advisory',    industry: 'professional services', platforms: ['linkedin', 'facebook'] },
  { name: 'Luminary Partners',   industry: 'professional services', platforms: ['linkedin', 'x', 'instagram'] },
  { name: 'Keystone Group',      industry: 'professional services', platforms: ['linkedin'] },
];

export const mockClients: MockClient[] = CLIENT_DATA.map((c, i) => ({
  id: `client-${String(i + 1).padStart(2, '0')}`,
  name: c.name,
  industry: c.industry,
  platforms: c.platforms,
}));

// ---------------------------------------------------------------------------
// 4 Servers
// ---------------------------------------------------------------------------

const SERVERS = [
  { id: 'srv-alpha-01', agentCount: 15 },
  { id: 'srv-alpha-02', agentCount: 15 },
  { id: 'srv-beta-01',  agentCount: 12 },
  { id: 'srv-beta-02',  agentCount: 8  },
] as const;

// ---------------------------------------------------------------------------
// 50 Agents
// ---------------------------------------------------------------------------

// Role distribution: 15 content-writers, 10 schedulers, 10 publishers, 8 monitors, 7 researchers
// Mapped AgentRole values per MVP role
type MvpRole = 'content-writer' | 'scheduler' | 'publisher' | 'monitor' | 'researcher';

const ROLE_MAP: Record<MvpRole, Agent['role']> = {
  'content-writer': 'content-gen',
  'scheduler':      'custom',
  'publisher':      'social-post',
  'monitor':        'engagement-monitor',
  'researcher':     'seo-optimize',
};

const ROLE_LABELS: Record<MvpRole, string> = {
  'content-writer': 'cw',
  'scheduler':      'sch',
  'publisher':      'pub',
  'monitor':        'mon',
  'researcher':     'res',
};

// Build ordered role list matching the distribution requirements
const AGENT_ROLES: MvpRole[] = [
  ...Array<MvpRole>(15).fill('content-writer'),
  ...Array<MvpRole>(10).fill('scheduler'),
  ...Array<MvpRole>(10).fill('publisher'),
  ...Array<MvpRole>(8).fill('monitor'),
  ...Array<MvpRole>(7).fill('researcher'),
];

// Status distribution: 35 working, 8 idle, 4 error, 3 offline
const AGENT_STATUSES: Agent['status'][] = [
  ...Array<Agent['status']>(35).fill('working'),
  ...Array<Agent['status']>(8).fill('idle'),
  ...Array<Agent['status']>(4).fill('error'),
  ...Array<Agent['status']>(3).fill('unreachable'),
];

// Expand server slots: [srv-alpha-01 x15, srv-alpha-02 x15, srv-beta-01 x12, srv-beta-02 x8]
const AGENT_SERVER_IDS: string[] = SERVERS.flatMap(s => Array(s.agentCount).fill(s.id));

export const mockAgents: (Agent & { clientId: string; clientName: string; mvpRole: MvpRole })[] =
  Array.from({ length: 50 }, (_, i) => {
    const mvpRole  = AGENT_ROLES[i];
    const status   = AGENT_STATUSES[i];
    const serverId = AGENT_SERVER_IDS[i];
    const clientId = mockClients[i % mockClients.length].id;
    const clientName = mockClients[i % mockClients.length].name;

    const isError   = status === 'error';
    const isOffline = status === 'unreachable';

    const lastHeartbeatOffset = isError
      ? seededInt(i * 7, 90_000, 300_000)
      : isOffline
        ? seededInt(i * 11, 600_000, 1_800_000)
        : seededInt(i * 3, 0, 15_000);

    const cpu    = isError   ? seededInt(i * 13, 85, 99)
                 : isOffline ? 0
                 : status === 'idle' ? seededInt(i * 5, 5, 20)
                 : seededInt(i * 17, 30, 85);

    const mem    = isOffline ? 0
                 : status === 'idle' ? seededInt(i * 7, 20, 40)
                 : seededInt(i * 19, 35, 75);

    const label  = ROLE_LABELS[mvpRole];
    const num    = String(i + 1).padStart(2, '0');

    return {
      id:            `agent-${num}`,
      serverId,
      tenantId:      `tenant-${clientId}`,
      name:          `${label}-${num}`,
      role:          ROLE_MAP[mvpRole],
      mvpRole,
      status,
      currentTaskId: status === 'working' ? `task-${String(i + 1).padStart(3, '0')}` : null,
      lastHeartbeat: ts(lastHeartbeatOffset),
      createdAt:     ts(seededInt(i * 23, 7 * 86_400_000, 90 * 86_400_000)),
      updatedAt:     ts(lastHeartbeatOffset),
      cpuPercent:    cpu,
      memoryPercent: mem,
      taskCounter:   isOffline ? 0 : seededInt(i * 29, 50, 5_000),
      queueDepth:    isOffline ? 0 : (status === 'idle' ? 0 : seededInt(i * 31, 0, 15)),
      clientId,
      clientName,
    };
  });

// ---------------------------------------------------------------------------
// 200 Tasks
// ---------------------------------------------------------------------------

// Pipeline stage distribution
// Queued(25), InProgress(30), Review(15), Approved(20), Scheduled(35), Published(65), Failed(10)
type PipelineStage = 'queued' | 'in_progress' | 'review' | 'approved' | 'scheduled' | 'published' | 'failed';

interface MockTask extends Task {
  pipelineStage: PipelineStage;
  platform: string;
  contentPreview: string;
}

const PIPELINE_STAGES: Array<{ stage: PipelineStage; count: number; status: Task['status'] }> = [
  { stage: 'queued',      count: 25,  status: 'queued'   },
  { stage: 'in_progress', count: 30,  status: 'active'   },
  { stage: 'review',      count: 15,  status: 'approval' },
  { stage: 'approved',    count: 20,  status: 'approval' },
  { stage: 'scheduled',   count: 35,  status: 'queued'   },
  { stage: 'published',   count: 65,  status: 'done'     },
  { stage: 'failed',      count: 10,  status: 'failed'   },
];

const PLATFORMS = ['x', 'linkedin', 'facebook', 'instagram'] as const;
// Platform weights: 30% x, 25% linkedin, 25% facebook, 20% instagram
const PLATFORM_WEIGHTS = [30, 25, 25, 20];
const PLATFORM_POOL: string[] = PLATFORMS.flatMap((p, i) => Array(PLATFORM_WEIGHTS[i]).fill(p));

const TASK_TYPES: Task['type'][] = [
  'social-post', 'social-post', 'social-post',
  'content-gen', 'content-gen',
  'blog-draft',
  'seo-audit',
  'engagement-pull',
  'email-batch',
  'custom',
];

const CONTENT_PREVIEWS = [
  // Promotional
  "Big news! Our latest product drop is live — and it's everything you've been waiting for. Shop now before stock runs out.",
  "Limited time offer: 20% off all plans this week only. Don't miss your chance to scale smarter with less effort.",
  "Introducing our summer collection. Crafted for performance, designed for style. Available starting today.",
  "Flash sale — 48 hours only. Up to 40% off select items. Your cart is waiting.",
  "New feature alert: we just shipped the most-requested update on our roadmap. Here's what changed.",
  "Early access is open. Be among the first to experience the platform that's redefining the industry.",
  // Thought leadership
  "The brands winning on social right now have one thing in common: consistency over virality. Here's why that matters.",
  "AI won't replace your marketing team. But teams using AI will outpace those that aren't. The gap is widening.",
  "Three things we learned from launching in five markets simultaneously — and what we'd do differently.",
  "The best content strategies aren't complicated. They're just executed with more discipline than most teams manage.",
  "Why we stopped chasing follower counts and started obsessing over engagement depth instead.",
  "Your audience doesn't want more content. They want more relevant content. There's a significant difference.",
  // Engagement
  "What's the one tool you can't run your business without? Drop it below — we're building a list.",
  "We asked our community what they struggle with most. The answers surprised us. Thread below.",
  "Hot take: most brand content is too polished. Real, imperfect moments convert better. Agree or disagree?",
  "Two truths and a lie about social media marketing. Can you spot the lie?",
  "Tag a colleague who would actually read a 2,000-word post on content strategy. They exist. We know it.",
  "We're curious — how many platforms is your team actively managing right now? Reply below.",
  // Announcements
  "We're excited to announce our partnership with one of the industry's leading platforms. Full details in the link.",
  "Our Q2 results are in. Growth across every channel, and we're just getting started. Read the full report.",
  "Huge milestone: we just crossed 10,000 active users. Thank you to every single person who made this possible.",
  "We're hiring. If you're passionate about building the future of digital marketing, we want to hear from you.",
  "Event recap: here's everything that happened at our annual summit, and what it means for the year ahead.",
  "New integration live: connect your existing workflow in minutes and let the automation handle the rest.",
];

// Build flat list of stage slots
const STAGE_SLOTS: Array<{ stage: PipelineStage; status: Task['status'] }> = PIPELINE_STAGES.flatMap(
  ({ stage, status, count }) => Array(count).fill({ stage, status })
);

const WORKING_AGENT_IDS = mockAgents
  .filter(a => a.status === 'working')
  .map(a => a.id);

export const mockTasks: MockTask[] = Array.from({ length: 200 }, (_, i) => {
  const { stage, status } = STAGE_SLOTS[i];
  const platform    = PLATFORM_POOL[seededInt(i * 41, 0, PLATFORM_POOL.length - 1)];
  const client      = mockClients[seededInt(i * 7, 0, mockClients.length - 1)];
  const taskType    = TASK_TYPES[seededInt(i * 13, 0, TASK_TYPES.length - 1)];
  const priority    = pick([1, 2, 2, 3, 3, 3, 4, 5] as (1 | 2 | 3 | 4 | 5)[], seededInt(i * 3, 0, 7));
  const preview     = CONTENT_PREVIEWS[seededInt(i * 17, 0, CONTENT_PREVIEWS.length - 1)];
  const agentId     = (status === 'active' || status === 'done' || status === 'failed')
    ? pick(WORKING_AGENT_IDS, i)
    : null;

  const num = String(i + 1).padStart(3, '0');

  // Timing — all offsets are positive (ms in the past from now)
  const createdOffset   = seededInt(i * 19, 3_600_000, 86_400_000);
  const startedOffset   = status !== 'queued'
    ? createdOffset - seededInt(i * 23, 5_000, 60_000)   // slightly more recent than created
    : null;
  const durationMs      = seededInt(i * 29, 15_000, 600_000);
  // completedOffset must be > 0 (in the past) and more recent than startedOffset
  const completedOffset = (status === 'done' || status === 'failed') && startedOffset !== null
    ? Math.max(1_000, startedOffset - durationMs)
    : null;

  const estimatedDuration = seededInt(i * 37, 30, 600);
  const actualDuration    = completedOffset !== null ? Math.round(durationMs / 1000) : null;

  const retryCount = status === 'failed' ? seededInt(i * 43, 1, 3) : 0;
  const maxRetries = 3;

  const outputs: Record<string, unknown> | null = status === 'done'
    ? { platform, postId: `post-${num}`, engagementEstimate: seededInt(i * 47, 10, 2000) }
    : null;

  const executionLog = status === 'failed'
    ? pick([
        'Rate limit exceeded after 3 retries. API quota exhausted.',
        'Timeout after 120s — downstream API unresponsive.',
        'Content policy violation detected. Post rejected by platform.',
        'Authentication token expired. Re-auth required.',
        'Network error: connection reset by peer after 2 attempts.',
      ], i)
    : null;

  const platformCapitalized = platform.charAt(0).toUpperCase() + platform.slice(1);

  return {
    id:                `task-${num}`,
    tenantId:          `tenant-${client.id}`,
    agentId,
    type:              taskType,
    status,
    priority,
    pipelineStage:     stage,
    platform,
    contentPreview:    preview,
    title:             `${platformCapitalized}: ${preview.slice(0, 52).trimEnd()}…`,
    description:       preview,
    estimatedDuration,
    actualDuration,
    retryCount,
    maxRetries,
    inputs:            { platform, clientId: client.id },
    outputs,
    executionLog,
    cost:              status === 'done' ? Number((seededInt(i * 53, 1, 150) / 1000).toFixed(4)) : null,
    createdAt:         ts(createdOffset),
    startedAt:         startedOffset !== null ? ts(startedOffset) : null,
    completedAt:       completedOffset !== null ? ts(completedOffset) : null,
  };
});

// ---------------------------------------------------------------------------
// 50 Alerts
// ---------------------------------------------------------------------------

const ERROR_AGENTS  = mockAgents.filter(a => a.status === 'error' || a.status === 'unreachable');
const FAILED_TASKS  = mockTasks.filter(t => t.status === 'failed');

// 15 agent errors, 10 task failures, 8 rate limits, 5 server health, 7 SLA warnings, 5 resolved = 50
const ALERT_TEMPLATES: Array<{
  severity: MockAlert['severity'];
  entityType: MockAlert['entityType'];
  getMessage: (idx: number) => string;
  getEntityId: (idx: number) => string;
  timeSpreadMs: number;
}> = [
  // Agent errors (15)
  ...Array.from({ length: 15 }, (_, i) => ({
    severity:    'critical' as const,
    entityType:  'agent' as const,
    getMessage:  (_: number) => pick([
      'Agent heartbeat timeout — no response for 90+ seconds.',
      'Agent crashed with unhandled exception. Auto-restart attempted.',
      'Agent CPU pegged at 99% — task execution stalled.',
      'Agent lost connection to task queue broker.',
      'Agent memory limit exceeded — OOM kill triggered.',
    ], i),
    getEntityId: (_: number) => pick(ERROR_AGENTS, i).id,
    timeSpreadMs: seededInt(i * 7,  0, 4 * 3_600_000),
  })),
  // Task failures (10)
  ...Array.from({ length: 10 }, (_, i) => ({
    severity:    'critical' as const,
    entityType:  'task' as const,
    getMessage:  (_: number) => pick([
      'Task failed after maximum retries exhausted.',
      'Task execution timeout — exceeded 120s limit.',
      'Platform API rejected content — policy violation.',
      'Task cancelled due to upstream dependency failure.',
      'Scheduled task missed execution window.',
    ], i),
    getEntityId: (_: number) => pick(FAILED_TASKS, i).id,
    timeSpreadMs: seededInt((i + 15) * 11, 0, 4 * 3_600_000),
  })),
  // Rate limit warnings (8)
  ...Array.from({ length: 8 }, (_, i) => ({
    severity:    'warning' as const,
    entityType:  'client' as const,
    getMessage:  (_: number) => pick([
      'X (Twitter) API rate limit at 85% — throttling requests.',
      'LinkedIn API: approaching daily post quota limit.',
      'Facebook Graph API: 429 responses increasing — backing off.',
      'Instagram posting limit: 18 of 25 daily posts used.',
      'Platform API token nearing expiry — refresh required within 1 hour.',
    ], i),
    getEntityId: (_: number) => pick(mockClients, i).id,
    timeSpreadMs: seededInt((i + 25) * 13, 0, 4 * 3_600_000),
  })),
  // Server health (5)
  ...Array.from({ length: 5 }, (_, i) => ({
    severity:    'warning' as const,
    entityType:  'server' as const,
    getMessage:  (_: number) => pick([
      'Server disk usage at 88% — cleanup recommended.',
      'Server load average elevated: 4.2 over 5-minute window.',
      'Server memory pressure: swap in use, performance degraded.',
      'Server network latency spike detected — P99 > 800ms.',
      'Server TLS certificate expires in 7 days — renewal pending.',
    ], i),
    getEntityId: (_: number) => pick(SERVERS as unknown as { id: string }[], i).id,
    timeSpreadMs: seededInt((i + 33) * 17, 0, 4 * 3_600_000),
  })),
  // SLA warnings (7)
  ...Array.from({ length: 7 }, (_, i) => ({
    severity:    'warning' as const,
    entityType:  'client' as const,
    getMessage:  (_: number) => pick([
      'SLA breach risk: 3 tasks have been queued for over 2 hours.',
      'Client content calendar falling behind — 5 posts overdue.',
      'Scheduled post window closing in 15 minutes — agent unavailable.',
      'SLA threshold: average task duration exceeded target by 40%.',
      'Approval queue backlog exceeding 4-hour SLA window.',
      'Client posting frequency dropped below agreed minimum.',
      'Task throughput below SLA floor for the past 30 minutes.',
    ], i),
    getEntityId: (_: number) => pick(mockClients, i + 7).id,
    timeSpreadMs: seededInt((i + 38) * 19, 0, 4 * 3_600_000),
  })),
  // Resolved (5)
  ...Array.from({ length: 5 }, (_, i) => ({
    severity:    'resolved' as const,
    entityType:  'system' as const,
    getMessage:  (_: number) => pick([
      'Agent auto-recovered after restart. Task queue resuming normally.',
      'Rate limit backoff lifted — API calls resuming at full rate.',
      'Server disk cleanup completed. Usage back to 61%.',
      'Network latency returned to baseline after routing fix.',
      'Failed tasks re-queued successfully after dependency resolved.',
    ], i),
    getEntityId: (_: number) => 'system',
    timeSpreadMs: seededInt((i + 45) * 23, 0, 4 * 3_600_000),
  })),
];

export const mockAlerts: MockAlert[] = ALERT_TEMPLATES
  .map((t, i) => ({
    id:         `alert-${String(i + 1).padStart(2, '0')}`,
    severity:   t.severity,
    entityType: t.entityType,
    entityId:   t.getEntityId(i),
    message:    t.getMessage(i),
    timestamp:  ts(t.timeSpreadMs),
  }))
  .sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // newest first

// ---------------------------------------------------------------------------
// 24h Metrics Snapshot
// ---------------------------------------------------------------------------

// Daily pattern: low midnight-6am, ramp 7-10am, steady 10am-4pm, taper 4-10pm, low 10pm-midnight
const HOURLY_PATTERN = [
  2, 1, 0, 1, 2, 3,   // 00:00-05:59
  5, 12, 22, 30,       // 06:00-09:59
  35, 38, 40, 37, 36, 34, // 10:00-15:59
  28, 25, 22, 20,      // 16:00-19:59
  15, 12, 8, 6,        // 20:00-23:59
];

// Apply slight per-hour jitter for realism
const completionsPerHour: number[] = HOURLY_PATTERN.map((base, i) =>
  Math.max(0, base + seededInt(i * 59, -3, 4))
);

const tasksCompleted24h = completionsPerHour.reduce((a, b) => a + b, 0);
// Published tasks count as successful, failed as not
const publishedCount = mockTasks.filter(t => t.pipelineStage === 'published').length;
const failedCount    = mockTasks.filter(t => t.pipelineStage === 'failed').length;
const successRate24h = Number(((publishedCount / (publishedCount + failedCount)) * 100).toFixed(1));

const doneTasks = mockTasks.filter(t => t.actualDuration !== null && t.actualDuration > 0);
const avgDuration24h = doneTasks.length > 0
  ? Math.round(doneTasks.reduce((sum, t) => sum + (t.actualDuration ?? 0), 0) / doneTasks.length)
  : 0;

const retriedTasks = mockTasks.filter(t => t.retryCount > 0).length;
const retryRate24h = Number(((retriedTasks / mockTasks.length) * 100).toFixed(1));

export const mockMetrics: MetricsSnapshot = {
  tasksCompleted24h,
  successRate24h,
  avgDuration24h,
  retryRate24h,
  completionsPerHour,
  byRole: {
    'content-writer': {
      completed:   Math.round(publishedCount * 0.35),
      total:       Math.round(mockTasks.length * 0.35),
      successRate: 94.2,
    },
    'publisher': {
      completed:   Math.round(publishedCount * 0.28),
      total:       Math.round(mockTasks.length * 0.28),
      successRate: 91.8,
    },
    'scheduler': {
      completed:   Math.round(publishedCount * 0.15),
      total:       Math.round(mockTasks.length * 0.15),
      successRate: 98.1,
    },
    'monitor': {
      completed:   Math.round(publishedCount * 0.12),
      total:       Math.round(mockTasks.length * 0.12),
      successRate: 99.3,
    },
    'researcher': {
      completed:   Math.round(publishedCount * 0.10),
      total:       Math.round(mockTasks.length * 0.10),
      successRate: 87.4,
    },
  },
};
