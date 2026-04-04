export type TaskStatus = 'queued' | 'active' | 'approval' | 'done' | 'failed' | 'cancelled';
export type TaskType = 'social-post' | 'email-batch' | 'seo-audit' | 'blog-draft' | 'content-gen' | 'sensor-read' | 'engagement-pull' | 'custom';

export interface Task {
  id: string;
  tenantId: string;
  agentId: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: 1 | 2 | 3 | 4 | 5;
  title: string;
  description: string;
  estimatedDuration: number | null;
  actualDuration: number | null;
  retryCount: number;
  maxRetries: number;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown> | null;
  executionLog: string | null;
  cost: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}
