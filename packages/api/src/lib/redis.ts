import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// General purpose client for commands, streams, pub/sub publishing
export const redis = new Redis(REDIS_URL);

redis.on('error', (err) => {
  console.error('[redis] Connection error:', err.message);
});

redis.on('connect', () => {
  console.log('[redis] Connected to', REDIS_URL);
});

/**
 * Push a command to an agent's Redis Stream.
 * Stream key: `agent-stream:{agentId}`
 * Commands queue when agents are offline and drain on reconnect.
 */
export async function pushAgentCommand(
  agentId: string,
  command: { type: string; payload?: Record<string, unknown>; issuedBy?: string },
) {
  const streamKey = `agent-stream:${agentId}`;
  const id = await redis.xadd(
    streamKey,
    '*',
    'type', command.type,
    'payload', JSON.stringify(command.payload || {}),
    'issuedBy', command.issuedBy || 'dashboard',
    'issuedAt', new Date().toISOString(),
  );
  return id;
}

/**
 * Push the same command to multiple agents' streams.
 */
export async function pushBulkCommand(
  agentIds: string[],
  command: { type: string; payload?: Record<string, unknown>; issuedBy?: string },
) {
  const pipeline = redis.pipeline();
  const streamTime = new Date().toISOString();

  for (const agentId of agentIds) {
    pipeline.xadd(
      `agent-stream:${agentId}`,
      '*',
      'type', command.type,
      'payload', JSON.stringify(command.payload || {}),
      'issuedBy', command.issuedBy || 'dashboard',
      'issuedAt', streamTime,
    );
  }

  return pipeline.exec();
}
