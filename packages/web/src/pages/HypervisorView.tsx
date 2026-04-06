import { motion } from 'framer-motion';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------

type SandboxStatus = 'secured' | 'warning' | 'violation';
type NetworkPolicy = 'RESTRICTED' | 'PERMISSIVE' | 'VIOLATION';

interface SandboxData {
  id: string;
  name: string;
  status: SandboxStatus;
  landlock: boolean;
  seccomp: boolean;
  netns: boolean;
  cpuLimit: string;
  cpuUsed: number; // 0–100
  memLimit: string;
  memUsed: number; // 0–100
  networkPolicy: NetworkPolicy;
  lastEvent: string;
  server: string;
}

const SANDBOXES: SandboxData[] = [
  { id: 'sb-01', name: 'sandbox-cw-01', status: 'secured',   landlock: true,  seccomp: true,  netns: true,  cpuLimit: '2 vCPU', cpuUsed: 38, memLimit: '4 GB',  memUsed: 52, networkPolicy: 'RESTRICTED',  lastEvent: '4m ago', server: 'srv-alpha' },
  { id: 'sb-02', name: 'sandbox-cw-02', status: 'secured',   landlock: true,  seccomp: true,  netns: true,  cpuLimit: '2 vCPU', cpuUsed: 61, memLimit: '4 GB',  memUsed: 44, networkPolicy: 'RESTRICTED',  lastEvent: '1m ago', server: 'srv-alpha' },
  { id: 'sb-03', name: 'sandbox-cw-03', status: 'warning',   landlock: true,  seccomp: true,  netns: true,  cpuLimit: '4 vCPU', cpuUsed: 89, memLimit: '8 GB',  memUsed: 76, networkPolicy: 'PERMISSIVE',  lastEvent: '12s ago', server: 'srv-alpha' },
  { id: 'sb-04', name: 'sandbox-cw-04', status: 'secured',   landlock: true,  seccomp: true,  netns: true,  cpuLimit: '2 vCPU', cpuUsed: 22, memLimit: '4 GB',  memUsed: 31, networkPolicy: 'RESTRICTED',  lastEvent: '7m ago', server: 'srv-beta' },
  { id: 'sb-05', name: 'sandbox-cw-05', status: 'secured',   landlock: true,  seccomp: true,  netns: true,  cpuLimit: '2 vCPU', cpuUsed: 47, memLimit: '4 GB',  memUsed: 58, networkPolicy: 'RESTRICTED',  lastEvent: '3m ago', server: 'srv-beta' },
  { id: 'sb-06', name: 'sandbox-cw-06', status: 'secured',   landlock: true,  seccomp: true,  netns: true,  cpuLimit: '2 vCPU', cpuUsed: 15, memLimit: '4 GB',  memUsed: 27, networkPolicy: 'RESTRICTED',  lastEvent: '9m ago', server: 'srv-beta' },
  { id: 'sb-07', name: 'sandbox-cw-07', status: 'secured',   landlock: true,  seccomp: true,  netns: true,  cpuLimit: '4 vCPU', cpuUsed: 71, memLimit: '8 GB',  memUsed: 63, networkPolicy: 'RESTRICTED',  lastEvent: '2m ago', server: 'srv-gamma' },
  { id: 'sb-08', name: 'sandbox-cw-08', status: 'warning',   landlock: true,  seccomp: false, netns: true,  cpuLimit: '2 vCPU', cpuUsed: 55, memLimit: '4 GB',  memUsed: 81, networkPolicy: 'PERMISSIVE',  lastEvent: '28s ago', server: 'srv-gamma' },
  { id: 'sb-09', name: 'sandbox-cw-09', status: 'secured',   landlock: true,  seccomp: true,  netns: true,  cpuLimit: '2 vCPU', cpuUsed: 33, memLimit: '4 GB',  memUsed: 40, networkPolicy: 'RESTRICTED',  lastEvent: '5m ago', server: 'srv-gamma' },
  { id: 'sb-10', name: 'sandbox-cw-10', status: 'secured',   landlock: true,  seccomp: true,  netns: true,  cpuLimit: '2 vCPU', cpuUsed: 19, memLimit: '4 GB',  memUsed: 22, networkPolicy: 'RESTRICTED',  lastEvent: '11m ago', server: 'srv-delta' },
  { id: 'sb-11', name: 'sandbox-cw-11', status: 'secured',   landlock: true,  seccomp: true,  netns: true,  cpuLimit: '4 vCPU', cpuUsed: 58, memLimit: '8 GB',  memUsed: 49, networkPolicy: 'RESTRICTED',  lastEvent: '6m ago', server: 'srv-delta' },
  { id: 'sb-12', name: 'sandbox-cw-12', status: 'violation', landlock: true,  seccomp: true,  netns: false, cpuLimit: '2 vCPU', cpuUsed: 94, memLimit: '4 GB',  memUsed: 88, networkPolicy: 'VIOLATION',   lastEvent: '8s ago', server: 'srv-delta' },
];

