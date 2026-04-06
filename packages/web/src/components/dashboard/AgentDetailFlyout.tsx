import { useEffect, useState } from 'react';
import type { Agent, Task } from '@omniscient/shared';
import { useAgentCommand } from '../../hooks/useAgentCommand';
import { useTaskStore } from '../../stores/taskStore';
import { motion } from 'framer-motion';
import { Sparkline } from '../charts/Sparkline';
import { SessionWaterfall } from './SessionWaterfall';
import { X } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Props {
  agent: Agent & { clientName?: string };
  onClose: () => void;
}

type Tab = 'overview' | 'log' | 'tasks';

// Mock log lines for terminal display
const MOCK_LOG_LINES = Array.from({ length: 100 }, (_, i) => {
  const ts = new Date(Date.now() - (100 - i) * 30000).toISOString().slice(11, 23);
  const types = [
    `[INFO]  Heartbeat sent — cpu=${(30 + Math.random() * 50).toFixed(0)}% mem=${(40 + Math.random() * 30).toFixed(0)}%`,
    `[INFO]  Task picked from queue — processing...`,
    `[INFO]  Content generated — 280 chars, brand_voice_score=0.92`,
    `[INFO]  API call completed — tokens_used=1247, latency=1.2s`,
    `[WARN]  Rate limit approaching — 85% consumed for this window`,
    `[INFO]  Task completed successfully — duration=14.3s`,
    `[INFO]  Idle — polling for next task...`,
    `[DEBUG] Config refreshed from control plane`,
  ];
  return `${ts} ${types[i % types.length]}`;
});

function formatUptime(lastHeartbeat?: string | Date | null): string {
  if (!lastHeartbeat) return '--';
  const diff = Date.now() - new Date(lastHeartbeat).getTime();
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
}

