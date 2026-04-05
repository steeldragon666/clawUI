import { useState, useMemo, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Monitor,
  Bot,
  Server,
  Building2,
  Bell,
  KeyRound,
  ChevronUp,
  ChevronDown,
  Plus,
  Pencil,
  Trash2,
  X,
  Copy,
  RefreshCw,
  Shield,
  Mail,
  Hash,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Section registry
// ---------------------------------------------------------------------------

type SectionKey = 'system' | 'agents' | 'servers' | 'tenants' | 'alerts' | 'api-keys';

interface SectionDef {
  key: SectionKey;
  label: string;
  icon: typeof Monitor;
}

const SECTIONS: SectionDef[] = [
  { key: 'system',   label: 'System',           icon: Monitor },
  { key: 'agents',   label: 'Agents',           icon: Bot },
  { key: 'servers',  label: 'Servers',           icon: Server },
  { key: 'tenants',  label: 'Tenants / Clients', icon: Building2 },
  { key: 'alerts',   label: 'Alerts',            icon: Bell },
  { key: 'api-keys', label: 'API Keys',          icon: KeyRound },
];

// ---------------------------------------------------------------------------
// Shared UI primitives
// ---------------------------------------------------------------------------

function SectionHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h2 className="text-sm font-mono font-semibold uppercase tracking-[0.15em] text-neon-cyan">{title}</h2>
        {subtitle && <p className="text-[11px] font-mono text-secondary mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

function NeonButton({
  children,
  onClick,
  variant = 'cyan',
  size = 'sm',
  className = '',
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'cyan' | 'magenta' | 'green' | 'amber';
  size?: 'sm' | 'xs';
  className?: string;
}) {
  const colorMap = {
    cyan:    'border-neon-cyan text-neon-cyan hover:bg-[rgba(0,240,255,0.1)]',
    magenta: 'border-neon-magenta text-neon-magenta hover:bg-[rgba(255,0,170,0.1)]',
    green:   'border-neon-green text-neon-green hover:bg-[rgba(0,255,136,0.1)]',
    amber:   'border-neon-amber text-neon-amber hover:bg-[rgba(255,170,0,0.1)]',
  };
  const sizeMap = {
    sm: 'px-3 py-1.5 text-[11px]',
    xs: 'px-2 py-1 text-[10px]',
  };
  return (
    <button
      onClick={onClick}
      className={`border font-mono font-medium uppercase tracking-wider transition-colors duration-150 rounded-sm inline-flex items-center gap-1.5 ${colorMap[variant]} ${sizeMap[size]} ${className}`}
    >
      {children}
    </button>
  );
}

function FieldLabel({ children }: { children: ReactNode }) {
  return (
    <label className="block text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-secondary mb-1.5">
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  mono = true,
  className = '',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] focus:border-[rgba(0,240,255,0.5)] focus:shadow-[0_0_8px_rgba(0,240,255,0.15)] outline-none rounded-sm px-3 py-2 text-[12px] text-primary placeholder:text-muted transition-all ${mono ? 'font-mono' : 'font-sans'} ${className}`}
    />
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-[#0a0a0f] border border-[rgba(255,255,255,0.08)] focus:border-[rgba(0,240,255,0.5)] focus:shadow-[0_0_8px_rgba(0,240,255,0.15)] outline-none rounded-sm px-3 py-2 text-[12px] font-mono text-primary transition-all appearance-none cursor-pointer"
    >
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 group"
    >
      <div
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${
          checked
            ? 'bg-[rgba(0,240,255,0.25)] border-neon-cyan shadow-[0_0_8px_rgba(0,240,255,0.3)]'
            : 'bg-[rgba(255,255,255,0.06)] border-[rgba(255,255,255,0.1)]'
        } border`}
      >
        <motion.div
          className={`absolute top-0.5 w-3.5 h-3.5 rounded-full transition-colors duration-200 ${
            checked ? 'bg-neon-cyan' : 'bg-secondary'
          }`}
          animate={{ left: checked ? 18 : 3 }}
          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        />
      </div>
      {label && (
        <span className="text-[11px] font-mono text-secondary group-hover:text-primary transition-colors">{label}</span>
      )}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Sortable table helpers
// ---------------------------------------------------------------------------

type SortDir = 'asc' | 'desc';

function useSortableTable<T>(data: T[], defaultKey: keyof T) {
  const [sortKey, setSortKey] = useState<keyof T>(defaultKey);
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
    return arr;
  }, [data, sortKey, sortDir]);

  function toggleSort(key: keyof T) {
    if (sortKey === key) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  return { sorted, sortKey, sortDir, toggleSort };
}

function SortHeader<T>({
  label,
  colKey,
  sortKey,
  sortDir,
  onSort,
  className = '',
}: {
  label: string;
  colKey: T;
  sortKey: T;
  sortDir: SortDir;
  onSort: (key: T) => void;
  className?: string;
}) {
  const active = sortKey === colKey;
  return (
    <th
      className={`text-left text-[10px] font-mono font-semibold uppercase tracking-[0.12em] py-2.5 px-3 cursor-pointer select-none transition-colors ${
        active ? 'text-neon-cyan' : 'text-secondary hover:text-primary'
      } ${className}`}
      onClick={() => onSort(colKey)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)}
      </span>
    </th>
  );
}