type ModelDeployment = 'LOCAL' | 'CLOUD';
type ModelStatus = 'ACTIVE' | 'ROUTED' | 'STANDBY';

interface ModelRoute {
  id: string;
  name: string;
  deployment: ModelDeployment;
  useCase: string;
  costPerQuery: string;
  status: ModelStatus;
}

const MODEL_ROUTES: ModelRoute[] = [
  { id: 'm1', name: 'nemotron-nano-3',  deployment: 'LOCAL', useCase: 'Research, summarization',        costPerQuery: '$0.00',   status: 'ACTIVE'  },
  { id: 'm2', name: 'nemotron-3-super', deployment: 'LOCAL', useCase: 'Content generation, editing',   costPerQuery: '$0.00',   status: 'ACTIVE'  },
  { id: 'm3', name: 'claude-sonnet-4',  deployment: 'CLOUD', useCase: 'Complex reasoning, strategy',   costPerQuery: '$0.003',  status: 'ROUTED'  },
  { id: 'm4', name: 'gpt-4o',           deployment: 'CLOUD', useCase: 'Fallback, high-volume tasks',   costPerQuery: '$0.005',  status: 'STANDBY' },
];

type PolicyDirection = 'ALLOW' | 'BLOCK' | 'SSRF CHECK' | 'RATE LIMIT';
type PolicyStatus = 'ACTIVE' | 'ENFORCED';

interface NetworkPolicyRule {
  id: string;
  direction: PolicyDirection;
  target: string;
  port: string;
  status: PolicyStatus;
}

const NETWORK_POLICIES: NetworkPolicyRule[] = [
  { id: 'np-01', direction: 'ALLOW',      target: 'api.twitter.com',                port: '443', status: 'ACTIVE'   },
  { id: 'np-02', direction: 'ALLOW',      target: 'api.linkedin.com',               port: '443', status: 'ACTIVE'   },
  { id: 'np-03', direction: 'ALLOW',      target: 'graph.facebook.com',             port: '443', status: 'ACTIVE'   },
  { id: 'np-04', direction: 'BLOCK',      target: '*.internal.corp',                port: '*',   status: 'ENFORCED' },
  { id: 'np-05', direction: 'BLOCK',      target: '10.0.0.0/8',                     port: '*',   status: 'ENFORCED' },
  { id: 'np-06', direction: 'SSRF CHECK', target: 'all outbound requests',          port: '—',   status: 'ACTIVE'   },
  { id: 'np-07', direction: 'RATE LIMIT', target: '100 req/min per sandbox',        port: '—',   status: 'ACTIVE'   },
  { id: 'np-08', direction: 'BLOCK',      target: 'ingress → all except ctrl-plane', port: '3001', status: 'ENFORCED' },
];

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

const STAGGER_CONTAINER = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.06 } },
};

const STAGGER_ITEM = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

// ---------------------------------------------------------------------------
// Section 1: Stat Cards
// ---------------------------------------------------------------------------

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  color: string;       // tailwind text-* class
  borderColor: string; // hex for inline style
  glowClass: string;
}

function StatCard({ label, value, subValue, color, borderColor, glowClass }: StatCardProps) {
  return (
    <div
      className={`glass-panel flex flex-col p-4 ${glowClass}`}
      style={{ borderBottomWidth: 2, borderBottomColor: borderColor }}
    >
      <span className="text-[11px] font-sans uppercase tracking-wider text-secondary mb-1">{label}</span>
      <span className={`text-2xl font-mono font-bold tabular-nums leading-none ${color}`}>{value}</span>
      {subValue && (
        <span className="text-[10px] font-mono text-muted mt-1">{subValue}</span>
      )}
    </div>
  );
}

