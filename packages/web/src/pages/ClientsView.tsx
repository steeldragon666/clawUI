import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { mockClients, mockAgents, mockTasks } from '../lib/mock';

// ---------------------------------------------------------------------------
// Industry config
// ---------------------------------------------------------------------------

const INDUSTRY_CONFIG: Record<string, { color: string; label: string; textClass: string; bgClass: string; borderColor: string }> = {
  'tech':                 { color: '#00f0ff', label: 'Tech',         textClass: 'text-neon-cyan',    bgClass: 'bg-[rgba(0,240,255,0.12)]',   borderColor: '#00f0ff' },
  'retail':               { color: '#ffaa00', label: 'Retail',       textClass: 'text-neon-amber',   bgClass: 'bg-[rgba(255,170,0,0.12)]',   borderColor: '#ffaa00' },
  'finance':              { color: '#00ff88', label: 'Finance',       textClass: 'text-neon-green',   bgClass: 'bg-[rgba(0,255,136,0.12)]',   borderColor: '#00ff88' },
  'hospitality':          { color: '#ff00aa', label: 'Hospitality',   textClass: 'text-neon-magenta', bgClass: 'bg-[rgba(255,0,170,0.12)]',   borderColor: '#ff00aa' },
  'professional services':{ color: '#0088ff', label: 'Pro Services',  textClass: 'text-[#0088ff]',    bgClass: 'bg-[rgba(0,136,255,0.12)]',   borderColor: '#0088ff' },
};

const INDUSTRY_FILTER_OPTIONS = [
  'All',
  'Tech',
  'Retail',
  'Finance',
  'Hospitality',
  'Professional Services',
];

// ---------------------------------------------------------------------------
// Platform config
// ---------------------------------------------------------------------------

const PLATFORM_CONFIG: Record<string, { label: string; textClass: string; bgClass: string }> = {
  x:         { label: 'X',         textClass: 'text-neon-cyan',    bgClass: 'bg-[rgba(0,240,255,0.1)]  border border-[rgba(0,240,255,0.25)]' },
  linkedin:  { label: 'in',        textClass: 'text-[#0088ff]',    bgClass: 'bg-[rgba(0,136,255,0.1)]  border border-[rgba(0,136,255,0.25)]' },
  facebook:  { label: 'fb',        textClass: 'text-[#3b82f6]',    bgClass: 'bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.25)]' },
  instagram: { label: 'ig',        textClass: 'text-neon-amber',   bgClass: 'bg-[rgba(255,170,0,0.1)]  border border-[rgba(255,170,0,0.25)]' },
};

// ---------------------------------------------------------------------------
// Sort options
// ---------------------------------------------------------------------------

type SortKey = 'name' | 'tasks' | 'agents';

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'name',   label: 'Name' },
  { key: 'tasks',  label: 'Tasks' },
  { key: 'agents', label: 'Agents' },
];

// ---------------------------------------------------------------------------
// Derived data helpers
// ---------------------------------------------------------------------------

function getClientMetrics(clientId: string) {
  const tenantId = `tenant-${clientId}`;
  const agentCount  = mockAgents.filter(a => a.clientId === clientId).length;
  const activeTasks = mockTasks.filter(t => t.tenantId === tenantId && t.status === 'active').length;
  const doneTasks   = mockTasks.filter(t => t.tenantId === tenantId && t.status === 'done').length;
  const totalTasks  = mockTasks.filter(t => t.tenantId === tenantId).length;
  const velocity    = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;
  return { agentCount, activeTasks, doneTasks, totalTasks, velocity };
}

// ---------------------------------------------------------------------------
// Summary stats
// ---------------------------------------------------------------------------

function buildSummaryStats() {
  const totalClients = mockClients.length;

  // "Active today" = clients that have at least one active task
  const activeClientIds = new Set(
    mockTasks
      .filter(t => t.status === 'active')
      .map(t => t.tenantId.replace('tenant-', ''))
  );
  const activeToday = activeClientIds.size;

  // Average tasks per client
  const avgTasksPerClient = Math.round(mockTasks.length / totalClients);

  // Total distinct platforms across all clients
  const allPlatforms = new Set(mockClients.flatMap(c => c.platforms));
  const totalPlatforms = allPlatforms.size;

  return { totalClients, activeToday, avgTasksPerClient, totalPlatforms };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string | number;
  glowColor: string;
}

