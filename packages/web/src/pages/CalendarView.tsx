import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Clock, Filter, X } from 'lucide-react';
import { mockTasks, mockClients } from '../lib/mock';
import type { Task } from '@omniscient/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface MockTask extends Task {
  pipelineStage?: string;
  platform?: string;
  contentPreview?: string;
}

interface ScheduledTask {
  id: string;
  title: string;
  clientName: string;
  platform: string;
  scheduledAt: Date;
  durationMinutes: number;
  type: string;
  priority: 1 | 2 | 3 | 4 | 5;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLATFORMS = ['x', 'linkedin', 'facebook', 'instagram'] as const;

const PLATFORM_COLORS: Record<string, string> = {
  x:         '#00f0ff',
  linkedin:  '#0088ff',
  facebook:  '#3b82f6',
  instagram: '#ffaa00',
};

const PLATFORM_BG: Record<string, string> = {
  x:         'rgba(0,240,255,0.12)',
  linkedin:  'rgba(0,136,255,0.12)',
  facebook:  'rgba(59,130,246,0.12)',
  instagram: 'rgba(255,170,0,0.12)',
};

const PLATFORM_ICONS: Record<string, string> = {
  x:         '𝕏',
  linkedin:  'in',
  facebook:  'f',
  instagram: '◎',
};

const PLATFORM_LABELS: Record<string, string> = {
  x:         'X',
  linkedin:  'LinkedIn',
  facebook:  'Facebook',
  instagram: 'Instagram',
};

const HOURS_START = 6;
const HOURS_END = 23;
const HOUR_SLOTS = HOURS_END - HOURS_START;

const DAY_NAMES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// ---------------------------------------------------------------------------
// Deterministic seeded random (matches mock.ts approach)
// ---------------------------------------------------------------------------

function seededRand(seed: number): number {
  const val = ((seed * 1664525 + 1013904223) & 0x7fffffff) / 0x7fffffff;
  return val;
}

function seededInt(seed: number, min: number, max: number): number {
  return Math.floor(min + seededRand(seed) * (max - min + 1));
}

// ---------------------------------------------------------------------------
// Generate calendar-specific scheduled tasks for a given week
// ---------------------------------------------------------------------------

function generateWeekTasks(weekStart: Date): ScheduledTask[] {
  const tasks: ScheduledTask[] = [];
  const allTasks = mockTasks as MockTask[];
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 7);

  // Spread 200 mock tasks across 2 weeks around the current week to ensure density
  allTasks.forEach((task, i) => {
    const client = mockClients.find(c => c.id === (task.inputs?.clientId as string));
    const platform = task.platform || 'x';

    // Generate 1-2 scheduled slots per task, spread across the target week
    const slotCount = seededInt(i * 97, 1, 2);
    for (let s = 0; s < slotCount; s++) {
      const dayOffset = seededInt(i * 53 + s * 31, 0, 6);
      const hour = seededInt(i * 67 + s * 43, HOURS_START, HOURS_END - 1);
      const minute = seededInt(i * 79 + s * 17, 0, 3) * 15; // 0, 15, 30, 45
      const duration = seededInt(i * 89 + s * 23, 1, 3) * 15; // 15, 30, 45

      const scheduledAt = new Date(weekStart);
      scheduledAt.setDate(scheduledAt.getDate() + dayOffset);
      scheduledAt.setHours(hour, minute, 0, 0);

      tasks.push({
        id: `cal-${task.id}-${s}`,
        title: task.title,
        clientName: client?.name ?? 'Unknown Client',
        platform,
        scheduledAt,
        durationMinutes: duration,
        type: task.type,
        priority: task.priority,
      });
    }
  });

