import { FastifyInstance } from 'fastify';
import { db } from '../db/index';
import { contentItems } from '../db/schema';
import { eq, and, SQL } from 'drizzle-orm';

export async function contentRoutes(fastify: FastifyInstance) {
  // List content items with filtering
  fastify.get('/api/content', async (request) => {
    const { tenantId, platform, status } = request.query as Record<string, string>;
    const conditions: SQL[] = [];
    if (tenantId) conditions.push(eq(contentItems.tenantId, tenantId));
    if (platform) conditions.push(eq(contentItems.platform, platform as any));
    if (status) conditions.push(eq(contentItems.status, status as any));

    if (conditions.length > 0) {
      return db.select().from(contentItems).where(and(...conditions));
    }
    return db.select().from(contentItems);
  });

  // Create content item
  fastify.post('/api/content', async (request) => {
    const body = request.body as {
      tenantId: string;
      taskId?: string;
      platform: string;
      contentBody: string;
      mediaUrls?: string[];
      hashtags?: string[];
      mentions?: string[];
      scheduledAt?: string;
    };

    const [item] = await db.insert(contentItems).values({
      tenantId: body.tenantId,
      taskId: body.taskId || null,
      platform: body.platform as any,
      contentBody: body.contentBody,
      mediaUrls: body.mediaUrls || [],
      hashtags: body.hashtags || [],
      mentions: body.mentions || [],
      scheduledAt: body.scheduledAt ? new Date(body.scheduledAt) : null,
    }).returning();

    // Broadcast to dashboard
    const io = (fastify as any).io;
    if (io) {
      io.emit('content:status_change', {
        contentId: item.id,
        tenantId: item.tenantId,
        from: null,
        to: 'draft',
      });
    }

    return item;
  });

  // Update content item (edit, approve, schedule, reject)
  fastify.patch('/api/content/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, any>;
    body.updatedAt = new Date();

    const [before] = await db.select().from(contentItems).where(eq(contentItems.id, id));
    if (!before) return reply.status(404).send({ error: 'Content not found' });

    const [item] = await db.update(contentItems).set(body).where(eq(contentItems.id, id)).returning();

    // Broadcast status change if status changed
    if (body.status && body.status !== before.status) {
      const io = (fastify as any).io;
      if (io) {
        io.emit('content:status_change', {
          contentId: item.id,
          tenantId: item.tenantId,
          from: before.status,
          to: item.status,
        });
      }
    }

    return item;
  });

  // Version history
  fastify.get('/api/content/:id/versions', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [item] = await db.select().from(contentItems).where(eq(contentItems.id, id));
    if (!item) return reply.status(404).send({ error: 'Content not found' });
    // For now, return the current version — full version history requires a separate versions table
    return [item];
  });
}