function HypervisorStats() {
  const sandboxActive = 47;
  const sandboxTotal  = 50;
  const sandboxRatio  = sandboxActive / sandboxTotal;
  const sandboxColor  = sandboxRatio > 0.9 ? 'text-neon-green' : sandboxRatio > 0.8 ? 'text-neon-amber' : 'text-neon-magenta';
  const sandboxBorder = sandboxRatio > 0.9 ? '#00ff88'         : sandboxRatio > 0.8 ? '#ffaa00'         : '#ff00aa';
  const sandboxGlow   = sandboxRatio > 0.9 ? 'glow-green'      : sandboxRatio > 0.8 ? 'glow-amber'      : 'glow-magenta';

  const costPerHr = 12.4;
  const costColor  = costPerHr < 20 ? 'text-neon-green' : costPerHr < 50 ? 'text-neon-amber' : 'text-neon-magenta';
  const costBorder = costPerHr < 20 ? '#00ff88'         : costPerHr < 50 ? '#ffaa00'         : '#ff00aa';
  const costGlow   = costPerHr < 20 ? 'glow-green'      : costPerHr < 50 ? 'glow-amber'      : 'glow-magenta';

  const secScore = 94;
  const secColor  = secScore > 90 ? 'text-neon-green' : secScore > 80 ? 'text-neon-amber' : 'text-neon-magenta';
  const secBorder = secScore > 90 ? '#00ff88'         : secScore > 80 ? '#ffaa00'         : '#ff00aa';
  const secGlow   = secScore > 90 ? 'glow-green'      : secScore > 80 ? 'glow-amber'      : 'glow-magenta';

  return (
    <div className="grid grid-cols-4 gap-3 shrink-0">
      <StatCard
        label="Sandboxes Active"
        value={`${sandboxActive}/${sandboxTotal}`}
        subValue="NemoClaw sandboxes"
        color={sandboxColor}
        borderColor={sandboxBorder}
        glowClass={sandboxGlow}
      />
      <StatCard
        label="Models Loaded"
        value="8 NIMs"
        subValue="NVIDIA Inference Microservices"
        color="text-neon-cyan"
        borderColor="#00f0ff"
        glowClass="glow-cyan"
      />
      <StatCard
        label="Inference Cost / hr"
        value={`$${costPerHr.toFixed(2)}`}
        subValue="73% routed locally"
        color={costColor}
        borderColor={costBorder}
        glowClass={costGlow}
      />
      <StatCard
        label="Security Score"
        value={`${secScore}/100`}
        subValue="OpenShell policy engine"
        color={secColor}
        borderColor={secBorder}
        glowClass={secGlow}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2 Left: Sandbox Fleet Grid
// ---------------------------------------------------------------------------

const SANDBOX_BORDER: Record<SandboxStatus, string> = {
  secured:   'border-l-[3px] border-l-neon-green',
  warning:   'border-l-[3px] border-l-neon-amber',
  violation: 'border-l-[3px] border-l-neon-magenta',
};

const SANDBOX_DOT: Record<SandboxStatus, string> = {
  secured:   'bg-neon-green shadow-[0_0_6px_rgba(0,255,136,0.6)]',
  warning:   'bg-neon-amber shadow-[0_0_6px_rgba(255,170,0,0.6)]',
  violation: 'bg-neon-magenta shadow-[0_0_6px_rgba(255,0,170,0.6)]',
};

const SANDBOX_STATUS_LABEL: Record<SandboxStatus, { text: string; color: string }> = {
  secured:   { text: 'SECURED',   color: 'text-neon-green'   },
  warning:   { text: 'WARNING',   color: 'text-neon-amber'   },
  violation: { text: 'VIOLATION', color: 'text-neon-magenta' },
};

const NETPOL_BADGE: Record<NetworkPolicy, { bg: string; text: string }> = {
  RESTRICTED: { bg: 'bg-neon-green/10 border border-neon-green/30',   text: 'text-neon-green'   },
  PERMISSIVE: { bg: 'bg-neon-amber/10 border border-neon-amber/30',   text: 'text-neon-amber'   },
  VIOLATION:  { bg: 'bg-neon-magenta/10 border border-neon-magenta/30', text: 'text-neon-magenta' },
};

function SecurityBadge({ label, active }: { label: string; active: boolean }) {
  return (
    <span
      className={`text-[8px] font-mono px-1.5 py-0.5 rounded-sm border ${
        active
          ? 'border-neon-green/40 text-neon-green bg-neon-green/10'
          : 'border-neon-magenta/40 text-neon-magenta bg-neon-magenta/10'
      }`}
    >
      {label} {active ? '✓' : '✗'}
    </span>
  );
}

function MiniProgressBar({ value, color }: { value: number; color: string }) {
  return (
    <div className="flex-1 h-[4px] rounded-sm bg-white/5 overflow-hidden">
      <div
        className={`h-full rounded-sm transition-all`}
        style={{ width: `${value}%`, backgroundColor: color }}
      />
    </div>
  );
}

function SandboxCard({ sandbox }: { sandbox: SandboxData }) {
  const borderClass = SANDBOX_BORDER[sandbox.status];
  const dotClass    = SANDBOX_DOT[sandbox.status];
  const statusLabel = SANDBOX_STATUS_LABEL[sandbox.status];
  const netBadge    = NETPOL_BADGE[sandbox.networkPolicy];

  const cpuColor = sandbox.cpuUsed > 80 ? '#ff00aa' : sandbox.cpuUsed > 60 ? '#ffaa00' : '#00ff88';
  const memColor = sandbox.memUsed > 80 ? '#ff00aa' : sandbox.memUsed > 60 ? '#ffaa00' : '#00ff88';

  return (
    <motion.div
      variants={STAGGER_ITEM}
      className={`bg-[#12121f] border border-border-subtle ${borderClass} rounded flex flex-col gap-2 p-3 transition-colors hover:bg-[#1a1a2e]`}
    >
      {/* Top row: name + status */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <div className={`w-2 h-2 shrink-0 rounded-full ${dotClass}`} />
          <span className="font-mono text-[10px] text-primary font-bold truncate">{sandbox.name}</span>
        </div>
        <span className={`text-[8px] font-mono uppercase tracking-wider shrink-0 ${statusLabel.color}`}>
          {statusLabel.text}
        </span>
      </div>

      {/* Security layer badges */}
      <div className="flex items-center gap-1 flex-wrap">
        <SecurityBadge label="LANDLOCK" active={sandbox.landlock} />
        <SecurityBadge label="SECCOMP"  active={sandbox.seccomp}  />
        <SecurityBadge label="NETNS"    active={sandbox.netns}    />
      </div>

      {/* Resource limits */}
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[9px] font-mono">
          <span className="text-secondary w-[26px] shrink-0">CPU</span>
          <span className="text-muted w-[38px] shrink-0">{sandbox.cpuLimit}</span>
          <MiniProgressBar value={sandbox.cpuUsed} color={cpuColor} />
          <span className="tabular-nums w-[24px] text-right" style={{ color: cpuColor }}>{sandbox.cpuUsed}%</span>
        </div>
        <div className="flex items-center gap-1.5 text-[9px] font-mono">
          <span className="text-secondary w-[26px] shrink-0">MEM</span>
          <span className="text-muted w-[38px] shrink-0">{sandbox.memLimit}</span>
          <MiniProgressBar value={sandbox.memUsed} color={memColor} />
          <span className="tabular-nums w-[24px] text-right" style={{ color: memColor }}>{sandbox.memUsed}%</span>
        </div>
      </div>

      {/* Network policy + last event */}
      <div className="flex items-center justify-between gap-1">
        <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-sm ${netBadge.bg} ${netBadge.text}`}>
          {sandbox.networkPolicy}
        </span>
        <span className="text-[8px] font-mono text-muted truncate">evt {sandbox.lastEvent}</span>
      </div>
    </motion.div>
  );
}

function SandboxFleetGrid() {
  const grouped = SANDBOXES.reduce<Record<string, SandboxData[]>>((acc, sb) => {
    if (!acc[sb.server]) acc[sb.server] = [];
    acc[sb.server].push(sb);
    return acc;
  }, {});

  return (
    <div className="glass-panel hud-corners flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle shrink-0">
        <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-neon-green">
          Sandbox Fleet
        </h2>
        <span className="text-[9px] font-mono text-secondary">showing 12 / 50</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 pb-3 pt-2 custom-scrollbar flex flex-col gap-4">
        {Object.entries(grouped).map(([serverId, sandboxes]) => (
          <div key={serverId} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[10px] font-mono text-secondary uppercase tracking-widest">
              <span>{serverId}</span>
              <div className="flex-1 h-px bg-border-subtle" />
              <span className="text-[9px] text-muted">{sandboxes.length} sandboxes</span>
            </div>
            <motion.div
              className="grid grid-cols-2 xl:grid-cols-3 gap-2"
              initial="hidden"
              animate="visible"
              variants={STAGGER_CONTAINER}
            >
              {sandboxes.map(sb => (
                <SandboxCard key={sb.id} sandbox={sb} />
              ))}
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2 Right Top: Model Routing Panel
// ---------------------------------------------------------------------------

const DEPLOY_BADGE: Record<ModelDeployment, { bg: string; text: string; label: string }> = {
  LOCAL: { bg: 'bg-neon-green/10 border border-neon-green/30', text: 'text-neon-green',   label: 'LOCAL' },
  CLOUD: { bg: 'bg-neon-cyan/10  border border-neon-cyan/30',  text: 'text-neon-cyan',    label: 'CLOUD' },
};

const STATUS_BADGE: Record<ModelStatus, { bg: string; text: string }> = {
  ACTIVE:  { bg: 'bg-neon-green/10  border border-neon-green/30',   text: 'text-neon-green'   },
  ROUTED:  { bg: 'bg-neon-cyan/10   border border-neon-cyan/30',    text: 'text-neon-cyan'    },
  STANDBY: { bg: 'bg-neon-amber/10  border border-neon-amber/30',   text: 'text-neon-amber'   },
};

const LOCAL_PCT = 73;
const CLOUD_PCT = 27;

function ModelRoutingPanel() {
  return (
    <div className="glass-panel hud-corners flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle shrink-0">
        <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-neon-cyan">
          Inference Routing
        </h2>
        <span className="text-[9px] font-mono text-neon-green animate-pulse">PRIVACY ROUTER: ACTIVE</span>
      </div>

      <div className="flex flex-col gap-0 flex-1 overflow-hidden">
        {/* Model rows */}
        <div className="flex flex-col divide-y divide-border-subtle px-3 pt-2 pb-1">
          {MODEL_ROUTES.map(model => {
            const deploy = DEPLOY_BADGE[model.deployment];
            const status = STATUS_BADGE[model.status];
            return (
              <div key={model.id} className="flex items-center gap-2 py-2">
                {/* Name */}
                <span className="font-mono text-[10px] text-primary font-semibold w-[130px] shrink-0 truncate">
                  {model.name}
                </span>
                {/* Deploy badge */}
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-sm ${deploy.bg} ${deploy.text} w-[40px] text-center shrink-0`}>
                  {deploy.label}
                </span>
                {/* Use case */}
                <span className="text-[10px] font-sans text-secondary flex-1 truncate min-w-0">
                  {model.useCase}
                </span>
                {/* Cost */}
                <span className="font-mono text-[9px] text-muted tabular-nums w-[40px] text-right shrink-0">
                  {model.costPerQuery}
                </span>
                {/* Status badge */}
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-sm ${status.bg} ${status.text} w-[52px] text-center shrink-0`}>
                  {model.status}
                </span>
              </div>
            );
          })}
        </div>

        {/* Distribution bar */}
        <div className="px-3 pb-3 flex flex-col gap-1.5 mt-1">
          <div className="flex items-center justify-between text-[9px] font-mono">
            <span className="text-secondary uppercase tracking-wider">Query Distribution</span>
            <span className="text-muted">{LOCAL_PCT}% local / {CLOUD_PCT}% cloud</span>
          </div>
          <div className="flex h-[6px] rounded-sm overflow-hidden bg-white/5">
            <div
              className="h-full bg-neon-green transition-all"
              style={{ width: `${LOCAL_PCT}%` }}
            />
            <div
              className="h-full bg-neon-cyan transition-all"
              style={{ width: `${CLOUD_PCT}%` }}
            />
          </div>
          <div className="flex items-center gap-3 text-[9px] font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-neon-green inline-block" />
              <span className="text-neon-green">{LOCAL_PCT}% LOCAL</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm bg-neon-cyan inline-block" />
              <span className="text-neon-cyan">{CLOUD_PCT}% CLOUD</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section 2 Right Bottom: Network Policy Monitor
// ---------------------------------------------------------------------------

const POLICY_STATUS_DOT: Record<PolicyStatus, string> = {
  ACTIVE:   'bg-neon-green shadow-[0_0_4px_rgba(0,255,136,0.7)]',
  ENFORCED: 'bg-neon-amber shadow-[0_0_4px_rgba(255,170,0,0.7)]',
};

const POLICY_STATUS_TEXT: Record<PolicyStatus, string> = {
  ACTIVE:   'text-neon-green',
  ENFORCED: 'text-neon-amber',
};

const DIRECTION_COLOR: Record<PolicyDirection, string> = {
  'ALLOW':      'text-neon-green',
  'BLOCK':      'text-neon-magenta',
  'SSRF CHECK': 'text-neon-cyan',
  'RATE LIMIT': 'text-neon-amber',
};

function NetworkPolicyMonitor() {
  return (
    <div className="glass-panel hud-corners flex flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border-subtle shrink-0">
        <h2 className="text-xs font-mono font-semibold uppercase tracking-widest text-neon-amber">
          Network Policies
        </h2>
        <span className="text-[9px] font-mono text-secondary">OpenShell enforced</span>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        <div className="flex flex-col divide-y divide-border-subtle px-3 overflow-y-auto flex-1 custom-scrollbar">
          {NETWORK_POLICIES.map(rule => (
            <div key={rule.id} className="flex items-center gap-2 py-1.5">
              {/* Direction */}
              <span className={`font-mono text-[9px] uppercase tracking-wide w-[68px] shrink-0 ${DIRECTION_COLOR[rule.direction]}`}>
                {rule.direction}
              </span>
              {/* Arrow */}
              <span className="text-muted text-[9px] font-mono shrink-0">→</span>
              {/* Target */}
              <span className="font-mono text-[9px] text-primary flex-1 min-w-0 truncate">
                {rule.target}
              </span>
              {/* Port */}
              {rule.port !== '—' && (
                <span className="font-mono text-[9px] text-muted tabular-nums w-[30px] text-right shrink-0">
                  :{rule.port}
                </span>
              )}
              {/* Status indicator */}
              <div className="flex items-center gap-1 shrink-0 w-[68px] justify-end">
                <div className={`w-1.5 h-1.5 rounded-full ${POLICY_STATUS_DOT[rule.status]}`} />
                <span className={`font-mono text-[8px] uppercase ${POLICY_STATUS_TEXT[rule.status]}`}>
                  {rule.status}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Summary footer */}
        <div className="px-3 py-2 border-t border-border-subtle shrink-0 flex items-center gap-3 text-[9px] font-mono">
          <span className="text-neon-green">47 SANDBOXES COMPLIANT</span>
          <span className="text-muted">|</span>
          <span className="text-neon-green">0 VIOLATIONS</span>
          <span className="text-muted">|</span>
          <span className="text-secondary">LAST AUDIT: <span className="text-primary">2m ago</span></span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root view
// ---------------------------------------------------------------------------

export function HypervisorView() {
  return (
    <div className="h-full flex flex-col gap-3 p-3 min-h-0 overflow-hidden">
      {/* Row 1: Stat cards */}
      <HypervisorStats />

      {/* Row 2: Main content — 60/40 split */}
      <div className="flex-1 grid grid-cols-[3fr_2fr] gap-3 min-h-0">
        {/* Left: Sandbox Fleet Grid */}
        <SandboxFleetGrid />

        {/* Right: stacked panels */}
        <div className="flex flex-col gap-3 min-h-0">
          <ModelRoutingPanel />
          <NetworkPolicyMonitor />
        </div>
      </div>
    </div>
  );
}
