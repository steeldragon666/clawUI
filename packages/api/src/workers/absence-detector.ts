import { db } from '../db/index';
import { agents, alerts } from '../db/schema';
import { sql, eq, and, ne } from 'drizzle-orm';
import type { Server as SocketServer } from 'socket.io';

const AMBER_THRESHOLD_MS = 60_000;   // 60s
const RED_THRESHOLD_MS = 90_000;     // 90s
const DEAD_THRESHOLD_MS = 120_000;   // 120s
const STALL_HEARTBEAT_COUNT = 5;
const CHECK_INTERVAL_MS = 15_000;    // 15s

export function startAbsenceDetector(io: SocketServer) {
  console.log('[absence-detector] Starting — checks every 15s');

  setInterval(async () => {
    const now = new Date();

    try {
      // Fetch all non-offline agents with their last heartbeat
      const liveAgents = await db.select().from(agents)
        .where(and(
          ne(agents.status, 'dead'),
          ne(agents.status, 'paused'),
        ));

      for (const agent of liveAgents) {
        if (!agent.lastHeartbeat) continue;

        const gap = now.getTime() - new Date(agent.lastHeartbeat).getTime();

        if (gap >= DEAD_THRESHOLD_MS && agent.status !== 'dead') {
          await transitionAgent(agent.id, 'dead', `No heartbeat for ${Math.round(gap / 1000)}s`, io);
        } else if (gap >= RED_THRESHOLD_MS && agent.status !== 'unreachable' && agent.status !== 'dead') {
          await transitionAgent(agent.id, 'unreachable', `No heartbeat for ${Math.round(gap / 1000)}s — critical`, io);
        } else if (gap >= AMBER_THRESHOLD_MS && !['unreachable', 'dead', 'error', 'stalled'].includes(agent.status)) {
          await transitionAgent(agent.id, 'degraded', `No heartbeat for ${Math.round(gap / 1000)}s — warning`, io);
        }
      }

      // Stall detection: agents reporting "working" but task_counter not incrementing
      const stallCheck = await db.execute(sql`
        SELECT agent_id, 
               count(*) as beat_count,
               max(task_counter) - min(task_counter) as counter_delta
        FROM heartbeats
        WHERE time > now() - interval '${sql.raw(String(STALL_HEARTBEAT_COUNT * 30))} seconds'
          AND status = 'working'
        GROUP BY agent_id
        HAVING count(*) >= ${STALL_HEARTBEAT_COUNT}
          AND max(task_counter) - min(task_counter) = 0
      `);

      for (const row of (stallCheck || []) as any[]) {
        const agentId = row.agent_id;
        const [current] = await db.select().from(agents).where(eq(agents.id, agentId));
        if (current && current.status !== 'stalled') {
          await transitionAgent(agentId, 'stalled', `task_counter frozen across ${row.beat_count} heartbeats`, io);
        }
      }
    } catch (err) {
      console.error('[absence-detector] Error:', err);
    }
  }, CHECK_INTERVAL_MS);
}

async function transitionAgent(
  agentId: string,
  newStatus: 'degraded' | 'unreachable' | 'dead' | 'stalled',
  reason: string,
  io: SocketServer,
) {
  const [current] = await db.select().from(agents).where(eq(agents.id, agentId));
  if (!current) return;

  const oldStatus = current.status;
  await db.update(agents).set({ status: newStatus, updatedAt: new Date() }).where(eq(agents.id, agentId));

  // Create alert
  const severity = newStatus === 'dead' || newStatus === 'unreachable' ? 'error' : 'warning';
  const [alert] = await db.insert(alerts).values({
    severity,
    source: 'absence-detector',
    agentId,
    serverId: current.serverId,
    tenantId: current.tenantId,
    message: `Agent ${current.name} → ${newStatus}: ${reason}`,
  }).returning();

  // Broadcast to dashboard
  io.emit('agent:status_change', { agentId, from: oldStatus, to: newStatus, reason });
  io.emit('alert:new', {
    id: alert.id,
    severity,
    source: 'absence-detector',
    agentId,
    message: alert.message,
    timestamp: alert.createdAt,
  });

  console.log(`[absence-detector] ${current.name}: ${oldStatus} → ${newStatus} (${reason})`);
}
