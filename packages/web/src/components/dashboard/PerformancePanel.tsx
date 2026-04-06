import { Sparkline } from '../charts/Sparkline';

// --- Mock data -----------------------------------------------------------

const MOCK_STATS = {
  tasksCompleted: 187,
  tasksDelta: 12,
  successRate: 94.2,
  successDelta: 1.8,
  avgDuration: 3.4,
  durationDelta: -0.6,
  retryRate: 8.1,
  retryDelta: -2.3,
};

// Simulated completions-per-hour over last 24h
const MOCK_HOURLY = [
  4, 3, 2, 1, 1, 2, 5, 9, 12, 14, 11, 10,
  13, 15, 12, 11, 9, 7, 8, 10, 6, 5, 4, 3,
];

const MOCK_ROLES: { role: string; rate: number }[] = [
  { role: 'email', rate: 89 },
  { role: 'social', rate: 71 },
  { role: 'seo', rate: 52 },
  { role: 'sensors', rate: 99 },
  { role: 'content', rate: 64 },
];

// --- Helpers -------------------------------------------------------------

function rateColor(rate: number): string {
  if (rate >= 80) return 'neon-green';
  if (rate >= 50) return 'neon-amber';
  return 'neon-magenta';
}

function rateIcon(rate: number): string {
  if (rate >= 80) return '\u2713';   // checkmark
  if (rate >= 50) return '\u25B2';   // up triangle
  return '\u25BC';                   // down triangle
}

function DeltaBadge({ value, positive, suffix = '%' }: { value: number; positive: boolean; suffix?: string }) {
  const sign = positive ? '+' : '';
  const color = positive ? 'text-neon-green' : 'text-neon-magenta';
  const arrow = positive ? '\u25B2' : '\u25BC';
  return (
    <span className={`text-[9px] font-mono leading-none px-1 py-0.5 rounded ${color} bg-white/5`}>
      {arrow} {sign}{value}{suffix}
    </span>
  );
}

// --- Stat card -----------------------------------------------------------

interface StatProps {
  label: string;
  value: string;
  delta: number;
  positive: boolean;
  suffix?: string;
}

function Stat({ label, value, delta, positive, suffix = '%' }: StatProps) {
  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[9px] font-sans uppercase tracking-wider text-secondary truncate">{label}</span>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-mono font-bold tabular-nums text-primary leading-none">{value}</span>
        <DeltaBadge value={Math.abs(delta)} positive={positive} suffix={suffix} />
      </div>
    </div>
  );
}

// --- Role bar ------------------------------------------------------------

function RoleBar({ role, rate }: { role: string; rate: number }) {
  const c = rateColor(rate);
  return (
    <div className="flex items-center gap-1.5 text-[10px] leading-none">
      <span className="font-mono text-secondary w-[52px] text-right truncate">{role}</span>
      <div className="flex-1 h-[6px] rounded-sm bg-white/5 overflow-hidden">
        <div
          className={`h-full rounded-sm bg-${c}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className={`font-mono tabular-nums w-[30px] text-${c}`}>{rate}%</span>
      <span className={`w-[10px] text-${c}`}>{rateIcon(rate)}</span>
    </div>
  );
}

// --- Main panel ----------------------------------------------------------

export function PerformancePanel() {
  return (
    <div className="glass-panel hud-corners flex flex-col gap-2 p-3 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-sans uppercase tracking-widest text-neon-cyan">Performance</span>
        <span className="text-[9px] font-mono text-secondary">24h / 7d</span>
      </div>

      {/* 2x2 stats grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <Stat
          label="Completed (24h)"
          value={String(MOCK_STATS.tasksCompleted)}
          delta={MOCK_STATS.tasksDelta}
          positive={MOCK_STATS.tasksDelta >= 0}
        />
        <Stat
          label="Success Rate"
          value={`${MOCK_STATS.successRate}%`}
          delta={MOCK_STATS.successDelta}
          positive={MOCK_STATS.successDelta >= 0}
        />
        <Stat
          label="Avg Duration"
          value={`${MOCK_STATS.avgDuration}m`}
          delta={MOCK_STATS.durationDelta}
          positive={MOCK_STATS.durationDelta <= 0}
          suffix="m"
        />
        <Stat
          label="Retry Rate"
          value={`${MOCK_STATS.retryRate}%`}
          delta={MOCK_STATS.retryDelta}
          positive={MOCK_STATS.retryDelta <= 0}
        />
      </div>

      {/* Sparkline */}
      <div className="flex flex-col gap-0.5">
        <span className="text-[9px] font-sans uppercase tracking-wider text-secondary">Completions / hr</span>
        <Sparkline data={MOCK_HOURLY} color="#00f0ff" height={40} />
      </div>

      {/* Role breakdown */}
      <div className="flex flex-col gap-1">
        <span className="text-[9px] font-sans uppercase tracking-wider text-secondary">By Role</span>
        {MOCK_ROLES.map((r) => (
          <RoleBar key={r.role} role={r.role} rate={r.rate} />
        ))}
      </div>
    </div>
  );
}
