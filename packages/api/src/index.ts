import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import { agentRoutes } from './routes/agents';
import { serverRoutes } from './routes/servers';
import { taskRoutes } from './routes/tasks';
import { heartbeatRoutes } from './routes/heartbeat';
import { metricsRoutes } from './routes/metrics';
import { tenantRoutes } from './routes/tenants';
import { contentRoutes } from './routes/content';
import { alertRoutes } from './routes/alerts';
import { startAbsenceDetector } from './workers/absence-detector';
import { startMetricsBroadcaster } from './workers/metrics-broadcaster';
import { registerSocketHandlers } from './ws/handlers';

dotenv.config();

const PORT = parseInt(process.env.API_PORT || '3001');
const HOST = process.env.API_HOST || '0.0.0.0';

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: process.env.WS_CORS_ORIGIN || 'http://localhost:5173',
});

// Health check
fastify.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// Register route modules
await fastify.register(agentRoutes);
await fastify.register(serverRoutes);
await fastify.register(taskRoutes);
await fastify.register(heartbeatRoutes);
await fastify.register(metricsRoutes);
await fastify.register(tenantRoutes);
await fastify.register(contentRoutes);
await fastify.register(alertRoutes);

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });

    // Socket.IO on same HTTP server
    const io = new Server(fastify.server, {
      cors: { origin: process.env.WS_CORS_ORIGIN || 'http://localhost:5173' },
    });

    // Make io accessible to routes
    (fastify as any).io = io;

    // Background workers
    startAbsenceDetector(io);
    startMetricsBroadcaster(io);

    // WS connection handling
    io.on('connection', (socket) => {
      fastify.log.info(`Dashboard connected: ${socket.id}`);
      registerSocketHandlers(socket, io);
      socket.on('disconnect', () => {
        fastify.log.info(`Dashboard disconnected: ${socket.id}`);
      });
    });

    fastify.log.info(`Omniscient AMC API running on http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
