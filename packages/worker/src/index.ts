import 'dotenv/config';
import { randomUUID } from 'crypto';
import type { AgentRole, AgentStatus } from '@omniscient/shared';
import { heartbeatEngine } from './heartbeat';
import { startCommandListener } from './commands';
import { taskExecutor } from './executor';

// Bootstrapping properties
export const AGENT_ID = process.env.AGENT_ID || randomUUID();
export const SERVER_ID = process.env.SERVER_ID || 'server-local';
export const TENANT_ID = process.env.TENANT_ID || 'tenant-local';
export const AGENT_ROLE: AgentRole = (process.env.AGENT_ROLE as AgentRole) || 'social-post';

export let currentStatus: AgentStatus = 'idle';

console.log(`[WORKER] Booting Agent Node...`);
console.log(`[WORKER] ID: ${AGENT_ID} | Role: ${AGENT_ROLE} | Server: ${SERVER_ID}`);

// This will eventually tie into the Heartbeat and Executor loops
export function setStatus(newStatus: AgentStatus) {
  if (currentStatus === newStatus) return;
  console.log(`[WORKER] Status Transition: ${currentStatus} -> ${newStatus}`);
  currentStatus = newStatus;
  
  // Immediately flush a heartbeat on status change
  heartbeatEngine.start(); // Resets timer effectively if we added a quick flash
}

heartbeatEngine.start();
startCommandListener();
taskExecutor.start();
