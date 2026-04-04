import { create } from 'zustand';
import type { Agent } from '@omniscient/shared';
import { mockAgents } from '../lib/mock';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface AgentState {
  agents: Agent[];
  loading: boolean;
  selectedAgentId: string | null;
  selectAgent: (id: string | null) => void;
  fetchAgents: () => Promise<void>;
  updateAgent: (id: string, patch: Partial<Agent>) => void;
  updateFromHeartbeat: (agentId: string, data: Partial<Agent>) => void;
}

export const useAgentStore = create<AgentState>((set) => ({
  agents: mockAgents,
  loading: true,
  selectedAgentId: null,
  selectAgent: (id) => set({ selectedAgentId: id }),
  fetchAgents: async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${API_URL}/api/agents`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      if (data.length > 0) set({ agents: data });
    } catch {
      // keep mocks
    } finally {
      set({ loading: false });
    }
  },
  updateAgent: (id, patch) =>
    set(s => ({ agents: s.agents.map(a => a.id === id ? { ...a, ...patch } : a) })),
  updateFromHeartbeat: (agentId, data) =>
    set(s => ({ agents: s.agents.map(a => a.id === agentId ? { ...a, ...data } : a) })),
}));
