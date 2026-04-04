import { Sparkline } from '../charts/Sparkline';
import { mockAgents, mockTasks, mockMetrics, mockClients } from '../../lib/mock';

interface MetricCardProps {
  label: string;
  value: string;
  color: string;
  delta: { value: string; positive: boolean } | null;
  sparkData: number[];
  sparkColor: string;
}

function MetricCard({ label, value, color, delta, sparkData, sparkColor }: MetricCardProps) {
  return (
    <div className="glass-panel flex flex-col p-4 border-t-0 border-l-0 border-r-0 rounded-none" style={{ borderBottomWidth: 2, borderBottomColor: sparkColor }}>
      <span className="text-[11px] font-sans uppercase tracking-wider text-secondary mb-1">{label}</span>
      <span className={`text-2xl font-mono font-bold tabular-nums ${color}`}>{value}</span>
      <div className="flex items-center justify-between mt-auto pt-2">
        {delta && (
          <span className={`text-[11px] font-mono ${delta.positive ? 'text-neon-green' : 'text-neon-magenta'}`}>
            {delta.positive ? '▲' : '▼'} {delta.value}
          </span>
        )}
        <div className="flex-1 ml-2">
          <Sparkline data={sparkData} color={sparkColor} height={32} />
        </div>
      </div>
    </div>
  );
}

export function MetricsRow() {
  const totalAgents = mockAgents.length;
  const onlineAgents = mockAgents.filter(a => a.status !== 'unreachable' && a.status !== 'dead').length;
  const activeTasks = mockTasks.filter(t => t.status === 'active').length;
  const publishedToday = mockTasks.filter(t => (t as any).pipelineStage === 'published').length;
  const queueDepth = mockTasks.filter(t => t.status === 'queued').length;
  const failedTasks = mockTasks.filter(t => t.status === 'failed').length;
  const totalTasks24h = mockTasks.length;
  const errorRate = totalTasks24h > 0 ? (failedTasks / totalTasks24h * 100) : 0;
  const avgDuration = mockMetrics.avgDuration24h;
  const activeClients = mockClients.length;

  // Colour logic per spec
  const onlineRatio = onlineAgents / totalAgents;
  const agentsColor = onlineRatio > 0.9 ? 'text-neon-green' : onlineRatio > 0.7 ? 'text-neon-amber' : 'text-neon-magenta';
  const queueColor = queueDepth < 20 ? 'text-neon-green' : queueDepth < 50 ? 'text-neon-amber' : 'text-neon-magenta';
  const errorColor = errorRate < 1 ? 'text-neon-green' : errorRate < 3 ? 'text-neon-amber' : 'text-neon-magenta';
  const budgetPercent = 34; // mock
  const budgetColor = budgetPercent < 50 ? 'text-neon-green' : budgetPercent < 80 ? 'text-neon-amber' : 'text-neon-magenta';

  // Sparkline data from mock metrics hourly completions
  const hourly = mockMetrics.completionsPerHour;

  return (
    <div className="grid grid-cols-6 gap-3 w-full">
      <MetricCard
        label="Posts Published Today"
        value={String(publishedToday)}
        color="text-neon-cyan"
        delta={{ value: '+12 vs yesterday', positive: true }}
        sparkData={hourly}
        sparkColor="#00f0ff"
      />
      <MetricCard
        label="Queue Depth"
        value={String(queueDepth)}
        color={queueColor}
        delta={{ value: '-3 vs 1hr ago', positive: true }}
        sparkData={hourly.map((v, i) => Math.max(0, 30 - v + (i % 5)))}
        sparkColor="#ffaa00"
      />
      <MetricCard
        label="Avg Task Duration"
        value={`${avgDuration.toFixed(0)}s`}
        color="text-[#0088ff]"
        delta={{ value: '-8s vs 7d avg', positive: true }}
        sparkData={hourly.map(v => 30 + v * 0.5)}
        sparkColor="#0088ff"
      />
      <MetricCard
        label="Fleet Error Rate"
        value={`${errorRate.toFixed(1)}%`}
        color={errorColor}
        delta={{ value: '-0.5% vs yesterday', positive: true }}
        sparkData={hourly.map((_, i) => i < 12 ? 2 + (i % 3) : 1 + (i % 2))}
        sparkColor="#ff00aa"
      />
      <MetricCard
        label="API Budget Consumed"
        value={`${budgetPercent}%`}
        color={budgetColor}
        delta={{ value: 'proj. 67% EOD', positive: false }}
        sparkData={hourly.map((_, i) => Math.min(100, i * 3 + 5))}
        sparkColor="#ffaa00"
      />
      <MetricCard
        label="Active Clients"
        value={`${activeClients}`}
        color="text-neon-green"
        delta={{ value: '+2 vs yesterday', positive: true }}
        sparkData={hourly.map(() => activeClients - Math.floor(Math.random() * 3))}
        sparkColor="#00ff88"
      />
    </div>
  );
}