export function AgentDetailFlyout({ agent, onClose }: Props) {
  const [tab, setTab] = useState<Tab>('overview');
  const { sendCommand, loading } = useAgentCommand();
  const [confirmKill, setConfirmKill] = useState(false);
  const allTasks = useTaskStore(s => s.tasks);

  const agentTasks = allTasks.filter(t => t.agentId === agent.id).slice(0, 20);

  // ESC to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Mock sparkline data
  const cpuHistory = Array.from({ length: 30 }, () => 20 + Math.random() * 60);
  const memHistory = Array.from({ length: 30 }, () => 30 + Math.random() * 40);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'OVERVIEW' },
    { key: 'log', label: 'LOG' },
    { key: 'tasks', label: 'TASKS' },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-40 flex justify-end"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="w-[400px] h-full bg-[#0a0a0f] border-l border-neon-cyan/30 shadow-2xl overflow-hidden flex flex-col"
        initial={{ x: 400 }}
        animate={{ x: 0 }}
        exit={{ x: 400 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        onClick={e => e.stopPropagation()}
        style={{ backdropFilter: 'blur(12px)' }}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border-subtle flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`w-2.5 h-2.5 rounded-full ${agent.status === 'working' ? 'bg-neon-cyan glow-cyan' : agent.status === 'error' ? 'bg-neon-magenta glow-magenta' : 'bg-secondary'}`} />
            <div className="min-w-0">
              <h2 className="font-mono text-sm font-bold text-primary truncate">{agent.name}</h2>
              <span className="font-mono text-[10px] text-secondary uppercase tracking-widest">{agent.role}</span>
            </div>
          </div>
          <button onClick={onClose} className="text-secondary hover:text-primary transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Tab bar */}
        <div className="flex border-b border-border-subtle shrink-0">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex-1 py-2 font-mono text-[10px] tracking-widest transition-colors ${
                tab === t.key
                  ? 'text-neon-cyan border-b-2 border-neon-cyan'
                  : 'text-secondary hover:text-primary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {tab === 'overview' && (
            <div className="p-4 flex flex-col gap-4">
              {/* Status + Client + Uptime */}
              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono text-secondary tracking-widest">STATUS</span>
                  <span className={`text-sm font-mono font-bold ${agent.status === 'working' ? 'text-neon-cyan' : agent.status === 'error' ? 'text-neon-magenta' : 'text-primary'}`}>
                    {agent.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono text-secondary tracking-widest">CLIENT</span>
                  <span className="text-sm font-mono text-primary truncate">{(agent as any).clientName || '—'}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-mono text-secondary tracking-widest">UPTIME</span>
                  <span className="text-sm font-mono text-primary tabular-nums">{formatUptime(agent.lastHeartbeat)}</span>
                </div>
              </div>

              {/* CPU/Memory with sparklines */}
              <div className="flex flex-col gap-3">
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-secondary mb-1">
                    <span>CPU</span>
                    <span className="tabular-nums">{agent.cpuPercent || 0}%</span>
                  </div>
                  <div className="h-1.5 bg-[#1e1e2d] rounded-sm overflow-hidden">
                    <div className="h-full bg-neon-cyan transition-all" style={{ width: `${agent.cpuPercent || 0}%` }} />
                  </div>
                  <Sparkline data={cpuHistory} color="#00f0ff" height={28} />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] font-mono text-secondary mb-1">
                    <span>MEMORY</span>
                    <span className="tabular-nums">{agent.memoryPercent || 0}%</span>
                  </div>
                  <div className="h-1.5 bg-[#1e1e2d] rounded-sm overflow-hidden">
                    <div className="h-full bg-neon-green transition-all" style={{ width: `${agent.memoryPercent || 0}%` }} />
                  </div>
                  <Sparkline data={memHistory} color="#00ff88" height={28} />
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 border-t border-border-subtle pt-3">
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-mono text-secondary tracking-widest">TASKS DONE</span>
                  <span className="text-lg font-mono font-bold text-primary tabular-nums">{agent.taskCounter || 0}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-mono text-secondary tracking-widest">QUEUE</span>
                  <span className="text-lg font-mono font-bold text-primary tabular-nums">{agent.queueDepth || 0}</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[9px] font-mono text-secondary tracking-widest">ERRORS 24H</span>
                  <span className="text-lg font-mono font-bold text-neon-magenta tabular-nums">0</span>
                </div>
              </div>

              {/* Last 5 task results */}
              <div className="border-t border-border-subtle pt-3">
                <span className="text-[9px] font-mono text-secondary tracking-widest">RECENT RESULTS</span>
                <div className="flex gap-1 mt-2">
                  {agentTasks.slice(0, 5).map(t => (
                    <div
                      key={t.id}
                      className={`w-6 h-6 rounded-sm flex items-center justify-center text-[8px] font-mono font-bold ${
                        t.status === 'done' ? 'bg-neon-green/20 text-neon-green' :
                        t.status === 'failed' ? 'bg-neon-magenta/20 text-neon-magenta' :
                        'bg-neon-cyan/20 text-neon-cyan'
                      }`}
                    >
                      {t.status === 'done' ? '✓' : t.status === 'failed' ? '✗' : '…'}
                    </div>
                  ))}
                  {agentTasks.length === 0 && <span className="text-[10px] font-mono text-muted">No tasks</span>}
                </div>
              </div>
            </div>
          )}

          {tab === 'log' && (
            <SessionWaterfall agentId={agent.id} agentName={agent.name} />
          )}

          {tab === 'tasks' && (
            <div className="p-2">
              <table className="w-full">
                <thead>
                  <tr className="text-[9px] font-mono text-secondary tracking-widest border-b border-border-subtle">
                    <th className="text-left py-2 px-2">TASK</th>
                    <th className="text-left py-2 px-1">STATUS</th>
                    <th className="text-right py-2 px-2">DURATION</th>
                  </tr>
                </thead>
                <tbody>
                  {agentTasks.map(task => (
                    <tr key={task.id} className="border-b border-white/[0.02] hover:bg-white/5">
                      <td className="py-1.5 px-2">
                        <span className="text-[11px] font-mono text-primary truncate block max-w-[180px]">{task.title}</span>
                        <span className="text-[9px] font-mono text-muted">{task.type}</span>
                      </td>
                      <td className="py-1.5 px-1">
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-sm border ${
                          task.status === 'done' ? 'text-neon-green border-neon-green/30' :
                          task.status === 'failed' ? 'text-neon-magenta border-neon-magenta/30' :
                          task.status === 'active' ? 'text-neon-cyan border-neon-cyan/30' :
                          'text-secondary border-border-subtle'
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        <span className="text-[10px] font-mono text-secondary tabular-nums">
                          {task.actualDuration ? `${task.actualDuration}s` : '—'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {agentTasks.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-[10px] font-mono text-muted">NO TASKS</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="px-4 py-3 border-t border-border-subtle flex gap-2 shrink-0">
          <button
            onClick={() => sendCommand(agent.id, agent.status === 'paused' ? 'resume' : 'pause')}
            disabled={loading}
            className="flex-1 py-1.5 border border-neon-cyan text-neon-cyan font-mono text-[10px] hover:bg-neon-cyan/10 transition-colors disabled:opacity-50"
          >
            {agent.status === 'paused' ? 'RESUME' : 'PAUSE'}
          </button>
          <button
            onClick={() => sendCommand(agent.id, 'restart')}
            disabled={loading}
            className="flex-1 py-1.5 border border-[#0088ff] text-[#0088ff] font-mono text-[10px] hover:bg-[#0088ff]/10 transition-colors disabled:opacity-50"
          >
            RESTART
          </button>
          {confirmKill ? (
            <button
              onClick={() => { sendCommand(agent.id, 'kill'); setConfirmKill(false); }}
              disabled={loading}
              className="flex-1 py-1.5 bg-neon-magenta/20 border border-neon-magenta text-neon-magenta font-mono text-[10px] animate-pulse disabled:opacity-50"
            >
              CONFIRM KILL
            </button>
          ) : (
            <button
              onClick={() => setConfirmKill(true)}
              disabled={loading}
              className="py-1.5 px-4 border border-neon-magenta text-neon-magenta font-mono text-[10px] hover:bg-neon-magenta/10 transition-colors disabled:opacity-50"
            >
              KILL
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
