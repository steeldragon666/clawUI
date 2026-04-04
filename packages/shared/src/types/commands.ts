export type AgentCommandType =
  | 'pause'
  | 'resume'
  | 'kill'
  | 'cancel_task'
  | 'reassign_task'
  | 'update_config'
  | 'force_sync'
  | 'graceful_shutdown'
  | 'restart';

export interface AgentCommand {
  id: string;
  agentId: string;
  type: AgentCommandType;
  payload?: Record<string, unknown>;
  issuedBy: string;
  issuedAt: string;
  acknowledgedAt?: string;
}

export interface BulkCommand {
  agentIds: string[];
  type: AgentCommandType;
  payload?: Record<string, unknown>;
  issuedBy: string;
}
