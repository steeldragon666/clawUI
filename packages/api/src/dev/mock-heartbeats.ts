import { db } from '../db/index';
import { agents } from '../db/schema';
import dotenv from 'dotenv';

dotenv.config();

const API_URL = `http://localhost:${process.env.API_PORT || 3001}`;
const HEARTBEAT_INTERVAL_MS = 5_000; // 5s for dev (faster than prod 30s)

interface MockAgentState {
  id: string;
  serverId: string;
  tenantId: string;
  taskCounter: number;
  status: 'idle' | 'working' | 'degraded' | 'error';
  cpuBase: number;
  memBase: number;
}

async function startSimulator() {
  console.log('[mock-heartbeats] Loading agents from database...');

  const allAgents = await db.select().from(agents);
  if (allAgents.length === 0) {
    console.error('No agents found. Run db:seed first.');
    process.exit(1);
  }

  const states: MockAgentState[] = allAgents.map((a) => ({
    id: a.id,
    serverId: a.serverId,
    tenantId: a.tenantId,
    taskCounter: Math.floor(Math.random() * 1000),
    status: (a.status as MockAgentState['status']) || 'idle',
    cpuBase: 20 + Math.random() * 40,
    memBase: 30 + Math.random() * 30,
  }));

  console.log(`[mock-heartbeats] Simulating ${states.length} agents every ${HEARTBEAT_INTERVAL_MS / 1000}s`);

  setInterval(async () => {
    for (const state of states) {
      const roll = Math.random();

      // Check narrow conditions first to avoid dead branches
      if (roll < 0.02) {
        // 2% chance of error
        state.status = 'error';
      } else if (roll < 0.08) {
        // 6% chance to toggle between idle and working
        state.status = state.status === 'idle' ? 'working' : 'idle';
      } else if (roll < 0.10 && state.status === 'error') {
        // 2% chance to recover from error
        state.status = 'idle';
      }

      if (state.status === 'working') {
        state.taskCounter += 1;
      }

      const payload = {
        agentId: state.id,
        serverId: state.serverId,
        tenantId: state.tenantId,
        timestamp: new Date().toISOString(),
        status: state.status,
        cpuPercent: Math.min(100, Math.max(0, state.cpuBase + (Math.random() - 0.5) * 20)),
        memoryPercent: Math.min(100, Math.max(0, state.memBase + (Math.random() - 0.5) * 10)),
        currentTaskId: null,
        taskCounter: state.taskCounter,
        queueDepth: Math.floor(Math.random() * 5),
      };

      try {
        await fetch(`${API_URL}/api/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } catch {
        // API not ready yet, skip
      }
    }
  }, HEARTBEAT_INTERVAL_MS);
}

startSimulator();
