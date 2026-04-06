import 'dotenv/config';
import { randomUUID } from 'crypto';
import type { AgentRole, AgentStatus, HeartbeatPayload } from '@omniscient/shared';
import { heartbeatEngine } from './heartbeat.js';
import { startCommandListener, stopCommandListener } from './commands.js';
import { taskExecutor } from './executor.js';

// ---------------------------------------------------------------------------
// CLI / Environment configuration
// ---------------------------------------------------------------------------

function arg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  return idx !== -1 && idx + 1 < process.argv.length ? process.argv[idx + 1] : undefined;
}

export const AGENT_ID = arg('--agent-id') || process.env.AGENT_ID || randomUUID();
export const SERVER_ID = arg('--server-id') || process.env.SERVER_ID || 'server-local';
export const TENANT_ID = arg('--tenant-id') || process.env.TENANT_ID || 'tenant-local';
export const API_URL = arg('--api-url') || process.env.CONTROL_PLANE_URL || 'http://localhost:3001';
export const AGENT_ROLE: AgentRole = (arg('--role') as AgentRole) || (process.env.AGENT_ROLE as AgentRole) || 'social-post';

// ---------------------------------------------------------------------------
// Agent status
// ---------------------------------------------------------------------------

export let currentStatus: AgentStatus = 'idle';

/**
 * Transition the agent to a new status.
 * Immediately flushes a heartbeat so the control plane sees the change fast.
 */
export function setStatus(newStatus: AgentStatus) {
  if (currentStatus === newStatus) return;
  console.log(`[WORKER] Status: ${currentStatus} -> ${newStatus}`);
  currentStatus = newStatus;

  // Flush an immediate heartbeat on status change
  heartbeatEngine.flush();
}

/**
 * Map the full AgentStatus to the subset accepted by HeartbeatPayload.
 * Statuses like 'paused', 'stalled', 'unreachable', 'dead' are mapped
 * to the closest valid heartbeat status.
 */
export function getHeartbeatStatus(): HeartbeatPayload['status'] {
  switch (currentStatus) {
    case 'idle':
      return 'idle';
    case 'working':
      return 'working';
    case 'degraded':
    case 'stalled':
      return 'degraded';
    case 'error':
    case 'dead':
    case 'unreachable':
      return 'error';
    case 'paused':
      return 'idle'; // paused agents report as idle in heartbeats
    default:
      return 'idle';
  }
}

// ---------------------------------------------------------------------------
// Startup banner
// ---------------------------------------------------------------------------

console.log('');
console.log('==========================================================');
console.log('  OMNISCIENT AI AGENT WORKER');
console.log('==========================================================');
console.log(`  Agent ID   : ${AGENT_ID}`);
console.log(`  Server ID  : ${SERVER_ID}`);
console.log(`  Tenant ID  : ${TENANT_ID}`);
console.log(`  Role       : ${AGENT_ROLE}`);
console.log(`  API URL    : ${API_URL}`);
console.log(`  PID        : ${process.pid}`);
console.log(`  Started at : ${new Date().toISOString()}`);
console.log('==========================================================');
console.log('');

// ---------------------------------------------------------------------------
// Start subsystems
// ---------------------------------------------------------------------------

heartbeatEngine.start();
startCommandListener();
taskExecutor.start();

// ---------------------------------------------------------------------------
// Graceful shutdown on SIGTERM / SIGINT
// ---------------------------------------------------------------------------

let shuttingDown = false;

async function gracefulShutdown(signal: string) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n[WORKER] Received ${signal}. Shutting down gracefully...`);

  // Stop accepting new tasks
  taskExecutor.stop();

  // Stop listening for commands
  stopCommandListener();

  // Send one final heartbeat, then stop the engine
  setStatus('dead');
  heartbeatEngine.stop();

  console.log('[WORKER] Shutdown complete. Goodbye.');
  process.exit(0);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
