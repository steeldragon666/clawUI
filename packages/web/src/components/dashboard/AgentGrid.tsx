import { useAgentStore } from '../../stores/agentStore';
import { AgentCard } from './AgentCard';
import { AgentDetailFlyout } from './AgentDetailFlyout';
import { motion, AnimatePresence } from 'framer-motion';

export function AgentGrid() {
  const agents = useAgentStore(s => s.agents);
  const loading = useAgentStore(s => s.loading);
  const selectedAgentId = useAgentStore(s => s.selectedAgentId);
  const selectAgent = useAgentStore(s => s.selectAgent);

  if (loading) {
    return <div className="flex justify-center items-center h-full text-neon-cyan font-mono text-sm animate-pulse">Initializing fleet telemetry...</div>;
  }

  if (agents.length === 0) {
    return <div className="flex justify-center items-center h-full text-secondary font-mono text-sm">NO ACTIVE AGENTS IN SECTOR</div>;
  }

  // Group agents by Server ID
  const groupedAgents = agents.reduce((acc, agent) => {
    if (!acc[agent.serverId]) acc[agent.serverId] = [];
    acc[agent.serverId].push(agent);
    return acc;
  }, {} as Record<string, typeof agents>);

  const selectedAgent = selectedAgentId ? agents.find(a => a.id === selectedAgentId) || null : null;

  return (
    <>
      <div className="h-full overflow-y-auto px-1 pb-4 custom-scrollbar flex flex-col gap-4">
        {Object.entries(groupedAgents).map(([serverId, serverAgents]) => (
          <div key={serverId} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 text-[10px] font-mono text-secondary uppercase tracking-widest pl-1">
              <span>{serverId}</span>
              <div className="flex-1 h-px bg-border-subtle" />
              <span className="text-[9px] text-muted">{serverAgents.length} agents</span>
            </div>

            <motion.div
              className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-2"
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: 0.05 } },
              }}
            >
              {serverAgents.map(agent => (
                <motion.div
                  key={agent.id}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
                  }}
                >
                  <AgentCard
                    agent={agent}
                    onSelect={() => selectAgent(agent.id)}
                  />
                </motion.div>
              ))}
            </motion.div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {selectedAgent && (
          <AgentDetailFlyout
            agent={selectedAgent}
            onClose={() => selectAgent(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
