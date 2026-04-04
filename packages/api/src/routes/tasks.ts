import { FastifyInstance } from 'fastify';
import { db } from '../db/index';
import { tasks } from '../db/schema';
import { eq, and, SQL } from 'drizzle-orm';

export async function taskRoutes(fastify: FastifyInstance) {
  // List tasks with SQL-level filtering
  fastify.get('/api/tasks', async (request) => {
    const { status, tenantId, agentId } = request.query as Record<string, string>;
    const conditions: SQL[] = [];
    if (status) conditions.push(eq(tasks.status, status as any));
    if (tenantId) conditions.push(eq(tasks.tenantId, tenantId));
    if (agentId) conditions.push(eq(tasks.agentId, agentId));

    if (conditions.length > 0) {
      return db.select().from(tasks).where(and(...conditions));
    }
    return db.select().from(tasks);
  });

  // Create task + broadcast
  fastify.post('/api/tasks', async (request) => {
    const body = request.body as {
      tenantId: string; type: string; agentId?: string;
      priority?: number; title: string; description?: string;
      inputs?: Record<string, unknown>;
    };
    const [task] = await db.insert(tasks).values({
      tenantId: body.tenantId,
      type: body.type as any,
      agentId: body.agentId || null,
      priority: (body.priority || 3) as any,
      title: body.title,
      description: body.description || '',
      inputs: body.inputs || {},
    }).returning();

    const io = (fastify as any).io;
    if (io) {
      io.emit('task:created', {
        taskId: task.id,
        tenantId: task.tenantId,
        type: task.type,
        priority: task.priority,
      });
    }

    return task;
  });

  // Update task + broadcast status changes
  fastify.patch('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, any>;

    // Get current state for diff
    const [before] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!before) return reply.status(404).send({ error: 'Task not found' });

    // Auto-set timestamps on status transitions
    if (body.status === 'active' && before.status !== 'active') {
      body.startedAt = new Date();
    }
    if ((body.status === 'done' || body.status === 'failed') && !before.completedAt) {
      body.completedAt = new Date();
      if (before.startedAt) {
        body.actualDuration = Math.round((Date.now() - new Date(before.startedAt).getTime()) / 1000);
      }
    }

    const [task] = await db.update(tasks).set(body).where(eq(tasks.id, id)).returning();

    const io = (fastify as any).io;
    if (io) {
      // Broadcast status change
      if (body.status && body.status !== before.status) {
        io.emit('task:status_change', {
          taskId: task.id,
          from: before.status,
          to: task.status,
          agentId: task.agentId,
        });
      }
    }

    return task;
  });

  // Audit trail
  fastify.get('/api/tasks/:id/audit', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return reply.status(404).send({ error: 'Task not found' });
    return { task, executionLog: task.executionLog, inputs: task.inputs, outputs: task.outputs };
  });
}
