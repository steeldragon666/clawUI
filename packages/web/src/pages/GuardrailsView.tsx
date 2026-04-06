import { motion } from 'framer-motion';
import { mockClients } from '../lib/mock';

// ---------------------------------------------------------------------------
// Design tokens (inline where Tailwind class won't reach)
// ---------------------------------------------------------------------------

const COLORS = {
  cyan:    '#00f0ff',
  magenta: '#ff00aa',
  green:   '#00ff88',
  amber:   '#ffaa00',
  blue:    '#0088ff',
} as const;

// ---------------------------------------------------------------------------
// Rail type definitions
// ---------------------------------------------------------------------------

type RailType = 'INPUT' | 'DIALOG' | 'RETRIEVAL' | 'EXECUTION' | 'OUTPUT';

interface RailTypeMeta {
  label: string;
  color: string;
  textClass: string;
  bgClass: string;
  borderColor: string;
}

const RAIL_META: Record<RailType, RailTypeMeta> = {
  INPUT:     { label: 'Input Rails',     color: COLORS.cyan,    textClass: 'text-neon-cyan',    bgClass: 'bg-[rgba(0,240,255,0.12)]',   borderColor: COLORS.cyan    },
  DIALOG:    { label: 'Dialog Rails',    color: COLORS.blue,    textClass: 'text-[#0088ff]',    bgClass: 'bg-[rgba(0,136,255,0.12)]',   borderColor: COLORS.blue    },
  RETRIEVAL: { label: 'Retrieval Rails', color: COLORS.green,   textClass: 'text-neon-green',   bgClass: 'bg-[rgba(0,255,136,0.12)]',   borderColor: COLORS.green   },
  EXECUTION: { label: 'Execution Rails', color: COLORS.amber,   textClass: 'text-neon-amber',   bgClass: 'bg-[rgba(255,170,0,0.12)]',   borderColor: COLORS.amber   },
  OUTPUT:    { label: 'Output Rails',    color: COLORS.magenta, textClass: 'text-neon-magenta', bgClass: 'bg-[rgba(255,0,170,0.12)]',   borderColor: COLORS.magenta },
};

// ---------------------------------------------------------------------------
// Section 1: Rail stats mock data
// ---------------------------------------------------------------------------

interface RailStat {
  type: RailType;
  checked: number;
  blocked: number;
  blockedLabel: string;
  passRate: number;
}

const RAIL_STATS: RailStat[] = [
  { type: 'INPUT',     checked: 1247, blocked: 23,  blockedLabel: '23 blocked',   passRate: 98.2 },
  { type: 'DIALOG',    checked: 892,  blocked: 15,  blockedLabel: '15 modified',  passRate: 98.3 },
  { type: 'RETRIEVAL', checked: 2103, blocked: 8,   blockedLabel: '8 filtered',   passRate: 99.6 },
  { type: 'EXECUTION', checked: 567,  blocked: 3,   blockedLabel: '3 rejected',   passRate: 99.5 },
  { type: 'OUTPUT',    checked: 1891, blocked: 47,  blockedLabel: '47 blocked',   passRate: 97.5 },
];

// ---------------------------------------------------------------------------
// Section 2-Left: Activity feed mock data
// ---------------------------------------------------------------------------

type Severity = 'block' | 'modify' | 'info';

interface FeedEvent {
  id: string;
  railType: RailType;
  severity: Severity;
  message: string;
  agentId: string;
  clientName: string;
  offsetMs: number;
}

