// ---------------------------------------------------------------------------
// InfrastructurePanel — Server health + API rate limits
// ---------------------------------------------------------------------------

import { mockAgents } from '../../lib/mock';

// ---------------------------------------------------------------------------
// Mock infrastructure data
// ---------------------------------------------------------------------------

interface ServerInfo {
  id: string;
  hostname: string;
  status: 'online' | 'offline';
  latencyMs: number;
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
  agentCount: number;
  uptime: string;
}

interface ApiRateLimit {
  name: string;
  used: number;
  limit: number;
}

const mockServers: ServerInfo[] = [
  {
    id: 'srv-alpha-01',
    hostname: 'alpha-01',
    status: 'online',
    latencyMs: 12,
    cpuPercent: 42,
    memoryPercent: 61,
    diskPercent: 55,
    agentCount: mockAgents.filter(a => a.serverId === 'srv-alpha-01').length,
    uptime: '14d 7h',
  },
  {
    id: 'srv-alpha-02',
    hostname: 'alpha-02',
    status: 'online',
    latencyMs: 18,
    cpuPercent: 78,
    memoryPercent: 72,
    diskPercent: 63,
    agentCount: mockAgents.filter(a => a.serverId === 'srv-alpha-02').length,
    uptime: '14d 7h',
  },
  {
    id: 'srv-beta-01',
    hostname: 'beta-01',
    status: 'online',
    latencyMs: 34,
    cpuPercent: 85,
    memoryPercent: 88,
    diskPercent: 81,
    agentCount: mockAgents.filter(a => a.serverId === 'srv-beta-01').length,
    uptime: '6d 19h',
  },
  {
    id: 'srv-beta-02',
    hostname: 'beta-02',
    status: 'offline',
    latencyMs: 0,
    cpuPercent: 0,
    memoryPercent: 0,
    diskPercent: 45,
    agentCount: mockAgents.filter(a => a.serverId === 'srv-beta-02').length,
    uptime: '0d 0h',
  },
];

const mockApiRateLimits: ApiRateLimit[] = [
  { name: 'Claude API', used: 8420, limit: 10000 },
  { name: 'X / Twitter', used: 412, limit: 500 },
  { name: 'LinkedIn', used: 78, limit: 100 },
  { name: 'Meta API', used: 1850, limit: 5000 },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function barColor(percent: number): string {
  if (percent > 80) return 'bg-neon-red';
  if (percent >= 60) return 'bg-neon-amber';
  return 'bg-neon-green';
}

function barGlow(percent: number): string {
  if (percent > 80) return 'shadow-red';
  return '';
}

function apiBarColor(percent: number): string {
  if (percent > 85) return 'bg-neon-red';
  if (percent >= 70) return 'bg-neon-amber';
  return 'bg-neon-cyan';
}

function apiBarGlow(percent: number): string {
  if (percent > 85) return 'shadow-red';
  return '';
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function UsageBar({ percent, color, glow }: { percent: number; color: string; glow: string }) {
  return (
    <div className="h-[4px] w-full rounded-full bg-white/5 overflow-hidden">
      <div
        className={`h-full rounded-full ${color} ${glow ? glow : ''}`}
        style={{ width: `${Math.min(percent, 100)}%` }}
      />
    </div>
  );
}

function ServerRow({ server }: { server: ServerInfo }) {
  const isOffline = server.status === 'offline';

  return (
    <div className={`flex flex-col gap-[3px] ${isOffline ? 'opacity-40' : ''}`}>
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block w-[6px] h-[6px] rounded-full ${
              isOffline ? 'bg-neon-red' : 'bg-neon-green'
            }`}
            style={
              isOffline
                ? { boxShadow: '0 0 4px rgba(255,34,68,0.6)' }
                : { boxShadow: '0 0 4px rgba(0,255,136,0.6)' }
            }
          />
          <span className="font-mono text-[11px] text-primary">{server.hostname}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-secondary font-mono">
          <span>{isOffline ? '--' : `${server.latencyMs}ms`}</span>
          <span>{server.agentCount} agents</span>
          <span>{server.uptime}</span>
        </div>
      </div>

      {/* Bars */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-0">
        {/* CPU */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-secondary font-mono w-[22px]">CPU</span>
          <div className="flex-1">
            <UsageBar
              percent={server.cpuPercent}
              color={barColor(server.cpuPercent)}
              glow={barGlow(server.cpuPercent)}
            />
          </div>
          <span className="text-[9px] font-mono text-secondary w-[24px] text-right tabular-nums">
            {server.cpuPercent}%
          </span>
        </div>

        {/* MEM */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-secondary font-mono w-[22px]">MEM</span>
          <div className="flex-1">
            <UsageBar
              percent={server.memoryPercent}
              color={barColor(server.memoryPercent)}
              glow={barGlow(server.memoryPercent)}
            />
          </div>
          <span className="text-[9px] font-mono text-secondary w-[24px] text-right tabular-nums">
            {server.memoryPercent}%
          </span>
        </div>

        {/* DISK */}
        <div className="flex items-center gap-1">
          <span className="text-[9px] text-secondary font-mono w-[22px]">DSK</span>
          <div className="flex-1">
            <UsageBar
              percent={server.diskPercent}
              color={barColor(server.diskPercent)}
              glow={barGlow(server.diskPercent)}
            />
          </div>
          <span className="text-[9px] font-mono text-secondary w-[24px] text-right tabular-nums">
            {server.diskPercent}%
          </span>
        </div>
      </div>
    </div>
  );
}

function ApiRateLimitRow({ api }: { api: ApiRateLimit }) {
  const percent = Math.round((api.used / api.limit) * 100);

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-secondary font-mono w-[72px] truncate">{api.name}</span>
      <div className="flex-1">
        <UsageBar
          percent={percent}
          color={apiBarColor(percent)}
          glow={apiBarGlow(percent)}
        />
      </div>
      <span className="text-[10px] font-mono text-secondary w-[32px] text-right tabular-nums">
        {percent}%
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function InfrastructurePanel() {
  return (
    <div className="flex flex-col gap-2 h-full overflow-hidden">
      {/* Servers */}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-neon-cyan/60">
          Servers
        </h3>
        <div className="flex flex-col gap-2">
          {mockServers.map(server => (
            <ServerRow key={server.id} server={server} />
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border-subtle" />

      {/* API Rate Limits */}
      <div className="flex flex-col gap-1.5">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-neon-cyan/60">
          API Rate Limits
        </h3>
        <div className="flex flex-col gap-1">
          {mockApiRateLimits.map(api => (
            <ApiRateLimitRow key={api.name} api={api} />
          ))}
        </div>
      </div>
    </div>
  );
}
