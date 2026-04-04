import { create } from 'zustand';
import { mockAlerts } from '../lib/mock';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export type AlertSeverity = 'critical' | 'warning' | 'info' | 'resolved';
export type AlertFilter = 'all' | AlertSeverity;

export interface Alert {
  id: string;
  severity: AlertSeverity;
  message: string;
  entityType: 'agent' | 'task' | 'server' | 'client' | 'system';
  entityId: string;
  timestamp: string;
}

interface AlertState {
  alerts: Alert[];
  filter: AlertFilter;
  setFilter: (f: AlertFilter) => void;
  fetchAlerts: () => Promise<void>;
  addAlert: (alert: Alert) => void;
}

export const useAlertStore = create<AlertState>((set) => ({
  alerts: mockAlerts,
  filter: 'all',
  setFilter: (filter) => set({ filter }),
  fetchAlerts: async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${API_URL}/api/alerts?limit=50`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return;
      const data = await res.json();
      if (data.length > 0) {
        set({ alerts: data.map((a: any) => ({
          id: a.id,
          severity: a.severity === 'error' ? 'critical' : a.severity,
          message: a.message,
          entityType: a.agentId ? 'agent' : 'system',
          entityId: a.agentId || a.source,
          timestamp: a.createdAt || a.timestamp,
        }))});
      }
    } catch {
      // keep mocks
    }
  },
  addAlert: (alert) =>
    set(s => ({ alerts: [alert, ...s.alerts].slice(0, 100) })),
}));
