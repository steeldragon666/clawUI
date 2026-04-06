import type { Task } from '@omniscient/shared';
import { AGENT_ID, TENANT_ID, currentStatus, setStatus, API_URL } from './index.js';
import { heartbeatEngine } from './heartbeat.js';

// ---------------------------------------------------------------------------
// State machine: IDLE -> WORKING -> PAUSED (with transitions)
// ---------------------------------------------------------------------------
export type ExecutorState = 'IDLE' | 'WORKING' | 'PAUSED';

const VALID_TRANSITIONS: Record<ExecutorState, ExecutorState[]> = {
  IDLE: ['WORKING', 'PAUSED'],
  WORKING: ['IDLE', 'PAUSED'],
  PAUSED: ['IDLE'],
};

export class TaskExecutor {
  private active = false;
  private state: ExecutorState = 'IDLE';
  private currentTask: Task | null = null;
  private taskAborted = false;
  private tickTimeout: NodeJS.Timeout | null = null;

  // ------------------------------------------------------------------
  // Lifecycle
  // ------------------------------------------------------------------

  start() {
    console.log(`[EXECUTOR] Starting task loop.`);
    this.active = true;
    this.transitionTo('IDLE');
    this.scheduleTick(0);
  }

  stop() {
    console.log(`[EXECUTOR] Stopping task loop.`);
    this.active = false;
    if (this.tickTimeout) {
      clearTimeout(this.tickTimeout);
      this.tickTimeout = null;
    }
  }

  /** Cancel the currently executing task (if any) and return to IDLE. */
  cancelCurrentTask() {
    if (this.currentTask) {
      console.log(`[EXECUTOR] Cancelling task ${this.currentTask.id}`);
      this.taskAborted = true;
      this.currentTask = null;
      heartbeatEngine.currentTaskId = null;
      this.transitionTo('IDLE');
      setStatus('idle');
    }
  }

  /** Pause the executor (e.g. from a command). */
  pause() {
    this.transitionTo('PAUSED');
  }

  /** Resume from paused state. */
  resume() {
    if (this.state === 'PAUSED') {
      this.transitionTo('IDLE');
      if (this.active) this.scheduleTick(0);
    }
  }

  getState(): ExecutorState {
    return this.state;
  }

  // ------------------------------------------------------------------
  // State machine
  // ------------------------------------------------------------------

  private transitionTo(next: ExecutorState) {
    if (this.state === next) return;
    const allowed = VALID_TRANSITIONS[this.state];
    if (!allowed.includes(next)) {
      console.warn(`[EXECUTOR] Invalid state transition: ${this.state} -> ${next}`);
      return;
    }
    console.log(`[EXECUTOR] State: ${this.state} -> ${next}`);
    this.state = next;
  }

  // ------------------------------------------------------------------
  // Main loop
  // ------------------------------------------------------------------

  private scheduleTick(delayMs: number) {
    if (!this.active) return;
    this.tickTimeout = setTimeout(() => this.tick(), delayMs);
  }

