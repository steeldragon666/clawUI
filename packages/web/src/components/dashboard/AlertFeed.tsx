import { useAlertStore } from '../../stores/alertStore';
import type { AlertFilter } from '../../stores/alertStore';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function relativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface FilterOption {
  key: AlertFilter;
  label: string;
  /** Tailwind classes applied when this filter is NOT active */
  inactiveColor: string;
  /** Tailwind classes applied when this filter IS active */
  activeColor: string;
}

const FILTER_OPTIONS: FilterOption[] = [
  {
    key: 'all',
    label: 'ALL',
    inactiveColor: 'text-secondary hover:bg-white/5',
    activeColor: 'text-primary bg-white/10',
  },
  {
    key: 'critical',
    label: 'CRITICAL',
    inactiveColor: 'text-neon-magenta/60 hover:bg-neon-magenta/5',
    activeColor: 'text-neon-magenta bg-neon-magenta/10',
  },
  {
    key: 'warning',
    label: 'WARNING',
    inactiveColor: 'text-neon-amber/60 hover:bg-neon-amber/5',
    activeColor: 'text-neon-amber bg-neon-amber/10',
  },
  {
    key: 'info',
    label: 'INFO',
    inactiveColor: 'text-neon-cyan/60 hover:bg-neon-cyan/5',
    activeColor: 'text-neon-cyan bg-neon-cyan/10',
  },
  {
    key: 'resolved',
    label: 'RESOLVED',
    inactiveColor: 'text-neon-green/60 hover:bg-neon-green/5',
    activeColor: 'text-neon-green bg-neon-green/10',
  },
];

/** 8 px severity dot colour — maps severity to a Tailwind bg class */
const SEVERITY_DOT: Record<string, string> = {
  critical: 'bg-neon-magenta shadow-[0_0_6px_rgba(255,0,170,0.7)]',
  warning:  'bg-neon-amber  shadow-[0_0_6px_rgba(255,170,0,0.7)]',
  info:     'bg-neon-cyan   shadow-[0_0_6px_rgba(0,240,255,0.7)]',
  resolved: 'bg-neon-green  shadow-[0_0_6px_rgba(0,255,136,0.7)]',
};

// ---------------------------------------------------------------------------
// Framer Motion variants
// ---------------------------------------------------------------------------

const rowVariants: Variants = {
  hidden: { x: 40, opacity: 0 },
  visible: {
    x: 0,
    opacity: 1,
    transition: { type: 'spring' as const, stiffness: 340, damping: 28 },
  },
  exit: { x: -20, opacity: 0, transition: { duration: 0.15 } },
};

/** Brief amber background flash played once on entry */
const flashVariants: Variants = {
  hidden: { backgroundColor: 'rgba(255,170,0,0)' },
  visible: {
    backgroundColor: ['rgba(255,170,0,0.18)', 'rgba(255,170,0,0)'],
    transition: { duration: 0.55, ease: 'easeOut' as const, times: [0, 1] },
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AlertFeed() {
  const alerts    = useAlertStore(s => s.alerts);
  const filter    = useAlertStore(s => s.filter);
  const setFilter = useAlertStore(s => s.setFilter);

  const filtered = filter === 'all' ? alerts : alerts.filter(a => a.severity === filter);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f]">

      {/* ------------------------------------------------------------------ */}
      {/* Filter bar                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-wrap gap-1 px-2 pt-1.5 pb-2 border-b border-border-subtle/50 shrink-0">
        {FILTER_OPTIONS.map(opt => {
          const isActive = filter === opt.key;
          const count    = opt.key !== 'all'
            ? alerts.filter(a => a.severity === opt.key).length
            : null;

          return (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={[
                'text-[9px] font-mono tracking-widest border border-border-subtle rounded-sm px-2 py-0.5 transition-colors',
                isActive ? opt.activeColor : opt.inactiveColor,
              ].join(' ')}
            >
              {opt.label}
              {count !== null && (
                <span className="ml-1 tabular-nums opacity-70">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Alert list                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-1 flex flex-col gap-px">

        {filtered.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <span className="text-[10px] font-mono text-secondary tracking-widest">
              NO ALERTS
            </span>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {filtered.map(alert => (
              <motion.div
                key={alert.id}
                variants={rowVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                layout
              >
                {/* Amber flash overlay — separate motion.div so layout stays stable */}
                <motion.div
                  variants={flashVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex items-center gap-2.5 px-2 py-1.5 rounded-sm hover:bg-white/[0.03] transition-colors group"
                >

                  {/* Severity dot */}
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[alert.severity] ?? 'bg-secondary'}`}
                  />

                  {/* Message + entity */}
                  <div className="flex-1 min-w-0 flex flex-col gap-px">
                    <span className="text-xs font-mono text-primary leading-tight truncate">
                      {alert.message}
                    </span>
                    <span className="text-[9px] font-mono text-secondary truncate cursor-pointer hover:text-neon-cyan transition-colors">
                      {alert.entityType}:{alert.entityId}
                    </span>
                  </div>

                  {/* Relative time */}
                  <span className="text-[9px] font-mono text-muted tabular-nums shrink-0 ml-1">
                    {relativeTime(alert.timestamp)}
                  </span>

                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
