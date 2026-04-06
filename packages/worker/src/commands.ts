import Redis from 'ioredis';
import type { AgentCommandType, AgentCommand } from '@omniscient/shared';
import { AGENT_ID, setStatus, API_URL } from './index.js';
import { taskExecutor } from './executor.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const STREAM_KEY = `agent-commands:${AGENT_ID}`;
const POLL_FALLBACK_MS = 10_000; // 10s HTTP polling fallback

let redis: Redis | null = null;
let stopped = false;

/**
 * Attempts to connect to Redis. Returns true if successful.
 */
async function connectRedis(): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      const client = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 1,
        retryStrategy: () => null, // Don't auto-retry on initial connect
        lazyConnect: true,
        connectTimeout: 3000,
      });

      client.on('error', () => {
        // Suppress connection errors during probe
      });

      client
        .connect()
        .then(() => {
          redis = client;
          console.log(`[COMMANDS] Redis connected at ${REDIS_URL}`);
          resolve(true);
        })
        .catch(() => {
          client.disconnect();
          resolve(false);
        });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Start the command listener.
 * Tries Redis Streams first; falls back to HTTP polling if Redis is unavailable.
 */
export async function startCommandListener(): Promise<void> {
  stopped = false;
  const connected = await connectRedis();

  if (connected) {
    console.log(`[COMMANDS] Listening on Redis stream: ${STREAM_KEY}`);
    redisStreamLoop();
  } else {
    console.warn(`[COMMANDS] Redis unavailable. Falling back to HTTP polling every ${POLL_FALLBACK_MS / 1000}s.`);
    httpPollLoop();
  }
}

/**
 * Stop the command listener gracefully.
 */
export function stopCommandListener(): void {
  stopped = true;
  if (redis) {
    redis.disconnect();
    redis = null;
  }
}

// ---------------------------------------------------------------------------
// Redis Stream listener
// ---------------------------------------------------------------------------

async function redisStreamLoop(): Promise<void> {
  let lastId = '0'; // Drain backlog first, then read new

  const poll = async () => {
    if (stopped || !redis) return;

    try {
      const result = await redis.xread('COUNT', 10, 'BLOCK', 5000, 'STREAMS', STREAM_KEY, lastId);

      if (result) {
        for (const [, messages] of result) {
          for (const [messageId, fields] of messages) {
            lastId = messageId;

            // Parse flat field array into object
            const data: Record<string, string> = {};
            for (let i = 0; i < fields.length; i += 2) {
              data[fields[i]] = fields[i + 1];
            }

            const commandType = data.type as AgentCommandType;
            const commandId = data.id || messageId;
            console.log(`[COMMANDS] Received: ${commandType} (stream ID: ${messageId})`);

            handleCommand(commandType, data);
            acknowledgeCommand(commandId);

            // Trim processed message to keep stream lean
            await redis!.xdel(STREAM_KEY, messageId);
          }
        }
      }
    } catch (err) {
      const msg = (err as Error).message || '';
      if (!msg.includes('NOGROUP')) {
        console.error('[COMMANDS] Redis stream error:', msg);
      }
    }

    // Continue (non-recursive setTimeout to avoid stack growth)
    if (!stopped) {
      setTimeout(poll, 100);
    }
  };

  poll();
}

// ---------------------------------------------------------------------------
// HTTP polling fallback
// ---------------------------------------------------------------------------

async function httpPollLoop(): Promise<void> {
  const tick = async () => {
    if (stopped) return;

    try {
      const res = await fetch(`${API_URL}/api/agents/${AGENT_ID}/commands`);
      if (res.ok) {
        const commands: AgentCommand[] = await res.json();
        for (const cmd of commands) {
          console.log(`[COMMANDS] Received (HTTP): ${cmd.type} (id: ${cmd.id})`);
          handleCommand(cmd.type, { ...cmd, payload: JSON.stringify(cmd.payload || {}) } as unknown as Record<string, string>);
          acknowledgeCommand(cmd.id);
        }
      }
    } catch (err) {
      console.warn(`[COMMANDS] HTTP poll failed: ${(err as Error).message}`);
    }

    if (!stopped) {
      setTimeout(tick, POLL_FALLBACK_MS);
    }
  };

  tick();
}

// ---------------------------------------------------------------------------
// Command handler
// ---------------------------------------------------------------------------

function handleCommand(type: AgentCommandType | string, data: Record<string, string>): void {
  switch (type) {
    case 'pause':
      console.log('[COMMANDS] -> PAUSE');
      setStatus('paused');
      break;

    case 'resume':
      console.log('[COMMANDS] -> RESUME');
      setStatus('idle');
      break;

    case 'cancel_task':
      console.log('[COMMANDS] -> CANCEL current task');
      taskExecutor.cancelCurrentTask();
      break;

    case 'reassign_task': {
      const payload = JSON.parse(data.payload || '{}');
      console.log('[COMMANDS] -> REASSIGN task', payload);
      taskExecutor.cancelCurrentTask();
      // The control plane will re-queue the task for another agent
      break;
    }

    case 'update_config': {
      const payload = JSON.parse(data.payload || '{}');
      console.log('[COMMANDS] -> CONFIG UPDATE:', payload);
      // Future: apply config changes to executor, heartbeat interval, etc.
      break;
    }

    case 'force_sync':
      console.log('[COMMANDS] -> FORCE SYNC');
      // Future: pull latest config/state from control plane
      break;

    case 'graceful_shutdown':
      console.log('[COMMANDS] -> GRACEFUL SHUTDOWN — finishing current task then exiting');
      taskExecutor.stop();
      setStatus('paused');
      setTimeout(() => {
        console.log('[COMMANDS] Graceful shutdown complete.');
        process.exit(0);
      }, 5000);
      break;

    case 'kill':
      console.log('[COMMANDS] -> KILL — immediate shutdown');
      setStatus('dead');
      setTimeout(() => process.exit(0), 500);
      break;

    case 'restart':
      console.log('[COMMANDS] -> RESTART');
      setStatus('degraded');
      setTimeout(() => process.exit(0), 500);
      break;

    default:
      console.warn(`[COMMANDS] Unknown command type: ${type}`);
  }
}

// ---------------------------------------------------------------------------
// Acknowledge a command back to the API
// ---------------------------------------------------------------------------

async function acknowledgeCommand(commandId: string): Promise<void> {
  try {
    await fetch(`${API_URL}/api/commands/${commandId}/ack`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: AGENT_ID,
        acknowledgedAt: new Date().toISOString(),
      }),
    });
  } catch {
    // Best-effort acknowledgement — don't crash if API is unreachable
  }
}
