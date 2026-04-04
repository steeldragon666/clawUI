import type { AgentStatus } from './agent';

export interface HeartbeatPayload {
  agentId: string;
  serverId: string;
  tenantId: string;
  timestamp: string;
  status: Extract<AgentStatus, 'idle' | 'working' | 'degraded' | 'error'>;
  cpuPercent: number;
  memoryPercent: number;
  currentTaskId: string | null;
  taskCounter: number;
  queueDepth: number;
  meta?: Record<string, unknown>;
}

export interface HeartbeatRecord extends HeartbeatPayload {
  time: string;
}