const FEED_EVENTS: FeedEvent[] = [
  { id: 'fe-01', railType: 'OUTPUT',     severity: 'block',  message: 'Brand voice violation blocked — tone too casual for finance client',                       agentId: 'cw-03',  clientName: 'Apex Digital',          offsetMs: 42_000      },
  { id: 'fe-02', railType: 'INPUT',      severity: 'modify', message: 'PII detected and masked — SSN pattern removed from prompt input',                         agentId: 'cw-11',  clientName: 'Solstice Capital',       offsetMs: 95_000      },
  { id: 'fe-03', railType: 'EXECUTION',  severity: 'block',  message: 'Unauthorized API endpoint blocked — attempted access to internal HR system',              agentId: 'pub-12', clientName: 'Meridian Systems',       offsetMs: 134_000     },
  { id: 'fe-04', railType: 'DIALOG',     severity: 'modify', message: 'Off-topic request redirected — political discussion steered back to content task',         agentId: 'cw-07',  clientName: 'Harbor & Co.',           offsetMs: 201_000     },
  { id: 'fe-05', railType: 'RETRIEVAL',  severity: 'block',  message: 'Competitor content filtered — prevented use of rival brand copyrighted material',         agentId: 'res-04', clientName: 'Vantage Cloud',          offsetMs: 267_000     },
  { id: 'fe-06', railType: 'OUTPUT',     severity: 'block',  message: 'Hallucination detected — fact-check failed on revenue claim, content held for review',    agentId: 'cw-02',  clientName: 'Granite Wealth',         offsetMs: 310_000     },
  { id: 'fe-07', railType: 'INPUT',      severity: 'block',  message: 'Prompt injection attempt detected — adversarial instruction sequence neutralized',        agentId: 'cw-19',  clientName: 'Ironbridge Finance',      offsetMs: 388_000     },
  { id: 'fe-08', railType: 'OUTPUT',     severity: 'modify', message: 'Compliance flag raised — disclaimer appended to financial performance claim',             agentId: 'cw-05',  clientName: 'Oakhurst Advisors',      offsetMs: 445_000     },
  { id: 'fe-09', railType: 'EXECUTION',  severity: 'block',  message: 'Rate-limited API call intercepted — request queued to avoid quota exhaustion',           agentId: 'pub-08', clientName: 'Summit Goods',           offsetMs: 512_000     },
  { id: 'fe-10', railType: 'DIALOG',     severity: 'info',   message: 'Context window boundary reached — conversation summarized and compressed',                agentId: 'cw-14',  clientName: 'Cascade Resorts',        offsetMs: 588_000     },
  { id: 'fe-11', railType: 'RETRIEVAL',  severity: 'block',  message: 'Stale knowledge base hit — source flagged as outdated, retrieval blocked',                agentId: 'res-02', clientName: 'Crestline Software',     offsetMs: 643_000     },
  { id: 'fe-12', railType: 'OUTPUT',     severity: 'block',  message: 'Sentiment threshold exceeded — aggressive tone detected in customer-facing post',         agentId: 'cw-09',  clientName: 'Pinnacle Market',        offsetMs: 710_000     },
  { id: 'fe-13', railType: 'INPUT',      severity: 'modify', message: 'Overly long prompt trimmed — context reduced to fit model token window',                  agentId: 'cw-16',  clientName: 'Drift & Stay',           offsetMs: 780_000     },
  { id: 'fe-14', railType: 'EXECUTION',  severity: 'info',   message: 'Sandbox boundary enforced — file system write attempt intercepted and logged',            agentId: 'pub-03', clientName: 'Halcyon Consulting',     offsetMs: 845_000     },
  { id: 'fe-15', railType: 'OUTPUT',     severity: 'block',  message: 'Competitor mention blocked — brand policy prohibits naming rival products explicitly',    agentId: 'cw-22',  clientName: 'Thornfield Suites',      offsetMs: 924_000     },
  { id: 'fe-16', railType: 'DIALOG',     severity: 'block',  message: 'Jailbreak attempt blocked — system persona override instruction detected and rejected',   agentId: 'cw-01',  clientName: 'Bellwether Hotels',      offsetMs: 1_002_000   },
  { id: 'fe-17', railType: 'RETRIEVAL',  severity: 'modify', message: 'Low-confidence retrieval demoted — relevance score below 0.6 threshold, excerpt trimmed', agentId: 'res-07', clientName: 'Stratos Advisory',       offsetMs: 1_088_000   },
  { id: 'fe-18', railType: 'INPUT',      severity: 'block',  message: 'Sensitive topic detected — mental health subject filtered per compliance policy',         agentId: 'cw-28',  clientName: 'Riverside Traders',      offsetMs: 1_145_000   },
  { id: 'fe-19', railType: 'OUTPUT',     severity: 'modify', message: 'URL sanitized — external link replaced with approved redirect through content proxy',     agentId: 'pub-15', clientName: 'Keystone Group',         offsetMs: 1_223_000   },
  { id: 'fe-20', railType: 'EXECUTION',  severity: 'block',  message: 'Excessive token spend intercepted — single-task cost projection exceeded $0.50 cap',     agentId: 'cw-33',  clientName: 'Luminary Partners',      offsetMs: 1_310_000   },
  { id: 'fe-21', railType: 'DIALOG',     severity: 'info',   message: 'Repetition loop detected — agent repeated same response 3× and was reset to baseline',   agentId: 'cw-06',  clientName: 'Apex Digital',           offsetMs: 1_400_000   },
  { id: 'fe-22', railType: 'OUTPUT',     severity: 'block',  message: 'Legal risk flag — unverified statistic cited without source, content quarantined',        agentId: 'cw-38',  clientName: 'Granite Wealth',         offsetMs: 1_489_000   },
  { id: 'fe-23', railType: 'RETRIEVAL',  severity: 'block',  message: 'Internal document leak prevented — confidential roadmap doc excluded from RAG context',  agentId: 'res-09', clientName: 'Vantage Cloud',          offsetMs: 1_567_000   },
  { id: 'fe-24', railType: 'INPUT',      severity: 'modify', message: 'Role confusion corrected — system prompt reinforced after user attempted persona shift',  agentId: 'cw-44',  clientName: 'Oakhurst Advisors',      offsetMs: 1_634_000   },
  { id: 'fe-25', railType: 'OUTPUT',     severity: 'modify', message: 'Readability enforced — Flesch-Kincaid score too low, content rewritten to grade-8 level', agentId: 'cw-17',  clientName: 'Bellwether Hotels',      offsetMs: 1_720_000   },
  { id: 'fe-26', railType: 'EXECUTION',  severity: 'info',   message: 'Concurrent execution cap reached — task 5 queued behind active limit of 4 parallel jobs', agentId: 'pub-21', clientName: 'Summit Goods',           offsetMs: 1_802_000   },
  { id: 'fe-27', railType: 'DIALOG',     severity: 'modify', message: 'Profanity filtered — 2 words replaced with policy-compliant alternatives before output',  agentId: 'cw-31',  clientName: 'Pinnacle Market',        offsetMs: 1_890_000   },
  { id: 'fe-28', railType: 'OUTPUT',     severity: 'block',  message: 'Duplicate content rejected — 87% similarity match found in previously published posts',  agentId: 'cw-48',  clientName: 'Harbor & Co.',           offsetMs: 1_956_000   },
  { id: 'fe-29', railType: 'INPUT',      severity: 'info',   message: 'Ambiguous instruction clarified — underspecified prompt expanded using client brief context', agentId: 'cw-25', clientName: 'Drift & Stay',         offsetMs: 2_035_000   },
  { id: 'fe-30', railType: 'RETRIEVAL',  severity: 'modify', message: 'Cross-tenant data isolation enforced — query scope narrowed to requesting tenant only',  agentId: 'res-11', clientName: 'Ironbridge Finance',      offsetMs: 2_112_000   },
];

