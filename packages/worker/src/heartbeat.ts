import os from 'os';
import type { HeartbeatPayload } from '@omniscient/shared';
import { AGENT_ID, SERVER_ID, TENANT_ID, getHeartbeatStatus, API_URL } from './index.js';

/**
 * HeartbeatEngine sends periodic heartbeats to the control plane API.
 * Collects real CPU and memory metrics from the OS.
 * Gracefully handles unreachable API — logs a warning and retries next interval.
 */
export class HeartbeatEngine {
  private timer: NodeJS.Timeout | null = null;
  private intervalMs = 30_000; // 30 seconds per spec

  /** Monotonic task counter — only incremented via incrementTaskCounter() */
  public taskCounter = 0;
  public queueDepth = 0;
  public currentTaskId: string | null = null;

  /** Previous CPU snapshot for delta-based CPU usage calculation */
  private prevCpuTimes: { idle: number; total: number } | null = null;

  /** Increment the monotonic task counter (called on each task completion) */
  incrementTaskCounter() {
    this.taskCounter++;
  }

  start() {
    if (this.timer) return;
    console.log(`[HEARTBEAT] Engine started. Interval: ${this.intervalMs}ms -> POST ${API_URL}/api/heartbeat`);

    // Send immediately on start
    this.sendPing();

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

  /** Force an immediate heartbeat (e.g. on status change) */
  flush() {
    this.sendPing();
  }

  /**
   * Compute CPU usage as a delta between snapshots.
   * First call returns instantaneous usage; subsequent calls return usage since last sample.
   */
  private getCpuPercent(): number {
    const cpus = os.cpus();
    let idleTotal = 0;
    let grandTotal = 0;

    for (const cpu of cpus) {
      const times = cpu.times;
      idleTotal += times.idle;
      grandTotal += times.user + times.nice + times.sys + times.idle + times.irq;
    }

    if (this.prevCpuTimes) {
      const idleDelta = idleTotal - this.prevCpuTimes.idle;
      const totalDelta = grandTotal - this.prevCpuTimes.total;
      this.prevCpuTimes = { idle: idleTotal, total: grandTotal };

      if (totalDelta === 0) return 0;
      return Math.round(((totalDelta - idleDelta) / totalDelta) * 100);
    }

    // First sample — compute instantaneous
    this.prevCpuTimes = { idle: idleTotal, total: grandTotal };
    if (grandTotal === 0) return 0;
    return Math.round(((grandTotal - idleTotal) / grandTotal) * 100);
  }

  private getMemoryPercent(): number {
    const used = os.totalmem() - os.freemem();
    return Math.round((used / os.totalmem()) * 100);
  }

  private async sendPing() {
    const cpuPercent = this.getCpuPercent();
    const memoryPercent = this.getMemoryPercent();

    const payload: HeartbeatPayload = {
      agentId: AGENT_ID,
      serverId: SERVER_ID,
      tenantId: TENANT_ID,
      status: getHeartbeatStatus(),
      cpuPercent,
      memoryPercent,
      taskCounter: this.taskCounter,
      queueDepth: this.queueDepth,
      currentTaskId: this.currentTaskId,
      timestamp: new Date().toISOString(),
    };

    try {
      const res = await fetch(`${API_URL}/api/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        console.warn(`[HEARTBEAT] API responded with status ${res.status}`);
      }
    } catch (err) {
      // Graceful: log and retry next interval — do not crash
      console.warn(`[HEARTBEAT] API unreachable (${(err as Error).message}). Will retry in ${this.intervalMs / 1000}s.`);
    }
  }
}

export const heartbeatEngine = new HeartbeatEngine();
