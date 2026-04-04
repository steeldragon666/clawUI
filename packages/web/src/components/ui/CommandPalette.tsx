import { useEffect, useState, useMemo } from 'react';
import { useAgentStore } from '../../stores/agentStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface Action {
  id: string;
  label: string;
  type: 'danger' | 'warning' | 'info' | 'default';
  execute: () => Promise<void> | void;
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const agents = useAgentStore(s => s.agents);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const actions: Action[] = useMemo(() => {
    const allIds = agents.map(a => a.id);
    const workingIds = agents.filter(a => a.status !== 'paused' && a.status !== 'dead' && a.status !== 'unreachable').map(a => a.id);
    const pausedIds = agents.filter(a => a.status === 'paused').map(a => a.id);

    const bulkCmd = async (ids: string[], type: string) => {
      if (ids.length === 0) return;
      await fetch(`${API_URL}/api/agents/bulk-command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentIds: ids, type }),
      });
    };

    const base: Action[] = [
      { id: 'pause-all', label: `Pause All Active (${workingIds.length})`, type: 'warning', execute: () => bulkCmd(workingIds, 'pause') },
      { id: 'resume-all', label: `Resume All Paused (${pausedIds.length})`, type: 'info', execute: () => bulkCmd(pausedIds, 'resume') },
      { id: 'restart-all', label: `Restart All (${allIds.length})`, type: 'danger', execute: () => bulkCmd(allIds, 'restart') },
      { id: 'force-sync', label: 'Force Sync Configs', type: 'info', execute: () => bulkCmd(allIds, 'force_sync') },
    ];

    for (const agent of agents.slice(0, 20)) {
      base.push({
        id: `agent-${agent.id}`,
        label: `→ ${agent.name} (${agent.status})`,
        type: 'default',
        execute: () => useAgentStore.getState().selectAgent(agent.id),
      });
    }

    return base;
  }, [agents]);

  if (!open) return null;

  const filtered = actions.filter(a => a.label.toLowerCase().includes(query.toLowerCase()));

  const getStyle = (type: string) => {
    switch (type) {
      case 'danger': return 'text-neon-magenta group-hover:bg-neon-magenta/20';
      case 'warning': return 'text-neon-amber group-hover:bg-neon-amber/20';
      case 'info': return 'text-neon-cyan group-hover:bg-neon-cyan/20';
      default: return 'text-primary group-hover:bg-white/10';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="w-full max-w-xl bg-[#0a0a0f] border border-border-glow shadow-2xl rounded-sm overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center px-4 py-3 border-b border-white/[0.05]">
          <span className="text-neon-cyan font-mono mr-3">{'>'}</span>
          <input
            autoFocus
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-primary font-mono placeholder:text-secondary"
            placeholder="Search agents, commands..."
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <span className="text-[10px] font-mono text-muted border border-border-subtle px-1.5 rounded-sm">ESC</span>
        </div>

        <div className="max-h-[60vh] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-4 py-8 text-center text-secondary font-mono text-xs">NO MATCHING ROUTINES</div>
          ) : (
            filtered.map(action => (
              <button
                key={action.id}
                className={`w-full text-left px-4 py-2.5 flex items-center gap-3 font-mono text-sm border-l-2 border-transparent hover:border-l-neon-cyan group transition-colors ${getStyle(action.type)}`}
                onClick={async () => { await action.execute(); setOpen(false); setQuery(''); }}
              >
                {action.label}
              </button>
            ))
          )}
        </div>

        <div className="px-4 py-2 border-t border-white/[0.05] bg-[#050508] flex items-center justify-between text-[10px] font-mono text-secondary">
          <span>OMNISCIENT KERNEL // ACCESS LEVEL: ALPHA</span>
          <span>{filtered.length} ROUTINES</span>
        </div>
      </div>
    </div>
  );
}
