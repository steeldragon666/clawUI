import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

type CommandType = 'pause' | 'resume' | 'kill' | 'restart';

export function useAgentCommand() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const sendCommand = async (agentId: string, command: CommandType, payload?: Record<string, unknown>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/agents/${agentId}/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: command, payload }),
      });
      
      if (!res.ok) {
        throw new Error(`Command failed: ${res.statusText}`);
      }
      
      return await res.json();
    } catch (err) {
      console.error('Command dispatch error:', err);
      setError(err instanceof Error ? err : new Error('Failed to dispatch command'));
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { sendCommand, loading, error };
}