  private async tick() {
    if (!this.active) return;

    // If agent-level status is paused/error/dead, idle-wait
    if (currentStatus === 'paused' || currentStatus === 'error' || currentStatus === 'dead') {
      this.scheduleTick(3000);
      return;
    }

    // If executor is PAUSED, wait
    if (this.state === 'PAUSED') {
      this.scheduleTick(3000);
      return;
    }

    // If already working on something, wait
    if (this.currentTask) {
      this.scheduleTick(1000);
      return;
    }

    // ------- Try to pick a task from the queue -------
    const task = await this.fetchNextTask();

    if (!task) {
      // Nothing in the queue — check again after a short delay
      this.scheduleTick(5000);
      return;
    }

    // ------- Execute the task -------
    this.currentTask = task;
    this.taskAborted = false;
    this.transitionTo('WORKING');
    setStatus('working');
    heartbeatEngine.currentTaskId = task.id;

    const startedAt = Date.now();
    let retries = 0;
    const maxRetries = task.maxRetries ?? 3;

    while (retries <= maxRetries) {
      if (this.taskAborted) break;

      const success = await this.executeTask(task);

      if (this.taskAborted) break;

      if (success) {
        const actualDuration = Date.now() - startedAt;
        await this.reportTaskComplete(task, actualDuration);
        heartbeatEngine.incrementTaskCounter();
        console.log(`[EXECUTOR] Task ${task.id} completed in ${actualDuration}ms.`);
        break;
      } else {
        retries++;
        if (retries > maxRetries) {
          await this.reportTaskFailed(task, retries - 1);
          console.error(`[EXECUTOR] Task ${task.id} failed after ${retries - 1} retries.`);
        } else {
          console.warn(`[EXECUTOR] Task ${task.id} failed. Retry ${retries}/${maxRetries}...`);
        }
      }
    }

    // ------- Return to idle -------
    this.currentTask = null;
    heartbeatEngine.currentTaskId = null;
    this.transitionTo('IDLE');
    setStatus('idle');

    // Small gap before picking next task
    this.scheduleTick(2000 + Math.random() * 3000);
  }

  // ------------------------------------------------------------------
  // Task fetching
  // ------------------------------------------------------------------

  private async fetchNextTask(): Promise<Task | null> {
    try {
      const url = `${API_URL}/api/tasks?status=queued&agentId=${AGENT_ID}&tenantId=${TENANT_ID}&limit=1`;
      const res = await fetch(url);

      if (!res.ok) {
        if (res.status !== 404) {
          console.warn(`[EXECUTOR] Task fetch returned status ${res.status}`);
        }
        return null;
      }

      const tasks: Task[] = await res.json();
      return tasks.length > 0 ? tasks[0] : null;
    } catch (err) {
      console.warn(`[EXECUTOR] Failed to fetch tasks: ${(err as Error).message}`);
      return null;
    }
  }

  // ------------------------------------------------------------------
  // Mock execution (random delay 5-30s, 10% failure chance)
  // ------------------------------------------------------------------

  private async executeTask(_task: Task): Promise<boolean> {
    const durationMs = 5000 + Math.random() * 25000; // 5-30 seconds
    await new Promise((resolve) => setTimeout(resolve, durationMs));

    // 10% chance of failure
    const succeeded = Math.random() > 0.1;
    return succeeded;
  }

  // ------------------------------------------------------------------
  // Reporting results to the API
  // ------------------------------------------------------------------

  private async reportTaskComplete(task: Task, actualDuration: number): Promise<void> {
    try {
      await fetch(`${API_URL}/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'done',
          actualDuration,
          completedAt: new Date().toISOString(),
          outputs: { result: 'mock-success', agentId: AGENT_ID },
        }),
      });
    } catch (err) {
      console.warn(`[EXECUTOR] Failed to report task completion: ${(err as Error).message}`);
    }

    // Emit task_complete event
    try {
      await fetch(`${API_URL}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'task:status_change',
          data: {
            taskId: task.id,
            from: 'active',
            to: 'done',
            agentId: AGENT_ID,
          },
        }),
      });
    } catch {
      // Best-effort event emission
    }
  }

  private async reportTaskFailed(task: Task, retryCount: number): Promise<void> {
    try {
      await fetch(`${API_URL}/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'failed',
          retryCount,
          completedAt: new Date().toISOString(),
          outputs: { error: 'mock-failure', agentId: AGENT_ID },
        }),
      });
    } catch (err) {
      console.warn(`[EXECUTOR] Failed to report task failure: ${(err as Error).message}`);
    }

    // Emit task_complete event (failed)
    try {
      await fetch(`${API_URL}/api/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'task:status_change',
          data: {
            taskId: task.id,
            from: 'active',
            to: 'failed',
            agentId: AGENT_ID,
          },
        }),
      });
    } catch {
      // Best-effort event emission
    }
  }
}

export const taskExecutor = new TaskExecutor();
