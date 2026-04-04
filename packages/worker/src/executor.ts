import { randomUUID } from 'crypto';
import { currentStatus, setStatus } from './index';
import { heartbeatEngine } from './heartbeat';

// Mock Executor
export class TaskExecutor {
  private active = true;
  private currentTask: any = null;

  start() {
    console.log(`[EXECUTOR] Starting loop...`);
    this.active = true;
    this.tick();
  }

  stop() {
    console.log(`[EXECUTOR] Stopping loop...`);
    this.active = false;
  }

  private async tick() {
    if (!this.active) return;

    if (currentStatus === 'paused' || currentStatus === 'error' || currentStatus === 'dead') {
      // Loop idly if we aren't supposed to be working
      setTimeout(() => this.tick(), 3000);
      return;
    }

    if (this.currentTask) {
      setTimeout(() => this.tick(), 1000);
      return;
    }

    // Attempt to grab a task
    setStatus('working');
    heartbeatEngine.queueDepth = Math.floor(Math.random() * 5); // Faking queue depth changes
    
    // Fake Task
    this.currentTask = {
      id: `task-${randomUUID()}`,
      durationMs: 5000 + Math.random() * 10000 
    };

    console.log(`[EXECUTOR] Pulled task: ${this.currentTask.id}`);
    heartbeatEngine.currentTaskId = this.currentTask.id;

    // Await fake work
    await new Promise(r => setTimeout(r, this.currentTask.durationMs));

    // Finish
    console.log(`[EXECUTOR] Completed task: ${this.currentTask.id}`);
    heartbeatEngine.currentTaskId = null;
    heartbeatEngine.taskCounter++;
    this.currentTask = null;

    // Fake an idle rest gap before grabbing the next task
    setStatus('idle');
    setTimeout(() => this.tick(), 2000 + Math.random() * 4000);
  }
}

export const taskExecutor = new TaskExecutor();
