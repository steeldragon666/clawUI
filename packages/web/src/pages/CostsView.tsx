import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { mockClients } from '../lib/mock';

// ---------------------------------------------------------------------------
// Deterministic seeded pseudo-random (same helper as mock.ts)
// ---------------------------------------------------------------------------

function seededFloat(seed: number, min: number, max: number): number {
  const val = ((seed * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;
  return min + val * (max - min);
}

function seededInt(seed: number, min: number, max: number): number {
  return Math.floor(seededFloat(seed, min, max + 1));
}

function fmt2(n: number): string {
  return n.toFixed(2);
}

function fmt3(n: number): string {
  return n.toFixed(3);
}

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

// ---------------------------------------------------------------------------
// Cost data types
// ---------------------------------------------------------------------------

interface ClientCostRow {
  id: string;
  name: string;
  tasks24h: number;
  tokensUsed: number;
  apiCost: number;
  avgCostPerTask: number;
  budget: number;
  budgetPct: number;
}

type SortKey = 'name' | 'cost' | 'tasks' | 'tokens' | 'avgCost' | 'budget';

// ---------------------------------------------------------------------------
// Per-client budgets (deterministic, spread realistically)
// ---------------------------------------------------------------------------

const CLIENT_BUDGETS: number[] = mockClients.map((_, i) =>
  // Range $15–$50 per client per day
  Math.round(seededFloat(i * 37 + 1, 15, 50) * 2) / 2
);

// ---------------------------------------------------------------------------
// Generate client cost rows
// ---------------------------------------------------------------------------

function buildClientCostRows(): ClientCostRow[] {
  return mockClients.map((client, i) => {
    const tasks24h    = seededInt(i * 41 + 7,  8,  80);
    const tokensUsed  = seededInt(i * 53 + 3,  120_000, 2_400_000);
    // Cost per 1K tokens: cloud models are $0.003–$0.015, local $0
    // Realistic blended rate assuming ~60% local, ~40% cloud
    const blendedRatePer1k = seededFloat(i * 17 + 5, 0.004, 0.018);
    const apiCost = Number((tokensUsed / 1000 * blendedRatePer1k * 0.4).toFixed(2));
    const avgCostPerTask = tasks24h > 0 ? Number((apiCost / tasks24h).toFixed(4)) : 0;
    const budget = CLIENT_BUDGETS[i];
    const budgetPct = budget > 0 ? (apiCost / budget) * 100 : 0;

    return {
      id: client.id,
      name: client.name,
      tasks24h,
      tokensUsed,
      apiCost,
      avgCostPerTask,
      budget,
      budgetPct,
    };
  });
}

// ---------------------------------------------------------------------------
// Model breakdown
// ---------------------------------------------------------------------------

interface ModelRow {
  name: string;
  cost: number;
  isLocal: boolean;
  queryPct: number;
  color: string;
}

const MODEL_ROWS: ModelRow[] = [
  { name: 'NEMOTRON-NANO-3',   cost: 0,     isLocal: true,  queryPct: 42, color: '#00ff88' },
  { name: 'NEMOTRON-SUPER-3',  cost: 0,     isLocal: true,  queryPct: 31, color: '#00ff88' },
  { name: 'CLAUDE-SONNET-4',   cost: 89.20, isLocal: false, queryPct: 19, color: '#ffaa00' },
  { name: 'GPT-4O',            cost: 38.20, isLocal: false, queryPct:  8, color: '#ff00aa' },
];

// ---------------------------------------------------------------------------
// Hourly cost timeline (24h)
// Daily pattern: low overnight, peak business hours
// ---------------------------------------------------------------------------

// Base hourly spend pattern keyed to actual clock hours 0–23
const HOURLY_BASE_SPEND: number[] = [
  0.4, 0.2, 0.1, 0.1, 0.2, 0.5,   // 00–05 (overnight, minimal)
  1.2, 3.8, 6.4, 9.1,              // 06–09 (morning ramp)
  11.2, 12.8, 13.4, 12.1, 11.6, 10.9,  // 10–15 (peak business)
  8.4, 7.1, 6.2, 5.3,              // 16–19 (afternoon taper)
  4.1, 3.2, 2.1, 1.4,              // 20–23 (evening wind-down)
];

interface HourBar {
  hour: number;      // 0–23
  label: string;     // display label, e.g. "6AM"
  spend: number;
  color: string;
}

function buildHourlyBars(): HourBar[] {
  return HOURLY_BASE_SPEND.map((base, h) => {
    // Add seeded jitter ±15%
    const jitter = seededFloat(h * 61 + 13, -0.15, 0.15);
    const spend = Number(Math.max(0.05, base * (1 + jitter)).toFixed(2));
    const color =
      spend >= 10  ? '#ff00aa' :
      spend >= 5   ? '#ffaa00' :
                     '#00ff88';
    const suffix = h < 12 ? 'AM' : 'PM';
    const display = h === 0 ? '12AM' : h === 12 ? '12PM' : `${h % 12}${suffix}`;
    return { hour: h, label: display, spend, color };
  });
}

// ---------------------------------------------------------------------------
// Top-level summary figures
// ---------------------------------------------------------------------------

function buildSummaryFigures(rows: ClientCostRow[]) {
  const totalCost = rows.reduce((s, r) => s + r.apiCost, 0);
  const dailyBudget = 200.0;
  const budgetConsumedPct = (totalCost / dailyBudget) * 100;

  // MTD: 14 days elapsed × avg daily spend with slight ramp
  const mtdSpend = 2847.20;

  // Projected EOD based on current rate at current hour
  const now = new Date();
  const hourElapsed = now.getHours() + now.getMinutes() / 60;
  const projectedEod = hourElapsed > 0
    ? Number(((totalCost / hourElapsed) * 24).toFixed(2))
    : totalCost;

  const totalTasks = rows.reduce((s, r) => s + r.tasks24h, 0);
  const avgCostPerTask = totalTasks > 0 ? totalCost / totalTasks : 0;

  return {
    todaySpend: totalCost,
    mtdSpend,
    dailyBudget,
    budgetConsumedPct,
    projectedEod,
    avgCostPerTask,
    daysRemaining: 14,
  };
}

// ---------------------------------------------------------------------------
// Color helpers
// ---------------------------------------------------------------------------

function spendColor(pct: number): string {
  if (pct >= 100) return '#ff00aa';
  if (pct >= 80)  return '#ffaa00';
  return '#00ff88';
}

function projectedColor(projected: number, budget: number): string {
  if (projected > budget)              return '#ff00aa';
  if (projected > budget * 0.9)        return '#ffaa00';
  return '#00ff88';
}

function statusColor(pct: number): string {
  if (pct >= 100) return '#ff00aa';
  if (pct >= 80)  return '#ffaa00';
  return '#00ff88';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// Section header divider
function SectionHeader({ label, accent = '#00f0ff' }: { label: string; accent?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2 shrink-0">
      <span
        className="text-[10px] font-mono uppercase tracking-[0.2em]"
        style={{ color: accent }}
      >
        {label}
      </span>
      <div className="flex-1 h-px" style={{ background: `${accent}22` }} />
    </div>
  );
}

// ---- Summary stat card ----

interface SummaryCardProps {
  label: string;
  value: string;
  sub: string;
  subColor: string;
  icon: React.ReactNode;
  accentColor: string;
  index: number;
}

function SummaryCard({ label, value, sub, subColor, icon, accentColor, index }: SummaryCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
      className="glass-panel flex flex-col gap-1.5 p-4 flex-1 relative overflow-hidden"
      style={{ borderBottomWidth: 2, borderBottomColor: accentColor, borderBottomStyle: 'solid' }}
    >
      {/* Background glow blob */}
      <div
        className="absolute bottom-0 right-0 w-16 h-10 rounded-full blur-2xl opacity-15 pointer-events-none"
        style={{ background: accentColor }}
      />
      <div className="flex items-center justify-between z-10">
        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-secondary">
          {label}
        </span>
        <span style={{ color: accentColor }} className="opacity-60">
          {icon}
        </span>
      </div>
      <span
        className="text-2xl font-mono font-bold tabular-nums z-10 leading-none"
        style={{ color: accentColor }}
      >
        {value}
      </span>
      <span className="text-[10px] font-mono z-10 tabular-nums" style={{ color: subColor }}>
        {sub}
      </span>
    </motion.div>
  );
}

// ---- Client cost table ----

type SortDir = 'asc' | 'desc';

interface ClientCostTableProps {
  rows: ClientCostRow[];
}

function ClientCostTable({ rows }: ClientCostTableProps) {
  const [sortKey, setSortKey]   = useState<SortKey>('cost');
  const [sortDir, setSortDir]   = useState<SortDir>('desc');

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  }

  const sorted = useMemo(() => {
    const copy = rows.slice();
    copy.sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortKey) {
        case 'name':    av = a.name;         bv = b.name;         break;
        case 'tasks':   av = a.tasks24h;     bv = b.tasks24h;     break;
        case 'tokens':  av = a.tokensUsed;   bv = b.tokensUsed;   break;
        case 'cost':    av = a.apiCost;      bv = b.apiCost;      break;
        case 'avgCost': av = a.avgCostPerTask; bv = b.avgCostPerTask; break;
        case 'budget':  av = a.budget;       bv = b.budget;       break;
        default:        av = a.apiCost;      bv = b.apiCost;
      }
      if (typeof av === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv as string) : (bv as string).localeCompare(av);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return copy;
  }, [rows, sortKey, sortDir]);

  const totals = useMemo(() => ({
    tasks24h:      rows.reduce((s, r) => s + r.tasks24h,    0),
    tokensUsed:    rows.reduce((s, r) => s + r.tokensUsed,  0),
    apiCost:       rows.reduce((s, r) => s + r.apiCost,     0),
    budget:        rows.reduce((s, r) => s + r.budget,      0),
  }), [rows]);

  const avgCostPerTaskTotal = totals.tasks24h > 0
    ? totals.apiCost / totals.tasks24h
    : 0;

  function SortArrow({ col }: { col: SortKey }) {
    if (sortKey !== col) return <span className="opacity-20 ml-0.5">↕</span>;
    return <span className="ml-0.5 text-neon-cyan">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  return (
    <div className="flex flex-col min-h-0 flex-1">
      {/* Scrollable table wrapper */}
      <div
        className="flex-1 overflow-y-auto min-h-0"
        style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,240,255,0.2) transparent' }}
      >
        <table className="w-full border-collapse text-[11px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-[#0e0e1a]">
              {/* Client name col — not a duplicate sort key */}
              <th
                className="text-left py-2 px-3 font-mono text-[9px] uppercase tracking-[0.15em] text-secondary cursor-pointer hover:text-primary whitespace-nowrap border-b border-[rgba(255,255,255,0.06)]"
                onClick={() => handleSort('name')}
              >
                Client <SortArrow col="name" />
              </th>
              <th
                className="text-right py-2 px-3 font-mono text-[9px] uppercase tracking-[0.15em] text-secondary cursor-pointer hover:text-primary whitespace-nowrap border-b border-[rgba(255,255,255,0.06)]"
                onClick={() => handleSort('tasks')}
              >
                Tasks (24h) <SortArrow col="tasks" />
              </th>
              <th
                className="text-right py-2 px-3 font-mono text-[9px] uppercase tracking-[0.15em] text-secondary cursor-pointer hover:text-primary whitespace-nowrap border-b border-[rgba(255,255,255,0.06)]"
                onClick={() => handleSort('tokens')}
              >
                Tokens <SortArrow col="tokens" />
              </th>
              <th
                className="text-right py-2 px-3 font-mono text-[9px] uppercase tracking-[0.15em] text-secondary cursor-pointer hover:text-primary whitespace-nowrap border-b border-[rgba(255,255,255,0.06)]"
                onClick={() => handleSort('cost')}
              >
                API Cost <SortArrow col="cost" />
              </th>
              <th
                className="text-right py-2 px-3 font-mono text-[9px] uppercase tracking-[0.15em] text-secondary cursor-pointer hover:text-primary whitespace-nowrap border-b border-[rgba(255,255,255,0.06)]"
                onClick={() => handleSort('avgCost')}
              >
                Avg/Task <SortArrow col="avgCost" />
              </th>
              <th
                className="text-right py-2 px-3 font-mono text-[9px] uppercase tracking-[0.15em] text-secondary cursor-pointer hover:text-primary whitespace-nowrap border-b border-[rgba(255,255,255,0.06)]"
                onClick={() => handleSort('budget')}
              >
                Budget <SortArrow col="budget" />
              </th>
              <th
                className="text-center py-2 px-3 font-mono text-[9px] uppercase tracking-[0.15em] text-secondary whitespace-nowrap border-b border-[rgba(255,255,255,0.06)]"
              >
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => {
              const sc = statusColor(row.budgetPct);
              const isEven = i % 2 === 0;
              return (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: i * 0.02 }}
                  className={`border-b border-[rgba(255,255,255,0.04)] hover:bg-[rgba(0,240,255,0.04)] transition-colors ${
                    isEven ? 'bg-transparent' : 'bg-[rgba(255,255,255,0.015)]'
                  }`}
                >
                  <td className="py-2 px-3 font-mono text-primary whitespace-nowrap">
                    {row.name}
                  </td>
                  <td className="py-2 px-3 font-mono tabular-nums text-right text-secondary">
                    {row.tasks24h}
                  </td>
                  <td className="py-2 px-3 font-mono tabular-nums text-right text-secondary">
                    {fmtK(row.tokensUsed)}
                  </td>
                  <td className="py-2 px-3 font-mono tabular-nums text-right text-neon-amber font-semibold">
                    ${fmt2(row.apiCost)}
                  </td>
                  <td className="py-2 px-3 font-mono tabular-nums text-right text-secondary">
                    ${fmt3(row.avgCostPerTask)}
                  </td>
                  <td className="py-2 px-3 font-mono tabular-nums text-right text-secondary">
                    ${fmt2(row.budget)}
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span
                      className="inline-flex items-center gap-1 text-[10px] font-mono"
                      style={{ color: sc }}
                    >
                      <span
                        className="inline-block w-1.5 h-1.5 rounded-full"
                        style={{ background: sc, boxShadow: `0 0 4px ${sc}` }}
                      />
                      {row.budgetPct >= 100 ? 'OVER' : row.budgetPct >= 80 ? 'WARN' : 'OK'}
                    </span>
                  </td>
                </motion.tr>
              );
            })}
          </tbody>
          {/* Totals row */}
          <tfoot>
            <tr className="border-t-2 border-[rgba(0,240,255,0.2)] bg-[#0e0e1a]">
              <td className="py-2 px-3 font-mono text-[10px] uppercase tracking-wider text-neon-cyan">
                TOTAL
              </td>
              <td className="py-2 px-3 font-mono tabular-nums text-right text-primary font-semibold">
                {totals.tasks24h}
              </td>
              <td className="py-2 px-3 font-mono tabular-nums text-right text-primary font-semibold">
                {fmtK(totals.tokensUsed)}
              </td>
              <td className="py-2 px-3 font-mono tabular-nums text-right font-bold text-neon-amber">
                ${fmt2(totals.apiCost)}
              </td>
              <td className="py-2 px-3 font-mono tabular-nums text-right text-primary font-semibold">
                ${fmt3(avgCostPerTaskTotal)}
              </td>
              <td className="py-2 px-3 font-mono tabular-nums text-right text-primary font-semibold">
                ${fmt2(totals.budget)}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ---- Model breakdown panel ----

