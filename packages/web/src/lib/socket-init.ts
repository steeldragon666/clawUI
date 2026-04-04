import { io } from 'socket.io-client';
import type { ServerToClientEvents, ClientToServerEvents } from '@omniscient/shared';
import type { Socket } from 'socket.io-client';
import { useAgentStore } from '../stores/agentStore';
import { useTaskStore } from '../stores/taskStore';
import { useAlertStore } from '../stores/alertStore';
import { useMetricsStore } from '../stores/metricsStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type TypedSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

export const socket: TypedSocket = io(API_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: Infinity,
});

let connected = false;

export function isConnected() {
  return connected;
}

export function initSocketListeners() {
  socket.on('connect', () => {
    connected = true;
    // Fetch fresh data on connect
    useAgentStore.getState().fetchAgents();
    useTaskStore.getState().fetchTasks();
    useAlertStore.getState().fetchAlerts();
    useMetricsStore.getState().fetchMetrics();
  });

  socket.on('disconnect', () => {
    connected = false;
  });

  socket.on('agent:heartbeat', (data) => {
    useAgentStore.getState().updateFromHeartbeat(data.agentId, {
      status: data.status,
      lastHeartbeat: data.timestamp,
      cpuPercent: data.cpuPercent,
      memoryPercent: data.memoryPercent,
      taskCounter: data.taskCounter,
      queueDepth: data.queueDepth,
    });
  });

  socket.on('agent:status_change', ({ agentId, to }) => {
    useAgentStore.getState().updateAgent(agentId, { status: to });
  });

  socket.on('task:status_change', ({ taskId, to }) => {
    useTaskStore.getState().updateTaskStatus(taskId, to);
  });

  socket.on('task:created', () => {
    useTaskStore.getState().fetchTasks();
  });

  socket.on('alert:new', (alert) => {
    useAlertStore.getState().addAlert({
      id: alert.id,
      severity: alert.severity === 'error' ? 'critical' : alert.severity as any,
      message: alert.message,
      entityType: alert.agentId ? 'agent' : 'system',
      entityId: alert.agentId || alert.source,
      timestamp: alert.timestamp,
    });
  });

  socket.on('metrics:update', (snapshot) => {
    useMetricsStore.getState().updateMetrics(snapshot);
  });

  // Initial fetch even without WS connection
  useAgentStore.getState().fetchAgents();
  useTaskStore.getState().fetchTasks();
  useAlertStore.getState().fetchAlerts();
  useMetricsStore.getState().fetchMetrics();
}
