import { FastifyInstance } from 'fastify';
import { db } from '../db/index';
import { servers, agents } from '../db/schema';
import { eq } from 'drizzle-orm';

export async function serverRoutes(fastify: FastifyInstance) {
  fastify.get('/api/servers', async () => {
    return db.select().from(servers);
  });

  fastify.get('/api/servers/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const [server] = await db.select().from(servers).where(eq(servers.id, id));
    if (!server) return reply.status(404).send({ error: 'Server not found' });

    const serverAgents = await db.select().from(agents).where(eq(agents.serverId, id));
    return { ...server, agents: serverAgents };
  });
}
