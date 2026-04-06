import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Clock, AlertTriangle } from 'lucide-react';
import { mockClients } from '../lib/mock';

// ---------------------------------------------------------------------------
// Design tokens
// ---------------------------------------------------------------------------

const C = {
  cyan:    '#00f0ff',
  magenta: '#ff00aa',
  green:   '#00ff88',
  amber:   '#ffaa00',
  blue:    '#0088ff',
  void:    '#0a0a0f',
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Priority = 'P1' | 'P2' | 'P3';
type Platform = 'x' | 'linkedin' | 'facebook' | 'instagram';
type SlaStatus = 'ok' | 'at-risk' | 'overdue';
type ReviewAction = 'approved' | 'rejected';

interface ApprovalItem {
  id: string;
  priority: Priority;
  clientName: string;
  platform: Platform;
  contentPreview: string;
  agentId: string;
  slaMinutesRemaining: number; // negative = overdue
  slaStatus: SlaStatus;
}

interface ReviewEvent {
  id: string;
  action: ReviewAction;
  clientName: string;
  platform: Platform;
  reviewer: string;
  offsetMs: number;
  rejectReason?: string;
}

// ---------------------------------------------------------------------------
// Mock data helpers
// ---------------------------------------------------------------------------

function platformIcon(p: Platform): string {
  switch (p) {
    case 'x':         return '🐦';
    case 'linkedin':  return '💼';
    case 'facebook':  return '📘';
    case 'instagram': return '📷';
  }
}

function platformLabel(p: Platform): string {
  switch (p) {
    case 'x':         return 'X (Twitter)';
    case 'linkedin':  return 'LinkedIn';
    case 'facebook':  return 'Facebook';
    case 'instagram': return 'Instagram';
  }
}

function seeded(seed: number, min: number, max: number): number {
  const v = ((seed * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;
  return Math.floor(min + v * (max - min + 1));
}

function pick<T>(arr: T[], seed: number): T {
  return arr[seeded(seed, 0, arr.length - 1)];
}

// ---------------------------------------------------------------------------
// Content previews for approval queue
// ---------------------------------------------------------------------------

const CONTENT_PREVIEWS: string[] = [
  "Excited to announce our Q2 results! Revenue growth of 23% YoY demonstrates our unwavering commitment to...",
  "5 strategies every B2B marketer needs in 2026: 1. AI-driven personalization at scale. 2. Intent signal mapping...",
  "Summer collection dropping this Friday! Get early access with code SUMMER26 — limited quantities, don't miss...",
  "We've been quietly rebuilding our infrastructure for 18 months. Today we're sharing what we learned and why...",
  "The market shifted faster than anyone predicted. Here's our unfiltered take on what Q3 holds for the industry...",
  "Customer spotlight: how Meridian reduced onboarding time by 60% using our automated workflow suite. Full case...",
  "Hot take: most enterprise software is designed for demos, not daily use. We built ours the other way around...",
  "Thrilled to welcome our new VP of Product, Jordan Harley, to the team. A seasoned builder with a track record...",
  "Your weekend reading list — 4 long-form pieces on the future of work, AI governance, and brand storytelling...",
  "We asked 500 marketing leaders what keeps them up at night. The #1 answer surprised us. Full findings inside...",
  "Q2 product updates are live. Faster pipelines, smarter scheduling, and a completely redesigned analytics dashb...",
  "The brands winning on LinkedIn aren't posting more. They're posting with more precision. Here's the framework...",
  "Behind the scenes: our creative process for high-volume content that still feels human. No shortcuts, just sys...",
  "A candid note from our founder on where we've been and where we're heading in the second half of 2026...",
  "Fall campaign brief is ready — reaching 4 key audience segments across 3 platforms with a unified message...",
];

const CLIENTS_SUBSET = mockClients.slice(0, 15);
const PLATFORMS: Platform[] = ['x', 'linkedin', 'facebook', 'instagram'];

function buildSlaStatus(mins: number): SlaStatus {
  if (mins < 0)  return 'overdue';
  if (mins < 60) return 'at-risk';
  return 'ok';
}

// 15 approval queue items — deterministic, varied priorities/platforms/SLAs
const INITIAL_QUEUE: ApprovalItem[] = Array.from({ length: 15 }, (_, i) => {
  const client   = CLIENTS_SUBSET[i];
  const platform = pick(PLATFORMS, i * 7 + 3) as Platform;
  const priority = pick(['P1', 'P1', 'P2', 'P2', 'P2', 'P3', 'P3', 'P3'] as Priority[], i * 13);
  const agentNum = String(seeded(i * 17 + 5, 1, 50)).padStart(2, '0');
  const agentId  = `cw-${agentNum}`;

  // SLA minutes: some urgent/overdue, most normal
  const slaMinutesRemaining =
    i === 0  ? -23          // overdue
    : i === 3  ? 18         // at-risk
    : i === 7  ? 42         // at-risk
    : i === 11 ? -5         // overdue
    : i === 2  ? 28         // at-risk (P1)
    : seeded(i * 31 + 9, 65, 240); // ok range

  return {
    id:                  `approval-${String(i + 1).padStart(2, '0')}`,
    priority,
    clientName:          client.name,
    platform,
    contentPreview:      CONTENT_PREVIEWS[i],
    agentId,
    slaMinutesRemaining,
    slaStatus:           buildSlaStatus(slaMinutesRemaining),
  };
});

// ---------------------------------------------------------------------------
// Review activity feed (last 10 events)
// ---------------------------------------------------------------------------


const REVIEW_FEED: ReviewEvent[] = [
  { id: 'rf-01', action: 'approved', clientName: 'Apex Digital',        platform: 'linkedin',  reviewer: 'operator', offsetMs: 3 * 60_000,   },
  { id: 'rf-02', action: 'rejected', clientName: 'Harbor & Co.',        platform: 'instagram', reviewer: 'sarah.m',  offsetMs: 8 * 60_000,   rejectReason: 'Off-brand imagery'       },
  { id: 'rf-03', action: 'approved', clientName: 'Vantage Cloud',       platform: 'x',         reviewer: 'operator', offsetMs: 12 * 60_000,  },
  { id: 'rf-04', action: 'rejected', clientName: 'Solstice Capital',    platform: 'linkedin',  reviewer: 'alex.k',   offsetMs: 19 * 60_000,  rejectReason: 'Missing disclaimer'      },
  { id: 'rf-05', action: 'approved', clientName: 'Summit Goods',        platform: 'facebook',  reviewer: 'operator', offsetMs: 27 * 60_000,  },
  { id: 'rf-06', action: 'approved', clientName: 'Bellwether Hotels',   platform: 'instagram', reviewer: 'sarah.m',  offsetMs: 34 * 60_000,  },
  { id: 'rf-07', action: 'rejected', clientName: 'Ironbridge Finance',  platform: 'linkedin',  reviewer: 'dev.ops',  offsetMs: 41 * 60_000,  rejectReason: 'Legal review required'   },
  { id: 'rf-08', action: 'approved', clientName: 'Crestline Software',  platform: 'x',         reviewer: 'operator', offsetMs: 55 * 60_000,  },
  { id: 'rf-09', action: 'approved', clientName: 'Cascade Resorts',     platform: 'facebook',  reviewer: 'alex.k',   offsetMs: 68 * 60_000,  },
  { id: 'rf-10', action: 'rejected', clientName: 'Pinnacle Market',     platform: 'instagram', reviewer: 'sarah.m',  offsetMs: 79 * 60_000,  rejectReason: 'Tone too casual'         },
];

// ---------------------------------------------------------------------------
// Trend bar data (7 days Mon–Sun)
// ---------------------------------------------------------------------------

interface DayTrend {
  label: string;
  approved: number;
  rejected: number;
}

const TREND_DATA: DayTrend[] = [
  { label: 'Mon', approved: 38, rejected: 3  },
  { label: 'Tue', approved: 44, rejected: 5  },
  { label: 'Wed', approved: 51, rejected: 4  },
  { label: 'Thu', approved: 39, rejected: 7  },
  { label: 'Fri', approved: 47, rejected: 2  },
  { label: 'Sat', approved: 29, rejected: 1  },
  { label: 'Sun', approved: 42, rejected: 3  },
];

// ---------------------------------------------------------------------------
// Relative time helper
// ---------------------------------------------------------------------------

function relativeTime(offsetMs: number): string {
  const mins = Math.round(offsetMs / 60_000);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

function formatSla(mins: number): string {
  if (mins < 0) {
    const abs = Math.abs(mins);
    if (abs < 60) return `${abs}m overdue`;
    return `${Math.floor(abs / 60)}h ${abs % 60}m overdue`;
  }
  if (mins < 60) return `${mins}m remaining`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${m}m remaining`;
}

// ---------------------------------------------------------------------------
// Priority badge
// ---------------------------------------------------------------------------

function priorityColor(p: Priority): string {
  switch (p) {
    case 'P1': return C.magenta;
    case 'P2': return C.amber;
    case 'P3': return C.cyan;
  }
}

// ---------------------------------------------------------------------------
// SLA color
// ---------------------------------------------------------------------------

function slaColor(s: SlaStatus): string {
  switch (s) {
    case 'ok':       return C.green;
    case 'at-risk':  return C.amber;
    case 'overdue':  return C.magenta;
  }
}

// ---------------------------------------------------------------------------
// Stat Card
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string;
  sub: string;
  valueColor: string;
}

function StatCard({ label, value, sub, valueColor }: StatCardProps) {
  return (
    <div
      className="flex flex-col gap-1 p-4 rounded"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <span className="font-mono text-[10px] tracking-widest text-[#6a6a7a] uppercase">{label}</span>
      <span className="font-mono text-2xl font-bold tabular-nums leading-none" style={{ color: valueColor }}>
        {value}
      </span>
      <span className="font-mono text-[11px] text-[#4a4a5a]">{sub}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Reject reason modal
// ---------------------------------------------------------------------------

const PREDEFINED_REASONS = [
  'Off-brand imagery',
  'Tone too casual',
  'Unverified statistic',
  'Competitor mention',
  'Missing disclaimer',
  'Legal review required',
  'Factual error',
  'Other',
];

interface RejectModalProps {
  itemId: string;
  clientName: string;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}

function RejectModal({ clientName, onConfirm, onCancel }: RejectModalProps) {
  const [selected, setSelected] = useState<string>('Off-brand imagery');
  const [custom, setCustom]     = useState('');

  const finalReason = selected === 'Other' && custom.trim() ? custom.trim() : selected;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ duration: 0.15 }}
        onClick={e => e.stopPropagation()}
        className="rounded flex flex-col gap-4"
        style={{
          width: 380,
          background: '#12121f',
          border: `1px solid ${C.magenta}`,
          boxShadow: `0 0 32px rgba(255,0,170,0.25)`,
          padding: 24,
        }}
      >
        <div className="flex items-center gap-2">
          <X size={14} color={C.magenta} />
          <span className="font-mono text-[11px] tracking-widest text-[#ff00aa] uppercase">
            Reject Content
          </span>
        </div>
        <p className="font-mono text-[11px] text-[#8a8a9a]">
          <span style={{ color: C.cyan }}>{clientName}</span> — select a reason:
        </p>
        <div className="flex flex-col gap-1.5">
          {PREDEFINED_REASONS.map(r => (
            <button
              key={r}
              onClick={() => setSelected(r)}
              className="text-left px-3 py-1.5 rounded transition-all duration-100"
              style={{
                background:   selected === r ? `rgba(255,0,170,0.15)` : 'rgba(255,255,255,0.03)',
                border:       `1px solid ${selected === r ? C.magenta : 'rgba(255,255,255,0.07)'}`,
                color:        selected === r ? C.magenta : '#8a8a9a',
                fontFamily:   'monospace',
                fontSize:     11,
              }}
            >
              {r}
            </button>
          ))}
        </div>
        {selected === 'Other' && (
          <input
            autoFocus
            value={custom}
            onChange={e => setCustom(e.target.value)}
            placeholder="Describe the issue..."
            className="px-3 py-2 rounded bg-transparent text-[11px] font-mono outline-none"
            style={{
              border: `1px solid ${C.magenta}`,
              color:  '#e0e0f0',
            }}
          />
        )}
        <div className="flex gap-2 mt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded font-mono text-[11px] tracking-widest uppercase transition-all"
            style={{
              background: 'transparent',
              border:     '1px solid rgba(255,255,255,0.1)',
              color:      '#6a6a7a',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(finalReason)}
            className="flex-1 py-2 rounded font-mono text-[11px] tracking-widest uppercase transition-all"
            style={{
              background: 'rgba(255,0,170,0.15)',
              border:     `1px solid ${C.magenta}`,
              color:      C.magenta,
            }}
          >
            Confirm Reject
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Approval Queue Item Card
// ---------------------------------------------------------------------------

interface QueueCardProps {
  item: ApprovalItem;
  onApprove: (id: string) => void;
  onReject:  (id: string) => void;
}

function QueueCard({ item, onApprove, onReject }: QueueCardProps) {
  const [expanded, setExpanded] = useState(false);

  const pColor  = priorityColor(item.priority);
  const sColor  = slaColor(item.slaStatus);
  const isOverdue = item.slaStatus === 'overdue';
  const previewTrunc = item.contentPreview.length > 80
    ? item.contentPreview.slice(0, 80) + '…'
    : item.contentPreview;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40, transition: { duration: 0.22 } }}
      transition={{ duration: 0.2 }}
      className="rounded cursor-pointer select-none"
      style={{
        background:    'rgba(255,255,255,0.02)',
        border:        '1px solid rgba(255,255,255,0.07)',
        borderLeft:    `3px solid ${pColor}`,
        boxShadow:     isOverdue ? `0 0 12px rgba(255,0,170,0.15)` : undefined,
      }}
      onClick={() => setExpanded(v => !v)}
    >
      {/* Collapsed row */}
      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Priority badge */}
        <span
          className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-sm flex-shrink-0"
          style={{
            color:      pColor,
            background: `${pColor}22`,
            border:     `1px solid ${pColor}55`,
          }}
        >
          {item.priority}
        </span>

        {/* Platform icon + client */}
        <div className="flex items-center gap-1.5 min-w-0 flex-shrink-0" style={{ width: 140 }}>
          <span className="text-[13px] leading-none">{platformIcon(item.platform)}</span>
          <span className="font-mono text-[11px] text-[#c0c0d0] truncate">{item.clientName}</span>
        </div>

        {/* Content preview */}
        <span className="font-mono text-[11px] text-[#6a6a7a] truncate flex-1 min-w-0">
          {previewTrunc}
        </span>

        {/* SLA countdown */}
        <div className="flex items-center gap-1 flex-shrink-0" style={{ minWidth: 120 }}>
          {isOverdue
            ? <AlertTriangle size={11} color={sColor} />
            : <Clock size={11} color={sColor} />
          }
          <span
            className="font-mono text-[10px] tabular-nums"
            style={{
              color:      sColor,
              animation:  isOverdue ? 'sla-pulse 1.1s ease-in-out infinite' : undefined,
            }}
          >
            {formatSla(item.slaMinutesRemaining)}
          </span>
        </div>

        {/* Agent */}
        <span className="font-mono text-[10px] text-[#4a4a5a] flex-shrink-0" style={{ width: 48 }}>
          {item.agentId}
        </span>

        {/* Action buttons — stop propagation so row click doesn't toggle expand */}
        <div
          className="flex gap-1.5 flex-shrink-0"
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => onApprove(item.id)}
            className="flex items-center gap-1 px-2 py-1 rounded font-mono text-[10px] tracking-wider uppercase transition-all duration-150 hover:bg-[rgba(0,255,136,0.15)]"
            style={{
              border: `1px solid ${C.green}`,
              color:  C.green,
            }}
            title="Approve"
          >
            <Check size={11} />
            <span>Approve</span>
          </button>
          <button
            onClick={() => onReject(item.id)}
            className="flex items-center gap-1 px-2 py-1 rounded font-mono text-[10px] tracking-wider uppercase transition-all duration-150 hover:bg-[rgba(255,0,170,0.15)]"
            style={{
              border: `1px solid ${C.magenta}`,
              color:  C.magenta,
            }}
            title="Reject"
          >
            <X size={11} />
            <span>Reject</span>
          </button>
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="expanded"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              className="px-4 py-3 flex flex-col gap-2"
              style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex gap-4 text-[11px] font-mono">
                <span style={{ color: '#6a6a7a' }}>PLATFORM</span>
                <span style={{ color: C.cyan }}>{platformLabel(item.platform)}</span>
              </div>
              <div className="flex gap-4 text-[11px] font-mono">
                <span style={{ color: '#6a6a7a' }}>AGENT</span>
                <span style={{ color: C.cyan }}>{item.agentId}</span>
              </div>
              <div className="flex gap-4 text-[11px] font-mono">
                <span style={{ color: '#6a6a7a' }}>SLA TARGET</span>
                <span style={{ color: '#8a8a9a' }}>
                  {item.priority === 'P1' ? '30 min' : item.priority === 'P2' ? '2 hours' : '4 hours'}
                </span>
              </div>
              <p className="font-mono text-[11px] text-[#a0a0b0] leading-relaxed mt-1">
                {item.contentPreview}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Review Activity Feed Panel
// ---------------------------------------------------------------------------

function ReviewFeed({ extraEvents }: { extraEvents: ReviewEvent[] }) {
  const allEvents = [...extraEvents, ...REVIEW_FEED].slice(0, 10);

  return (
    <div
      className="flex flex-col rounded"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border:     '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="font-mono text-[10px] tracking-widest text-[#00f0ff] uppercase">
          Review Activity
        </span>
        <span className="font-mono text-[9px] text-[#4a4a5a]">Last 10 actions</span>
      </div>

      <div className="flex flex-col divide-y divide-[rgba(255,255,255,0.04)]">
        {allEvents.map(ev => {
          const isApprove = ev.action === 'approved';
          const icon      = isApprove
            ? <Check size={11} color={C.green} />
            : <X size={11} color={C.magenta} />;
          const accentColor = isApprove ? C.green : C.magenta;

          return (
            <div key={ev.id} className="flex items-start gap-2.5 px-3 py-2">
              <div className="flex-shrink-0 mt-0.5">{icon}</div>
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <span
                    className="font-mono text-[11px] font-medium capitalize"
                    style={{ color: accentColor }}
                  >
                    {ev.action}
                  </span>
                  <span className="font-mono text-[11px] text-[#c0c0d0]">
                    {ev.clientName}
                  </span>
                  <span className="font-mono text-[10px] text-[#6a6a7a]">
                    {platformIcon(ev.platform)} {platformLabel(ev.platform)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[#4a4a5a]">
                    by {ev.reviewer}
                  </span>
                  {ev.rejectReason && (
                    <span className="font-mono text-[10px] text-[#ff00aa]">
                      &ldquo;{ev.rejectReason}&rdquo;
                    </span>
                  )}
                  <span className="font-mono text-[9px] text-[#3a3a4a] ml-auto flex-shrink-0">
                    {relativeTime(ev.offsetMs)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SLA Compliance Panel
// ---------------------------------------------------------------------------

function SlaPanel({ queue }: { queue: ApprovalItem[] }) {
  const total    = queue.length;
  const within   = queue.filter(i => i.slaStatus === 'ok').length;
  const atRisk   = queue.filter(i => i.slaStatus === 'at-risk').length;
  const overdue  = queue.filter(i => i.slaStatus === 'overdue').length;

  const pct = (n: number) => total > 0 ? Math.round((n / total) * 100) : 0;

  const rows: { label: string; count: number; total: number; color: string }[] = [
    { label: 'WITHIN SLA', count: within,  total, color: C.green   },
    { label: 'AT RISK',    count: atRisk,  total, color: C.amber   },
    { label: 'OVERDUE',    count: overdue, total, color: C.magenta },
  ];

  return (
    <div
      className="flex flex-col rounded"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border:     '1px solid rgba(255,255,255,0.07)',
      }}
    >
      <div
        className="px-3 py-2 flex items-center justify-between"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <span className="font-mono text-[10px] tracking-widest text-[#00f0ff] uppercase">
          SLA Compliance
        </span>
        <span
          className="font-mono text-[9px] px-1.5 py-0.5 rounded-sm"
          style={{
            background: 'rgba(0,255,136,0.1)',
            border:     '1px solid rgba(0,255,136,0.25)',
            color:      C.green,
          }}
        >
          {pct(within)}% healthy
        </span>
      </div>

      <div className="flex flex-col gap-3 p-3">
        {rows.map(row => (
          <div key={row.label} className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] tracking-widest" style={{ color: row.color }}>
                {row.label}
              </span>
              <span className="font-mono text-[10px] tabular-nums text-[#8a8a9a]">
                {row.count}/{row.total} ({pct(row.count)}%)
              </span>
            </div>
            <div
              className="w-full rounded-full"
              style={{ height: 6, background: 'rgba(255,255,255,0.06)' }}
            >
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${pct(row.count)}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                style={{
                  background: row.color,
                  boxShadow:  `0 0 6px ${row.color}66`,
                }}
              />
            </div>
          </div>
        ))}

        {/* Avg review time */}
        <div
          className="flex items-center justify-between pt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span className="font-mono text-[10px] text-[#6a6a7a] tracking-wider uppercase">
            Avg Review Time
          </span>
          <span className="font-mono text-[15px] font-bold tabular-nums" style={{ color: C.cyan }}>
            4.2 <span className="text-[11px] font-normal text-[#6a6a7a]">min</span>
          </span>
        </div>

        {/* SLA targets */}
        <div
          className="flex flex-col gap-1 pt-2"
          style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
        >
          <span className="font-mono text-[9px] text-[#4a4a5a] uppercase tracking-widest mb-1">
            SLA Targets
          </span>
          {[
            { p: 'P1', sla: '30 min', color: C.magenta },
            { p: 'P2', sla: '2 hours', color: C.amber  },
            { p: 'P3', sla: '4 hours', color: C.cyan   },
          ].map(row => (
            <div key={row.p} className="flex items-center justify-between">
              <span
                className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-sm"
                style={{
                  color:      row.color,
                  background: `${row.color}22`,
                  border:     `1px solid ${row.color}55`,
                }}
              >
                {row.p}
              </span>
              <span className="font-mono text-[10px] text-[#8a8a9a]">within {row.sla}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Trend bar chart (7 days)
// ---------------------------------------------------------------------------

function TrendChart() {
  const maxTotal = Math.max(...TREND_DATA.map(d => d.approved + d.rejected));

  return (
    <div
      className="rounded flex flex-col"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border:     '1px solid rgba(255,255,255,0.07)',
        padding:    '12px 16px',
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="font-mono text-[10px] tracking-widest text-[#00f0ff] uppercase">
          Approval Rate Trend — 7 Days
        </span>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: C.green }} />
            <span className="font-mono text-[10px] text-[#6a6a7a]">Approved</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: C.magenta }} />
            <span className="font-mono text-[10px] text-[#6a6a7a]">Rejected</span>
          </div>
        </div>
      </div>

      <div className="flex items-end gap-2 h-[80px]">
        {TREND_DATA.map(day => {
          const total      = day.approved + day.rejected;
          const totalPct   = maxTotal > 0 ? (total / maxTotal) * 100 : 0;
          const approvePct = total > 0 ? (day.approved / total) * 100 : 0;
          const rejectPct  = total > 0 ? (day.rejected / total) * 100 : 0;
          const barH       = Math.round((totalPct / 100) * 72); // max 72px

          return (
            <div key={day.label} className="flex flex-col items-center gap-1 flex-1 min-w-0">
              {/* Bar */}
              <div
                className="w-full flex flex-col-reverse rounded-t overflow-hidden"
                style={{ height: barH, minHeight: 4 }}
                title={`${day.label}: ${day.approved} approved, ${day.rejected} rejected`}
              >
                {/* Approved (bottom portion) */}
                <div
                  style={{
                    height:     `${approvePct}%`,
                    background: C.green,
                    boxShadow:  `0 0 4px ${C.green}66`,
                    minHeight:  2,
                  }}
                />
                {/* Rejected (top portion) */}
                <div
                  style={{
                    height:     `${rejectPct}%`,
                    background: C.magenta,
                    boxShadow:  `0 0 4px ${C.magenta}66`,
                    minHeight:  day.rejected > 0 ? 2 : 0,
                  }}
                />
              </div>
              {/* Day label */}
              <span className="font-mono text-[9px] text-[#4a4a5a] uppercase">{day.label}</span>
              {/* Total count */}
              <span className="font-mono text-[9px] text-[#6a6a7a] tabular-nums">{total}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// ApprovalsView — main export
// ---------------------------------------------------------------------------

export function ApprovalsView() {
  const [queue, setQueue]             = useState<ApprovalItem[]>(INITIAL_QUEUE);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [liveEvents, setLiveEvents]   = useState<ReviewEvent[]>([]);

  // Stat calculations
  const pendingCount  = queue.length;
  const urgentCount   = queue.filter(i => i.priority === 'P1').length;
  const approvedToday = 42;
  const rejectedToday = 3;
  const totalReviewed = approvedToday + rejectedToday;
  const rejectedRate  = totalReviewed > 0 ? ((rejectedToday / totalReviewed) * 100).toFixed(1) : '0.0';

  const pendingColor =
    pendingCount > 20 ? C.magenta :
    pendingCount > 10 ? C.amber :
    C.cyan;

  const rejectRateColor =
    parseFloat(rejectedRate) > 10 ? C.magenta :
    parseFloat(rejectedRate) >= 5  ? C.amber :
    C.green;

  // Approve handler
  function handleApprove(id: string) {
    const item = queue.find(i => i.id === id);
    if (!item) return;

    const ev: ReviewEvent = {
      id:         `live-approve-${Date.now()}`,
      action:     'approved',
      clientName: item.clientName,
      platform:   item.platform,
      reviewer:   'operator',
      offsetMs:   0,
    };
    setLiveEvents(prev => [ev, ...prev]);
    setQueue(prev => prev.filter(i => i.id !== id));
  }

  // Reject handler — opens modal
  function handleRejectInit(id: string) {
    setRejectingId(id);
  }

  function handleRejectConfirm(reason: string) {
    if (!rejectingId) return;
    const item = queue.find(i => i.id === rejectingId);
    if (!item) return;

    const ev: ReviewEvent = {
      id:           `live-reject-${Date.now()}`,
      action:       'rejected',
      clientName:   item.clientName,
      platform:     item.platform,
      reviewer:     'operator',
      offsetMs:     0,
      rejectReason: reason,
    };
    setLiveEvents(prev => [ev, ...prev]);
    setQueue(prev => prev.filter(i => i.id !== rejectingId));
    setRejectingId(null);
  }

  const rejectingItem = rejectingId ? queue.find(i => i.id === rejectingId) : null;

  return (
    <>
      {/* Inject keyframes */}
      <style>{`
        @keyframes sla-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>

      {/* Reject modal */}
      <AnimatePresence>
        {rejectingItem && (
          <RejectModal
            key="reject-modal"
            itemId={rejectingItem.id}
            clientName={rejectingItem.clientName}
            onConfirm={handleRejectConfirm}
            onCancel={() => setRejectingId(null)}
          />
        )}
      </AnimatePresence>

      {/* Page layout */}
      <div
        className="flex flex-col h-full w-full overflow-y-auto"
        style={{
          background: C.void,
          padding:    '20px 24px',
          gap:        16,
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.08) transparent',
        }}
      >

        {/* ----------------------------------------------------------------- */}
        {/* Section 1: Stat cards                                              */}
        {/* ----------------------------------------------------------------- */}
        <div className="grid grid-cols-4 gap-3 flex-shrink-0">
          <StatCard
            label="Pending Review"
            value={String(pendingCount)}
            sub={`${urgentCount} urgent (P1)`}
            valueColor={pendingColor}
          />
          <StatCard
            label="Approved Today"
            value={String(approvedToday)}
            sub="▲ +8 vs avg"
            valueColor={C.green}
          />
          <StatCard
            label="Rejected Today"
            value={String(rejectedToday)}
            sub={`${rejectedRate}% rate`}
            valueColor={rejectRateColor}
          />
          <StatCard
            label="Avg Review Time"
            value="4.2 min"
            sub="▼ -1.1m vs 7d avg"
            valueColor={C.cyan}
          />
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Section 2: Main content (65/35 split)                              */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex gap-4 flex-shrink-0" style={{ minHeight: 0 }}>

          {/* Left: Approval Queue (65%) */}
          <div className="flex flex-col" style={{ flex: '0 0 65%', minWidth: 0 }}>
            <div
              className="rounded flex flex-col"
              style={{
                background: 'rgba(255,255,255,0.015)',
                border:     '1px solid rgba(255,255,255,0.07)',
              }}
            >
              {/* Queue header */}
              <div
                className="px-3 py-2 flex items-center justify-between flex-shrink-0"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
              >
                <span className="font-mono text-[10px] tracking-widest text-[#00f0ff] uppercase">
                  Approval Queue
                </span>
                <div className="flex items-center gap-2">
                  <span
                    className="font-mono text-[9px] px-2 py-0.5 rounded-sm tabular-nums"
                    style={{
                      background: pendingCount > 10 ? `${pendingColor}22` : 'rgba(255,255,255,0.05)',
                      border:     `1px solid ${pendingCount > 10 ? `${pendingColor}55` : 'rgba(255,255,255,0.1)'}`,
                      color:      pendingColor,
                    }}
                  >
                    {pendingCount} pending
                  </span>
                </div>
              </div>

              {/* Queue list */}
              <div
                className="flex flex-col gap-1 p-2 overflow-y-auto"
                style={{
                  maxHeight:     560,
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(255,255,255,0.08) transparent',
                }}
              >
                <AnimatePresence mode="popLayout">
                  {queue.length === 0 ? (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-12 gap-2"
                    >
                      <Check size={24} color={C.green} />
                      <span className="font-mono text-[11px] text-[#4a4a5a] tracking-widest uppercase">
                        Queue Clear
                      </span>
                    </motion.div>
                  ) : (
                    queue.map(item => (
                      <QueueCard
                        key={item.id}
                        item={item}
                        onApprove={handleApprove}
                        onReject={handleRejectInit}
                      />
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right column: stacked panels (35%) */}
          <div className="flex flex-col gap-3" style={{ flex: '0 0 35%', minWidth: 0 }}>
            {/* Panel A: Review Feed */}
            <ReviewFeed extraEvents={liveEvents} />
            {/* Panel B: SLA Compliance */}
            <SlaPanel queue={queue} />
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Section 3: Trend chart                                             */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex-shrink-0">
          <TrendChart />
        </div>

      </div>
    </>
  );
}