function StatCard({ label, value, glowColor }: StatCardProps) {
  return (
    <div
      className="glass-panel flex flex-col p-4 flex-1 relative overflow-hidden"
      style={{ borderBottomWidth: 2, borderBottomColor: glowColor, borderBottomStyle: 'solid' }}
    >
      {/* Background glow blob */}
      <div
        className="absolute bottom-0 left-0 w-20 h-12 rounded-full blur-2xl opacity-20 pointer-events-none"
        style={{ background: glowColor }}
      />
      <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-secondary mb-1 z-10">
        {label}
      </span>
      <span
        className="text-3xl font-mono font-bold tabular-nums z-10"
        style={{ color: glowColor }}
      >
        {value}
      </span>
    </div>
  );
}

interface PlatformPillProps {
  platform: string;
}

function PlatformPill({ platform }: PlatformPillProps) {
  const cfg = PLATFORM_CONFIG[platform];
  if (!cfg) return null;
  return (
    <span
      className={`inline-flex items-center justify-center px-2 py-0.5 rounded-sm text-[10px] font-mono font-bold uppercase tracking-wider ${cfg.textClass} ${cfg.bgClass}`}
    >
      {cfg.label}
    </span>
  );
}

interface ClientCardProps {
  client: typeof mockClients[0];
  index: number;
}

