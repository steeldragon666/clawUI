import { FastifyInstance } from 'fastify';
import { db } from '../db/index';
import { tasks, agents, heartbeats } from '../db/schema';
import { sql } from 'drizzle-orm';

export async function metricsRoutes(fastify: FastifyInstance) {
  fastify.get('/api/metrics/performance', async () => {
    // 24h task stats
    const result = await db.execute(sql`
      SELECT
        count(*) FILTER (WHERE status = 'done' AND completed_at > now() - interval '24 hours') as completed_24h,
        count(*) FILTER (WHERE status = 'failed' AND completed_at > now() - interval '24 hours') as failed_24h,
        count(*) FILTER (WHERE completed_at > now() - interval '24 hours') as total_24h,
        avg(actual_duration) FILTER (WHERE completed_at > now() - interval '24 hours') as avg_duration_24h
      FROM tasks
    `);

    return result?.[0] || { completed_24h: 0, failed_24h: 0, total_24h: 0, avg_duration_24h: 0 };
  });

  fastify.get('/api/metrics/infrastructure', async () => {
    // Latest heartbeat per agent for current resource usage
    const result = await db.execute(sql`
      SELECT DISTINCT ON (agent_id)
        agent_id, cpu_percent, memory_percent, status, time
      FROM heartbeats
      ORDER BY agent_id, time DESC
    `);

    return result || [];
  });
}
