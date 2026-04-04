import { FastifyInstance } from 'fastify';
import { db } from '../db/index';
import { alerts } from '../db/schema';
import { eq, and, desc, SQL } from 'drizzle-orm';

export async function alertRoutes(fastify: FastifyInstance) {
  // List recent alerts with filtering
  fastify.get('/api/alerts', async (request) => {
    const { severity, agentId, tenantId, limit: limitStr } = request.query as Record<string, string>;
    const conditions: SQL[] = [];
    if (severity) conditions.push(eq(alerts.severity, severity as any));
    if (agentId) conditions.push(eq(alerts.agentId, agentId));
    if (tenantId) conditions.push(eq(alerts.tenantId, tenantId));

    const rowLimit = Math.min(parseInt(limitStr || '100'), 500);

    const query = conditions.length > 0
      ? db.select().from(alerts).where(and(...conditions)).orderBy(desc(alerts.createdAt)).limit(rowLimit)
      : db.select().from(alerts).orderBy(desc(alerts.createdAt)).limit(rowLimit);

    return query;
  });

  // Acknowledge an alert
  fastify.patch('/api/alerts/:id/acknowledge', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [alert] = await db.update(alerts)
      .set({ acknowledged: new Date() })
      .where(eq(alerts.id, id))
      .returning();

    if (!alert) return reply.status(404).send({ error: 'Alert not found' });
    return alert;
  });
}