// ---------------------------------------------------------------------------
// Section 2-Right: Tenant guardrail config mock data
// ---------------------------------------------------------------------------

type SafetyLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'STRICT';

interface TenantRailConfig {
  id: string;
  clientName: string;
  industry: string;
  enabledRails: RailType[];
  safetyLevel: SafetyLevel;
  policies: string[];
  lastActivation: number; // ms ago
}

const SAFETY_META: Record<SafetyLevel, { label: string; color: string; textClass: string; bgClass: string }> = {
  LOW:    { label: 'LOW',    color: COLORS.green,   textClass: 'text-neon-green',   bgClass: 'bg-[rgba(0,255,136,0.12)]'  },
  MEDIUM: { label: 'MEDIUM', color: COLORS.cyan,    textClass: 'text-neon-cyan',    bgClass: 'bg-[rgba(0,240,255,0.12)]'  },
  HIGH:   { label: 'HIGH',   color: COLORS.amber,   textClass: 'text-neon-amber',   bgClass: 'bg-[rgba(255,170,0,0.12)]'  },
  STRICT: { label: 'STRICT', color: COLORS.magenta, textClass: 'text-neon-magenta', bgClass: 'bg-[rgba(255,0,170,0.12)]'  },
};

const TENANT_CONFIGS: TenantRailConfig[] = [
  {
    id: 'tc-01',
    clientName: 'Solstice Capital',
    industry: 'finance',
    enabledRails: ['INPUT', 'DIALOG', 'RETRIEVAL', 'EXECUTION', 'OUTPUT'],
    safetyLevel: 'STRICT',
    policies: ['Formal tone only — no contractions or slang', 'Require source citation on all statistics', 'No competitor mentions under any circumstance'],
    lastActivation: 42_000,
  },
  {
    id: 'tc-02',
    clientName: 'Apex Digital',
    industry: 'tech',
    enabledRails: ['INPUT', 'DIALOG', 'RETRIEVAL', 'OUTPUT'],
    safetyLevel: 'HIGH',
    policies: ['No unverified performance benchmarks', 'No political or social commentary', 'Brand voice: confident but not aggressive'],
    lastActivation: 201_000,
  },
  {
    id: 'tc-03',
    clientName: 'Bellwether Hotels',
    industry: 'hospitality',
    enabledRails: ['INPUT', 'DIALOG', 'EXECUTION', 'OUTPUT'],
    safetyLevel: 'MEDIUM',
    policies: ['No pricing commitments in content', 'Always include accessibility statement for events', 'Seasonal promotions require pre-approval'],
    lastActivation: 512_000,
  },
  {
    id: 'tc-04',
    clientName: 'Pinnacle Market',
    industry: 'retail',
    enabledRails: ['INPUT', 'RETRIEVAL', 'OUTPUT'],
    safetyLevel: 'MEDIUM',
    policies: ['No out-of-stock items promoted without inventory check', 'Discount claims require price verification', 'Brand color palette enforced in image prompts'],
    lastActivation: 710_000,
  },
  {
    id: 'tc-05',
    clientName: 'Halcyon Consulting',
    industry: 'professional services',
    enabledRails: ['INPUT', 'DIALOG', 'RETRIEVAL', 'EXECUTION', 'OUTPUT'],
    safetyLevel: 'STRICT',
    policies: ['All content must comply with ISO 27001 communication policy', 'No client case studies without explicit written approval', 'Regulatory language must be reviewed before publication'],
    lastActivation: 845_000,
  },
  {
    id: 'tc-06',
    clientName: 'Summit Goods',
    industry: 'retail',
    enabledRails: ['INPUT', 'DIALOG', 'OUTPUT'],
    safetyLevel: 'LOW',
    policies: ['Casual, playful tone preferred', 'Hashtag limit of 5 per post', 'UGC reposts require attribution tag'],
    lastActivation: 1_310_000,
  },
];

