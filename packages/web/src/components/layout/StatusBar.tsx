import { useEffect, useState } from 'react';
import { Bell } from 'lucide-react';
import { useAgentStore } from '../../stores/agentStore';
import { useTaskStore } from '../../stores/taskStore';
import { useAlertStore } from '../../stores/alertStore';
import { socket, isConnected } from '../../lib/socket-init';

// ─── colour helpers ────────────────────────────────────────────────────────────

const C = {
  cyan:   'text-neon-cyan',
  green:  'text-neon-green',
  amber:  'text-neon-amber',
  pink:   'text-neon-magenta',
} as const;

type NeonColor = typeof C[keyof typeof C];

// ─── Stat pill ────────────────────────────────────────────────────────────────

interface PillProps {
  label: string;
  value: string;
  color: NeonColor;
}

function StatPill({ label, value, color }: PillProps) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#12121f] border border-border-subtle rounded-md">
      <span className="text-[11px] font-sans text-secondary uppercase tracking-wider whitespace-nowrap">
        {label}
      </span>
      <span className={`font-mono font-bold tabular-nums text-xs ${color}`}>
        {value}
      </span>
    </div>
  );
}

// ─── StatusBar ────────────────────────────────────────────────────────────────

export function StatusBar() {
  // ── clock ──────────────────────────────────────────────────────────────────
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const clockStr = time.toLocaleTimeString('en-GB', { hour12: false });

  // ── socket connection ──────────────────────────────────────────────────────
  const [connected, setConnected] = useState(isConnected);
  useEffect(() => {
    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect',    onConnect);
    socket.on('disconnect', onDisconnect);
    return () => {
      socket.off('connect',    onConnect);
      socket.off('disconnect', onDisconnect);
    };
  }, []);

  // ── store data ─────────────────────────────────────────────────────────────
  const agents = useAgentStore(s => s.agents);
  const tasks  = useTaskStore(s => s.tasks);
  const alerts = useAlertStore(s => s.alerts);

  // ── derived agent stats ────────────────────────────────────────────────────
  const totalAgents  = agents.length;
  const onlineAgents = agents.filter(a => a.status === 'idle' || a.status === 'working').length;
  const onlinePct    = totalAgents > 0 ? onlineAgents / totalAgents : 1;
  const agentsColor: NeonColor =
    onlinePct > 0.9 ? C.green :
    onlinePct > 0.7 ? C.amber : C.pink;

  // ── derived task stats ─────────────────────────────────────────────────────
  const activeTasks = tasks.filter(t => t.status === 'active').length;
  const doneTasks   = tasks.filter(t => t.status === 'done').length;
  const queuedTasks = tasks.filter(t => t.status === 'queued').length;
  const failedTasks = tasks.filter(t => t.status === 'failed').length;
  const totalTasks  = tasks.length;

  const queueColor: NeonColor =
    queuedTasks < 20 ? C.green :
    queuedTasks < 50 ? C.amber : C.pink;

  const errorPct     = totalTasks > 0 ? (failedTasks / totalTasks) * 100 : 0;
  const errorColor: NeonColor =
    errorPct < 1 ? C.green :
    errorPct < 3 ? C.amber : C.pink;

  // ── alert badge (unacknowledged = not resolved) ────────────────────────────
  const unacknowledged = alerts.filter(a => a.severity !== 'resolved').length;

  // ── API budget (hardcoded per spec) ───────────────────────────────────────
  const apiBudgetPct  = 34;
  const budgetColor: NeonColor =
    apiBudgetPct < 50 ? C.green :
    apiBudgetPct < 80 ? C.amber : C.pink;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <header className="flex items-center justify-between px-4 border-b border-border-subtle bg-panel h-[48px]">

      {/* ── Left: stat pills ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <StatPill
          label="Agents Online"
          value={`${onlineAgents}/${totalAgents}`}
          color={agentsColor}
        />
        <StatPill
          label="Tasks Active"
          value={String(activeTasks)}
          color={C.cyan}
        />
        <StatPill
          label="Posts Today"
          value={String(doneTasks)}
          color={C.cyan}
        />
        <StatPill
          label="Queue Depth"
          value={String(queuedTasks)}
          color={queueColor}
        />
        <StatPill
          label="Error Rate"
          value={`${errorPct.toFixed(1)}%`}
          color={errorColor}
        />
        <StatPill
          label="API Budget"
          value={`${apiBudgetPct}%`}
          color={budgetColor}
        />
      </div>

      {/* ── Right: clock, alert bell, connection ─────────────────────────── */}
      <div className="flex items-center gap-4">

        {/* Live clock */}
        <span className="font-mono tabular-nums text-sm text-primary">
          {clockStr}
        </span>

        {/* Alert bell */}
        <button
          type="button"
          aria-label={`${unacknowledged} unacknowledged alerts`}
          className="relative flex items-center justify-center text-secondary hover:text-primary transition-colors"
        >
          <Bell size={16} />
          {unacknowledged > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] flex items-center justify-center rounded-full bg-neon-magenta text-[9px] font-mono font-bold text-void leading-none px-[3px]">
              {unacknowledged > 99 ? '99+' : unacknowledged}
            </span>
          )}
        </button>

        {/* Connection indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${connected ? 'bg-neon-green' : 'bg-neon-magenta animate-pulse'}`}
          />
          <span className={`text-[11px] font-mono uppercase tracking-wider ${connected ? 'text-neon-green' : 'text-neon-magenta'}`}>
            {connected ? 'Live' : 'Offline'}
          </span>
        </div>

      </div>
    </header>
  );
}