function StatusDot({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    online:  'bg-neon-green shadow-[0_0_6px_rgba(0,255,136,0.5)]',
    working: 'bg-neon-cyan shadow-[0_0_6px_rgba(0,240,255,0.5)]',
    idle:    'bg-neon-amber',
    offline: 'bg-muted',
    error:   'bg-neon-magenta shadow-[0_0_6px_rgba(255,0,170,0.5)]',
    warning: 'bg-neon-amber shadow-[0_0_6px_rgba(255,170,0,0.5)]',
    degraded:'bg-neon-amber',
    active:  'bg-neon-green shadow-[0_0_6px_rgba(0,255,136,0.5)]',
    valid:   'bg-neon-green shadow-[0_0_6px_rgba(0,255,136,0.5)]',
    expiring:'bg-neon-amber shadow-[0_0_6px_rgba(255,170,0,0.5)]',
    expired: 'bg-neon-red shadow-[0_0_6px_rgba(255,34,68,0.5)]',
    revoked: 'bg-muted',
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full shrink-0 ${colorMap[status] ?? 'bg-secondary'}`} />
  );
}

// ---------------------------------------------------------------------------
// Mock toast (for UI-only actions)
// ---------------------------------------------------------------------------

function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  function toast(msg: string) {
    setMessage(msg);
    setTimeout(() => setMessage(null), 2500);
  }
  const ToastOverlay = () => (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-6 right-6 z-[100] bg-[#12121f] border border-neon-cyan/40 rounded-sm px-4 py-2.5 text-[11px] font-mono text-neon-cyan shadow-[0_0_20px_rgba(0,240,255,0.15)]"
        >
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
  return { toast, ToastOverlay };
}

// ---------------------------------------------------------------------------
// 1. SYSTEM section
// ---------------------------------------------------------------------------

function SystemSection() {
  const [apiUrl, setApiUrl] = useState('https://api.omniscient.ai/v1');
  const [wsUrl, setWsUrl] = useState('wss://ws.omniscient.ai/v1/stream');
  const [heartbeatInterval, setHeartbeatInterval] = useState('30');
  const [absenceThreshold, setAbsenceThreshold] = useState('90');
  const [stallThreshold, setStallThreshold] = useState('300');
  const [autoReconnect, setAutoReconnect] = useState(true);
  const [debugMode, setDebugMode] = useState(false);
  const [telemetry, setTelemetry] = useState(true);

  return (
    <div>
      <SectionHeader title="System Configuration" subtitle="Core platform endpoints and detection thresholds" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Endpoints */}
        <div className="glass-panel p-4 space-y-4">
          <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.15em] text-primary mb-3 flex items-center gap-2">
            <Monitor size={14} className="text-neon-cyan" /> Endpoints
          </h3>
          <div>
            <FieldLabel>API Endpoint URL</FieldLabel>
            <TextInput value={apiUrl} onChange={setApiUrl} placeholder="https://..." />
          </div>
          <div>
            <FieldLabel>WebSocket URL</FieldLabel>
            <TextInput value={wsUrl} onChange={setWsUrl} placeholder="wss://..." />
          </div>
          <div>
            <FieldLabel>Heartbeat Interval (seconds)</FieldLabel>
            <TextInput value={heartbeatInterval} onChange={setHeartbeatInterval} placeholder="30" />
          </div>
        </div>

        {/* Thresholds */}
        <div className="glass-panel p-4 space-y-4">
          <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.15em] text-primary mb-3 flex items-center gap-2">
            <Shield size={14} className="text-neon-amber" /> Detection Thresholds
          </h3>
          <div>
            <FieldLabel>Absence Threshold</FieldLabel>
            <SelectInput
              value={absenceThreshold}
              onChange={setAbsenceThreshold}
              options={[
                { value: '60', label: '60s - Aggressive' },
                { value: '90', label: '90s - Balanced (default)' },
                { value: '120', label: '120s - Relaxed' },
              ]}
            />
            <p className="text-[10px] font-mono text-muted mt-1">
              Time after last heartbeat before agent is marked absent
            </p>
          </div>
          <div>
            <FieldLabel>Stall Detection Threshold (seconds)</FieldLabel>
            <TextInput value={stallThreshold} onChange={setStallThreshold} placeholder="300" />
            <p className="text-[10px] font-mono text-muted mt-1">
              Task execution time before stall alert triggers
            </p>
          </div>
        </div>

        {/* Toggles */}
        <div className="glass-panel p-4 space-y-4 lg:col-span-2">
          <h3 className="text-[11px] font-mono font-bold uppercase tracking-[0.15em] text-primary mb-3">
            Runtime Options
          </h3>
          <div className="flex flex-wrap gap-6">
            <Toggle checked={autoReconnect} onChange={setAutoReconnect} label="Auto-reconnect on disconnect" />
            <Toggle checked={debugMode} onChange={setDebugMode} label="Debug mode (verbose logging)" />
            <Toggle checked={telemetry} onChange={setTelemetry} label="Send anonymous telemetry" />
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <NeonButton variant="cyan">Save Configuration</NeonButton>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. AGENTS section
// ---------------------------------------------------------------------------

interface MockAgentConfig {
  id: string;
  name: string;
  server: string;
  role: string;
  status: string;
  model: string;
  maxConcurrency: number;
}

const MOCK_AGENTS: MockAgentConfig[] = [
  { id: 'a-001', name: 'Writer-Alpha',   server: 'prod-us-1', role: 'content-gen',       status: 'working', model: 'gpt-4o',        maxConcurrency: 4 },
  { id: 'a-002', name: 'Writer-Beta',    server: 'prod-us-1', role: 'content-gen',       status: 'idle',    model: 'gpt-4o',        maxConcurrency: 4 },
  { id: 'a-003', name: 'Scheduler-1',    server: 'prod-us-2', role: 'custom',            status: 'working', model: 'claude-3.5',    maxConcurrency: 2 },
  { id: 'a-004', name: 'Publisher-X',    server: 'prod-eu-1', role: 'social-post',       status: 'idle',    model: 'gpt-4o-mini',   maxConcurrency: 8 },
  { id: 'a-005', name: 'Monitor-1',      server: 'prod-eu-1', role: 'engagement-monitor',status: 'working', model: 'claude-3.5',    maxConcurrency: 1 },
  { id: 'a-006', name: 'SEO-Alpha',      server: 'prod-us-2', role: 'seo-optimize',      status: 'error',   model: 'gpt-4o',        maxConcurrency: 3 },
  { id: 'a-007', name: 'Email-Filter-1', server: 'prod-us-1', role: 'email-filter',      status: 'working', model: 'gpt-4o-mini',   maxConcurrency: 10 },
  { id: 'a-008', name: 'Blogger-Prime',  server: 'prod-ap-1', role: 'blog-writer',       status: 'idle',    model: 'claude-3.5',    maxConcurrency: 2 },
];

function AgentsSection() {
  const { toast, ToastOverlay } = useToast();
  const { sorted, sortKey, sortDir, toggleSort } = useSortableTable(MOCK_AGENTS, 'name');

  return (
    <div>
      <SectionHeader
        title="Agent Registry"
        subtitle={`${MOCK_AGENTS.length} agents configured across all servers`}
        action={
          <NeonButton onClick={() => toast('Add Agent dialog would open')} variant="cyan" size="sm">
            <Plus size={12} /> Add Agent
          </NeonButton>
        }
      />

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                <SortHeader label="Name" colKey="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Server" colKey="server" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Role" colKey="role" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Model" colKey="model" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="text-left text-[10px] font-mono font-semibold uppercase tracking-[0.12em] py-2.5 px-3 text-secondary">
                  Concurrency
                </th>
                <th className="text-right text-[10px] font-mono font-semibold uppercase tracking-[0.12em] py-2.5 px-3 text-secondary">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((agent, i) => (
                <tr
                  key={agent.id}
                  className={`border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(0,240,255,0.03)] transition-colors ${
                    i % 2 === 1 ? 'bg-[rgba(255,255,255,0.015)]' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 text-[12px] font-mono font-semibold text-primary">{agent.name}</td>
                  <td className="py-2.5 px-3 text-[11px] font-mono text-secondary">{agent.server}</td>
                  <td className="py-2.5 px-3 text-[11px] font-mono text-secondary">{agent.role}</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono">
                      <StatusDot status={agent.status} />
                      <span className={
                        agent.status === 'working' ? 'text-neon-cyan' :
                        agent.status === 'error' ? 'text-neon-magenta' :
                        'text-secondary'
                      }>
                        {agent.status}
                      </span>
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[11px] font-mono text-secondary">{agent.model}</td>
                  <td className="py-2.5 px-3 text-[11px] font-mono text-primary tabular-nums text-center">{agent.maxConcurrency}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center gap-1">
                      <button onClick={() => toast(`Edit ${agent.name}`)} className="p-1.5 text-secondary hover:text-neon-cyan transition-colors" title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => toast(`Remove ${agent.name}`)} className="p-1.5 text-secondary hover:text-neon-magenta transition-colors" title="Remove">
                        <Trash2 size={13} />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ToastOverlay />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. SERVERS section
// ---------------------------------------------------------------------------

interface MockServer {
  id: string;
  hostname: string;
  ip: string;
  region: string;
  status: string;
  cpu: string;
  ram: string;
  agents: number;
}

const MOCK_SERVERS: MockServer[] = [
  { id: 's-01', hostname: 'prod-us-1',  ip: '10.0.1.10',  region: 'us-east-1',  status: 'online',  cpu: '32 vCPU',  ram: '128 GB', agents: 3 },
  { id: 's-02', hostname: 'prod-us-2',  ip: '10.0.1.11',  region: 'us-west-2',  status: 'online',  cpu: '16 vCPU',  ram: '64 GB',  agents: 2 },
  { id: 's-03', hostname: 'prod-eu-1',  ip: '10.0.2.10',  region: 'eu-west-1',  status: 'online',  cpu: '32 vCPU',  ram: '128 GB', agents: 2 },
  { id: 's-04', hostname: 'prod-ap-1',  ip: '10.0.3.10',  region: 'ap-south-1', status: 'degraded', cpu: '16 vCPU', ram: '64 GB',  agents: 1 },
  { id: 's-05', hostname: 'staging-1',  ip: '10.0.9.10',  region: 'us-east-1',  status: 'online',  cpu: '8 vCPU',   ram: '32 GB',  agents: 0 },
  { id: 's-06', hostname: 'dev-local',  ip: '192.168.1.5', region: 'local',      status: 'offline', cpu: '4 vCPU',   ram: '16 GB',  agents: 0 },
];

function ServersSection() {
  const { toast, ToastOverlay } = useToast();
  const { sorted, sortKey, sortDir, toggleSort } = useSortableTable(MOCK_SERVERS, 'hostname');

  return (
    <div>
      <SectionHeader
        title="Server Fleet"
        subtitle={`${MOCK_SERVERS.length} servers registered`}
        action={
          <NeonButton onClick={() => toast('Add Server dialog would open')} variant="cyan" size="sm">
            <Plus size={12} /> Add Server
          </NeonButton>
        }
      />

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px]">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                <SortHeader label="Hostname" colKey="hostname" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="IP" colKey="ip" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Region" colKey="region" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="text-left text-[10px] font-mono font-semibold uppercase tracking-[0.12em] py-2.5 px-3 text-secondary">Specs</th>
                <SortHeader label="Agents" colKey="agents" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="text-right text-[10px] font-mono font-semibold uppercase tracking-[0.12em] py-2.5 px-3 text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((srv, i) => (
                <tr
                  key={srv.id}
                  className={`border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(0,240,255,0.03)] transition-colors ${
                    i % 2 === 1 ? 'bg-[rgba(255,255,255,0.015)]' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 text-[12px] font-mono font-semibold text-primary">{srv.hostname}</td>
                  <td className="py-2.5 px-3 text-[11px] font-mono text-secondary tabular-nums">{srv.ip}</td>
                  <td className="py-2.5 px-3 text-[11px] font-mono text-secondary">{srv.region}</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono">
                      <StatusDot status={srv.status} />
                      <span className={
                        srv.status === 'online' ? 'text-neon-green' :
                        srv.status === 'degraded' ? 'text-neon-amber' :
                        'text-muted'
                      }>
                        {srv.status}
                      </span>
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[11px] font-mono text-secondary">
                    {srv.cpu} / {srv.ram}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] font-mono text-primary tabular-nums text-center">{srv.agents}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center gap-1">
                      <button onClick={() => toast(`Edit ${srv.hostname}`)} className="p-1.5 text-secondary hover:text-neon-cyan transition-colors" title="Edit">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => toast(`Remove ${srv.hostname}`)} className="p-1.5 text-secondary hover:text-neon-magenta transition-colors" title="Remove">
                        <Trash2 size={13} />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ToastOverlay />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. TENANTS / CLIENTS section
// ---------------------------------------------------------------------------

interface MockTenant {
  id: string;
  company: string;
  slaTier: string;
  platforms: string[];
  approvalWorkflow: string;
  contactEmail: string;
  status: string;
}

const MOCK_TENANTS: MockTenant[] = [
  { id: 't-01', company: 'Apex Digital',       slaTier: 'Enterprise',  platforms: ['x', 'linkedin', 'instagram'], approvalWorkflow: 'Auto',          contactEmail: 'ops@apexdigital.io',     status: 'active' },
  { id: 't-02', company: 'Meridian Systems',   slaTier: 'Enterprise',  platforms: ['linkedin', 'x'],              approvalWorkflow: 'Manager Review', contactEmail: 'admin@meridian.dev',     status: 'active' },
  { id: 't-03', company: 'Harbor & Co.',       slaTier: 'Business',    platforms: ['instagram', 'facebook', 'x'], approvalWorkflow: 'Auto',          contactEmail: 'team@harborco.com',      status: 'active' },
  { id: 't-04', company: 'Summit Goods',       slaTier: 'Starter',     platforms: ['instagram', 'facebook'],      approvalWorkflow: 'Client Approval',contactEmail: 'hello@summitgoods.com',  status: 'active' },
  { id: 't-05', company: 'Pinnacle Finance',   slaTier: 'Enterprise',  platforms: ['linkedin', 'x'],              approvalWorkflow: 'Compliance',    contactEmail: 'sec@pinnaclefin.com',    status: 'active' },
  { id: 't-06', company: 'Coastal Hospitality', slaTier: 'Business',   platforms: ['instagram', 'facebook'],      approvalWorkflow: 'Auto',          contactEmail: 'media@coastalhosp.com',  status: 'active' },
  { id: 't-07', company: 'Redwood Analytics',  slaTier: 'Starter',     platforms: ['linkedin'],                   approvalWorkflow: 'Manager Review', contactEmail: 'data@redwoodai.com',     status: 'active' },
];

const SLA_COLORS: Record<string, string> = {
  Enterprise: 'text-neon-cyan border-neon-cyan bg-[rgba(0,240,255,0.1)]',
  Business:   'text-neon-green border-neon-green bg-[rgba(0,255,136,0.1)]',
  Starter:    'text-neon-amber border-neon-amber bg-[rgba(255,170,0,0.1)]',
};

function TenantsSection() {
  const { toast, ToastOverlay } = useToast();
  const { sorted, sortKey, sortDir, toggleSort } = useSortableTable(MOCK_TENANTS, 'company');

  return (
    <div>
      <SectionHeader
        title="Tenants / Clients"
        subtitle={`${MOCK_TENANTS.length} active tenant configurations`}
        action={
          <NeonButton onClick={() => toast('Add Tenant dialog would open')} variant="cyan" size="sm">
            <Plus size={12} /> Add Tenant
          </NeonButton>
        }
      />

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                <SortHeader label="Company" colKey="company" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="SLA Tier" colKey="slaTier" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="text-left text-[10px] font-mono font-semibold uppercase tracking-[0.12em] py-2.5 px-3 text-secondary">Platforms</th>
                <SortHeader label="Approval" colKey="approvalWorkflow" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="text-left text-[10px] font-mono font-semibold uppercase tracking-[0.12em] py-2.5 px-3 text-secondary">Contact</th>
                <th className="text-right text-[10px] font-mono font-semibold uppercase tracking-[0.12em] py-2.5 px-3 text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((tenant, i) => (
                <tr
                  key={tenant.id}
                  className={`border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(0,240,255,0.03)] transition-colors ${
                    i % 2 === 1 ? 'bg-[rgba(255,255,255,0.015)]' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 text-[12px] font-mono font-semibold text-primary">{tenant.company}</td>
                  <td className="py-2.5 px-3">
                    <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border rounded-sm ${SLA_COLORS[tenant.slaTier] ?? 'text-secondary border-secondary'}`}>
                      {tenant.slaTier}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="flex gap-1 flex-wrap">
                      {tenant.platforms.map(p => (
                        <span key={p} className="text-[10px] font-mono font-medium uppercase px-1.5 py-0.5 rounded-sm bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-secondary">
                          {p}
                        </span>
                      ))}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[11px] font-mono text-secondary">{tenant.approvalWorkflow}</td>
                  <td className="py-2.5 px-3 text-[11px] font-mono text-secondary">{tenant.contactEmail}</td>
                  <td className="py-2.5 px-3 text-right">
                    <button onClick={() => toast(`Edit ${tenant.company}`)} className="p-1.5 text-secondary hover:text-neon-cyan transition-colors" title="Edit">
                      <Pencil size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ToastOverlay />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. ALERTS section
// ---------------------------------------------------------------------------

interface AlertRule {
  id: string;
  name: string;
  severity: 'critical' | 'warning' | 'info';
  condition: string;
  escalationChain: string[];
  channels: { type: string; target: string }[];
  enabled: boolean;
}

const MOCK_ALERT_RULES: AlertRule[] = [
  {
    id: 'ar-01',
    name: 'Agent Down',
    severity: 'critical',
    condition: 'Agent heartbeat missing > absence threshold',
    escalationChain: ['On-Call Engineer', 'Team Lead', 'VP Engineering'],
    channels: [
      { type: 'slack', target: '#alerts-critical' },
      { type: 'email', target: 'oncall@omniscient.ai' },
    ],
    enabled: true,
  },
  {
    id: 'ar-02',
    name: 'Task Stall',
    severity: 'warning',
    condition: 'Task running > stall threshold with no progress',
    escalationChain: ['On-Call Engineer', 'Team Lead'],
    channels: [
      { type: 'slack', target: '#alerts-warning' },
    ],
    enabled: true,
  },
  {
    id: 'ar-03',
    name: 'Error Rate Spike',
    severity: 'critical',
    condition: 'Error rate > 15% over 5-minute window',
    escalationChain: ['On-Call Engineer', 'Team Lead', 'VP Engineering'],
    channels: [
      { type: 'slack', target: '#alerts-critical' },
      { type: 'email', target: 'oncall@omniscient.ai' },
      { type: 'email', target: 'vp-eng@omniscient.ai' },
    ],
    enabled: true,
  },
  {
    id: 'ar-04',
    name: 'Server CPU High',
    severity: 'warning',
    condition: 'CPU utilization > 90% for 3+ minutes',
    escalationChain: ['Infrastructure Team'],
    channels: [
      { type: 'slack', target: '#infra-alerts' },
    ],
    enabled: true,
  },
  {
    id: 'ar-05',
    name: 'New Client Onboarded',
    severity: 'info',
    condition: 'New tenant record created',
    escalationChain: [],
    channels: [
      { type: 'slack', target: '#general' },
    ],
    enabled: false,
  },
  {
    id: 'ar-06',
    name: 'API Key Expiring',
    severity: 'warning',
    condition: 'API key expiry < 7 days',
    escalationChain: ['Platform Admin'],
    channels: [
      { type: 'slack', target: '#platform-ops' },
      { type: 'email', target: 'admin@omniscient.ai' },
    ],
    enabled: true,
  },
];

const SEVERITY_STYLE: Record<string, string> = {
  critical: 'text-neon-magenta border-neon-magenta bg-[rgba(255,0,170,0.1)]',
  warning:  'text-neon-amber border-neon-amber bg-[rgba(255,170,0,0.1)]',
  info:     'text-neon-cyan border-neon-cyan bg-[rgba(0,240,255,0.1)]',
};

function AlertsSection() {
  const { toast, ToastOverlay } = useToast();
  const [rules, setRules] = useState(MOCK_ALERT_RULES);

  function toggleRule(id: string) {
    setRules(prev => prev.map(r => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  }

  return (
    <div>
      <SectionHeader
        title="Alert Rules"
        subtitle="Escalation chains and notification channels"
        action={
          <NeonButton onClick={() => toast('Add Alert Rule dialog would open')} variant="cyan" size="sm">
            <Plus size={12} /> Add Rule
          </NeonButton>
        }
      />

      <div className="space-y-3">
        {rules.map((rule, i) => (
          <motion.div
            key={rule.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: i * 0.04 }}
            className={`glass-panel p-4 transition-opacity ${rule.enabled ? '' : 'opacity-50'}`}
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <Toggle checked={rule.enabled} onChange={() => toggleRule(rule.id)} />
                <div>
                  <h4 className="text-[13px] font-mono font-semibold text-primary">{rule.name}</h4>
                  <p className="text-[11px] font-mono text-secondary mt-0.5">{rule.condition}</p>
                </div>
              </div>
              <span className={`shrink-0 inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider border rounded-sm ${SEVERITY_STYLE[rule.severity]}`}>
                {rule.severity}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-8 gap-y-2 ml-[52px]">
              {/* Escalation chain */}
              {rule.escalationChain.length > 0 && (
                <div>
                  <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-muted block mb-1">Escalation</span>
                  <div className="flex items-center gap-1 text-[11px] font-mono text-secondary">
                    {rule.escalationChain.map((person, j) => (
                      <span key={j} className="flex items-center gap-1">
                        {j > 0 && <span className="text-muted">&rarr;</span>}
                        <span className="text-primary">{person}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Channels */}
              <div>
                <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-muted block mb-1">Channels</span>
                <div className="flex flex-wrap gap-1.5">
                  {rule.channels.map((ch, j) => (
                    <span
                      key={j}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono rounded-sm bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-secondary"
                    >
                      {ch.type === 'slack' ? <Hash size={10} className="text-neon-cyan" /> : <Mail size={10} className="text-neon-amber" />}
                      {ch.target}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      <ToastOverlay />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. API KEYS section
// ---------------------------------------------------------------------------

interface MockApiKey {
  id: string;
  platform: string;
  maskedKey: string;
  created: string;
  expires: string;
  status: string;
  lastUsed: string;
}

const MOCK_API_KEYS: MockApiKey[] = [
  { id: 'k-01', platform: 'OpenAI',        maskedKey: '****-7f3a',  created: '2025-11-15', expires: '2026-05-15', status: 'valid',    lastUsed: '2 min ago' },
  { id: 'k-02', platform: 'Anthropic',     maskedKey: '****-c8e2',  created: '2025-12-01', expires: '2026-06-01', status: 'valid',    lastUsed: '5 min ago' },
  { id: 'k-03', platform: 'X / Twitter',   maskedKey: '****-91ab',  created: '2025-10-20', expires: '2026-04-20', status: 'expiring', lastUsed: '1 hr ago' },
  { id: 'k-04', platform: 'LinkedIn',      maskedKey: '****-4d5f',  created: '2026-01-10', expires: '2026-07-10', status: 'valid',    lastUsed: '30 min ago' },
  { id: 'k-05', platform: 'Meta (FB/IG)',  maskedKey: '****-be72',  created: '2025-09-01', expires: '2026-03-01', status: 'expired',  lastUsed: '34 days ago' },
  { id: 'k-06', platform: 'Google (YT)',   maskedKey: '****-1f44',  created: '2026-02-15', expires: '2026-08-15', status: 'valid',    lastUsed: '12 min ago' },
  { id: 'k-07', platform: 'SendGrid',      maskedKey: '****-a3c9',  created: '2025-08-01', expires: '2026-02-01', status: 'revoked',  lastUsed: 'N/A' },
];

function ApiKeysSection() {
  const { toast, ToastOverlay } = useToast();
  const { sorted, sortKey, sortDir, toggleSort } = useSortableTable(MOCK_API_KEYS, 'platform');

  return (
    <div>
      <SectionHeader
        title="API Keys"
        subtitle="Platform integration credentials and rotation status"
        action={
          <NeonButton onClick={() => toast('Add API Key dialog would open')} variant="cyan" size="sm">
            <Plus size={12} /> Add Key
          </NeonButton>
        }
      />

      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[750px]">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.06)]">
                <SortHeader label="Platform" colKey="platform" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="text-left text-[10px] font-mono font-semibold uppercase tracking-[0.12em] py-2.5 px-3 text-secondary">Key</th>
                <SortHeader label="Created" colKey="created" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Expires" colKey="expires" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <SortHeader label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th className="text-left text-[10px] font-mono font-semibold uppercase tracking-[0.12em] py-2.5 px-3 text-secondary">Last Used</th>
                <th className="text-right text-[10px] font-mono font-semibold uppercase tracking-[0.12em] py-2.5 px-3 text-secondary">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((key, i) => (
                <tr
                  key={key.id}
                  className={`border-b border-[rgba(255,255,255,0.03)] hover:bg-[rgba(0,240,255,0.03)] transition-colors ${
                    i % 2 === 1 ? 'bg-[rgba(255,255,255,0.015)]' : ''
                  }`}
                >
                  <td className="py-2.5 px-3 text-[12px] font-mono font-semibold text-primary">{key.platform}</td>
                  <td className="py-2.5 px-3 text-[11px] font-mono text-secondary tabular-nums tracking-wider">{key.maskedKey}</td>
                  <td className="py-2.5 px-3 text-[11px] font-mono text-secondary tabular-nums">{key.created}</td>
                  <td className="py-2.5 px-3 text-[11px] font-mono text-secondary tabular-nums">{key.expires}</td>
                  <td className="py-2.5 px-3">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-mono">
                      <StatusDot status={key.status} />
                      <span className={
                        key.status === 'valid' ? 'text-neon-green' :
                        key.status === 'expiring' ? 'text-neon-amber' :
                        key.status === 'expired' ? 'text-neon-red' :
                        'text-muted'
                      }>
                        {key.status}
                      </span>
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-[11px] font-mono text-secondary">{key.lastUsed}</td>
                  <td className="py-2.5 px-3 text-right">
                    <span className="inline-flex items-center gap-1">
                      <button onClick={() => toast(`Copied ${key.platform} key`)} className="p-1.5 text-secondary hover:text-neon-cyan transition-colors" title="Copy Key">
                        <Copy size={13} />
                      </button>
                      <button onClick={() => toast(`Rotating ${key.platform} key...`)} className="p-1.5 text-secondary hover:text-neon-green transition-colors" title="Rotate Key">
                        <RefreshCw size={13} />
                      </button>
                      <button onClick={() => toast(`Revoke ${key.platform} key`)} className="p-1.5 text-secondary hover:text-neon-magenta transition-colors" title="Revoke Key">
                        <X size={13} />
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <ToastOverlay />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section content map
// ---------------------------------------------------------------------------

const SECTION_COMPONENTS: Record<SectionKey, () => React.JSX.Element> = {
  system:     SystemSection,
  agents:     AgentsSection,
  servers:    ServersSection,
  tenants:    TenantsSection,
  alerts:     AlertsSection,
  'api-keys': ApiKeysSection,
};

// ---------------------------------------------------------------------------
// Page transition variants
// ---------------------------------------------------------------------------

const pageVariants = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -20 },
};

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function SettingsView() {
  const [activeSection, setActiveSection] = useState<SectionKey>('system');
  const ActiveComponent = SECTION_COMPONENTS[activeSection];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-5 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <h1 className="text-xs font-mono font-semibold uppercase tracking-[0.2em] text-neon-cyan">
            Settings
          </h1>
          <div className="flex-1 h-px bg-[rgba(0,240,255,0.15)]" />
          <span className="text-[10px] font-mono text-secondary tabular-nums">
            {SECTIONS.find(s => s.key === activeSection)?.label}
          </span>
        </div>
      </div>

      {/* Body: sidebar + content */}
      <div className="flex-1 flex min-h-0 px-4 pb-4 gap-4">
        {/* Sidebar */}
        <nav className="shrink-0 w-52 glass-panel flex flex-col py-2 overflow-y-auto" style={{ scrollbarWidth: 'thin' }}>
          {SECTIONS.map(({ key, label, icon: Icon }) => {
            const isActive = activeSection === key;
            return (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`relative flex items-center gap-3 w-full px-4 py-3 text-left transition-colors ${
                  isActive
                    ? 'text-neon-cyan bg-[rgba(0,240,255,0.06)]'
                    : 'text-secondary hover:text-primary hover:bg-[rgba(255,255,255,0.03)]'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="settings-sidebar-indicator"
                    className="absolute left-0 top-1 bottom-1 w-[3px] bg-neon-cyan rounded-r"
                    style={{ boxShadow: '0 0 8px rgba(0,240,255,0.4)' }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <Icon size={16} className="shrink-0" />
                <span className="text-[11px] font-mono font-medium tracking-wider uppercase whitespace-nowrap">
                  {label}
                </span>
              </button>
            );
          })}

          {/* Footer */}
          <div className="mt-auto px-4 py-3 border-t border-[rgba(255,255,255,0.04)]">
            <span className="text-[9px] font-mono text-muted tracking-wider block">BUILD v0.14.2</span>
            <span className="text-[9px] font-mono text-muted tracking-wider block">ENV production</span>
          </div>
        </nav>

        {/* Content */}
        <div
          className="flex-1 min-w-0 overflow-y-auto pr-1"
          style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(0,240,255,0.2) transparent' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            >
              <ActiveComponent />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
