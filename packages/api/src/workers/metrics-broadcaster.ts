import type { Server as SocketServer } from 'socket.io';
import { db } from '../db/index';
import { tasks, agents } from '../db/schema';
import { sql } from 'drizzle-orm';

const BROADCAST_INTERVAL_MS = 10_000; // 10s

/**
 * Periodically computes aggregated metrics and broadcasts to all dashboard clients.
 */
export function startMetricsBroadcaster(io: SocketServer) {
  console.log('[metrics-broadcaster] Starting — broadcasts every 10s');

  setInterval(async () => {
    try {
      // 24h task performance
      const perfResult = await db.execute(sql`
        SELECT
          count(*) FILTER (WHERE status = 'done' AND completed_at > now() - interval '24 hours') as completed_24h,
          count(*) FILTER (WHERE status = 'failed' AND completed_at > now() - interval '24 hours') as failed_24h,
          count(*) FILTER (WHERE completed_at > now() - interval '24 hours') as total_24h,
          avg(actual_duration) FILTER (WHERE status = 'done' AND completed_at > now() - interval '24 hours') as avg_duration_24h
        FROM tasks
      `);

      const perf = (perfResult as any)?.[0] || {};
      const completed24h = Number(perf.completed_24h) || 0;
      const failed24h = Number(perf.failed_24h) || 0;
      const total24h = Number(perf.total_24h) || 0;
      const avgDuration24h = Number(perf.avg_duration_24h) || 0;
      const successRate24h = total24h > 0 ? completed24h / total24h : 1;

      // Hourly completions for sparkline (last 24 buckets)
      const hourlyResult = await db.execute(sql`
        SELECT
          date_trunc('hour', completed_at) as hour,
          count(*) as cnt
        FROM tasks
        WHERE status = 'done'
          AND completed_at > now() - interval '24 hours'
        GROUP BY date_trunc('hour', completed_at)
        ORDER BY hour
      `);

      const completionsPerHour: number[] = [];
      const hourlyRows = (hourlyResult || []) as any[];
      for (let i = 0; i < 24; i++) {
        const match = hourlyRows.find((r: any) => {
          const h = new Date(r.hour).getHours();
          const target = (new Date().getHours() - 23 + i + 24) % 24;
          return h === target;
        });
        completionsPerHour.push(match ? Number(match.cnt) : 0);
      }

      // Per-role breakdown
      const roleResult = await db.execute(sql`
        SELECT
          a.role,
          count(*) FILTER (WHERE t.status = 'done') as completed,
          count(*) as total
        FROM tasks t
        JOIN agents a ON a.id = t.agent_id
        WHERE t.created_at > now() - interval '24 hours'
        GROUP BY a.role
      `);

      const byRole: Record<string, { completed: number; total: number; successRate: number }> = {};
      for (const row of (roleResult || []) as any[]) {
        const completed = Number(row.completed) || 0;
        const total = Number(row.total) || 0;
        byRole[row.role] = {
          completed,
          total,
          successRate: total > 0 ? completed / total : 0,
        };
      }

      io.emit('metrics:update', {
        tasksCompleted24h: completed24h,
        successRate24h,
        avgDuration24h,
        retryRate24h: 0, // TODO: compute from retry_count > 0
        completionsPerHour,
        byRole,
      });
    } catch (err) {
      console.error('[metrics-broadcaster] Error:', err);
    }
  }, BROADCAST_INTERVAL_MS);
}
