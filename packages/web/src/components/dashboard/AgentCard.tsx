import type { Agent } from '@omniscient/shared';
import { useAgentCommand } from '../../hooks/useAgentCommand';

interface AgentCardProps {
  agent: Agent & { clientName?: string; mvpRole?: string };
  onSelect?: () => void;
}

const STATUS_COLORS: Record<string, { border: string; dot: string; glow: string }> = {
  working:     { border: 'border-l-neon-cyan',    dot: 'bg-neon-cyan',    glow: 'shadow-[0_0_8px_rgba(0,240,255,0.4)]' },
  idle:        { border: 'border-l-neon-amber',   dot: 'bg-neon-amber',   glow: '' },
  error:       { border: 'border-l-neon-magenta',  dot: 'bg-neon-magenta', glow: 'shadow-[0_0_8px_rgba(255,0,170,0.4)]' },
  stalled:     { border: 'border-l-neon-amber',   dot: 'bg-neon-amber',   glow: '' },
  degraded:    { border: 'border-l-neon-amber',   dot: 'bg-neon-amber',   glow: '' },
  unreachable: { border: 'border-l-muted',        dot: 'bg-muted',        glow: '' },
  dead:        { border: 'border-l-muted',        dot: 'bg-muted',        glow: '' },
  paused:      { border: 'border-l-secondary',    dot: 'bg-secondary',    glow: '' },
};

function formatUptime(lastHeartbeat?: string | Date | null): string {
  if (!lastHeartbeat) return '--';
  const diff = Date.now() - new Date(lastHeartbeat).getTime();
  if (diff < 0) return '--';
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

const ROLE_LABELS: Record<string, string> = {
  'content-gen': 'Writer',
  'custom': 'Scheduler',
  'social-post': 'Publisher',
  'engagement-monitor': 'Monitor',
  'seo-optimize': 'Researcher',
  'email-filter': 'Email',
  'blog-writer': 'Blogger',
  'sensor-monitor': 'Sensor',
  'climate-control': 'Climate',
  'irrigation': 'Irrigation',
  'ops-engineer': 'Ops',
};

export function AgentCard({ agent, onSelect }: AgentCardProps) {
  const { sendCommand, loading } = useAgentCommand();
  const colors = STATUS_COLORS[agent.status] || STATUS_COLORS.idle;
  const roleLabel = ROLE_LABELS[agent.role] || agent.role;

  return (
    <div
      className={`h-[120px] bg-[#12121f] border border-border-subtle border-l-[3px] ${colors.border} rounded flex flex-col justify-between p-3 relative overflow-hidden transition-colors hover:bg-[#1a1a2e] cursor-pointer group`}
      onClick={onSelect}
    >
      {/* Top: ID + status dot */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${colors.dot} ${colors.glow}`} />
          <span className="font-mono text-[11px] text-primary font-bold">{agent.name}</span>
        </div>
        <span className={`text-[9px] font-mono uppercase tracking-wider ${agent.status === 'working' ? 'text-neon-cyan' : agent.status === 'error' ? 'text-neon-magenta' : 'text-secondary'}`}>
          {agent.status}
        </span>
      </div>

      {/* Middle: current task or idle */}
      <div className="flex-1 mt-1.5">
        {agent.currentTaskId ? (
          <p className="text-[11px] font-sans text-primary leading-snug line-clamp-2">
            Task in progress...
          </p>
        ) : (
          <p className="text-[11px] font-sans text-muted leading-snug">
            Awaiting assignment
          </p>
        )}
      </div>

      {/* Bottom: client badge, uptime, role */}
      <div className="flex items-center justify-between gap-1 mt-1">
        {(agent as any).clientName && (
          <span className="text-[9px] font-mono bg-white/5 border border-border-subtle px-1.5 py-0.5 rounded text-secondary truncate max-w-[80px]">
            {(agent as any).clientName}
          </span>
        )}
        <span className="text-[9px] font-mono text-muted tabular-nums">{formatUptime(agent.lastHeartbeat)}</span>
        <span className="text-[9px] font-mono text-secondary bg-white/5 px-1.5 py-0.5 rounded">{roleLabel}</span>
      </div>

      {/* Hover overlay with controls */}
      <div
        className="absolute inset-0 bg-[rgba(10,10,15,0.92)] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 z-20 backdrop-blur-sm"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={() => sendCommand(agent.id, agent.status === 'paused' ? 'resume' : 'pause')}
          disabled={loading}
          className="px-3 py-1 border border-neon-cyan text-neon-cyan font-mono text-[10px] hover:bg-neon-cyan/10 transition-colors disabled:opacity-50"
        >
          {agent.status === 'paused' ? 'RESUME' : 'PAUSE'}
        </button>
        <button
          onClick={() => sendCommand(agent.id, 'kill')}
          disabled={loading}
          className="px-3 py-1 border border-neon-magenta text-neon-magenta font-mono text-[10px] hover:bg-neon-magenta/10 transition-colors disabled:opacity-50"
        >
          KILL
        </button>
        <button
          onClick={onSelect}
          className="px-3 py-1 border border-white/20 text-primary font-mono text-[10px] hover:bg-white/10 transition-colors"
        >
          DETAIL
        </button>
      </div>
    </div>
  );
}