function ClientCard({ client, index }: ClientCardProps) {
  const industry = INDUSTRY_CONFIG[client.industry] ?? INDUSTRY_CONFIG['tech'];
  const { agentCount, activeTasks, doneTasks, totalTasks, velocity } = getClientMetrics(client.id);

  // Velocity bar color
  const velocityColor =
    velocity >= 80 ? '#00ff88' :
    velocity >= 50 ? '#ffaa00' :
    '#00f0ff';

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
      className="relative bg-[#12121f] border border-[rgba(255,255,255,0.06)] hover:bg-[#1a1a2e] hover:border-[rgba(255,255,255,0.12)] transition-colors duration-200 rounded-sm cursor-pointer group overflow-hidden flex flex-col"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: industry.borderColor,
        borderLeftStyle: 'solid',
        minHeight: 200,
      }}
    >
      {/* Subtle inner glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 0% 50%, ${industry.color}08 0%, transparent 60%)`,
        }}
      />

      {/* Card content */}
      <div className="flex flex-col gap-3 p-4 flex-1 z-10">

        {/* Header: name + industry badge */}
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[15px] font-mono font-semibold text-primary leading-tight">
            {client.name}
          </h3>
          <span
            className={`shrink-0 inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-mono font-bold uppercase tracking-wider border ${industry.textClass} ${industry.bgClass}`}
            style={{ borderColor: `${industry.color}40` }}
          >
            {industry.label}
          </span>
        </div>

        {/* Platforms */}
        <div className="flex flex-wrap gap-1.5">
          {client.platforms.map(p => (
            <PlatformPill key={p} platform={p} />
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mt-auto">
          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase tracking-widest text-secondary mb-0.5">
              Agents
            </span>
            <span className="text-[18px] font-mono font-bold tabular-nums text-primary">
              {agentCount}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase tracking-widest text-secondary mb-0.5">
              Active
            </span>
            <span className={`text-[18px] font-mono font-bold tabular-nums ${activeTasks > 0 ? 'text-neon-cyan' : 'text-secondary'}`}>
              {activeTasks}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[9px] font-mono uppercase tracking-widest text-secondary mb-0.5">
              Published
            </span>
            <span className="text-[18px] font-mono font-bold tabular-nums text-neon-green">
              {doneTasks}
            </span>
          </div>
        </div>

        {/* Velocity bar */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase tracking-widest text-secondary">
              Content Velocity
            </span>
            <span
              className="text-[9px] font-mono font-bold tabular-nums"
              style={{ color: velocityColor }}
            >
              {velocity}%
            </span>
          </div>
          <div className="h-[3px] w-full bg-[#1e1e2d] rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: velocityColor, boxShadow: `0 0 6px ${velocityColor}80` }}
              initial={{ width: 0 }}
              animate={{ width: `${velocity}%` }}
              transition={{ duration: 0.6, delay: index * 0.05 + 0.2, ease: 'easeOut' }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono text-muted">{doneTasks} of {totalTasks} tasks</span>
          </div>
        </div>

      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------

export function ClientsView() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeIndustry, setActiveIndustry] = useState('All');
  const [sortKey, setSortKey] = useState<SortKey>('name');

  const stats = useMemo(() => buildSummaryStats(), []);

  const filteredClients = useMemo(() => {
    let result = mockClients.slice();

    // Filter by name search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q));
    }

    // Filter by industry
    if (activeIndustry !== 'All') {
      const industryKey = activeIndustry.toLowerCase();
      result = result.filter(c => c.industry.toLowerCase() === industryKey);
    }

    // Sort
    if (sortKey === 'name') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortKey === 'tasks') {
      result.sort((a, b) => {
        const aTotal = mockTasks.filter(t => t.tenantId === `tenant-${a.id}`).length;
        const bTotal = mockTasks.filter(t => t.tenantId === `tenant-${b.id}`).length;
        return bTotal - aTotal;
      });
    } else if (sortKey === 'agents') {
      result.sort((a, b) => {
        const aCount = mockAgents.filter(ag => ag.clientId === a.id).length;
        const bCount = mockAgents.filter(ag => ag.clientId === b.id).length;
        return bCount - aCount;
      });
    }

    return result;
  }, [searchQuery, activeIndustry, sortKey]);

  return (
    <div className="h-full flex flex-col gap-3 p-4 overflow-hidden">

      {/* ------------------------------------------------------------------ */}
      {/* Section 1: Summary stats bar                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="shrink-0">
        <div className="flex items-center gap-2 mb-3">
          <h1 className="text-xs font-mono font-semibold uppercase tracking-[0.2em] text-neon-cyan">
            Client Management
          </h1>
          <div className="flex-1 h-px bg-[rgba(0,240,255,0.15)]" />
          <span className="text-[10px] font-mono text-secondary tabular-nums">
            {filteredClients.length} / {mockClients.length} clients
          </span>
        </div>

        <motion.div
          className="grid grid-cols-4 gap-3"
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <StatCard label="Total Clients"      value={stats.totalClients}      glowColor="#00f0ff" />
          <StatCard label="Active Today"       value={stats.activeToday}       glowColor="#00ff88" />
          <StatCard label="Avg Tasks / Client" value={stats.avgTasksPerClient} glowColor="#ffaa00" />
          <StatCard label="Total Platforms"    value={stats.totalPlatforms}    glowColor="#0088ff" />
        </motion.div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 2: Search / filter bar                                      */}
      {/* ------------------------------------------------------------------ */}
      <motion.div
        className="shrink-0 glass-panel p-3 flex flex-wrap items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.1 }}
      >
        {/* Search input */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-secondary text-[11px] font-mono pointer-events-none select-none">
            ⌕
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search clients..."
            className="w-full bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] focus:border-[rgba(0,240,255,0.4)] outline-none rounded-sm pl-7 pr-3 py-1.5 text-[12px] font-mono text-primary placeholder:text-muted transition-colors"
          />
        </div>

        {/* Vertical divider */}
        <div className="w-px h-6 bg-[rgba(255,255,255,0.08)] hidden sm:block" />

        {/* Industry filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {INDUSTRY_FILTER_OPTIONS.map(opt => {
            const isActive = activeIndustry === opt;
            const cfg = opt === 'All' ? null : INDUSTRY_CONFIG[opt.toLowerCase()];
            const activeColor = cfg?.color ?? '#00f0ff';
            return (
              <button
                key={opt}
                onClick={() => setActiveIndustry(opt)}
                className={`px-2.5 py-1 rounded-sm text-[10px] font-mono font-medium uppercase tracking-wider border transition-colors duration-150 ${
                  isActive
                    ? 'bg-[rgba(0,240,255,0.08)] text-neon-cyan border-[rgba(0,240,255,0.35)]'
                    : 'text-secondary border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] hover:text-primary'
                }`}
                style={isActive && cfg ? { color: activeColor, borderColor: `${activeColor}55`, background: `${activeColor}10` } : {}}
              >
                {opt}
              </button>
            );
          })}
        </div>

        {/* Vertical divider */}
        <div className="w-px h-6 bg-[rgba(255,255,255,0.08)] hidden sm:block ml-auto" />

        {/* Sort pills */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-[9px] font-mono uppercase tracking-widest text-muted mr-1">Sort</span>
          {SORT_OPTIONS.map(opt => (
            <button
              key={opt.key}
              onClick={() => setSortKey(opt.key)}
              className={`px-2 py-1 rounded-sm text-[10px] font-mono uppercase tracking-wider border transition-colors duration-150 ${
                sortKey === opt.key
                  ? 'bg-[rgba(0,240,255,0.08)] text-neon-cyan border-[rgba(0,240,255,0.35)]'
                  : 'text-secondary border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.2)] hover:text-primary'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </motion.div>

      {/* ------------------------------------------------------------------ */}
      {/* Section 3: Client grid                                              */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 overflow-y-auto min-h-0 pr-1" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,240,255,0.2) transparent' }}>
        {filteredClients.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-secondary text-[12px] font-mono">
            No clients match the current filters.
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3 pb-3">
            {filteredClients.map((client, i) => (
              <ClientCard key={client.id} client={client} index={i} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
