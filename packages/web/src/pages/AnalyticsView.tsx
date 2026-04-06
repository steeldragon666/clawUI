import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

// ---------------------------------------------------------------------------
// Design constants
// ---------------------------------------------------------------------------

const COLORS = {
  cyan:    '#00f0ff',
  magenta: '#ff00aa',
  green:   '#00ff88',
  amber:   '#ffaa00',
  blue:    '#0088ff',
  blue500: '#3b82f6',
} as const;

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const STAGGER_CONTAINER = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

const FADE_UP = {
  hidden:  { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

// ---------------------------------------------------------------------------
// Section 1 — Quality Summary Stat Cards
// ---------------------------------------------------------------------------

interface QualityStatCardProps {
  label: string;
  value: string;
  delta: string;
  trend: 'up' | 'down' | 'stable';
  accentColor: string;
  glowClass: string;
}

function QualityStatCard({ label, value, delta, trend, accentColor, glowClass }: QualityStatCardProps) {
  const TrendIcon =
    trend === 'up'     ? TrendingUp   :
    trend === 'down'   ? TrendingDown :
                         Minus;

  const trendColor =
    trend === 'up'     ? 'text-neon-green'   :
    trend === 'down'   ? 'text-neon-magenta' :
                         'text-neon-amber';

  return (
    <motion.div
      variants={FADE_UP}
      className={`glass-panel flex flex-col p-4 ${glowClass}`}
      style={{ borderBottomWidth: 2, borderBottomColor: accentColor }}
    >
      <span className="text-[11px] font-sans uppercase tracking-wider text-secondary mb-1">{label}</span>
      <span className="text-2xl font-mono font-bold tabular-nums leading-none text-primary" style={{ color: accentColor }}>
        {value}
      </span>
      <div className={`flex items-center gap-1 mt-1.5 ${trendColor}`}>
        <TrendIcon size={10} strokeWidth={2.5} />
        <span className="text-[10px] font-mono">{delta}</span>
      </div>
    </motion.div>
  );
}

function QualitySummaryRow() {
  return (
    <motion.div
      className="grid grid-cols-4 gap-3 shrink-0"
      initial="hidden"
      animate="visible"
      variants={STAGGER_CONTAINER}
    >
      <QualityStatCard
        label="Content Quality"
        value="0.87 / 1.0"
        delta="+0.03 vs 7d"
        trend="up"
        accentColor={COLORS.green}
        glowClass="glow-green"
      />
      <QualityStatCard
        label="Brand Voice Match"
        value="94.2%"
        delta="+1.2% vs 7d"
        trend="up"
        accentColor={COLORS.cyan}
        glowClass="glow-cyan"
      />
      <QualityStatCard
        label="Fact-Check Pass Rate"
        value="98.7%"
        delta="stable"
        trend="stable"
        accentColor={COLORS.amber}
        glowClass="glow-amber"
      />
      <QualityStatCard
        label="Engagement Score"
        value="7.4 / 10"
        delta="+0.8 vs 7d"
        trend="up"
        accentColor={COLORS.green}
        glowClass="glow-green"
      />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Section 2 Left — Panel A: Content Quality Trend (7-day spark bars)
// ---------------------------------------------------------------------------

interface DayBar {
  day: string;
  score: number; // 0.0–1.0
}

const QUALITY_TREND: DayBar[] = [
  { day: 'Mon', score: 0.82 },
  { day: 'Tue', score: 0.84 },
  { day: 'Wed', score: 0.83 },
  { day: 'Thu', score: 0.86 },
  { day: 'Fri', score: 0.88 },
  { day: 'Sat', score: 0.87 },
  { day: 'Sun', score: 0.91 },
];

function qualityBarColor(score: number): string {
  if (score >= 0.88) return COLORS.green;
  if (score >= 0.84) return COLORS.cyan;
  return COLORS.amber;
}

function ContentQualityTrend() {
  const maxScore = 1.0;
  const chartH = 64; // px height of bar area

  return (
    <div className="glass-panel hud-corners flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle shrink-0">
        <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-neon-cyan">
          Content Quality Trend
        </h2>
        <span className="text-[9px] font-mono text-secondary">7-DAY WINDOW</span>
      </div>

      <div className="flex-1 px-3 pb-3 pt-3 flex flex-col gap-2">
        {/* Bar chart */}
        <div className="flex items-end gap-1.5" style={{ height: chartH }}>
          {QUALITY_TREND.map((d) => {
            const heightPct = (d.score / maxScore) * 100;
            const color = qualityBarColor(d.score);
            return (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span
                  className="text-[8px] font-mono tabular-nums"
                  style={{ color }}
                >
                  {d.score.toFixed(2)}
                </span>
                <div
                  className="w-full rounded-sm transition-all"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: color,
                    boxShadow: `0 0 6px ${color}55`,
                    minHeight: 4,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Day labels */}
        <div className="flex gap-1.5">
          {QUALITY_TREND.map((d) => (
            <div key={d.day} className="flex-1 text-center text-[9px] font-mono text-muted">
              {d.day}
            </div>
          ))}
        </div>

        {/* Y-axis legend */}
        <div className="flex items-center justify-between text-[9px] font-mono text-muted border-t border-border-subtle pt-1.5 mt-0.5">
          <span>SCORE 0.0–1.0</span>
          <span className="text-neon-green">
            AVG {(QUALITY_TREND.reduce((s, d) => s + d.score, 0) / QUALITY_TREND.length).toFixed(3)}
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2 Left — Panel B: Task Duration Distribution
// ---------------------------------------------------------------------------

interface DurationBucket {
  label: string;
  count: number;
  modal: boolean;
}

const DURATION_BUCKETS: DurationBucket[] = [
  { label: '<10s',   count: 18,  modal: false },
  { label: '10-30s', count: 52,  modal: false },
  { label: '30-60s', count: 124, modal: false },
  { label: '1-2m',   count: 157, modal: true  },
  { label: '2-5m',   count: 89,  modal: false },
  { label: '5-10m',  count: 41,  modal: false },
  { label: '10-30m', count: 16,  modal: false },
  { label: '>30m',   count: 7,   modal: false },
];

function TaskDurationDistribution() {
  const maxCount = Math.max(...DURATION_BUCKETS.map(b => b.count));
  const chartH = 68;

  return (
    <div className="glass-panel hud-corners flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle shrink-0">
        <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-neon-amber">
          Task Duration Distribution
        </h2>
        <span className="text-[9px] font-mono text-secondary">LAST 24H · {DURATION_BUCKETS.reduce((s, b) => s + b.count, 0)} TASKS</span>
      </div>

      <div className="flex-1 px-3 pb-3 pt-3 flex flex-col gap-2">
        <div className="flex items-end gap-1" style={{ height: chartH }}>
          {DURATION_BUCKETS.map((b) => {
            const heightPct = (b.count / maxCount) * 100;
            const color = b.modal ? COLORS.cyan : 'rgba(255,255,255,0.15)';
            const glow = b.modal ? `0 0 8px ${COLORS.cyan}66` : 'none';
            return (
              <div key={b.label} className="flex-1 flex flex-col items-center gap-0.5">
                <span
                  className="text-[8px] font-mono tabular-nums"
                  style={{ color: b.modal ? COLORS.cyan : 'rgba(255,255,255,0.4)' }}
                >
                  {b.count}
                </span>
                <div
                  className="w-full rounded-sm"
                  style={{
                    height: `${heightPct}%`,
                    backgroundColor: color,
                    boxShadow: glow,
                    minHeight: 3,
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* Bucket labels */}
        <div className="flex gap-1">
          {DURATION_BUCKETS.map((b) => (
            <div
              key={b.label}
              className="flex-1 text-center font-mono"
              style={{
                fontSize: '7px',
                color: b.modal ? COLORS.cyan : 'rgba(255,255,255,0.3)',
              }}
            >
              {b.label}
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[9px] font-mono border-t border-border-subtle pt-1.5 mt-0.5">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-sm inline-block" style={{ backgroundColor: COLORS.cyan }} />
            <span style={{ color: COLORS.cyan }}>modal bucket</span>
          </span>
          <span className="text-secondary">|</span>
          <span className="text-muted">bell distribution around 1-2m</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2 Right — Panel A: Error Analysis Pivot
// ---------------------------------------------------------------------------

type ErrorTrend = 'improving' | 'stable' | 'worsening';

interface ErrorRow {
  type: string;
  count: number;
  pct: string;
  trend: ErrorTrend;
}

const ERROR_ROWS: ErrorRow[] = [
  { type: 'Hallucination',        count: 12, pct: '2.1%', trend: 'improving' },
  { type: 'Brand voice mismatch', count: 8,  pct: '1.4%', trend: 'stable'    },
  { type: 'Rate limit exceeded',  count: 6,  pct: '1.0%', trend: 'worsening' },
  { type: 'Content too long',     count: 4,  pct: '0.7%', trend: 'improving' },
  { type: 'PII leak attempt',     count: 2,  pct: '0.3%', trend: 'stable'    },
  { type: 'Fact-check failure',   count: 1,  pct: '0.2%', trend: 'improving' },
];

function TrendIndicator({ trend }: { trend: ErrorTrend }) {
  if (trend === 'improving') {
    return (
      <span className="flex items-center gap-0.5 text-neon-green text-[9px] font-mono">
        <TrendingDown size={9} strokeWidth={2.5} />
        improving
      </span>
    );
  }
  if (trend === 'worsening') {
    return (
      <span className="flex items-center gap-0.5 text-neon-magenta text-[9px] font-mono">
        <TrendingUp size={9} strokeWidth={2.5} />
        worsening
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-neon-amber text-[9px] font-mono">
      <Minus size={9} strokeWidth={2.5} />
      stable
    </span>
  );
}

function ErrorAnalysisPivot() {
  const total = ERROR_ROWS.reduce((s, r) => s + r.count, 0);

  return (
    <div className="glass-panel hud-corners flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle shrink-0">
        <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-neon-magenta">
          Error Analysis
        </h2>
        <span className="text-[9px] font-mono text-secondary">{total} ERRORS · 7D</span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-3 py-1.5 border-b border-border-subtle">
          {['ERROR TYPE', 'COUNT', '%', 'TREND'].map((h) => (
            <span key={h} className="text-[8px] font-mono uppercase tracking-wider text-muted">{h}</span>
          ))}
        </div>

        {/* Rows */}
        <div className="divide-y divide-border-subtle">
          {ERROR_ROWS.map((row) => (
            <motion.div
              key={row.type}
              variants={FADE_UP}
              className="grid grid-cols-[1fr_auto_auto_auto] gap-x-3 px-3 py-2 items-center hover:bg-white/[0.02] transition-colors"
            >
              <span className="font-sans text-[10px] text-primary truncate">{row.type}</span>
              <span className="font-mono text-[10px] tabular-nums text-secondary text-right">{row.count}</span>
              <span className="font-mono text-[10px] tabular-nums text-muted text-right">{row.pct}</span>
              <TrendIndicator trend={row.trend} />
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2 Right — Panel B: Model Performance Comparison
// ---------------------------------------------------------------------------

interface ModelRow {
  name: string;
  quality: number;   // 0.0–1.0
  speedSec: number;  // seconds
  costQuery: string;
}

const MODEL_ROWS: ModelRow[] = [
  { name: 'nemotron-nano-3',  quality: 0.79, speedSec: 1.2, costQuery: '$0.00'  },
  { name: 'nemotron-3-super', quality: 0.86, speedSec: 2.8, costQuery: '$0.00'  },
  { name: 'claude-sonnet-4',  quality: 0.94, speedSec: 3.1, costQuery: '$0.003' },
  { name: 'gpt-4o',           quality: 0.91, speedSec: 2.4, costQuery: '$0.005' },
];

function qualityColor(q: number): string {
  if (q >= 0.9) return COLORS.green;
  if (q >= 0.8) return COLORS.cyan;
  return COLORS.amber;
}

function speedColor(s: number): string {
  if (s < 2)  return COLORS.green;
  if (s <= 4) return COLORS.amber;
  return COLORS.magenta;
}

function ModelPerformanceComparison() {
  return (
    <div className="glass-panel hud-corners flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle shrink-0">
        <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-neon-green">
          Model Performance
        </h2>
        <span className="text-[9px] font-mono text-secondary">QUALITY · SPEED · COST</span>
      </div>

      <div className="flex-1 px-3 py-2 flex flex-col gap-2.5">
        {MODEL_ROWS.map((model) => {
          const qColor = qualityColor(model.quality);
          const sColor = speedColor(model.speedSec);

          return (
            <div key={model.name} className="flex flex-col gap-1">
              {/* Name + speed + cost */}
              <div className="flex items-center justify-between">
                <span className="font-mono text-[10px] text-primary font-semibold">{model.name}</span>
                <div className="flex items-center gap-3 text-[9px] font-mono tabular-nums">
                  <span style={{ color: sColor }}>{model.speedSec.toFixed(1)}s</span>
                  <span className="text-muted">{model.costQuery}/q</span>
                </div>
              </div>

              {/* Quality bar */}
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-mono text-muted w-[14px]">Q</span>
                <div className="flex-1 h-[5px] rounded-sm bg-white/5 overflow-hidden">
                  <div
                    className="h-full rounded-sm transition-all"
                    style={{
                      width: `${model.quality * 100}%`,
                      backgroundColor: qColor,
                      boxShadow: `0 0 4px ${qColor}66`,
                    }}
                  />
                </div>
                <span
                  className="text-[9px] font-mono tabular-nums w-[30px] text-right"
                  style={{ color: qColor }}
                >
                  {model.quality.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 3 — Scatter Plot: Quality vs Engagement
// ---------------------------------------------------------------------------

type Platform = 'X' | 'LinkedIn' | 'Facebook' | 'Instagram';

interface ScatterPoint {
  quality: number;     // 0.7–1.0
  engagement: number;  // 0–8 (%)
  platform: Platform;
}

// Generate ~30 correlated data points with platform variety
const SCATTER_POINTS: ScatterPoint[] = [
  // X
  { quality: 0.72, engagement: 1.2, platform: 'X' },
  { quality: 0.75, engagement: 1.8, platform: 'X' },
  { quality: 0.79, engagement: 2.1, platform: 'X' },
  { quality: 0.83, engagement: 3.3, platform: 'X' },
  { quality: 0.87, engagement: 4.0, platform: 'X' },
  { quality: 0.91, engagement: 5.2, platform: 'X' },
  { quality: 0.95, engagement: 6.1, platform: 'X' },
  // LinkedIn
  { quality: 0.74, engagement: 0.9, platform: 'LinkedIn' },
  { quality: 0.78, engagement: 1.5, platform: 'LinkedIn' },
  { quality: 0.82, engagement: 2.8, platform: 'LinkedIn' },
  { quality: 0.86, engagement: 3.6, platform: 'LinkedIn' },
  { quality: 0.89, engagement: 4.4, platform: 'LinkedIn' },
  { quality: 0.93, engagement: 5.8, platform: 'LinkedIn' },
  { quality: 0.97, engagement: 6.9, platform: 'LinkedIn' },
  // Facebook
  { quality: 0.71, engagement: 1.4, platform: 'Facebook' },
  { quality: 0.76, engagement: 2.3, platform: 'Facebook' },
  { quality: 0.80, engagement: 2.9, platform: 'Facebook' },
  { quality: 0.85, engagement: 3.8, platform: 'Facebook' },
  { quality: 0.88, engagement: 4.6, platform: 'Facebook' },
  { quality: 0.92, engagement: 5.5, platform: 'Facebook' },
  // Instagram
  { quality: 0.73, engagement: 2.0, platform: 'Instagram' },
  { quality: 0.77, engagement: 3.1, platform: 'Instagram' },
  { quality: 0.81, engagement: 4.2, platform: 'Instagram' },
  { quality: 0.84, engagement: 5.0, platform: 'Instagram' },
  { quality: 0.90, engagement: 6.3, platform: 'Instagram' },
  { quality: 0.94, engagement: 7.2, platform: 'Instagram' },
  { quality: 0.98, engagement: 7.8, platform: 'Instagram' },
  // Noise / outliers
  { quality: 0.76, engagement: 4.1, platform: 'Instagram' },
  { quality: 0.88, engagement: 2.2, platform: 'X' },
  { quality: 0.93, engagement: 3.7, platform: 'Facebook' },
];

const PLATFORM_COLOR: Record<Platform, string> = {
  X:         COLORS.cyan,
  LinkedIn:  COLORS.blue,
  Facebook:  COLORS.blue500,
  Instagram: COLORS.amber,
};

const Q_MIN = 0.70;
const Q_MAX = 1.00;
const E_MIN = 0;
const E_MAX = 8;

const GRID_LINES_X = [0.70, 0.75, 0.80, 0.85, 0.90, 0.95, 1.00];
const GRID_LINES_Y = [0, 2, 4, 6, 8];

function EngagementScatter() {
  const PLOT_H = 140; // px

  return (
    <div className="glass-panel hud-corners flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle shrink-0">
        <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-neon-cyan">
          Content Quality vs Engagement
        </h2>
        <span className="text-[9px] font-mono text-secondary">7-DAY · {SCATTER_POINTS.length} DATA POINTS</span>
      </div>

      <div className="flex-1 px-4 pt-3 pb-3 flex gap-3 min-h-0">
        {/* Y-axis labels */}
        <div className="flex flex-col justify-between text-[8px] font-mono text-muted shrink-0 py-1" style={{ height: PLOT_H }}>
          {[...GRID_LINES_Y].reverse().map((v) => (
            <span key={v}>{v}%</span>
          ))}
        </div>

        {/* Plot area */}
        <div className="flex-1 flex flex-col gap-1 min-w-0">
          <div
            className="relative w-full flex-1 rounded-sm"
            style={{
              height: PLOT_H,
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.05)',
            }}
          >
            {/* Horizontal grid lines */}
            {GRID_LINES_Y.map((e) => {
              const yPct = 100 - ((e - E_MIN) / (E_MAX - E_MIN)) * 100;
              return (
                <div
                  key={`gy-${e}`}
                  className="absolute left-0 right-0"
                  style={{
                    top: `${yPct}%`,
                    height: 1,
                    background: 'rgba(255,255,255,0.05)',
                  }}
                />
              );
            })}

            {/* Vertical grid lines */}
            {GRID_LINES_X.map((q) => {
              const xPct = ((q - Q_MIN) / (Q_MAX - Q_MIN)) * 100;
              return (
                <div
                  key={`gx-${q}`}
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `${xPct}%`,
                    width: 1,
                    background: 'rgba(255,255,255,0.05)',
                  }}
                />
              );
            })}

            {/* Data points */}
            {SCATTER_POINTS.map((pt, i) => {
              const xPct = ((pt.quality - Q_MIN) / (Q_MAX - Q_MIN)) * 100;
              const yPct = 100 - ((pt.engagement - E_MIN) / (E_MAX - E_MIN)) * 100;
              const color = PLATFORM_COLOR[pt.platform];
              return (
                <div
                  key={i}
                  className="absolute rounded-full"
                  style={{
                    left:  `${xPct}%`,
                    top:   `${yPct}%`,
                    width:  5,
                    height: 5,
                    transform: 'translate(-50%, -50%)',
                    backgroundColor: color,
                    boxShadow: `0 0 5px ${color}99`,
                  }}
                  title={`${pt.platform}: Q=${pt.quality.toFixed(2)} E=${pt.engagement.toFixed(1)}%`}
                />
              );
            })}
          </div>

          {/* X-axis labels */}
          <div className="flex justify-between text-[8px] font-mono text-muted px-0">
            {GRID_LINES_X.map((q) => (
              <span key={q}>{q.toFixed(2)}</span>
            ))}
          </div>
          <div className="text-center text-[8px] font-mono text-muted">QUALITY SCORE</div>
        </div>

        {/* Y-axis label */}
        <div
          className="shrink-0 flex items-center text-[8px] font-mono text-muted"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: PLOT_H }}
        >
          ENGAGEMENT %
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-4 pb-3 shrink-0">
        {(Object.entries(PLATFORM_COLOR) as [Platform, string][]).map(([platform, color]) => (
          <span key={platform} className="flex items-center gap-1.5 text-[9px] font-mono">
            <span
              className="rounded-full inline-block"
              style={{ width: 6, height: 6, backgroundColor: color, boxShadow: `0 0 4px ${color}88` }}
            />
            <span className="text-secondary">{platform}</span>
          </span>
        ))}
        <span className="ml-auto text-[9px] font-mono text-muted">positive correlation r=0.78</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root view
// ---------------------------------------------------------------------------

export function AnalyticsView() {
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0 overflow-hidden">

      {/* Section 1: Quality summary stat cards */}
      <QualitySummaryRow />

      {/* Section 2: Two-column main content */}
      <div className="flex-1 grid gap-3 min-h-0" style={{ gridTemplateColumns: '55% 1fr' }}>

        {/* Left column: stacked panels */}
        <div className="flex flex-col gap-3 min-h-0">
          <div className="flex-1 min-h-0">
            <ContentQualityTrend />
          </div>
          <div className="flex-1 min-h-0">
            <TaskDurationDistribution />
          </div>
        </div>

        {/* Right column: stacked panels */}
        <div className="flex flex-col gap-3 min-h-0">
          <motion.div
            className="flex-1 min-h-0"
            initial="hidden"
            animate="visible"
            variants={STAGGER_CONTAINER}
          >
            <ErrorAnalysisPivot />
          </motion.div>
          <div className="flex-1 min-h-0">
            <ModelPerformanceComparison />
          </div>
        </div>
      </div>

      {/* Section 3: Engagement scatter */}
      <div className="shrink-0">
        <EngagementScatter />
      </div>

    </div>
  );
}
