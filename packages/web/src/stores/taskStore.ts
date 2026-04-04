import { create } from 'zustand';
import type { Task, TaskStatus } from '@omniscient/shared';
import { mockTasks } from '../lib/mock';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  fetchTasks: () => Promise<void>;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  addTask: (task: Task) => void;
}

export const useTaskStore = create<TaskState>((set) => ({
  tasks: mockTasks,
  loading: true,
  fetchTasks: async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${API_URL}/api/tasks`, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      if (data.length > 0) set({ tasks: data });
    } catch {
      // keep mocks
    } finally {
      set({ loading: false });
    }
  },
  updateTaskStatus: (id, status) =>
    set(s => ({ tasks: s.tasks.map(t => t.id === id ? { ...t, status } : t) })),
  addTask: (task) =>
    set(s => ({ tasks: [task, ...s.tasks] })),
}));
