import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { mockClients } from '../../lib/mock';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ScheduleStatus = 'completed' | 'active' | 'scheduled' | 'failed' | 'late';

interface ScheduledTask {
  id: string;
  clientId: string;
  title: string;
  status: ScheduleStatus;
  startHour: number; // fractional hours from window start (0 = 6 AM)
  durationHours: number;
}

// ---------------------------------------------------------------------------
// Color mapping
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<ScheduleStatus, { bg: string; border: string; text: string }> = {
  completed: { bg: 'rgba(0,255,136,0.25)', border: '#00ff88', text: '#00ff88' },
  active:    { bg: 'rgba(0,240,255,0.25)', border: '#00f0ff', text: '#00f0ff' },
  scheduled: { bg: 'rgba(106,106,122,0.18)', border: '#6a6a7a', text: '#6a6a7a' },
  failed:    { bg: 'rgba(255,0,170,0.25)', border: '#ff00aa', text: '#ff00aa' },
  late:      { bg: 'rgba(255,170,0,0.25)', border: '#ffaa00', text: '#ffaa00' },
};

// ---------------------------------------------------------------------------
// Deterministic pseudo-random (same as mock.ts)
// ---------------------------------------------------------------------------

function seededRand(seed: number): number {
  return ((seed * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;
}

// ---------------------------------------------------------------------------
// Generate inline mock schedule data for the current 24h window (6AM-6AM)
// ---------------------------------------------------------------------------

function generateScheduleData(): { tasks: ScheduledTask[]; windowStart: Date } {
  const now = new Date();
  const windowStart = new Date(now);
  windowStart.setHours(6, 0, 0, 0);
  // If before 6 AM, start from previous day's 6 AM
  if (now.getHours() < 6) {
    windowStart.setDate(windowStart.getDate() - 1);
  }

  const nowHourOffset = (now.getTime() - windowStart.getTime()) / (1000 * 60 * 60);

  const TASK_TITLES = [
    'Post to X', 'LinkedIn article', 'IG story batch', 'FB campaign', 'SEO audit',
    'Blog draft', 'Email blast', 'Engagement scan', 'Content review', 'Analytics pull',
    'Ad copy gen', 'Hashtag research', 'Competitor scan', 'Report gen', 'Schedule posts',
  ];

  const tasks: ScheduledTask[] = [];
  let taskId = 0;

  // Generate 2-4 tasks per client spread across the 24h window
  for (let ci = 0; ci < mockClients.length; ci++) {
    const client = mockClients[ci];
    const taskCount = 2 + Math.floor(seededRand(ci * 97) * 3); // 2-4

    for (let ti = 0; ti < taskCount; ti++) {
      const seed = ci * 1000 + ti;
      const startHour = seededRand(seed * 13) * 22; // 0-22h into window
      const duration = 0.3 + seededRand(seed * 29) * 1.7; // 0.3-2h
      const endHour = startHour + duration;
      const title = TASK_TITLES[Math.floor(seededRand(seed * 41) * TASK_TITLES.length)];

      // Determine status based on time relationship to now
      let status: ScheduleStatus;
      if (endHour < nowHourOffset) {
        // Past task
        status = seededRand(seed * 53) > 0.12 ? 'completed' : 'failed';
      } else if (startHour <= nowHourOffset && endHour >= nowHourOffset) {
        // Currently running
        status = 'active';
      } else {
        // Future
        status = seededRand(seed * 67) > 0.85 ? 'late' : 'scheduled';
      }

      tasks.push({
        id: `sched-${String(++taskId).padStart(3, '0')}`,
        clientId: client.id,
        title: `${title} — ${client.name}`,
        status,
        startHour,
        durationHours: duration,
      });
    }
  }

  return { tasks, windowStart };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TOTAL_HOURS = 24;
const ROW_HEIGHT = 20;
const LABEL_WIDTH = 120;
const HEADER_HEIGHT = 18;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ScheduleTimeline() {
  const [hoveredTask, setHoveredTask] = useState<{ task: ScheduledTask; x: number; y: number } | null>(null);

  const { tasks, windowStart, nowOffset, hourLabels } = useMemo(() => {
    const { tasks, windowStart } = generateScheduleData();
    const now = new Date();
    const nowOffset = (now.getTime() - windowStart.getTime()) / (1000 * 60 * 60);

    const hourLabels: string[] = [];
    for (let i = 0; i < TOTAL_HOURS; i++) {
      const h = (6 + i) % 24;
      const ampm = h >= 12 ? 'P' : 'A';
      const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
      hourLabels.push(`${display}${ampm}`);
    }

    return { tasks, windowStart, nowOffset, hourLabels };
  }, []);

  // Subset of clients that actually have tasks (keep it compact)
  const clientsWithTasks = useMemo(() => {
    const ids = new Set(tasks.map(t => t.clientId));
    return mockClients.filter(c => ids.has(c.id));
  }, [tasks]);

  const gridHeight = clientsWithTasks.length * ROW_HEIGHT;
  const totalHeight = HEADER_HEIGHT + gridHeight;

  return (
    <motion.div
      className="glass-panel hud-corners relative overflow-hidden"
      style={{ height: 140 }}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Header label */}
      <div className="flex items-center justify-between px-3 py-1 border-b border-border-subtle">
        <h2 className="text-[10px] font-mono font-semibold uppercase tracking-widest text-neon-cyan">
          Schedule Timeline
        </h2>
        <span className="text-[9px] font-mono text-secondary">24h window</span>
      </div>

      {/* Scrollable timeline area */}
      <div className="overflow-y-auto overflow-x-hidden" style={{ height: 140 - 28 }}>
        <div className="flex" style={{ minHeight: totalHeight }}>
          {/* Y-axis: client labels */}
          <div className="shrink-0" style={{ width: LABEL_WIDTH }}>
            {/* Spacer for hour header */}
            <div style={{ height: HEADER_HEIGHT }} />
            {clientsWithTasks.map((client) => (
              <div
                key={client.id}
                className="flex items-center px-2 text-[9px] font-mono text-secondary truncate border-b border-border-subtle"
                style={{ height: ROW_HEIGHT }}
                title={client.name}
              >
                {client.name.length > 16 ? client.name.slice(0, 15) + '\u2026' : client.name}
              </div>
            ))}
          </div>

          {/* Timeline grid area */}
          <div className="flex-1 relative" style={{ minWidth: 0 }}>
            {/* Hour header */}
            <div className="flex" style={{ height: HEADER_HEIGHT }}>
              {hourLabels.map((label, i) => (
                <div
                  key={i}
                  className="text-[8px] font-mono text-muted text-center border-l border-border-subtle"
                  style={{ width: `${100 / TOTAL_HOURS}%` }}
                >
                  {i % 2 === 0 ? label : ''}
                </div>
              ))}
            </div>

            {/* Grid rows + hour lines */}
            <div className="relative" style={{ height: gridHeight }}>
              {/* Vertical hour grid lines */}
              {hourLabels.map((_, i) => (
                <div
                  key={`line-${i}`}
                  className="absolute top-0 bottom-0 border-l"
                  style={{
                    left: `${(i / TOTAL_HOURS) * 100}%`,
                    borderColor: 'rgba(255,255,255,0.02)',
                  }}
                />
              ))}

              {/* Horizontal row lines */}
              {clientsWithTasks.map((_, i) => (
                <div
                  key={`row-${i}`}
                  className="absolute left-0 right-0 border-b border-border-subtle"
                  style={{ top: (i + 1) * ROW_HEIGHT }}
                />
              ))}

              {/* Task blocks */}
              {tasks.map((task) => {
                const clientIndex = clientsWithTasks.findIndex(c => c.id === task.clientId);
                if (clientIndex === -1) return null;

                const leftPct = (task.startHour / TOTAL_HOURS) * 100;
                const widthPct = (task.durationHours / TOTAL_HOURS) * 100;
                const colors = STATUS_COLORS[task.status];
                const isPast = task.status === 'completed' || task.status === 'failed';
                const isFuture = task.status === 'scheduled' || task.status === 'late';

                return (
                  <motion.div
                    key={task.id}
                    className="absolute cursor-pointer"
                    style={{
                      left: `${leftPct}%`,
                      width: `${Math.max(widthPct, 0.4)}%`,
                      top: clientIndex * ROW_HEIGHT + 3,
                      height: ROW_HEIGHT - 6,
                      backgroundColor: isPast ? colors.bg : 'transparent',
                      border: `1px ${isFuture ? 'dashed' : 'solid'} ${colors.border}`,
                      borderRadius: 2,
                      opacity: isPast ? 0.85 : 1,
                    }}
                    initial={{ scaleX: 0, originX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.4, delay: 0.1 + clientIndex * 0.015 }}
                    onMouseEnter={(e) => {
                      const rect = (e.target as HTMLElement).getBoundingClientRect();
                      setHoveredTask({ task, x: rect.left + rect.width / 2, y: rect.top - 8 });
                    }}
                    onMouseLeave={() => setHoveredTask(null)}
                  />
                );
              })}

              {/* NOW marker */}
              {nowOffset >= 0 && nowOffset <= TOTAL_HOURS && (
                <div
                  className="absolute top-0 bottom-0"
                  style={{
                    left: `${(nowOffset / TOTAL_HOURS) * 100}%`,
                    width: 2,
                    zIndex: 20,
                  }}
                >
                  {/* Glow line */}
                  <div
                    className="absolute inset-0"
                    style={{
                      background: '#00f0ff',
                      boxShadow: '0 0 6px rgba(0,240,255,0.7), 0 0 14px rgba(0,240,255,0.4), 0 0 24px rgba(0,240,255,0.2)',
                      animation: 'pulse-now 2s ease-in-out infinite',
                    }}
                  />
                  {/* NOW label */}
                  <div
                    className="absolute font-mono font-bold text-neon-cyan"
                    style={{
                      top: -HEADER_HEIGHT + 1,
                      left: -10,
                      fontSize: 7,
                      letterSpacing: '0.1em',
                      textShadow: '0 0 6px rgba(0,240,255,0.8)',
                    }}
                  >
                    NOW
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tooltip */}
      {hoveredTask && (
        <div
          className="fixed z-50 px-2 py-1 rounded text-[9px] font-mono pointer-events-none"
          style={{
            left: hoveredTask.x,
            top: hoveredTask.y,
            transform: 'translate(-50%, -100%)',
            background: 'rgba(18,18,31,0.95)',
            border: `1px solid ${STATUS_COLORS[hoveredTask.task.status].border}`,
            color: STATUS_COLORS[hoveredTask.task.status].text,
            maxWidth: 220,
            whiteSpace: 'nowrap',
            backdropFilter: 'blur(8px)',
          }}
        >
          {hoveredTask.task.title}
          <span className="ml-2 text-secondary">
            {hoveredTask.task.durationHours.toFixed(1)}h
          </span>
        </div>
      )}

      {/* Inline keyframes for NOW pulse */}
      <style>{`
        @keyframes pulse-now {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </motion.div>
  );
}