function ModelBreakdownPanel() {
  const maxBarPct = Math.max(...MODEL_ROWS.map(m => m.queryPct));

  return (
    <div className="flex flex-col gap-3">
      <SectionHeader label="Cost by Model" accent="#00f0ff" />
      <div className="flex flex-col gap-2">
        {MODEL_ROWS.map((model, i) => (
          <motion.div
            key={model.name}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.07, ease: 'easeOut' }}
            className="flex flex-col gap-1"
          >
            {/* Top row: name + cost + tag */}
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[11px] text-primary tracking-wider truncate">
                {model.name}
              </span>
              <div className="flex items-center gap-2 shrink-0">
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded-sm"
                  style={{
                    color: model.isLocal ? '#00ff88' : '#ffaa00',
                    background: model.isLocal ? 'rgba(0,255,136,0.1)' : 'rgba(255,170,0,0.1)',
                    border: `1px solid ${model.isLocal ? 'rgba(0,255,136,0.25)' : 'rgba(255,170,0,0.25)'}`,
                  }}
                >
                  {model.isLocal ? 'local' : 'cloud'}
                </span>
                <span
                  className="font-mono font-semibold tabular-nums text-[12px] w-16 text-right"
                  style={{ color: model.isLocal ? '#00ff88' : model.color }}
                >
                  {model.cost === 0 ? '$0.00' : `$${fmt2(model.cost)}`}
                </span>
              </div>
            </div>
            {/* Bar + pct */}
            <div className="flex items-center gap-2">
              <div className="flex-1 h-[5px] bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: model.color,
                    boxShadow: `0 0 6px ${model.color}60`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${(model.queryPct / maxBarPct) * 100}%` }}
                  transition={{ duration: 0.7, delay: i * 0.07 + 0.2, ease: 'easeOut' }}
                />
              </div>
              <span
                className="font-mono tabular-nums text-[10px] w-10 text-right shrink-0"
                style={{ color: model.color }}
              >
                {model.queryPct}%
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Cache savings card */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.45 }}
        className="mt-2 glass-panel p-3 flex flex-col gap-2"
        style={{ borderLeftWidth: 3, borderLeftColor: '#00ff88', borderLeftStyle: 'solid' }}
      >
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-neon-green">
            Helicone Cache
          </span>
          <div className="flex-1 h-px bg-[rgba(0,255,136,0.15)]" />
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-secondary">Hit Rate</span>
            <span className="text-[13px] font-mono font-bold tabular-nums text-neon-green">34%</span>
          </div>

          {/* Cache hit progress bar */}
          <div className="h-[4px] w-full bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-neon-green"
              style={{ boxShadow: '0 0 6px rgba(0,255,136,0.5)' }}
              initial={{ width: 0 }}
              animate={{ width: '34%' }}
              transition={{ duration: 0.8, delay: 0.5, ease: 'easeOut' }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-secondary">Est. Savings</span>
            <span className="text-[12px] font-mono font-bold tabular-nums text-neon-green">
              $62.40/day
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-secondary">Cache Hits</span>
            <span className="text-[10px] font-mono tabular-nums text-secondary">
              <span className="text-primary">1,247</span>
              <span className="text-muted"> / 3,667 req</span>
            </span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

// ---- 24h cost timeline ----

function CostTimeline({ bars }: { bars: HourBar[] }) {
  const maxSpend = Math.max(...bars.map(b => b.spend));
  // Display order: start from 6AM, wrap around (6AM … 5AM)
  const orderedBars = [
    ...bars.slice(6),   // 6AM … 11PM
    ...bars.slice(0, 6), // midnight … 5AM
  ];

  return (
    <div className="flex flex-col gap-2">
      <SectionHeader label="24h Cost Timeline" accent="#00f0ff" />

      {/* Legend */}
      <div className="flex items-center gap-4 text-[9px] font-mono shrink-0">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-sm bg-neon-green" style={{ boxShadow: '0 0 4px rgba(0,255,136,0.6)' }} />
          <span className="text-secondary">&lt;$5/hr</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-sm bg-neon-amber" style={{ boxShadow: '0 0 4px rgba(255,170,0,0.6)' }} />
          <span className="text-secondary">$5–$10/hr</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-sm bg-neon-magenta" style={{ boxShadow: '0 0 4px rgba(255,0,170,0.6)' }} />
          <span className="text-secondary">&gt;$10/hr</span>
        </span>
        <span className="ml-auto text-muted tabular-nums">MAX ${fmt2(maxSpend)}/hr</span>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-[3px] h-[80px]">
        {orderedBars.map((bar, i) => {
          const heightPct = maxSpend > 0 ? (bar.spend / maxSpend) * 100 : 0;
          return (
            <div
              key={bar.hour}
              className="flex flex-col items-center flex-1 min-w-0 gap-0.5 group relative"
            >
              {/* Tooltip on hover */}
              <div
                className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 bg-[#0e0e1a] border border-[rgba(255,255,255,0.1)] rounded-sm px-1.5 py-1 text-[9px] font-mono whitespace-nowrap"
                style={{ color: bar.color }}
              >
                ${fmt2(bar.spend)}
              </div>

              {/* Bar */}
              <motion.div
                className="w-full rounded-t-sm"
                style={{
                  background: bar.color,
                  boxShadow: `0 0 6px ${bar.color}50`,
                  height: `${heightPct}%`,
                  minHeight: 2,
                }}
                initial={{ scaleY: 0, originY: 1 }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 0.4, delay: i * 0.02, ease: 'easeOut' }}
              />
            </div>
          );
        })}
      </div>

      {/* X-axis labels — show every 3rd hour to avoid overlap */}
      <div className="flex items-center gap-[3px]">
        {orderedBars.map((bar, i) => (
          <div key={bar.hour} className="flex-1 min-w-0 text-center">
            {i % 3 === 0 ? (
              <span className="text-[8px] font-mono text-muted tabular-nums whitespace-nowrap">
                {bar.label}
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function CostsView() {
  const clientRows = useMemo(() => buildClientCostRows(), []);
  const summary    = useMemo(() => buildSummaryFigures(clientRows), [clientRows]);
  const hourlyBars = useMemo(() => buildHourlyBars(), []);

  const todayColor     = spendColor(summary.budgetConsumedPct);
  const projectedColor_ = projectedColor(summary.projectedEod, summary.dailyBudget);

  // Projected label
  const projectedLabel =
    summary.projectedEod > summary.dailyBudget
      ? '● OVER BUDGET'
      : summary.projectedEod > summary.dailyBudget * 0.9
        ? '● NEAR LIMIT'
        : '● UNDER BUDGET';

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden">

      {/* ------------------------------------------------------------------ */}
      {/* View header                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="shrink-0 flex items-center gap-2">
        <DollarSign size={14} className="text-neon-cyan opacity-80" />
        <h1 className="text-[10px] font-mono font-semibold uppercase tracking-[0.2em] text-neon-cyan">
          API Cost Tracking
        </h1>
        <div className="flex-1 h-px bg-[rgba(0,240,255,0.15)]" />
        <span className="text-[10px] font-mono text-secondary tabular-nums">
          VIA HELICONE
        </span>
        <span className="text-[10px] font-mono text-muted ml-2">
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </span>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 1: Summary stats                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="shrink-0 grid grid-cols-5 gap-3">
        <SummaryCard
          index={0}
          label="Today's Spend"
          value={`$${fmt2(summary.todaySpend)}`}
          sub={
            summary.budgetConsumedPct >= 100
              ? `▲ OVER BUDGET`
              : `▲ +12% vs avg`
          }
          subColor={todayColor}
          accentColor={todayColor}
          icon={<DollarSign size={14} />}
        />
        <SummaryCard
          index={1}
          label="MTD Spend"
          value={`$${summary.mtdSpend.toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
          sub={`${summary.daysRemaining} days remaining`}
          subColor="#6a6a7a"
          accentColor="#00f0ff"
          icon={<TrendingUp size={14} />}
        />
        <SummaryCard
          index={2}
          label="Daily Budget"
          value={`$${fmt2(summary.dailyBudget)}`}
          sub={`${summary.budgetConsumedPct.toFixed(0)}% consumed`}
          subColor={todayColor}
          accentColor={todayColor}
          icon={<DollarSign size={14} />}
        />
        <SummaryCard
          index={3}
          label="Projected EOD"
          value={`$${fmt2(summary.projectedEod)}`}
          sub={projectedLabel}
          subColor={projectedColor_}
          accentColor={projectedColor_}
          icon={<TrendingUp size={14} />}
        />
        <SummaryCard
          index={4}
          label="Cost / Task Avg"
          value={`$${summary.avgCostPerTask.toFixed(3)}`}
          sub="▼ -8% vs 7d avg"
          subColor="#00ff88"
          accentColor="#ffaa00"
          icon={<TrendingDown size={14} />}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: Main content — 60% / 40%                                 */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex gap-3 min-h-0" style={{ flex: '1 1 0', minHeight: 0 }}>

        {/* Left: Client cost table — 60% */}
        <motion.div
          className="glass-panel flex flex-col p-3 overflow-hidden"
          style={{ flex: '0 0 60%' }}
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <SectionHeader label="Cost by Client" accent="#00f0ff" />
          <ClientCostTable rows={clientRows} />
        </motion.div>

        {/* Right: Model breakdown — 40% */}
        <motion.div
          className="glass-panel flex flex-col p-3 overflow-y-auto"
          style={{
            flex: '0 0 40%',
            scrollbarWidth: 'thin',
            scrollbarColor: 'rgba(0,240,255,0.2) transparent',
          }}
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <ModelBreakdownPanel />
        </motion.div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 3: 24h cost timeline                                         */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        className="glass-panel shrink-0 p-3"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.28 }}
      >
        <CostTimeline bars={hourlyBars} />
      </motion.div>

    </div>
  );
}
