import type { Socket, Server as SocketServer } from 'socket.io';
import { pushAgentCommand } from '../lib/redis';
import { db } from '../db/index';
import { tasks } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Register client→server WebSocket event handlers.
 * These allow the dashboard to send commands without REST round-trips.
 */
export function registerSocketHandlers(socket: Socket, io: SocketServer) {
  // agent:command — send command to a specific agent
  socket.on('agent:command', async (data: { agentId: string; type: string; payload?: Record<string, unknown> }) => {
    try {
      await pushAgentCommand(data.agentId, {
        type: data.type,
        payload: data.payload,
        issuedBy: `ws:${socket.id}`,
      });

      io.emit('alert:new', {
        id: crypto.randomUUID(),
        severity: 'info',
        source: 'command-dispatch',
        agentId: data.agentId,
        message: `Command '${data.type}' queued for agent ${data.agentId}`,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('[ws:agent:command] Error:', err);
    }
  });

  // task:dispatch — create and optionally assign a task
  socket.on('task:dispatch', async (data: { tenantId: string; type: string; agentId?: string; priority: number; title?: string; inputs: Record<string, unknown> }) => {
    try {
      const [task] = await db.insert(tasks).values({
        tenantId: data.tenantId,
        type: data.type as any,
        agentId: data.agentId || null,
        priority: data.priority as any,
        title: data.title || `${data.type} task`,
        inputs: data.inputs,
      }).returning();

      io.emit('task:created', {
        taskId: task.id,
        tenantId: task.tenantId,
        type: task.type,
        priority: task.priority,
      });
    } catch (err) {
      console.error('[ws:task:dispatch] Error:', err);
    }
  });

  // task:priority_change — change task priority
  socket.on('task:priority_change', async (data: { taskId: string; priority: number }) => {
    try {
      const [updated] = await db.update(tasks)
        .set({ priority: data.priority as any })
        .where(eq(tasks.id, data.taskId))
        .returning();

      if (updated) {
        io.emit('task:status_change', {
          taskId: updated.id,
          from: updated.status,
          to: updated.status,
          agentId: updated.agentId,
        });
      }
    } catch (err) {
      console.error('[ws:task:priority_change] Error:', err);
    }
  });
}
