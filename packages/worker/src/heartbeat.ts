import os from 'os';
import type { HeartbeatPayload } from '@omniscient/shared';
import { AGENT_ID, SERVER_ID, TENANT_ID, currentStatus } from './index';

const API_URL = process.env.CONTROL_PLANE_URL || 'http://localhost:3001';

export class HeartbeatEngine {
  private timer: NodeJS.Timeout | null = null;
  private intervalMs = 15000;
  
  // Fake telemetry state
  public taskCounter = 0;
  public queueDepth = 0;
  public currentTaskId: string | null = null;

  start() {
    if (this.timer) return;
    console.log(`[HEARTBEAT] Engine started. Pinging ${API_URL} every ${this.intervalMs}ms`);
    
    // Initial ping
    this.sendPing();
    
    // Loop
    this.timer = setInterval(() => {
      this.sendPing();
    }, this.intervalMs);
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log(`[HEARTBEAT] Engine stopped.`);
    }
  }

  private async sendPing() {
    // Collect OS level telemetry
    const cpus = os.cpus();
    const cpuTotal = cpus.reduce((acc: number, cpu) => {
      const times = Object.values(cpu.times) as number[];
      const total = times.reduce((a: number, b: number) => a + b, 0);
      return acc + (total - cpu.times.idle) / total;
    }, 0);
    const cpuPercent = Math.round((cpuTotal / cpus.length) * 100);
    
    const usedMem = os.totalmem() - os.freemem();
    const memoryPercent = Math.round((usedMem / os.totalmem()) * 100);

    const payload: HeartbeatPayload = {
      agentId: AGENT_ID,
      serverId: SERVER_ID,
      tenantId: TENANT_ID,
      status: currentStatus,
      cpuPercent,
      memoryPercent,
      taskCounter: this.taskCounter,
      queueDepth: this.queueDepth,
      currentTaskId: this.currentTaskId,
      timestamp: new Date().toISOString()
    };

    try {
      const res = await fetch(`${API_URL}/api/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) {
        console.warn(`[HEARTBEAT] Failed with status: ${res.status}`);
      }
    } catch (err) {
      console.error(`[HEARTBEAT] Network error sending ping to Control Plane:`, (err as Error).message);
    }
  }
}

export const heartbeatEngine = new HeartbeatEngine();
