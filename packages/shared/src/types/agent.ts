export type AgentStatus = 'idle' | 'working' | 'degraded' | 'error' | 'stalled' | 'unreachable' | 'dead' | 'paused';

export type AgentRole =
  | 'email-filter'
  | 'social-post'
  | 'seo-optimize'
  | 'content-gen'
  | 'blog-writer'
  | 'sensor-monitor'
  | 'climate-control'
  | 'irrigation'
  | 'engagement-monitor'
  | 'ops-engineer'
  | 'custom';

export interface Agent {
  id: string;
  serverId: string;
  tenantId: string;
  name: string;
  role: AgentRole;
  status: AgentStatus;
  currentTaskId?: string | null;
  config?: Record<string, unknown>;
  lastHeartbeat?: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  
  // Real-time metric overlays (from heartbeats)
  cpuPercent?: number;
  memoryPercent?: number;
  taskCounter?: number;
  queueDepth?: number;
}