  return tasks;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

function formatTime(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatHour(hour: number): string {
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayH = hour % 12 || 12;
  return `${displayH} ${ampm}`;
}

function formatDateShort(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const fadeIn = {
  hidden: { opacity: 0, y: 6 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.02, duration: 0.25, ease: 'easeOut' as const },
  }),
};

const slideIn = {
  hidden: { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
};

// ---------------------------------------------------------------------------
// Task Block on the calendar grid
// ---------------------------------------------------------------------------

interface TaskBlockProps {
  task: ScheduledTask;
  index: number;
  dayStart: Date;
}

function TaskBlock({ task, index, dayStart }: TaskBlockProps) {
  const color = PLATFORM_COLORS[task.platform] || '#00f0ff';
  const bg = PLATFORM_BG[task.platform] || 'rgba(0,240,255,0.12)';
  const icon = PLATFORM_ICONS[task.platform] || '?';

  const minutesFromStart = (task.scheduledAt.getHours() - HOURS_START) * 60 + task.scheduledAt.getMinutes();
  const totalMinutes = HOUR_SLOTS * 60;
  const topPercent = (minutesFromStart / totalMinutes) * 100;
  const heightPercent = Math.max((task.durationMinutes / totalMinutes) * 100, 2.2);

  // Truncate title
  const maxLen = 28;
  const displayTitle = task.title.length > maxLen
    ? task.title.slice(0, maxLen).trimEnd() + '...'
    : task.title;

  return (
    <motion.div
      custom={index}
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="absolute left-0.5 right-0.5 rounded-[3px] cursor-pointer group overflow-hidden"
      style={{
        top: `${topPercent}%`,
        height: `${heightPercent}%`,
        minHeight: '26px',
        background: bg,
        borderLeft: `2px solid ${color}`,
        zIndex: 10 + (index % 5),
      }}
      whileHover={{ scale: 1.02, zIndex: 50 }}
      title={`${task.title}\n${task.clientName}\n${formatTime(task.scheduledAt)}`}
    >
      <div className="px-1.5 py-0.5 flex flex-col h-full justify-start overflow-hidden">
        {/* Time */}
        <div className="flex items-center gap-1">
          <span
            className="font-mono text-[8px] leading-none font-bold tracking-wide shrink-0"
            style={{ color }}
          >
            {formatTime(task.scheduledAt)}
          </span>
          <span
            className="text-[9px] font-bold leading-none shrink-0 w-[14px] h-[14px] flex items-center justify-center rounded-[2px]"
            style={{
              color,
              backgroundColor: `${color}22`,
            }}
          >
            {icon}
          </span>
        </div>
        {/* Title */}
        <div
          className="text-[9px] font-sans leading-tight text-primary/80 truncate mt-0.5"
        >
          {displayTitle}
        </div>
        {/* Client */}
        <div className="text-[8px] font-sans leading-none text-secondary truncate mt-auto">
          {task.clientName}
        </div>
      </div>

      {/* Hover glow */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-[3px]"
        style={{
          boxShadow: `inset 0 0 12px ${color}33, 0 0 8px ${color}22`,
        }}
      />
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Upcoming Task Row (sidebar)
// ---------------------------------------------------------------------------

interface UpcomingRowProps {
  task: ScheduledTask;
  index: number;
}

function UpcomingRow({ task, index }: UpcomingRowProps) {
  const color = PLATFORM_COLORS[task.platform] || '#00f0ff';
  const icon = PLATFORM_ICONS[task.platform] || '?';

  const now = new Date();
  const diffMs = task.scheduledAt.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60_000);
  let timeLabel: string;
  if (diffMins < 0) {
    timeLabel = 'NOW';
  } else if (diffMins < 60) {
    timeLabel = `${diffMins}m`;
  } else {
    const hrs = Math.floor(diffMins / 60);
    timeLabel = `${hrs}h ${diffMins % 60}m`;
  }

  return (
    <motion.div
      custom={index}
      variants={fadeIn}
      initial="hidden"
      animate="visible"
      className="flex items-start gap-2 px-2.5 py-2 border-b border-border-subtle hover:bg-[rgba(255,255,255,0.02)] transition-colors cursor-pointer"
    >
      {/* Platform badge */}
      <div
        className="flex items-center justify-center w-[22px] h-[22px] rounded-[3px] shrink-0 mt-0.5 text-[10px] font-bold"
        style={{
          color,
          backgroundColor: `${color}18`,
          border: `1px solid ${color}33`,
        }}
      >
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-sans text-primary/90 leading-tight truncate">
          {task.title}
        </div>
        <div className="text-[9px] font-sans text-secondary leading-none mt-0.5 truncate">
          {task.clientName}
        </div>
      </div>

      <div className="flex flex-col items-end shrink-0 gap-0.5">
        <span className="font-mono text-[9px] tabular-nums" style={{ color }}>
          {formatTime(task.scheduledAt)}
        </span>
        <span className={`font-mono text-[8px] tabular-nums ${diffMins <= 15 ? 'text-neon-magenta' : 'text-secondary'}`}>
          {timeLabel}
        </span>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Filter Dropdown
// ---------------------------------------------------------------------------

interface FilterDropdownProps {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (val: string) => void;
}

function FilterDropdown({ label, value, options, onChange }: FilterDropdownProps) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-mono text-[9px] text-secondary tracking-widest uppercase">{label}</span>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="
          bg-[#12121f] border border-border-subtle rounded-[3px]
          text-[10px] font-mono text-primary/90
          px-2 py-1
          outline-none
          focus:border-neon-cyan
          cursor-pointer
          appearance-none
          min-w-[120px]
        "
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%236a6a7a' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 6px center',
          paddingRight: '22px',
        }}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main CalendarView
// ---------------------------------------------------------------------------

export function CalendarView() {
  const now = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const [clientFilter, setClientFilter] = useState('all');
  const [platformFilter, setPlatformFilter] = useState('all');

  // Compute week boundaries
  const currentWeekStart = useMemo(() => getWeekStart(now), []);
  const displayWeekStart = useMemo(() => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [currentWeekStart, weekOffset]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(displayWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [displayWeekStart]);

  // Generate tasks for this week
  const allWeekTasks = useMemo(
    () => generateWeekTasks(displayWeekStart),
    [displayWeekStart]
  );

  // Apply filters
  const filteredTasks = useMemo(() => {
    return allWeekTasks.filter(t => {
      if (clientFilter !== 'all' && t.clientName !== clientFilter) return false;
      if (platformFilter !== 'all' && t.platform !== platformFilter) return false;
      return true;
    });
  }, [allWeekTasks, clientFilter, platformFilter]);

  // Group tasks by day
  const tasksByDay = useMemo(() => {
    const map = new Map<number, ScheduledTask[]>();
    for (let i = 0; i < 7; i++) map.set(i, []);
    for (const task of filteredTasks) {
      const dayIdx = task.scheduledAt.getDay() - displayWeekStart.getDay();
      const normalizedIdx = ((dayIdx % 7) + 7) % 7;
      if (normalizedIdx >= 0 && normalizedIdx < 7) {
        map.get(normalizedIdx)!.push(task);
      }
    }
    // Sort each day by time
    for (const tasks of map.values()) {
      tasks.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    }
    return map;
  }, [filteredTasks, displayWeekStart]);

  // Upcoming tasks (next 24h from now)
  const upcomingTasks = useMemo(() => {
    const cutoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    return filteredTasks
      .filter(t => t.scheduledAt >= now && t.scheduledAt <= cutoff)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime())
      .slice(0, 20);
  }, [filteredTasks, now]);

  // Client options for filter
  const clientOptions = useMemo(() => {
    const names = new Set(allWeekTasks.map(t => t.clientName));
    const sorted = Array.from(names).sort();
    return [
      { value: 'all', label: 'All Clients' },
      ...sorted.map(n => ({ value: n, label: n })),
    ];
  }, [allWeekTasks]);

  // Platform options for filter
  const platformOptions = useMemo(() => [
    { value: 'all', label: 'All Platforms' },
    ...PLATFORMS.map(p => ({ value: p, label: PLATFORM_LABELS[p] })),
  ], []);

  // Stats
  const totalThisWeek = filteredTasks.length;
  const todayTasks = filteredTasks.filter(t => isSameDay(t.scheduledAt, now));
  const platformCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of filteredTasks) {
      counts[t.platform] = (counts[t.platform] || 0) + 1;
    }
    return counts;
  }, [filteredTasks]);

  // Week label
  const weekLabel = `${formatDateShort(weekDays[0])} - ${formatDateShort(weekDays[6])}, ${weekDays[6].getFullYear()}`;

  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-void">
      {/* ---- TOP BAR ---- */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b border-border-subtle bg-[rgba(12,12,20,0.9)]"
      >
        {/* Left: title + week nav */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-5 rounded-full bg-neon-cyan" style={{ boxShadow: '0 0 8px rgba(0,240,255,0.4)' }} />
            <span className="font-mono text-[11px] font-bold tracking-widest text-primary">
              CONTENT CALENDAR
            </span>
          </div>

          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => setWeekOffset(w => w - 1)}
              className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)] text-secondary hover:text-neon-cyan transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              onClick={() => setWeekOffset(0)}
              className="px-2 py-0.5 rounded font-mono text-[10px] text-secondary hover:text-neon-cyan hover:bg-[rgba(255,255,255,0.06)] tracking-wider transition-colors"
            >
              TODAY
            </button>
            <button
              onClick={() => setWeekOffset(w => w + 1)}
              className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)] text-secondary hover:text-neon-cyan transition-colors"
            >
              <ChevronRight size={14} />
            </button>
            <span className="font-mono text-[11px] text-primary/80 ml-2 tabular-nums">
              {weekLabel}
            </span>
          </div>
        </div>

        {/* Center: stats */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] text-secondary tracking-widest">WEEK</span>
            <span className="font-mono text-[13px] text-neon-cyan tabular-nums font-bold">{totalThisWeek}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] text-secondary tracking-widest">TODAY</span>
            <span className="font-mono text-[13px] text-neon-green tabular-nums font-bold">{todayTasks.length}</span>
          </div>
          <div className="h-4 w-px bg-border-subtle" />
          {PLATFORMS.map(p => (
            <div key={p} className="flex items-center gap-1">
              <span
                className="text-[10px] font-bold w-[16px] h-[16px] flex items-center justify-center rounded-[2px]"
                style={{
                  color: PLATFORM_COLORS[p],
                  backgroundColor: `${PLATFORM_COLORS[p]}18`,
                }}
              >
                {PLATFORM_ICONS[p]}
              </span>
              <span className="font-mono text-[10px] tabular-nums text-primary/70">
                {platformCounts[p] || 0}
              </span>
            </div>
          ))}
        </div>

        {/* Right: filters */}
        <div className="flex items-center gap-3">
          <Filter size={12} className="text-secondary" />
          <FilterDropdown
            label=""
            value={clientFilter}
            options={clientOptions}
            onChange={setClientFilter}
          />
          <FilterDropdown
            label=""
            value={platformFilter}
            options={platformOptions}
            onChange={setPlatformFilter}
          />
          {(clientFilter !== 'all' || platformFilter !== 'all') && (
            <button
              onClick={() => { setClientFilter('all'); setPlatformFilter('all'); }}
              className="p-1 rounded hover:bg-[rgba(255,255,255,0.06)] text-secondary hover:text-neon-magenta transition-colors"
              title="Clear filters"
            >
              <X size={12} />
            </button>
          )}
        </div>
      </motion.div>

      {/* ---- MAIN CONTENT: SIDEBAR + CALENDAR ---- */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ---- LEFT SIDEBAR: UPCOMING ---- */}
        <motion.div
          variants={slideIn}
          initial="hidden"
          animate="visible"
          className="flex-shrink-0 w-[260px] border-r border-border-subtle bg-[rgba(12,12,20,0.6)] flex flex-col"
        >
          {/* Sidebar header */}
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border-subtle">
            <Clock size={12} className="text-neon-cyan" />
            <span className="font-mono text-[10px] font-bold tracking-widest text-primary/80">
              UPCOMING 24H
            </span>
            <span className="font-mono text-[10px] text-neon-cyan tabular-nums ml-auto">
              {upcomingTasks.length}
            </span>
          </div>

          {/* Task list */}
          <div
            className="flex-1 overflow-y-auto min-h-0"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.08) transparent',
            }}
          >
            <AnimatePresence>
              {upcomingTasks.length === 0 ? (
                <div className="flex items-center justify-center h-32">
                  <span className="font-mono text-[9px] text-muted tracking-widest">NO UPCOMING TASKS</span>
                </div>
              ) : (
                upcomingTasks.map((task, i) => (
                  <UpcomingRow key={task.id} task={task} index={i} />
                ))
              )}
            </AnimatePresence>
          </div>

          {/* Sidebar footer: platform legend */}
          <div className="flex-shrink-0 border-t border-border-subtle px-3 py-2">
            <div className="font-mono text-[8px] text-secondary tracking-widest mb-1.5">PLATFORMS</div>
            <div className="grid grid-cols-2 gap-1">
              {PLATFORMS.map(p => (
                <div key={p} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-[1px]"
                    style={{ backgroundColor: PLATFORM_COLORS[p] }}
                  />
                  <span className="font-mono text-[9px] text-secondary">{PLATFORM_LABELS[p]}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ---- CALENDAR GRID ---- */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Day header row */}
          <div className="flex-shrink-0 flex border-b border-border-subtle">
            {/* Time gutter spacer */}
            <div className="flex-shrink-0 w-[48px]" />
            {/* Day columns */}
            {weekDays.map((day, i) => {
              const isToday = isSameDay(day, now);
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.2 }}
                  className={`
                    flex-1 min-w-0 text-center py-2 border-l border-border-subtle
                    ${isToday ? 'bg-[rgba(0,240,255,0.04)]' : ''}
                  `}
                  style={isToday ? { borderBottom: '2px solid #00f0ff' } : {}}
                >
                  <div className={`font-mono text-[9px] tracking-widest ${isToday ? 'text-neon-cyan font-bold' : 'text-secondary'}`}>
                    {DAY_NAMES[day.getDay()]}
                  </div>
                  <div className={`font-mono text-[13px] tabular-nums mt-0.5 ${isToday ? 'text-neon-cyan font-bold' : 'text-primary/70'}`}>
                    {day.getDate()}
                  </div>
                  <div className="font-mono text-[8px] text-secondary/60 mt-0.5">
                    {(tasksByDay.get(i)?.length ?? 0)} posts
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* Scrollable time grid */}
          <div
            className="flex-1 flex overflow-y-auto min-h-0"
            style={{
              scrollbarWidth: 'thin',
              scrollbarColor: 'rgba(255,255,255,0.08) transparent',
            }}
          >
            {/* Time gutter */}
            <div className="flex-shrink-0 w-[48px] relative">
              {Array.from({ length: HOUR_SLOTS }, (_, h) => (
                <div
                  key={h}
                  className="border-b border-border-subtle flex items-start justify-end pr-1.5 pt-0.5"
                  style={{ height: `${100 / HOUR_SLOTS}%`, minHeight: '48px' }}
                >
                  <span className="font-mono text-[8px] text-secondary/60 tabular-nums leading-none">
                    {formatHour(HOURS_START + h)}
                  </span>
                </div>
              ))}
            </div>

            {/* Day columns with tasks */}
            {weekDays.map((day, dayIdx) => {
              const isToday = isSameDay(day, now);
              const dayTasks = tasksByDay.get(dayIdx) || [];

              // Current time indicator position
              const nowMinutes = (now.getHours() - HOURS_START) * 60 + now.getMinutes();
              const nowPercent = (nowMinutes / (HOUR_SLOTS * 60)) * 100;
              const showNowLine = isToday && now.getHours() >= HOURS_START && now.getHours() < HOURS_END;

              return (
                <div
                  key={dayIdx}
                  className={`
                    flex-1 min-w-0 border-l border-border-subtle relative
                    ${isToday ? 'bg-[rgba(0,240,255,0.02)]' : ''}
                  `}
                  style={isToday ? {
                    boxShadow: 'inset 0 0 30px rgba(0,240,255,0.03)',
                  } : {}}
                >
                  {/* Hour grid lines */}
                  {Array.from({ length: HOUR_SLOTS }, (_, h) => (
                    <div
                      key={h}
                      className="border-b border-border-subtle"
                      style={{ height: `${100 / HOUR_SLOTS}%`, minHeight: '48px' }}
                    />
                  ))}

                  {/* Current time indicator */}
                  {showNowLine && (
                    <div
                      className="absolute left-0 right-0 z-40 pointer-events-none"
                      style={{ top: `${nowPercent}%` }}
                    >
                      <div className="relative">
                        <div className="absolute -left-[3px] -top-[3px] w-[7px] h-[7px] rounded-full bg-neon-magenta" style={{ boxShadow: '0 0 6px rgba(255,0,170,0.6)' }} />
                        <div className="h-[1px] bg-neon-magenta w-full" style={{ boxShadow: '0 0 4px rgba(255,0,170,0.4)' }} />
                      </div>
                    </div>
                  )}

                  {/* Task blocks */}
                  {dayTasks.map((task, i) => (
                    <TaskBlock
                      key={task.id}
                      task={task}
                      index={i}
                      dayStart={day}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
