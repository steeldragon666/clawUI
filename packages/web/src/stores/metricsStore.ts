import { create } from 'zustand';
import type { MetricsSnapshot } from '@omniscient/shared';
import { mockMetrics } from '../lib/mock';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface MetricsState {
  metrics: MetricsSnapshot;
  loading: boolean;
  fetchMetrics: () => Promise<void>;
  updateMetrics: (snapshot: MetricsSnapshot) => void;
}

export const useMetricsStore = create<MetricsState>((set) => ({
  metrics: mockMetrics,
  loading: true,
  fetchMetrics: async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${API_URL}/api/metrics/performance`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      set(s => ({
        metrics: {
          ...s.metrics,
          tasksCompleted24h: Number(data.completed_24h) || 0,
          successRate24h: Number(data.total_24h) > 0 ? Number(data.completed_24h) / Number(data.total_24h) : 1,
          avgDuration24h: Number(data.avg_duration_24h) || 0,
        },
      }));
    } catch {
      // keep mocks
    } finally {
      set({ loading: false });
    }
  },
  updateMetrics: (snapshot) => set({ metrics: snapshot }),
}));
