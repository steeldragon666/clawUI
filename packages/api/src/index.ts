import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

dotenv.config();

const PORT = parseInt(process.env.API_PORT || '3001');
const HOST = process.env.API_HOST || '0.0.0.0';

const fastify = Fastify({ logger: true });

await fastify.register(cors, {
  origin: process.env.WS_CORS_ORIGIN || 'http://localhost:5173',
});

// Health check
fastify.get('/api/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: HOST });

    // Socket.IO on same server
    const io = new Server(fastify.server, {
      cors: { origin: process.env.WS_CORS_ORIGIN || 'http://localhost:5173' },
    });

    io.on('connection', (socket) => {
      fastify.log.info(`Dashboard connected: ${socket.id}`);
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
