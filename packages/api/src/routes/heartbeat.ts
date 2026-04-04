import { FastifyInstance } from 'fastify';
import { db } from '../db/index';
import { heartbeats, agents } from '../db/schema';
import { eq } from 'drizzle-orm';
import type { HeartbeatPayload } from '@omniscient/shared';

export async function heartbeatRoutes(fastify: FastifyInstance) {
  // Ingest heartbeat from agent
  fastify.post('/api/heartbeat', async (request, reply) => {
    const body = request.body as HeartbeatPayload;

    // Write to hypertable
    await db.insert(heartbeats).values({
      time: new Date(body.timestamp),
      agentId: body.agentId,
      tenantId: body.tenantId,
      status: body.status,
      cpuPercent: body.cpuPercent,
      memoryPercent: body.memoryPercent,
      taskCounter: body.taskCounter,
      queueDepth: body.queueDepth,
      currentTaskId: body.currentTaskId,
      payload: body.meta || {},
    });

    // Update agent's last heartbeat + status
    await db.update(agents).set({
      lastHeartbeat: new Date(body.timestamp),
      status: body.status,
    }).where(eq(agents.id, body.agentId));

    // Broadcast to dashboard via Socket.IO (injected via fastify.io)
    const io = (fastify as any).io;
    if (io) {
      io.emit('agent:heartbeat', body);
    }

    return reply.status(204).send();
  });

  // Get recent heartbeats for an agent
  fastify.get('/api/heartbeats/:agentId', async (request) => {
    const { agentId } = request.params as { agentId: string };
    return db.select().from(heartbeats)
      .where(eq(heartbeats.agentId, agentId))
      .orderBy(heartbeats.time)
      .limit(100);
  });
}
