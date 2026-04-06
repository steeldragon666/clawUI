import { motion } from 'framer-motion';
import { Zap, Heart, Database, FlaskConical } from 'lucide-react';

// ---------------------------------------------------------------------------
// Design constants
// ---------------------------------------------------------------------------

const COLORS = {
  cyan:    '#00f0ff',
  magenta: '#ff00aa',
  green:   '#00ff88',
  amber:   '#ffaa00',
} as const;

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const STAGGER_CONTAINER = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const FADE_UP = {
  hidden:  { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } },
};

const FADE_IN = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function PanelHeader({
  icon: Icon,
  title,
  badge,
  badgeColor,
}: {
  icon: React.ElementType;
  title: string;
  badge: string;
  badgeColor: string;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle shrink-0">
      <div className="flex items-center gap-2">
        <Icon size={13} strokeWidth={2} style={{ color: badgeColor }} />
        <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-primary">
          {title}
        </h2>
      </div>
      <span
        className="text-[9px] font-mono font-semibold uppercase tracking-wider px-2 py-0.5 rounded-sm"
        style={{
          color:           badgeColor,
          backgroundColor: `${badgeColor}18`,
          border:          `1px solid ${badgeColor}44`,
        }}
      >
        {badge}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QUADRANT 1 — Auto-Scaling Engine
// ---------------------------------------------------------------------------

type RuleStatus = 'ARMED' | 'TRIGGERED';

interface ScalingRule {
  id:          string;
  condition:   string;
  action:      string;
  status:      RuleStatus;
  statusLabel: string;
  lastTime:    string;
}

const SCALING_RULES: ScalingRule[] = [
  {
    id:          'sr-01',
    condition:   'queue depth > 50',
    action:      'Assign 3 idle agents from content-writer pool',
    status:      'ARMED',
    statusLabel: 'ARMED',
    lastTime:    'last: 3h ago',
  },
  {
    id:          'sr-02',
    condition:   'error rate > 5%',
    action:      'Rotate failing agent, assign backup',
    status:      'TRIGGERED',
    statusLabel: 'TRIGGERED 2x TODAY',
    lastTime:    'last: 41m ago',
  },
  {
    id:          'sr-03',
    condition:   'CPU avg > 85%',
    action:      'Redistribute tasks across servers',
    status:      'ARMED',
    statusLabel: 'ARMED',
    lastTime:    'last: 6h ago',
  },
  {
    id:          'sr-04',
    condition:   'client SLA < 30min remaining',
    action:      'Escalate to priority queue',
    status:      'TRIGGERED',
    statusLabel: 'TRIGGERED 1x TODAY',
    lastTime:    'last: 2h ago',
  },
];

function ScalingRuleCard({ rule }: { rule: ScalingRule }) {
  const isTriggered = rule.status === 'TRIGGERED';
  const statusColor = isTriggered ? COLORS.amber : COLORS.green;

  return (
    <motion.div
      variants={FADE_UP}
      className="rounded-sm p-2.5 flex flex-col gap-1"
      style={{
        background:   isTriggered ? 'rgba(255,170,0,0.05)' : 'rgba(0,255,136,0.04)',
        border:       `1px solid ${statusColor}22`,
        borderLeft:   `2px solid ${statusColor}`,
      }}
    >
      {/* Condition */}
      <span
        className="font-mono text-[9px] uppercase tracking-wider"
        style={{ color: COLORS.cyan }}
      >
        WHEN {rule.condition}
      </span>

      {/* Action */}
      <span className="font-sans text-[10px] text-primary leading-snug">
        {rule.action}
      </span>

      {/* Footer: status badge + last triggered */}
      <div className="flex items-center justify-between pt-0.5">
        <span
          className="text-[9px] font-mono font-semibold uppercase tracking-wider"
          style={{ color: statusColor }}
        >
          {rule.statusLabel}
        </span>
        <span className="text-[9px] font-mono text-muted">{rule.lastTime}</span>
      </div>
    </motion.div>
  );
}

function AutoScalingPanel() {
  return (
    <div className="glass-panel hud-corners flex flex-col h-full">
      <PanelHeader
        icon={Zap}
        title="Auto-Scaling Rules"
        badge="ACTIVE"
        badgeColor={COLORS.green}
      />

      <motion.div
        className="flex-1 flex flex-col gap-2 p-2.5 overflow-y-auto custom-scrollbar"
        initial="hidden"
        animate="visible"
        variants={STAGGER_CONTAINER}
      >
        {SCALING_RULES.map((rule) => (
          <ScalingRuleCard key={rule.id} rule={rule} />
        ))}
      </motion.div>

      {/* Footer bar */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-t border-border-subtle bg-white/[0.02]">
        <span className="text-[9px] font-mono text-secondary">
          SCALING EVENTS TODAY:{' '}
          <span className="text-neon-cyan font-semibold">7</span>
        </span>
        <span className="text-[9px] font-mono text-secondary">
          AGENTS REASSIGNED:{' '}
          <span className="text-neon-green font-semibold">12</span>
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QUADRANT 2 — Self-Healing Monitor
// ---------------------------------------------------------------------------

type RecoveryStatus = 'recovered' | 'partial';

interface RecoveryEvent {
  id:        string;
  agentId:   string;
  trigger:   string;
  action:    string;
  timeAgo:   string;
  status:    RecoveryStatus;
}

const RECOVERY_EVENTS: RecoveryEvent[] = [
  { id: 're-01', agentId: 'cw-03',  trigger: '3 consecutive errors',   action: 'auto-rotated to cw-backup-01',      timeAgo: '14m ago',  status: 'recovered' },
  { id: 're-02', agentId: 'pub-07', trigger: 'stalled 5min',           action: 'auto-restarted',                    timeAgo: '47m ago',  status: 'recovered' },
  { id: 're-03', agentId: 'sch-02', trigger: 'memory 95%',             action: 'graceful shutdown + restart',       timeAgo: '1h ago',   status: 'recovered' },
  { id: 're-04', agentId: 'mon-04', trigger: 'heartbeat lost',         action: 'marked dead, tasks reassigned',     timeAgo: '2h ago',   status: 'partial'   },
  { id: 're-05', agentId: 'cw-09',  trigger: 'timeout after 12min',    action: 'task requeued, agent restarted',    timeAgo: '3h ago',   status: 'recovered' },
  { id: 're-06', agentId: 'res-03', trigger: 'API rate-limit hit',     action: 'exponential backoff applied',       timeAgo: '4h ago',   status: 'recovered' },
  { id: 're-07', agentId: 'pub-02', trigger: 'disk I/O spike > 95%',   action: 'migrated to secondary node',        timeAgo: '6h ago',   status: 'recovered' },
  { id: 're-08', agentId: 'sch-05', trigger: 'OOM killed by OS',       action: 'auto-restarted, heap limit raised', timeAgo: '8h ago',   status: 'partial'   },
];

function SelfHealingPanel() {
  const resilience = 96;

  return (
    <div className="glass-panel hud-corners flex flex-col h-full">
      <PanelHeader
        icon={Heart}
        title="Self-Healing Monitor"
        badge="3 RECOVERIES TODAY"
        badgeColor={COLORS.magenta}
      />

      {/* Metrics row */}
      <div className="shrink-0 flex items-center gap-0 border-b border-border-subtle">
        {/* Resilience score */}
        <div className="flex-1 flex flex-col gap-1 px-3 py-2 border-r border-border-subtle">
          <span className="text-[9px] font-mono uppercase tracking-wider text-secondary">
            Fleet Resilience
          </span>
          <div className="flex items-center gap-2">
            <span
              className="text-lg font-mono font-bold tabular-nums leading-none"
              style={{ color: COLORS.green }}
            >
              {resilience}/100
            </span>
            <div className="flex-1 h-[4px] rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${resilience}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
                style={{
                  backgroundColor: COLORS.green,
                  boxShadow: `0 0 6px ${COLORS.green}66`,
                }}
              />
            </div>
          </div>
        </div>

        {/* MTTR */}
        <div className="flex flex-col gap-0.5 px-3 py-2">
          <span className="text-[9px] font-mono uppercase tracking-wider text-secondary">MTTR</span>
          <span
            className="text-lg font-mono font-bold tabular-nums leading-none"
            style={{ color: COLORS.cyan }}
          >
            2.3<span className="text-[10px] text-secondary ml-0.5">min avg</span>
          </span>
        </div>
      </div>

      {/* Recovery log */}
      <motion.div
        className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border-subtle"
        initial="hidden"
        animate="visible"
        variants={STAGGER_CONTAINER}
      >
        {RECOVERY_EVENTS.map((evt) => {
          const isRecovered = evt.status === 'recovered';
          const dotColor    = isRecovered ? COLORS.green : COLORS.amber;

          return (
            <motion.div
              key={evt.id}
              variants={FADE_UP}
              className="flex items-start gap-2 px-3 py-2 hover:bg-white/[0.02] transition-colors"
            >
              {/* Status dot */}
              <span
                className="mt-[3px] shrink-0 rounded-full"
                style={{
                  width:           6,
                  height:          6,
                  backgroundColor: dotColor,
                  boxShadow:       `0 0 5px ${dotColor}88`,
                }}
              />

              {/* Event text */}
              <div className="flex-1 min-w-0">
                <span className="font-mono text-[9px] font-semibold" style={{ color: COLORS.cyan }}>
                  {evt.agentId}
                </span>
                <span className="font-sans text-[9px] text-secondary mx-1">—</span>
                <span className="font-sans text-[9px] text-muted">{evt.trigger}</span>
                <span className="font-sans text-[9px] text-secondary mx-1">→</span>
                <span className="font-sans text-[9px] text-primary">{evt.action}</span>
              </div>

              {/* Time + status */}
              <div className="shrink-0 flex flex-col items-end gap-0.5">
                <span className="font-mono text-[8px] text-muted">{evt.timeAgo}</span>
                <span
                  className="font-mono text-[8px] uppercase tracking-wider"
                  style={{ color: dotColor }}
                >
                  {isRecovered ? 'OK' : 'PARTIAL'}
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QUADRANT 3 — Agent Registry
// ---------------------------------------------------------------------------

interface CapabilityRow {
  capability:   string;
  totalAgents:  number;
  available:    number;
  utilization:  number; // 0–100
}

const CAPABILITY_ROWS: CapabilityRow[] = [
  { capability: 'Content Generation',    totalAgents: 15, available: 12, utilization: 80 },
  { capability: 'Social Publishing',     totalAgents: 10, available: 7,  utilization: 70 },
  { capability: 'Scheduling',            totalAgents: 10, available: 9,  utilization: 90 },
  { capability: 'Engagement Monitoring', totalAgents: 8,  available: 6,  utilization: 75 },
  { capability: 'Research / SEO',        totalAgents: 7,  available: 5,  utilization: 71 },
];

function utilizationColor(pct: number): string {
  if (pct >= 85) return COLORS.amber;
  if (pct >= 60) return COLORS.cyan;
  return COLORS.green;
}

function AgentRegistryPanel() {
  const totalRegistered = CAPABILITY_ROWS.reduce((s, r) => s + r.totalAgents, 0);

  return (
    <div className="glass-panel hud-corners flex flex-col h-full">
      <PanelHeader
        icon={Database}
        title="Agent Registry"
        badge={`${totalRegistered} REGISTERED`}
        badgeColor={COLORS.cyan}
      />

      {/* Table header */}
      <div className="shrink-0 grid px-3 py-1.5 border-b border-border-subtle"
           style={{ gridTemplateColumns: '1fr 48px 56px 1fr' }}>
        {['CAPABILITY', 'AGENTS', 'AVAIL', 'UTILIZATION'].map((h) => (
          <span key={h} className="text-[8px] font-mono uppercase tracking-wider text-muted">{h}</span>
        ))}
      </div>

      {/* Table rows */}
      <motion.div
        className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-border-subtle"
        initial="hidden"
        animate="visible"
        variants={STAGGER_CONTAINER}
      >
        {CAPABILITY_ROWS.map((row) => {
          const color = utilizationColor(row.utilization);
          return (
            <motion.div
              key={row.capability}
              variants={FADE_UP}
              className="grid items-center gap-x-2 px-3 py-2.5 hover:bg-white/[0.02] transition-colors"
              style={{ gridTemplateColumns: '1fr 48px 56px 1fr' }}
            >
              {/* Capability */}
              <span className="font-sans text-[10px] text-primary truncate">{row.capability}</span>

              {/* Total agents */}
              <span
                className="font-mono text-[10px] tabular-nums text-center"
                style={{ color: COLORS.cyan }}
              >
                {row.totalAgents}
              </span>

              {/* Available */}
              <span className="font-mono text-[10px] tabular-nums text-neon-green text-center">
                {row.available}
              </span>

              {/* Utilization bar + label */}
              <div className="flex items-center gap-1.5 min-w-0">
                <div className="flex-1 h-[5px] rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${row.utilization}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut', delay: 0.15 }}
                    style={{
                      backgroundColor: color,
                      boxShadow:       `0 0 4px ${color}66`,
                    }}
                  />
                </div>
                <span
                  className="font-mono text-[9px] tabular-nums shrink-0 w-[26px] text-right"
                  style={{ color }}
                >
                  {row.utilization}%
                </span>
              </div>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Footer */}
      <div className="shrink-0 flex items-center justify-between px-3 py-1.5 border-t border-border-subtle bg-white/[0.02]">
        <span className="text-[9px] font-mono text-secondary">
          LAST REGISTRATION:{' '}
          <span className="text-neon-amber">agent res-08</span>
          <span className="text-muted"> — 4h ago</span>
        </span>
        <span className="text-[9px] font-mono">
          <span className="text-secondary">ROUTING: </span>
          <span className="text-neon-green font-semibold">ACTIVE</span>
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QUADRANT 4 — A/B Testing
// ---------------------------------------------------------------------------

interface ABVariant {
  label:       string;
  impressions: number;
  engagement:  number; // percent
  leading:     boolean;
}

interface ABTest {
  id:          string;
  name:        string;
  variantA:    ABVariant;
  variantB:    ABVariant;
  progress:    number; // 0–100
  note:        string;
}

const AB_TESTS: ABTest[] = [
  {
    id:       'abt-01',
    name:     'Headline Style — Formal vs Casual',
    variantA: { label: 'Formal',          impressions: 234, engagement: 4.2, leading: true  },
    variantB: { label: 'Casual',          impressions: 198, engagement: 3.1, leading: false },
    progress: 67,
    note:     'Estimated winner in 2 days',
  },
  {
    id:       'abt-02',
    name:     'Post Length — Short (<100) vs Long (200+)',
    variantA: { label: 'Short (<100)',    impressions: 312, engagement: 3.8, leading: false },
    variantB: { label: 'Long (200+)',     impressions: 298, engagement: 4.5, leading: true  },
    progress: 45,
    note:     'Insufficient data for significance',
  },
  {
    id:       'abt-03',
    name:     'Hashtag Count — 3 tags vs 8 tags',
    variantA: { label: '3 hashtags',     impressions: 451, engagement: 3.2, leading: true  },
    variantB: { label: '8 hashtags',     impressions: 448, engagement: 2.9, leading: false },
    progress: 89,
    note:     'Winner projected: Variant A',
  },
];

function ABTestCard({ test }: { test: ABTest }) {
  const maxEng = Math.max(test.variantA.engagement, test.variantB.engagement);

  function VariantRow({ variant, label }: { variant: ABVariant; label: 'A' | 'B' }) {
    const fillPct = (variant.engagement / maxEng) * 100;
    const barColor = variant.leading ? COLORS.green : 'rgba(255,255,255,0.15)';
    const textColor = variant.leading ? COLORS.green : 'rgba(255,255,255,0.4)';

    return (
      <div className="flex items-center gap-2">
        {/* Variant label */}
        <span
          className="font-mono text-[8px] font-bold shrink-0 w-4"
          style={{ color: variant.leading ? COLORS.green : COLORS.cyan }}
        >
          {label}
        </span>

        {/* Bar */}
        <div className="flex-1 h-[6px] rounded-sm bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-sm"
            initial={{ width: 0 }}
            animate={{ width: `${fillPct}%` }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 0.1 }}
            style={{
              backgroundColor: barColor,
              boxShadow:       variant.leading ? `0 0 5px ${COLORS.green}66` : 'none',
            }}
          />
        </div>

        {/* Engagement pct */}
        <span
          className="font-mono text-[9px] tabular-nums shrink-0 w-[28px] text-right"
          style={{ color: textColor }}
        >
          {variant.engagement.toFixed(1)}%
        </span>

        {/* Impressions */}
        <span className="font-mono text-[8px] text-muted shrink-0 w-[26px] text-right tabular-nums">
          {variant.impressions}
        </span>

        {/* Leading badge */}
        {variant.leading && (
          <span
            className="font-mono text-[7px] uppercase tracking-wider px-1 py-0.5 rounded-sm shrink-0"
            style={{
              color:           COLORS.green,
              backgroundColor: `${COLORS.green}18`,
              border:          `1px solid ${COLORS.green}44`,
            }}
          >
            LEAD
          </span>
        )}
      </div>
    );
  }

  return (
    <motion.div
      variants={FADE_UP}
      className="rounded-sm p-2.5 flex flex-col gap-2"
      style={{
        background: 'rgba(255,255,255,0.025)',
        border:     '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Test name */}
      <span className="font-mono text-[9px] uppercase tracking-wider text-neon-cyan leading-tight">
        {test.name}
      </span>

      {/* Variant rows */}
      <div className="flex flex-col gap-1.5">
        <VariantRow variant={test.variantA} label="A" />
        <VariantRow variant={test.variantB} label="B" />
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-[3px] rounded-full bg-white/5 overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${test.progress}%` }}
            transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
            style={{
              backgroundColor: COLORS.amber,
              boxShadow:       `0 0 4px ${COLORS.amber}44`,
            }}
          />
        </div>
        <span className="font-mono text-[8px] tabular-nums text-muted shrink-0">
          {test.progress}%
        </span>
      </div>

      {/* Note */}
      <span className="font-sans text-[9px] text-secondary leading-none">{test.note}</span>
    </motion.div>
  );
}

function ABTestingPanel() {
  return (
    <div className="glass-panel hud-corners flex flex-col h-full">
      <PanelHeader
        icon={FlaskConical}
        title="Content A/B Tests"
        badge="3 ACTIVE"
        badgeColor={COLORS.magenta}
      />

      {/* Column legend */}
      <div className="shrink-0 flex items-center gap-4 px-3 py-1.5 border-b border-border-subtle">
        <span className="text-[8px] font-mono text-muted uppercase tracking-wider">Engagement</span>
        <span className="text-[8px] font-mono text-muted">·</span>
        <span className="text-[8px] font-mono text-muted uppercase tracking-wider">Impressions</span>
        <span className="ml-auto text-[8px] font-mono text-muted uppercase tracking-wider">Progress</span>
      </div>

      <motion.div
        className="flex-1 flex flex-col gap-2 p-2.5 overflow-y-auto custom-scrollbar"
        initial="hidden"
        animate="visible"
        variants={STAGGER_CONTAINER}
      >
        {AB_TESTS.map((test) => (
          <ABTestCard key={test.id} test={test} />
        ))}
      </motion.div>

      {/* Footer */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-1.5 border-t border-border-subtle bg-white/[0.02]">
        <span className="text-[9px] font-mono text-secondary">
          SIGNIFICANCE THRESHOLD:{' '}
          <span className="text-neon-cyan">95% CI</span>
        </span>
        <span className="text-[9px] font-mono text-secondary">|</span>
        <span className="text-[9px] font-mono text-secondary">
          ENGINE:{' '}
          <span className="text-neon-green font-semibold">BAYESIAN</span>
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root view — 2x2 grid
// ---------------------------------------------------------------------------

export function IntelligenceView() {
  return (
    <motion.div
      className="h-full p-3 min-h-0 overflow-hidden"
      style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: '12px' }}
      initial="hidden"
      animate="visible"
      variants={FADE_IN}
    >
      {/* Q1 — top-left: Auto-Scaling */}
      <AutoScalingPanel />

      {/* Q2 — top-right: Self-Healing */}
      <SelfHealingPanel />

      {/* Q3 — bottom-left: Agent Registry */}
      <AgentRegistryPanel />

      {/* Q4 — bottom-right: A/B Testing */}
      <ABTestingPanel />
    </motion.div>
  );
}
