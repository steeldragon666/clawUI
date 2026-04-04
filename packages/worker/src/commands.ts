import Redis from 'ioredis';
import { AGENT_ID, setStatus } from './index';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redis = new Redis(REDIS_URL);

const STREAM_KEY = `agent-stream:${AGENT_ID}`;

/**
 * Worker-Side Command Listener using Redis Streams.
 * Reads commands from agent-stream:{agentId}.
 * Starts from '0' on boot to drain any queued commands, then reads new ones.
 */
export function startCommandListener() {
  console.log(`[COMMANDS] Listening on stream: ${STREAM_KEY}`);

  // Start from '0' to drain backlog, then switch to '$' for new-only
  let lastId = '0';

  const poll = async () => {
    try {
      // XREAD COUNT 10 BLOCK 5000 — blocks up to 5s waiting for messages
      const result = await redis.xread('COUNT', 10, 'BLOCK', 5000, 'STREAMS', STREAM_KEY, lastId);

      if (result) {
        for (const [, messages] of result) {
          for (const [messageId, fields] of messages) {
            lastId = messageId;

            // Parse fields array into object: ['type', 'pause', 'payload', '{}', ...]
            const data: Record<string, string> = {};
            for (let i = 0; i < fields.length; i += 2) {
              data[fields[i]] = fields[i + 1];
            }

            const commandType = data.type;
            console.log(`[COMMANDS] Received command: ${commandType} (stream ID: ${messageId})`);

            handleCommand(commandType, data);

            // Acknowledge by trimming processed messages (keep stream lean)
            await redis.xdel(STREAM_KEY, messageId);
          }
        }
      }
    } catch (err) {
      if ((err as Error).message?.includes('NOGROUP')) {
        // Stream doesn't exist yet — that's fine, wait for first command
      } else {
        console.error('[COMMANDS] Stream read error:', (err as Error).message);
      }
    }

    // Continue polling (non-recursive to avoid stack overflow)
    setTimeout(poll, 100);
  };

  poll();
}

function handleCommand(type: string, data: Record<string, string>) {
  switch (type) {
    case 'pause':
      console.log('[COMMANDS] -> Executing PAUSE');
      setStatus('paused');
      break;
    case 'resume':
      console.log('[COMMANDS] -> Executing RESUME');
      setStatus('idle');
      break;
    case 'kill':
      console.log('[COMMANDS] -> SHUTTING DOWN (Kill received)');
      setStatus('dead');
      setTimeout(() => process.exit(0), 500);
      break;
    case 'restart':
      console.log('[COMMANDS] -> RESTARTING');
      setStatus('degraded');
      setTimeout(() => process.exit(0), 500);
      break;
    case 'force_sync':
      console.log('[COMMANDS] -> Force sync requested');
      // TODO: pull latest config from control plane
      break;
    case 'graceful_shutdown':
      console.log('[COMMANDS] -> Graceful shutdown — finishing current task');
      setStatus('paused');
      setTimeout(() => {
        console.log('[COMMANDS] -> Graceful shutdown complete');
        process.exit(0);
      }, 5000);
      break;
    case 'cancel_task':
      console.log('[COMMANDS] -> Cancelling current task');
      setStatus('idle');
      break;
    case 'update_config': {
      const payload = JSON.parse(data.payload || '{}');
      console.log('[COMMANDS] -> Config update received:', payload);
      break;
    }
    default:
      console.warn(`[COMMANDS] Unknown command type: ${type}`);
  }
}