// ---------------------------------------------------------------------------
// Section 3: Heatmap mock data
// ---------------------------------------------------------------------------

// Realistic daily pattern: low overnight, ramp morning, steady business hours, taper evening
const DAILY_WEIGHTS = [
  0, 0, 0, 1, 1, 2,     // 00–05
  4, 9, 15, 20,          // 06–09
  22, 24, 26, 23, 22, 20,// 10–15
  18, 16, 14, 11,        // 16–19
  8, 6, 4, 2,            // 20–23
];

function seededJitter(seed: number, range: number): number {
  return Math.floor(((seed * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff * range);
}

// Generate 5×24 heatmap — each rail type has slightly different peak patterns
const HEATMAP_MULTIPLIERS: Record<RailType, number> = {
  INPUT:     1.1,
  DIALOG:    0.8,
  RETRIEVAL: 1.4,
  EXECUTION: 0.6,
  OUTPUT:    1.2,
};

const RAIL_ORDER: RailType[] = ['INPUT', 'DIALOG', 'RETRIEVAL', 'EXECUTION', 'OUTPUT'];

const HEATMAP_DATA: Record<RailType, number[]> = Object.fromEntries(
  RAIL_ORDER.map((rail, ri) => [
    rail,
    DAILY_WEIGHTS.map((base, hi) => {
      const jitter = seededJitter(ri * 31 + hi * 17, 5) - 2;
      return Math.max(0, Math.round((base + jitter) * HEATMAP_MULTIPLIERS[rail]));
    }),
  ])
) as Record<RailType, number[]>;

const HEATMAP_MAX = Math.max(
  ...RAIL_ORDER.flatMap(r => HEATMAP_DATA[r])
);

// ---------------------------------------------------------------------------
// Utility: relative time
// ---------------------------------------------------------------------------

function relativeTime(offsetMs: number): string {
  const secs = Math.floor(offsetMs / 1000);
  if (secs < 60)  return `${secs}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ago`;
}

// ---------------------------------------------------------------------------
// Sub-component: RailStatCard
// ---------------------------------------------------------------------------

function RailStatCard({ stat, index }: { stat: RailStat; index: number }) {
  const meta = RAIL_META[stat.type];
  const pct = stat.blocked / stat.checked * 100;
  const blockedColor = pct > 5 ? COLORS.magenta : COLORS.amber;
  const barColor =
    stat.passRate >= 95 ? COLORS.green :
    stat.passRate >= 90 ? COLORS.amber :
    COLORS.magenta;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
      className="glass-panel flex flex-col p-4 relative overflow-hidden"
      style={{ borderBottomWidth: 2, borderBottomColor: meta.color, borderBottomStyle: 'solid' }}
    >
      {/* Background glow blob */}
      <div
        className="absolute bottom-0 left-0 w-24 h-12 rounded-full blur-2xl opacity-15 pointer-events-none"
        style={{ background: meta.color }}
      />

      {/* Rail type label */}
      <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-secondary mb-1 z-10">
        {meta.label}
      </span>

      {/* Total checks — large number */}
      <span
        className="text-[22px] font-mono font-bold tabular-nums z-10 leading-tight"
        style={{ color: meta.color }}
      >
        {stat.checked.toLocaleString()}
      </span>
      <span className="text-[9px] font-mono text-muted mb-2 z-10">checks (24h)</span>

      {/* Blocked / modified count */}
      <span
        className="text-[11px] font-mono font-semibold tabular-nums z-10 mb-2"
        style={{ color: blockedColor }}
      >
        {stat.blockedLabel}
        <span className="text-secondary ml-1">
          ({pct.toFixed(1)}%)
        </span>
      </span>

      {/* Pass-through rate bar */}
      <div className="flex flex-col gap-1 z-10">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-mono text-secondary uppercase tracking-widest">Pass rate</span>
          <span
            className="text-[9px] font-mono font-bold tabular-nums"
            style={{ color: barColor }}
          >
            {stat.passRate}%
          </span>
        </div>
        <div className="h-[4px] w-full bg-[#1e1e2d] rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ background: barColor, boxShadow: `0 0 6px ${barColor}80` }}
            initial={{ width: 0 }}
            animate={{ width: `${stat.passRate}%` }}
            transition={{ duration: 0.7, delay: index * 0.06 + 0.25, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: RailTypeBadge
// ---------------------------------------------------------------------------

function RailTypeBadge({ type }: { type: RailType }) {
  const meta = RAIL_META[type];
  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-mono font-bold uppercase tracking-wider border ${meta.textClass} ${meta.bgClass}`}
      style={{ borderColor: `${meta.color}40` }}
    >
      {type}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: SeverityIcon
// ---------------------------------------------------------------------------

function SeverityIcon({ severity }: { severity: Severity }) {
  if (severity === 'block')  return <span className="text-neon-magenta text-[12px] leading-none" title="Blocked">✕</span>;
  if (severity === 'modify') return <span className="text-neon-amber   text-[12px] leading-none" title="Modified">⚡</span>;
  return                            <span className="text-secondary    text-[12px] leading-none" title="Info">●</span>;
}

// ---------------------------------------------------------------------------
// Sub-component: ActivityFeed
// ---------------------------------------------------------------------------

function ActivityFeed() {
  return (
    <div className="flex flex-col h-full min-h-0">
      {/* Column headers */}
      <div className="shrink-0 grid gap-2 px-2 pb-1.5 border-b border-border-subtle mb-1"
        style={{ gridTemplateColumns: '52px 80px 12px 1fr 56px 90px' }}
      >
        <span className="text-[9px] font-mono uppercase tracking-widest text-muted">Time</span>
        <span className="text-[9px] font-mono uppercase tracking-widest text-muted">Rail</span>
        <span />
        <span className="text-[9px] font-mono uppercase tracking-widest text-muted">Event</span>
        <span className="text-[9px] font-mono uppercase tracking-widest text-muted">Agent</span>
        <span className="text-[9px] font-mono uppercase tracking-widest text-muted">Client</span>
      </div>

      {/* Scrollable rows */}
      <div
        className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-[2px]"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,240,255,0.2) transparent' }}
      >
        {FEED_EVENTS.map((evt, i) => (
          <motion.div
            key={evt.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25, delay: i * 0.03, ease: 'easeOut' }}
            className="grid gap-2 px-2 py-1.5 rounded-sm hover:bg-[#1a1a2e] transition-colors duration-150 items-center"
            style={{ gridTemplateColumns: '52px 80px 12px 1fr 56px 90px' }}
          >
            {/* Timestamp */}
            <span className="text-[10px] font-mono text-secondary tabular-nums whitespace-nowrap">
              {relativeTime(evt.offsetMs)}
            </span>

            {/* Rail badge */}
            <div>
              <RailTypeBadge type={evt.railType} />
            </div>

            {/* Severity icon */}
            <SeverityIcon severity={evt.severity} />

            {/* Message */}
            <span className="text-[11px] font-mono text-primary leading-snug truncate">
              {evt.message}
            </span>

            {/* Agent ID */}
            <span className="text-[10px] font-mono text-neon-cyan tabular-nums">
              {evt.agentId}
            </span>

            {/* Client */}
            <span className="text-[10px] font-mono text-secondary truncate">
              {evt.clientName}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: TenantConfigCard
// ---------------------------------------------------------------------------

const INDUSTRY_COLORS: Record<string, string> = {
  'finance':              COLORS.green,
  'tech':                 COLORS.cyan,
  'retail':               COLORS.amber,
  'hospitality':          COLORS.magenta,
  'professional services': COLORS.blue,
};

const INDUSTRY_LABELS: Record<string, string> = {
  'finance':              'Finance',
  'tech':                 'Tech',
  'retail':               'Retail',
  'hospitality':          'Hospitality',
  'professional services': 'Pro Services',
};

function TenantConfigCard({ config, index }: { config: TenantRailConfig; index: number }) {
  const industryColor = INDUSTRY_COLORS[config.industry] ?? COLORS.cyan;
  const industryLabel = INDUSTRY_LABELS[config.industry] ?? config.industry;
  const safety = SAFETY_META[config.safetyLevel];

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.07, ease: 'easeOut' }}
      className="relative bg-[#12121f] border border-[rgba(255,255,255,0.06)] hover:bg-[#1a1a2e] hover:border-[rgba(255,255,255,0.12)] transition-colors duration-200 rounded-sm overflow-hidden flex flex-col gap-2.5 p-3"
      style={{ borderLeftWidth: 3, borderLeftColor: industryColor, borderLeftStyle: 'solid' }}
    >
      {/* Subtle left glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse at 0% 50%, ${industryColor}07 0%, transparent 55%)` }}
      />

      {/* Header: client name + industry badge + safety level */}
      <div className="flex items-start justify-between gap-2 z-10">
        <span className="text-[13px] font-mono font-semibold text-primary leading-tight">
          {config.clientName}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-mono font-bold uppercase tracking-wider border"
            style={{ color: industryColor, borderColor: `${industryColor}40`, background: `${industryColor}12` }}
          >
            {industryLabel}
          </span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-mono font-bold uppercase tracking-wider border ${safety.textClass} ${safety.bgClass}`}
            style={{ borderColor: `${safety.color}40` }}
          >
            {safety.label}
          </span>
        </div>
      </div>

      {/* Active rails — 5 checkboxes */}
      <div className="flex items-center gap-1.5 z-10 flex-wrap">
        <span className="text-[9px] font-mono uppercase tracking-widest text-muted mr-1">Rails:</span>
        {RAIL_ORDER.map(rail => {
          const enabled = config.enabledRails.includes(rail);
          const meta = RAIL_META[rail];
          return (
            <div key={rail} className="flex items-center gap-0.5">
              <span
                className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-sm border text-[8px] font-bold"
                style={enabled
                  ? { borderColor: meta.color, color: meta.color, background: `${meta.color}18` }
                  : { borderColor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.15)', background: 'transparent' }
                }
              >
                {enabled ? '✓' : '×'}
              </span>
              <span
                className="text-[8px] font-mono uppercase"
                style={{ color: enabled ? meta.color : '#334455' }}
              >
                {rail.slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>

      {/* Content policies */}
      <div className="flex flex-col gap-1 z-10">
        <span className="text-[9px] font-mono uppercase tracking-widest text-muted">Policies</span>
        {config.policies.map((policy, pi) => (
          <div key={pi} className="flex items-start gap-1.5">
            <span className="text-neon-cyan text-[9px] font-mono leading-tight shrink-0 mt-px">›</span>
            <span className="text-[10px] font-mono text-secondary leading-snug">{policy}</span>
          </div>
        ))}
      </div>

      {/* Last activation */}
      <div className="flex items-center justify-between z-10 pt-1 border-t border-border-subtle">
        <span className="text-[9px] font-mono uppercase tracking-widest text-muted">Last activation</span>
        <span className="text-[10px] font-mono text-neon-amber tabular-nums">
          {relativeTime(config.lastActivation)}
        </span>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: Heatmap
// ---------------------------------------------------------------------------

function HeatmapCell({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? value / max : 0;

  // Color scale: 0 = empty, low = cyan tint, medium = amber, high = magenta
  let bg: string;
  let shadow: string | undefined;

  if (ratio === 0) {
    bg = 'rgba(255,255,255,0.03)';
    shadow = undefined;
  } else if (ratio < 0.33) {
    const alpha = 0.08 + ratio * 0.4;
    bg = `rgba(0,240,255,${alpha.toFixed(2)})`;
    shadow = undefined;
  } else if (ratio < 0.66) {
    const alpha = 0.15 + (ratio - 0.33) * 0.5;
    bg = `rgba(255,170,0,${alpha.toFixed(2)})`;
    shadow = `0 0 4px rgba(255,170,0,${(alpha * 0.6).toFixed(2)})`;
  } else {
    const alpha = 0.25 + (ratio - 0.66) * 0.6;
    bg = `rgba(255,0,170,${Math.min(0.9, alpha).toFixed(2)})`;
    shadow = `0 0 6px rgba(255,0,170,${(alpha * 0.7).toFixed(2)})`;
  }

  return (
    <div
      className="rounded-[2px] transition-colors duration-200 hover:opacity-80 cursor-default"
      style={{
        background: bg,
        boxShadow: shadow,
        aspectRatio: '1 / 1',
        minHeight: 16,
      }}
      title={value > 0 ? `${value} activations` : 'No activations'}
    />
  );
}

function RailHeatmap() {
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="flex flex-col gap-2">
      {/* Hour labels */}
      <div className="flex items-center gap-[3px] pl-[76px]">
        {hours.map(h => (
          <div key={h} className="flex-1 text-center text-[8px] font-mono text-muted tabular-nums">
            {h % 6 === 0 ? `${String(h).padStart(2, '0')}h` : ''}
          </div>
        ))}
      </div>

      {/* Rail rows */}
      {RAIL_ORDER.map(rail => {
        const meta = RAIL_META[rail];
        const data = HEATMAP_DATA[rail];
        return (
          <div key={rail} className="flex items-center gap-[3px]">
            {/* Rail label */}
            <div className="w-[72px] shrink-0 flex items-center justify-end pr-2">
              <span
                className="text-[9px] font-mono uppercase tracking-wider"
                style={{ color: meta.color }}
              >
                {rail}
              </span>
            </div>

            {/* Cells */}
            {data.map((val, hi) => (
              <div key={hi} className="flex-1">
                <HeatmapCell value={val} max={HEATMAP_MAX} />
              </div>
            ))}
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex items-center gap-3 pt-1 pl-[76px]">
        <span className="text-[9px] font-mono text-muted uppercase tracking-widest mr-1">Intensity:</span>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-[2px]" style={{ background: 'rgba(255,255,255,0.03)' }} />
          <span className="text-[9px] font-mono text-muted">None</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-[2px]" style={{ background: 'rgba(0,240,255,0.25)' }} />
          <span className="text-[9px] font-mono text-muted">Low</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-[2px]" style={{ background: 'rgba(255,170,0,0.45)' }} />
          <span className="text-[9px] font-mono text-muted">Medium</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-[2px]" style={{ background: 'rgba(255,0,170,0.7)' }} />
          <span className="text-[9px] font-mono text-muted">High</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function GuardrailsView() {
  // Derive aggregate stats for the header summary
  const totalChecks = RAIL_STATS.reduce((s, r) => s + r.checked, 0);
  const totalBlocked = RAIL_STATS.reduce((s, r) => s + r.blocked, 0);
  const overallPassRate = ((totalChecks - totalBlocked) / totalChecks * 100).toFixed(1);

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden">

      {/* ------------------------------------------------------------------ */}
      {/* Page header                                                         */}
      {/* ------------------------------------------------------------------ */}
      <div className="shrink-0 flex items-center gap-3">
        <h1 className="text-xs font-mono font-semibold uppercase tracking-[0.2em] text-neon-cyan">
          NeMo Guardrails Monitor
        </h1>
        <div className="flex-1 h-px bg-[rgba(0,240,255,0.15)]" />
        <span className="text-[10px] font-mono text-secondary tabular-nums">
          {totalChecks.toLocaleString()} checks ·{' '}
          <span className="text-neon-green">{overallPassRate}% pass rate</span>
          {' '}· 50 agents monitored
        </span>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 1: Rail type stat cards                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="shrink-0 grid grid-cols-5 gap-3">
        {RAIL_STATS.map((stat, i) => (
          <RailStatCard key={stat.type} stat={stat} index={i} />
        ))}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: Main content — 65/35 split                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 grid grid-cols-[65fr_35fr] gap-3 min-h-0">

        {/* Left column: Guardrail Activity Feed */}
        <div className="glass-panel hud-corners scanlines flex flex-col min-h-0">
          {/* Panel header */}
          <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border-subtle">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-neon-cyan">
              Guardrail Activity Feed
            </h2>
            <div className="flex items-center gap-3">
              {/* Live indicator */}
              <div className="flex items-center gap-1.5">
                <span className="status-dot status-dot--working" />
                <span className="text-[9px] font-mono text-secondary uppercase tracking-wider">Live</span>
              </div>
              <span className="text-[10px] font-mono text-secondary tabular-nums">
                {FEED_EVENTS.length} events
              </span>
            </div>
          </div>

          {/* Feed body */}
          <div className="flex-1 overflow-hidden p-3 min-h-0">
            <ActivityFeed />
          </div>
        </div>

        {/* Right column: Tenant guardrail configs */}
        <div className="glass-panel hud-corners scanlines flex flex-col min-h-0">
          {/* Panel header */}
          <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-border-subtle">
            <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-neon-cyan">
              Tenant Rail Configs
            </h2>
            <span className="text-[10px] font-mono text-secondary tabular-nums">
              {TENANT_CONFIGS.length} clients
            </span>
          </div>

          {/* Config cards */}
          <div
            className="flex-1 overflow-y-auto p-3 flex flex-col gap-2.5 min-h-0"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,240,255,0.2) transparent' }}
          >
            {TENANT_CONFIGS.map((cfg, i) => (
              <TenantConfigCard key={cfg.id} config={cfg} index={i} />
            ))}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 3: Rail Activation Heatmap                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="shrink-0 glass-panel hud-corners p-3">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-mono font-semibold uppercase tracking-[0.18em] text-neon-cyan">
            Rail Activations (24H)
          </span>
          <div className="flex-1 h-px bg-[rgba(0,240,255,0.12)]" />
          <span className="text-[9px] font-mono text-secondary">
            Local time · UTC+0
          </span>
        </div>
        <RailHeatmap />
      </div>

    </div>
  );
}
