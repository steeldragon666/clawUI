import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Kanban, Calendar, Users, Settings, Shield, Cpu, DollarSign, BarChart3, CheckSquare, Send, Brain } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { to: '/', icon: Activity, label: 'Fleet' },
  { to: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/costs', icon: DollarSign, label: 'Costs' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/approvals', icon: CheckSquare, label: 'Approvals' },
  { to: '/publish', icon: Send, label: 'Publish' },
  { to: '/guardrails', icon: Shield, label: 'Guardrails' },
  { to: '/hypervisor', icon: Cpu, label: 'Hypervisor' },
  { to: '/intelligence', icon: Brain, label: 'Intelligence' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function NavigationRail() {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.nav
      className="h-full bg-panel border-r border-border-subtle flex flex-col items-center py-2 overflow-hidden overflow-y-auto z-30 custom-scrollbar"
      animate={{ width: expanded ? 220 : 64 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex items-center gap-3 w-full h-9 px-5 transition-colors relative shrink-0 ${
              isActive ? 'text-neon-cyan' : 'text-secondary hover:text-primary'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <div className="absolute left-0 top-0.5 bottom-0.5 w-[3px] bg-neon-cyan glow-cyan rounded-r" />
              )}
              <Icon size={16} className="shrink-0" />
              <motion.span
                className="font-mono text-[10px] tracking-wider whitespace-nowrap overflow-hidden"
                animate={{ opacity: expanded ? 1 : 0, width: expanded ? 'auto' : 0 }}
                transition={{ duration: 0.2 }}
              >
                {label}
              </motion.span>
            </>
          )}
        </NavLink>
      ))}

      <div className="mt-auto px-3 shrink-0 py-2">
        <span className="font-mono text-[9px] text-muted whitespace-nowrap">
          {expanded ? 'OMNISCIENT AI' : 'O'}
        </span>
      </div>
    </motion.nav>
  );
}
