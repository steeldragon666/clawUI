import { FastifyInstance } from 'fastify';
import { db } from '../db/index';
import { tenants } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function tenantRoutes(fastify: FastifyInstance) {
  // List all tenants
  fastify.get('/api/tenants', async () => {
    return db.select().from(tenants);
  });

  // Get single tenant
  fastify.get('/api/tenants/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });
    return tenant;
  });

  // Create tenant
  fastify.post('/api/tenants', async (request) => {
    const body = request.body as {
      companyName: string;
      brandVoiceRules?: Record<string, unknown>;
      approvalWorkflow?: 'auto' | 'manual' | 'hybrid';
      slaTier?: 'basic' | 'professional' | 'enterprise';
      pricingTier?: string;
      platforms?: string[];
    };

    const [tenant] = await db.insert(tenants).values({
      companyName: body.companyName,
      brandVoiceRules: body.brandVoiceRules || {},
      approvalWorkflow: body.approvalWorkflow || 'hybrid',
      slaTier: body.slaTier || 'basic',
      pricingTier: body.pricingTier || 'starter',
      platforms: body.platforms || [],
    }).returning();

    return tenant;
  });

  // Update tenant
  fastify.patch('/api/tenants/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, any>;
    body.updatedAt = new Date();

    const [tenant] = await db.update(tenants).set(body).where(eq(tenants.id, id)).returning();
    if (!tenant) return reply.status(404).send({ error: 'Tenant not found' });
    return tenant;
  });
}
