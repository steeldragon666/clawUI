import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Send, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { mockClients } from '../lib/mock';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PublishStatus = 'publishing' | 'queued' | 'published' | 'failed';

interface PublishJob {
  id: number;
  status: PublishStatus;
  clientName: string;
  platform: 'x' | 'linkedin' | 'facebook' | 'instagram';
  contentPreview: string;
  scheduledTime: string;
  scheduledHour: number;   // 0-23 absolute hour for timeline
  scheduledMinute: number;
  agentId: string | null;
  attempts: number;
  maxAttempts: number;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORM_EMOJI: Record<string, string> = {
  x:         '𝕏',
  linkedin:  '💼',
  facebook:  '📘',
  instagram: '📷',
};

const PLATFORM_LABEL: Record<string, string> = {
  x:         'X',
  linkedin:  'LinkedIn',
  facebook:  'Facebook',
  instagram: 'Instagram',
};

const PLATFORM_COLOR: Record<string, string> = {
  x:         '#00f0ff',
  linkedin:  '#0088ff',
  facebook:  '#3b82f6',
  instagram: '#ffaa00',
};

// Optimal posting windows per platform (hour ranges, inclusive start)
const OPTIMAL_WINDOWS: Record<string, Array<[number, number]>> = {
  x:         [[8, 9],  [12, 13], [17, 18]],
  linkedin:  [[7, 8],  [10, 11], [17, 18]],
  facebook:  [[9, 10], [13, 14], [19, 20]],
  instagram: [[11, 13],          [19, 21]],
};

const OPTIMAL_WINDOW_LABELS: Record<string, string[]> = {
  x:         ['8–9 AM', '12–1 PM', '5–6 PM'],
  linkedin:  ['7–8 AM', '10–11 AM', '5–6 PM'],
  facebook:  ['9–10 AM', '1–2 PM', '7–8 PM'],
  instagram: ['11 AM–1 PM', '7–9 PM'],
};

// ---------------------------------------------------------------------------
// Seeded deterministic helpers (consistent with mock.ts approach)
// ---------------------------------------------------------------------------

function seededInt(seed: number, min: number, max: number): number {
  const val = ((seed * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;
  return Math.floor(min + val * (max - min + 1));
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seededInt(seed, 0, arr.length - 1)];
}

// ---------------------------------------------------------------------------
// Mock data generation
// ---------------------------------------------------------------------------

const CONTENT_SNIPPETS = [
  'Excited to announce our new partnership with…',
  'Summer collection is finally here. Discover…',
  'Q2 market outlook: what the data tells us…',
  'Weekend getaway deals you cannot afford to miss…',
  'Three things we learned from our biggest launch…',
  'AI is reshaping the way brands connect with…',
  'Flash sale — 48 hours only. Up to 40% off…',
  'Hot take: consistency beats virality every time…',
  'New integration live — connect in minutes and…',
  'Q3 report is in. Growth across every channel…',
  'Tag a colleague who needs to read this thread…',
  'We just crossed 10,000 active users. Thank you…',
  'Event recap: everything from our annual summit…',
  'The brands winning right now have one thing in…',
  'What tool can you not run your business without…',
  'Introducing our most-requested feature update…',
  'Early access is open — be among the first to…',
  'Why we stopped chasing follower counts and…',
  'Limited time offer: 20% off all plans this week…',
  'Your audience wants relevance, not more content…',
];

const PLATFORMS: Array<'x' | 'linkedin' | 'facebook' | 'instagram'> = [
  'x', 'linkedin', 'facebook', 'instagram',
];

// Status distribution: 3 publishing, 8 queued, 7 published, 2 failed
const STATUS_POOL: PublishStatus[] = [
  'publishing', 'publishing', 'publishing',
  'queued', 'queued', 'queued', 'queued', 'queued', 'queued', 'queued', 'queued',
  'published', 'published', 'published', 'published', 'published', 'published', 'published',
  'failed', 'failed',
];

// Build 20 jobs seeded so they are stable across renders
const PUBLISH_AGENTS = ['pub-01', 'pub-02', 'pub-03', 'pub-04', 'pub-05'];

function buildJobs(): PublishJob[] {
  const now = new Date();
  const baseHour = now.getHours();
  const baseMinute = now.getMinutes();

  const jobs: PublishJob[] = Array.from({ length: 20 }, (_, i) => {
    const status = STATUS_POOL[i];
    const platform = pick(PLATFORMS, i * 7 + 3);
    const client = pick(mockClients, i * 11 + 5);
    const content = CONTENT_SNIPPETS[seededInt(i * 13, 0, CONTENT_SNIPPETS.length - 1)];

    // Spread scheduled times around current hour: past for published/failed, future for queued, now for publishing
    let offsetMinutes: number;
    if (status === 'published' || status === 'failed') {
      offsetMinutes = -(seededInt(i * 17, 5, 90));
    } else if (status === 'publishing') {
      offsetMinutes = 0;
    } else {
      offsetMinutes = seededInt(i * 19, 5, 180);
    }

    const scheduledDate = new Date(now);
    scheduledDate.setMinutes(baseMinute + offsetMinutes);

    const scheduledHour = scheduledDate.getHours();
    const scheduledMinute = scheduledDate.getMinutes();

    const h12 = scheduledHour % 12 || 12;
    const ampm = scheduledHour < 12 ? 'AM' : 'PM';
    const mm = String(scheduledMinute).padStart(2, '0');
    const scheduledTime = `${h12}:${mm} ${ampm}`;

    const attempts = status === 'failed'
      ? 3
      : status === 'published'
        ? seededInt(i * 23, 1, 2)
        : status === 'publishing'
          ? 1
          : 0;

    const agentId = (status === 'publishing' || status === 'published' || status === 'failed')
      ? pick(PUBLISH_AGENTS, i * 7)
      : null;

    return {
      id: i + 1,
      status,
      clientName: client.name,
      platform,
      contentPreview: content,
      scheduledTime,
      scheduledHour,
      scheduledMinute,
      agentId,
      attempts,
      maxAttempts: 3,
    };
  });

  // Sort by scheduled time (past → future)
  return jobs.sort((a, b) => {
    const aMs = a.scheduledHour * 60 + a.scheduledMinute;
    const bMs = b.scheduledHour * 60 + b.scheduledMinute;
    return aMs - bMs;
  });
}

const PUBLISH_JOBS = buildJobs();

// ---------------------------------------------------------------------------
// Rate limit data (static mock)
// ---------------------------------------------------------------------------

interface RateLimitData {
  platform: 'x' | 'linkedin' | 'facebook' | 'instagram';
  used: number;
  total: number;
  resetsInMinutes: number;
}

const RATE_LIMITS: RateLimitData[] = [
  { platform: 'x',         used: 58,  total: 200, resetsInMinutes: 42 },
  { platform: 'linkedin',  used: 30,  total: 200, resetsInMinutes: 67 },
  { platform: 'facebook',  used: 44,  total: 200, resetsInMinutes: 28 },
  { platform: 'instagram', used: 92,  total: 200, resetsInMinutes: 15 },
];

// ---------------------------------------------------------------------------
// Derived stats
// ---------------------------------------------------------------------------

const STATS = {
  queued:        PUBLISH_JOBS.filter(j => j.status === 'queued').length,
  publishing:    PUBLISH_JOBS.filter(j => j.status === 'publishing').length,
  publishedToday: 89,
  failedToday:   2,
};

// ---------------------------------------------------------------------------
// Helper: rate limit color
// ---------------------------------------------------------------------------

function rateLimitColor(pct: number): string {
  if (pct > 50) return '#00ff88';
  if (pct >= 20) return '#ffaa00';
  return '#ff00aa';
}

function rateLimitTextClass(pct: number): string {
  if (pct > 50) return 'text-neon-green';
  if (pct >= 20) return 'text-neon-amber';
  return 'text-neon-magenta';
}

function overallRateLimitLabel(pct: number): string {
  if (pct > 50) return `OK (${pct}% avail)`;
  if (pct >= 20) return `CAUTION (${pct}% avail)`;
  return `LOW (${pct}% avail)`;
}

// Use instagram as worst-case for the header stat
const INSTAGRAM_RATE = RATE_LIMITS.find(r => r.platform === 'instagram')!;
const OVERALL_RATE_PCT = Math.round(((INSTAGRAM_RATE.total - INSTAGRAM_RATE.used) / INSTAGRAM_RATE.total) * 100);

// ---------------------------------------------------------------------------
// Status helpers
// ---------------------------------------------------------------------------

function statusIcon(status: PublishStatus): string {
  switch (status) {
    case 'publishing': return '●';
    case 'queued':     return '○';
    case 'published':  return '✓';
    case 'failed':     return '✗';
  }
}

function statusLabel(status: PublishStatus): string {
  switch (status) {
    case 'publishing': return 'PUBLISHING';
    case 'queued':     return 'QUEUED';
    case 'published':  return 'PUBLISHED';
    case 'failed':     return 'FAILED';
  }
}

function statusColor(status: PublishStatus): string {
  switch (status) {
    case 'publishing': return '#00f0ff';
    case 'queued':     return '#6a6a7a';
    case 'published':  return '#00ff88';
    case 'failed':     return '#ff00aa';
  }
}

function statusTextClass(status: PublishStatus): string {
  switch (status) {
    case 'publishing': return 'text-neon-cyan';
    case 'queued':     return 'text-secondary';
    case 'published':  return 'text-neon-green';
    case 'failed':     return 'text-neon-magenta';
  }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// --- Stat Card ---

interface StatCardProps {
  label: string;
  value: string | number;
  accent?: string;
  pulse?: boolean;
  icon?: ReactNode;
  subtext?: ReactNode;
}

function StatCard({ label, value, accent, pulse, icon, subtext }: StatCardProps) {
  return (
    <div className="glass-panel hud-corners flex flex-col gap-1 p-3 flex-1 min-w-0">
      <div className="flex items-center gap-1.5">
        {icon && <span className="opacity-60">{icon}</span>}
        <span className="text-[9px] font-sans uppercase tracking-widest text-secondary truncate">
          {label}
        </span>
      </div>
      <div className="flex items-end gap-2">
        <span
          className="text-2xl font-mono font-bold tabular-nums leading-none"
          style={{
            color: accent ?? '#e0e0e8',
            textShadow: accent ? `0 0 10px ${accent}66` : undefined,
            animation: pulse ? 'pulse-fast 1.5s ease-in-out infinite' : undefined,
          }}
        >
          {value}
        </span>
        {subtext && (
          <span className="text-[10px] font-mono text-secondary mb-0.5 leading-none">
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
}

// --- Rate Limit Gauge ---

function RateLimitGauge({ data }: { data: RateLimitData }) {
  const remaining = data.total - data.used;
  const pct = Math.round((remaining / data.total) * 100);
  const color = rateLimitColor(pct);
  const textClass = rateLimitTextClass(pct);
  const filled = Math.round(pct / 8.33); // out of 12 blocks
  const blocks = Array.from({ length: 12 }, (_, i) => i < filled);

  const hrs = Math.floor(data.resetsInMinutes / 60);
  const mins = data.resetsInMinutes % 60;
  const resetLabel = hrs > 0 ? `resets in ${hrs}h ${mins}m` : `resets in ${mins}m`;

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono font-bold text-primary">
          {PLATFORM_LABEL[data.platform]}
        </span>
        <span className={`text-[9px] font-mono tabular-nums ${textClass}`}>
          {remaining}/{data.total} calls
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {/* Block bar */}
        <div className="flex gap-[2px] flex-1">
          {blocks.map((filled, i) => (
            <div
              key={i}
              className="h-[6px] flex-1 rounded-sm transition-all"
              style={{
                backgroundColor: filled ? color : 'rgba(255,255,255,0.06)',
                boxShadow: filled ? `0 0 4px ${color}66` : undefined,
              }}
            />
          ))}
        </div>
        <span className={`text-[9px] font-mono tabular-nums w-[30px] text-right ${textClass}`}>
          {pct}%
        </span>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[9px] font-mono text-secondary">{resetLabel}</span>
      </div>
    </div>
  );
}

// --- Optimal Timing Row ---

function OptimalTimingRow({ platform }: { platform: string }) {
  const now = new Date();
  const currentHour = now.getHours();
  const windows = OPTIMAL_WINDOWS[platform] ?? [];
  const labels = OPTIMAL_WINDOW_LABELS[platform] ?? [];
  const color = PLATFORM_COLOR[platform];

  const isActive = windows.some(([start, end]) => currentHour >= start && currentHour < end);

  return (
    <div className="flex items-start gap-2 py-1">
      <span
        className="text-[10px] font-mono w-[68px] flex-shrink-0 pt-0.5"
        style={{ color }}
      >
        {PLATFORM_LABEL[platform]}
      </span>
      <div className="flex flex-wrap gap-1 flex-1">
        {labels.map((label, i) => {
          const [start, end] = windows[i] ?? [0, 0];
          const windowActive = currentHour >= start && currentHour < end;
          return (
            <span
              key={label}
              className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm border"
              style={{
                borderColor: windowActive ? color : 'rgba(255,255,255,0.1)',
                color: windowActive ? color : '#6a6a7a',
                backgroundColor: windowActive ? `${color}18` : 'transparent',
                boxShadow: windowActive ? `0 0 8px ${color}44` : undefined,
              }}
            >
              {label}
            </span>
          );
        })}
      </div>
      {isActive && (
        <span
          className="text-[8px] font-mono px-1 py-0.5 rounded-sm flex-shrink-0"
          style={{
            color,
            backgroundColor: `${color}22`,
            border: `1px solid ${color}66`,
            boxShadow: `0 0 6px ${color}44`,
          }}
        >
          NOW
        </span>
      )}
    </div>
  );
}

// --- Timeline dot ---

interface TimelineDotProps {
  job: PublishJob;
  leftPct: number;
  clusterOffset: number;
}

function TimelineDot({ job, leftPct, clusterOffset }: TimelineDotProps) {
  const color = PLATFORM_COLOR[job.platform];
  const isPast = job.status === 'published' || job.status === 'failed';
  const isPublishing = job.status === 'publishing';

  return (
    <div
      title={`${job.clientName} — ${PLATFORM_LABEL[job.platform]} — ${job.scheduledTime}`}
      style={{
        position: 'absolute',
        left: `${leftPct}%`,
        bottom: `${14 + clusterOffset * 14}px`,
        transform: 'translateX(-50%)',
        width: '10px',
        height: '10px',
        borderRadius: '50%',
        backgroundColor: isPast ? `${color}55` : color,
        border: `1.5px solid ${isPast ? `${color}44` : color}`,
        boxShadow: isPublishing ? `0 0 10px ${color}, 0 0 20px ${color}66` : isPast ? 'none' : `0 0 6px ${color}88`,
        animation: isPublishing ? 'pulse-fast 1.5s ease-in-out infinite' : undefined,
        cursor: 'default',
        zIndex: clusterOffset + 1,
        transition: 'box-shadow 0.2s',
      }}
    />
  );
}

// ---------------------------------------------------------------------------
// PublishView — main component
// ---------------------------------------------------------------------------

export function PublishView() {
  const [_hoveredJob, setHoveredJob] = useState<number | null>(null);

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  // Timeline: current hour ± 6 hours (12 hours total)
  const timelineStartHour = currentHour - 6;
  const timelineEndHour   = currentHour + 6;
  const totalTimelineMinutes = 12 * 60;

  function toTimelinePct(hour: number, minute: number): number {
    const totalMinutes = (hour - timelineStartHour) * 60 + minute;
    return Math.max(0, Math.min(100, (totalMinutes / totalTimelineMinutes) * 100));
  }

  // NOW marker position
  const nowPct = toTimelinePct(currentHour, currentMinute);

  // Cluster detection: group dots at same approximate position (within 1.5% of timeline width)
  const dotsWithPosition = PUBLISH_JOBS.map(job => ({
    job,
    pct: toTimelinePct(job.scheduledHour, job.scheduledMinute),
  }));

  // Assign cluster offsets
  const clusterMap = new Map<number, number>();
  const sorted = [...dotsWithPosition].sort((a, b) => a.pct - b.pct);
  sorted.forEach(({ pct }, idx) => {
    const nearby = sorted.slice(0, idx).filter(prev => Math.abs(prev.pct - pct) < 1.5);
    clusterMap.set(idx, nearby.length);
  });

  // Timeline hour labels (every 2 hours)
  const timelineHourLabels: Array<{ hour: number; pct: number; label: string }> = [];
  for (let h = timelineStartHour; h <= timelineEndHour; h += 2) {
    const label = h < 0
      ? `${((h % 24) + 24) % 24 % 12 || 12}${h < 0 ? 'AM' : h < 12 ? 'AM' : 'PM'}`
      : (() => {
          const norm = ((h % 24) + 24) % 24;
          const h12 = norm % 12 || 12;
          const ampm = norm < 12 ? 'AM' : 'PM';
          return `${h12}${ampm}`;
        })();
    timelineHourLabels.push({ hour: h, pct: toTimelinePct(h, 0), label });
  }

  return (
    <>
      <style>{`
        @keyframes publishing-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #00f0ff, 0 0 16px #00f0ff44; }
          50%       { opacity: 0.7; box-shadow: 0 0 4px #00f0ff44; }
        }
        @keyframes now-line-glow {
          0%, 100% { box-shadow: 0 0 6px #00f0ff88, 0 0 12px #00f0ff44; }
          50%       { box-shadow: 0 0 10px #00f0ff, 0 0 20px #00f0ff66; }
        }
      `}</style>

      <div className="flex flex-col h-full w-full overflow-hidden bg-void gap-2 p-3">

        {/* ================================================================
            SECTION 1 — Stats Row (5 cards)
        ================================================================ */}
        <div className="flex gap-2 flex-shrink-0">
          <StatCard
            label="Queued to Publish"
            value={STATS.queued}
            icon={<Clock size={11} />}
          />
          <StatCard
            label="Publishing Now"
            value={STATS.publishing}
            accent="#00f0ff"
            pulse
            icon={<Send size={11} style={{ color: '#00f0ff' }} />}
          />
          <StatCard
            label="Published Today"
            value={STATS.publishedToday}
            accent="#00ff88"
            icon={<CheckCircle size={11} style={{ color: '#00ff88' }} />}
          />
          <StatCard
            label="Failed Today"
            value={STATS.failedToday}
            accent={STATS.failedToday > 0 ? '#ff00aa' : '#00ff88'}
            icon={
              STATS.failedToday > 0
                ? <AlertCircle size={11} style={{ color: '#ff00aa' }} />
                : <CheckCircle size={11} style={{ color: '#00ff88' }} />
            }
          />
          <StatCard
            label="Rate Limit Status"
            value={overallRateLimitLabel(OVERALL_RATE_PCT)}
            accent={rateLimitColor(OVERALL_RATE_PCT)}
          />
        </div>

        {/* ================================================================
            SECTION 2 — Main Content (55% / 45% split)
        ================================================================ */}
        <div className="flex gap-2 flex-1 min-h-0 overflow-hidden">

          {/* ---- LEFT: Publish Job Queue (55%) ---- */}
          <div className="glass-panel flex flex-col gap-0 overflow-hidden" style={{ flex: '0 0 55%' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(255,255,255,0.06)] flex-shrink-0">
              <div className="flex items-center gap-2">
                <Send size={12} className="text-neon-cyan" />
                <span className="text-[10px] font-sans uppercase tracking-widest text-neon-cyan">
                  Publish Job Queue
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-mono text-secondary tabular-nums">
                  {PUBLISH_JOBS.length} jobs
                </span>
                <div className="flex items-center gap-1.5 text-[9px] font-mono">
                  <span className="text-neon-cyan">● {STATS.publishing}</span>
                  <span className="text-secondary">○ {STATS.queued}</span>
                  <span className="text-neon-green">✓ {PUBLISH_JOBS.filter(j => j.status === 'published').length}</span>
                  <span className="text-neon-magenta">✗ {PUBLISH_JOBS.filter(j => j.status === 'failed').length}</span>
                </div>
              </div>
            </div>

            {/* Table header */}
            <div
              className="grid text-[8px] font-mono uppercase tracking-widest text-secondary px-3 py-1.5 border-b border-[rgba(255,255,255,0.04)] flex-shrink-0"
              style={{ gridTemplateColumns: '28px 110px 1fr 60px 74px 54px 60px' }}
            >
              <span>#</span>
              <span>STATUS</span>
              <span>CLIENT / CONTENT</span>
              <span>PLATFORM</span>
              <span className="text-center">SCHEDULED</span>
              <span className="text-center">AGENT</span>
              <span className="text-right">ATTEMPTS</span>
            </div>

            {/* Scrollable job rows */}
            <div
              className="flex-1 overflow-y-auto min-h-0"
              style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}
            >
              {PUBLISH_JOBS.map((job, idx) => {
                const color = statusColor(job.status);
                const textClass = statusTextClass(job.status);
                const isPublishing = job.status === 'publishing';

                return (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.025, duration: 0.2, ease: 'easeOut' }}
                    className="grid items-center px-3 py-2 border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(255,255,255,0.025)] transition-colors cursor-default"
                    style={{ gridTemplateColumns: '28px 110px 1fr 60px 74px 54px 60px' }}
                    onMouseEnter={() => setHoveredJob(job.id)}
                    onMouseLeave={() => setHoveredJob(null)}
                  >
                    {/* # */}
                    <span className="text-[9px] font-mono text-muted tabular-nums">{job.id}</span>

                    {/* Status */}
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={`text-[10px] font-mono ${textClass}`}
                        style={{
                          animation: isPublishing ? 'publishing-pulse 1.5s ease-in-out infinite' : undefined,
                        }}
                      >
                        {statusIcon(job.status)}
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold tracking-wide ${textClass} truncate`}
                      >
                        {statusLabel(job.status)}
                      </span>
                    </div>

                    {/* Client / Content */}
                    <div className="flex flex-col gap-0 min-w-0 pr-2">
                      <span className="text-[9px] font-mono text-secondary truncate leading-tight">
                        {job.clientName}
                      </span>
                      <span className="text-[10px] font-sans text-primary truncate leading-tight">
                        "{job.contentPreview}"
                      </span>
                    </div>

                    {/* Platform */}
                    <div className="flex items-center gap-1">
                      <span className="text-[11px]">{PLATFORM_EMOJI[job.platform]}</span>
                      <span
                        className="text-[8px] font-mono"
                        style={{ color: PLATFORM_COLOR[job.platform] }}
                      >
                        {job.platform === 'instagram' ? 'IG' : job.platform.toUpperCase()}
                      </span>
                    </div>

                    {/* Scheduled */}
                    <div className="text-center">
                      <span className="text-[9px] font-mono tabular-nums text-primary">
                        {job.scheduledTime}
                      </span>
                    </div>

                    {/* Agent */}
                    <div className="text-center">
                      <span className="text-[9px] font-mono text-neon-cyan truncate">
                        {job.agentId ?? '—'}
                      </span>
                    </div>

                    {/* Attempts */}
                    <div className="text-right">
                      <span
                        className="text-[9px] font-mono tabular-nums"
                        style={{ color: job.attempts >= job.maxAttempts ? '#ff00aa' : '#6a6a7a' }}
                      >
                        {job.attempts}/{job.maxAttempts}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* ---- RIGHT: Three stacked panels (45%) ---- */}
          <div className="flex flex-col gap-2 flex-1 min-h-0 overflow-hidden">

            {/* Panel A: Platform Rate Limits */}
            <div className="glass-panel hud-corners flex flex-col gap-0 overflow-hidden flex-shrink-0">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[rgba(255,255,255,0.06)]">
                <AlertCircle size={11} className="text-neon-amber" />
                <span className="text-[10px] font-sans uppercase tracking-widest text-neon-amber">
                  Platform Rate Limits
                </span>
              </div>
              <div className="flex flex-col gap-2.5 px-3 py-3">
                {RATE_LIMITS.map(rl => (
                  <RateLimitGauge key={rl.platform} data={rl} />
                ))}
              </div>
            </div>

            {/* Panel B: Platform-Optimal Timing */}
            <div className="glass-panel hud-corners flex flex-col gap-0 overflow-hidden flex-shrink-0">
              <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-2">
                  <Clock size={11} className="text-neon-cyan" />
                  <span className="text-[10px] font-sans uppercase tracking-widest text-neon-cyan">
                    Optimal Post Windows
                  </span>
                </div>
                <span className="text-[8px] font-mono text-secondary">based on engagement data</span>
              </div>
              <div className="flex flex-col px-3 py-1 divide-y divide-[rgba(255,255,255,0.04)]">
                {PLATFORMS.map(p => (
                  <OptimalTimingRow key={p} platform={p} />
                ))}
              </div>
            </div>

            {/* Panel C: Publish Results (last 1h) */}
            <div className="glass-panel hud-corners flex flex-col gap-0 overflow-hidden flex-1 min-h-0">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-[rgba(255,255,255,0.06)]">
                <CheckCircle size={11} className="text-neon-green" />
                <span className="text-[10px] font-sans uppercase tracking-widest text-neon-green">
                  Publish Results
                </span>
                <span className="text-[9px] font-mono text-secondary ml-auto">last 1h</span>
              </div>

              <div className="flex flex-col gap-0 px-3 py-2 flex-1 min-h-0 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>
                {/* Success rate */}
                <div className="flex items-center justify-between py-1.5 border-b border-[rgba(255,255,255,0.04)]">
                  <span className="text-[9px] font-mono text-secondary uppercase tracking-wide">Success Rate</span>
                  <span className="text-[13px] font-mono font-bold text-neon-green tabular-nums"
                    style={{ textShadow: '0 0 8px #00ff8866' }}>
                    97.8%
                  </span>
                </div>

                {/* Sub-stat: 44/45 */}
                <div className="flex items-center justify-between py-1.5 border-b border-[rgba(255,255,255,0.04)]">
                  <span className="text-[9px] font-mono text-secondary uppercase tracking-wide">Jobs Completed</span>
                  <span className="text-[11px] font-mono text-primary tabular-nums">44 / 45</span>
                </div>

                {/* Avg latency */}
                <div className="flex items-center justify-between py-1.5 border-b border-[rgba(255,255,255,0.04)]">
                  <span className="text-[9px] font-mono text-secondary uppercase tracking-wide">Avg Publish Latency</span>
                  <span className="text-[11px] font-mono text-neon-cyan tabular-nums">2.3s</span>
                </div>

                {/* Platform breakdown */}
                <div className="flex flex-col gap-1 py-2 border-b border-[rgba(255,255,255,0.04)]">
                  <span className="text-[8px] font-mono text-secondary uppercase tracking-wide mb-0.5">Platform Breakdown</span>
                  {[
                    { platform: 'x',         count: 12 },
                    { platform: 'linkedin',   count: 10 },
                    { platform: 'facebook',   count: 13 },
                    { platform: 'instagram',  count: 9  },
                  ].map(({ platform, count }) => (
                    <div key={platform} className="flex items-center gap-2">
                      <span className="text-[10px]">{PLATFORM_EMOJI[platform]}</span>
                      <span
                        className="text-[9px] font-mono w-[60px]"
                        style={{ color: PLATFORM_COLOR[platform] }}
                      >
                        {PLATFORM_LABEL[platform]}
                      </span>
                      <div className="flex-1 h-[4px] rounded-sm bg-[rgba(255,255,255,0.05)] overflow-hidden">
                        <div
                          className="h-full rounded-sm"
                          style={{
                            width: `${(count / 13) * 100}%`,
                            backgroundColor: PLATFORM_COLOR[platform],
                            boxShadow: `0 0 4px ${PLATFORM_COLOR[platform]}88`,
                          }}
                        />
                      </div>
                      <span
                        className="text-[9px] font-mono tabular-nums w-[18px] text-right"
                        style={{ color: PLATFORM_COLOR[platform] }}
                      >
                        {count}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Last failure */}
                <div className="flex items-start gap-1.5 py-2">
                  <AlertCircle size={10} className="text-neon-magenta mt-0.5 flex-shrink-0" />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[8px] font-mono text-secondary uppercase tracking-wide">Last Failure</span>
                    <span className="text-[9px] font-mono text-neon-magenta"
                      style={{ textShadow: '0 0 6px #ff00aa44' }}>
                      Rate limit exceeded — Instagram — 14m ago
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ================================================================
            SECTION 3 — Publishing Timeline (12-hour horizontal)
        ================================================================ */}
        <div className="glass-panel hud-corners flex-shrink-0 overflow-hidden" style={{ height: '90px' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-2">
              <Clock size={11} className="text-secondary" />
              <span className="text-[9px] font-sans uppercase tracking-widest text-secondary">
                Publishing Timeline
              </span>
              <span className="text-[8px] font-mono text-muted">
                {(() => {
                  const startH = ((currentHour - 6) % 24 + 24) % 24;
                  const endH = ((currentHour + 6) % 24 + 24) % 24;
                  const fmt = (h: number) => {
                    const h12 = h % 12 || 12;
                    const ap = h < 12 ? 'AM' : 'PM';
                    return `${h12}${ap}`;
                  };
                  return `${fmt(startH)} — ${fmt(endH)}`;
                })()}
              </span>
            </div>
            {/* Platform legend */}
            <div className="flex items-center gap-3">
              {PLATFORMS.map(p => (
                <div key={p} className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: PLATFORM_COLOR[p], boxShadow: `0 0 4px ${PLATFORM_COLOR[p]}88` }}
                  />
                  <span className="text-[8px] font-mono" style={{ color: PLATFORM_COLOR[p] }}>
                    {p === 'instagram' ? 'IG' : p.toUpperCase()}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline track */}
          <div className="relative mx-3" style={{ height: '56px' }}>

            {/* Hour tick marks */}
            {timelineHourLabels.map(({ pct, label }) => (
              <div
                key={label + pct}
                style={{
                  position: 'absolute',
                  left: `${pct}%`,
                  top: 0,
                  bottom: 0,
                  transform: 'translateX(-50%)',
                  width: '1px',
                  backgroundColor: 'rgba(255,255,255,0.05)',
                  zIndex: 0,
                }}
              >
                <span
                  style={{
                    position: 'absolute',
                    bottom: '2px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '8px',
                    fontFamily: 'var(--font-mono)',
                    color: '#334455',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </span>
              </div>
            ))}

            {/* Track baseline */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: '12px',
                height: '1px',
                backgroundColor: 'rgba(255,255,255,0.08)',
              }}
            />

            {/* NOW marker */}
            <div
              style={{
                position: 'absolute',
                left: `${nowPct}%`,
                top: 0,
                bottom: '12px',
                width: '2px',
                transform: 'translateX(-50%)',
                backgroundColor: '#00f0ff',
                zIndex: 10,
                animation: 'now-line-glow 2s ease-in-out infinite',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: '2px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '7px',
                  fontFamily: 'var(--font-mono)',
                  color: '#00f0ff',
                  whiteSpace: 'nowrap',
                  fontWeight: 'bold',
                  textShadow: '0 0 6px #00f0ff',
                  letterSpacing: '0.05em',
                }}
              >
                NOW
              </span>
            </div>

            {/* Publish dots */}
            {sorted.map(({ job, pct }, idx) => (
              <TimelineDot
                key={job.id}
                job={job}
                leftPct={pct}
                clusterOffset={clusterMap.get(idx) ?? 0}
              />
            ))}
          </div>
        </div>

      </div>
    </>
  );
}
