import type { AgentStatus } from './agent';
import type { TaskStatus } from './task';
import type { HeartbeatPayload } from './heartbeat';
import type { AgentCommand } from './commands';

// Server → Client events (dashboard receives)
export interface ServerToClientEvents {
  'agent:heartbeat': (data: HeartbeatPayload) => void;
  'agent:status_change': (data: { agentId: string; from: AgentStatus; to: AgentStatus; reason?: string }) => void;
  'task:status_change': (data: { taskId: string; from: TaskStatus; to: TaskStatus; agentId?: string | null }) => void;
  'task:created': (data: { taskId: string; tenantId: string; type: string; priority: number }) => void;
  'alert:new': (data: AlertEvent) => void;
  'metrics:update': (data: MetricsSnapshot) => void;
  'content:status_change': (data: { contentId: string; tenantId: string; from: string | null; to: string }) => void;
}

// Client → Server events (dashboard sends)
export interface ClientToServerEvents {
  'agent:command': (data: { agentId: string; type: string; payload?: Record<string, unknown> }) => void;
  'task:dispatch': (data: { tenantId: string; type: string; agentId?: string; priority: number; title?: string; inputs: Record<string, unknown> }) => void;
  'task:priority_change': (data: { taskId: string; priority: number }) => void;
}

export type AlertSeverity = 'error' | 'warning' | 'info';

export interface AlertEvent {
  id: string;
  severity: AlertSeverity;
  source: string;
  agentId?: string;
  serverId?: string;
  tenantId?: string;
  message: string;
  details?: string;
  timestamp: string;
}

export interface MetricsSnapshot {
  tasksCompleted24h: number;
  successRate24h: number;
  avgDuration24h: number;
  retryRate24h: number;
  completionsPerHour: number[];
  byRole: Record<string, { completed: number; total: number; successRate: number }>;
}
