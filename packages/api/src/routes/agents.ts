import { FastifyInstance } from 'fastify';
import { db } from '../db/index';
import { agents } from '../db/schema';
import { eq, sql } from 'drizzle-orm';
import { pushAgentCommand, pushBulkCommand } from '../lib/redis';

export async function agentRoutes(fastify: FastifyInstance) {
  // List all agents enriched with latest heartbeat metrics
  fastify.get('/api/agents', async (request) => {
    const { serverId, tenantId, status } = request.query as Record<string, string>;

    // Build raw WHERE clause fragments
    const whereParts: string[] = [];
    if (serverId) whereParts.push(`a.server_id = '${serverId}'`);
    if (tenantId) whereParts.push(`a.tenant_id = '${tenantId}'`);
    if (status) whereParts.push(`a.status = '${status}'`);

    const whereClause = whereParts.length > 0 ? sql.raw(`WHERE ${whereParts.join(' AND ')}`) : sql.raw('');

    const result = await db.execute(sql`
      SELECT
        a.id, a.server_id as "serverId", a.tenant_id as "tenantId",
        a.name, a.role, a.status,
        a.current_task_id as "currentTaskId",
        a.config, a.last_heartbeat as "lastHeartbeat",
        a.created_at as "createdAt", a.updated_at as "updatedAt",
        COALESCE(h.cpu_percent, 0) as "cpuPercent",
        COALESCE(h.memory_percent, 0) as "memoryPercent",
        COALESCE(h.task_counter, 0) as "taskCounter",
        COALESCE(h.queue_depth, 0) as "queueDepth"
      FROM agents a
      LEFT JOIN LATERAL (
        SELECT cpu_percent, memory_percent, task_counter, queue_depth
        FROM heartbeats
        WHERE heartbeats.agent_id = a.id
        ORDER BY time DESC
        LIMIT 1
      ) h ON true
      ${whereClause}
      ORDER BY a.server_id, a.name
    `);

    return result || [];
  });

  // Get single agent enriched with latest heartbeat + recent heartbeat history
  fastify.get('/api/agents/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    const result = await db.execute(sql`
      SELECT
        a.id, a.server_id as "serverId", a.tenant_id as "tenantId",
        a.name, a.role, a.status,
        a.current_task_id as "currentTaskId",
        a.config, a.last_heartbeat as "lastHeartbeat",
        a.created_at as "createdAt", a.updated_at as "updatedAt",
        COALESCE(h.cpu_percent, 0) as "cpuPercent",
        COALESCE(h.memory_percent, 0) as "memoryPercent",
        COALESCE(h.task_counter, 0) as "taskCounter",
        COALESCE(h.queue_depth, 0) as "queueDepth"
      FROM agents a
      LEFT JOIN LATERAL (
        SELECT cpu_percent, memory_percent, task_counter, queue_depth
        FROM heartbeats
        WHERE heartbeats.agent_id = a.id
        ORDER BY time DESC
        LIMIT 1
      ) h ON true
      WHERE a.id = ${id}
    `);

    const agent = (result as any[])?.[0];
    if (!agent) return reply.status(404).send({ error: 'Agent not found' });
    return agent;
  });

  // Send command to agent via Redis Stream + persist status change
  fastify.post('/api/agents/:id/command', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { type: string; payload?: Record<string, unknown> };

    // Verify agent exists
    const [agent] = await db.select().from(agents).where(eq(agents.id, id));
    if (!agent) return reply.status(404).send({ error: 'Agent not found' });

    const streamId = await pushAgentCommand(id, {
      type: body.type,
      payload: body.payload,
      issuedBy: 'dashboard',
    });

    // Determine new status from command type
    const statusMap: Record<string, string> = {
      pause: 'paused',
      resume: 'idle',
      kill: 'dead',
      restart: 'degraded',
      graceful_shutdown: 'paused',
    };

    const newStatus = statusMap[body.type];
    if (newStatus) {
      await db.update(agents)
        .set({ status: newStatus as any, updatedAt: new Date() })
        .where(eq(agents.id, id));
    }

    // Broadcast to dashboard for immediate UI feedback
    const io = (fastify as any).io;
    if (io && newStatus) {
      io.emit('agent:status_change', {
        agentId: id,
        from: agent.status,
        to: newStatus,
        reason: `Command: ${body.type}`,
      });
    }

    return { agentId: id, command: body.type, status: 'queued', streamId };
  });

  // Bulk command via Redis Streams
  fastify.post('/api/agents/bulk-command', async (request) => {
    const body = request.body as { agentIds: string[]; type: string; payload?: Record<string, unknown> };

    await pushBulkCommand(body.agentIds, {
      type: body.type,
      payload: body.payload,
      issuedBy: 'dashboard',
    });

    // Persist status changes for applicable commands
    const statusMap: Record<string, string> = {
      pause: 'paused',
      resume: 'idle',
      kill: 'dead',
      restart: 'degraded',
    };
    const newStatus = statusMap[body.type];
    if (newStatus) {
      for (const agentId of body.agentIds) {
        await db.update(agents)
          .set({ status: newStatus as any, updatedAt: new Date() })
          .where(eq(agents.id, agentId));
      }
    }

    return { agentIds: body.agentIds, command: body.type, status: 'queued', count: body.agentIds.length };
  });
}
