import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTaskStore } from '../stores/taskStore';
import type { Task } from '@omniscient/shared';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PipelineStage =
  | 'queued'
  | 'in_progress'
  | 'review'
  | 'approved'
  | 'scheduled'
  | 'published'
  | 'failed';

interface MockTask extends Task {
  pipelineStage?: PipelineStage;
  platform?: string;
  contentPreview?: string;
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

interface ColumnDef {
  key: PipelineStage;
  label: string;
  headerColor: string;
  throughputHr: number;
}

const COLUMNS: ColumnDef[] = [
  { key: 'queued',      label: 'QUEUED',      headerColor: 'text-secondary',      throughputHr: 12 },
  { key: 'in_progress', label: 'IN PROGRESS', headerColor: 'text-neon-cyan',      throughputHr: 28 },
  { key: 'review',      label: 'REVIEW',      headerColor: 'text-neon-amber',     throughputHr: 8  },
  { key: 'approved',    label: 'APPROVED',    headerColor: 'text-[#0088ff]',      throughputHr: 15 },
  { key: 'scheduled',   label: 'SCHEDULED',   headerColor: 'text-[#0088ff]',      throughputHr: 22 },
  { key: 'published',   label: 'PUBLISHED',   headerColor: 'text-neon-green',     throughputHr: 40 },
  { key: 'failed',      label: 'FAILED',      headerColor: 'text-neon-magenta',   throughputHr: 3  },
];

// ---------------------------------------------------------------------------
// Stage resolution
// ---------------------------------------------------------------------------

function resolveStage(task: MockTask): PipelineStage {
  if (task.pipelineStage) return task.pipelineStage;

  switch (task.status) {
    case 'active':    return 'in_progress';
    case 'approval':  return 'review';
    case 'done':      return 'published';
    case 'failed':    return 'failed';
    case 'cancelled': return 'failed';
    case 'queued':
    default:          return 'queued';
  }
}

// ---------------------------------------------------------------------------
// Priority border color (left accent)
// ---------------------------------------------------------------------------

function priorityBorderColor(priority: number): string {
  switch (priority) {
    case 1:  return '#ff00aa'; // neon-magenta
    case 2:  return '#ffaa00'; // neon-amber
    case 3:  return '#00f0ff'; // neon-cyan
    case 4:  return '#6a6a7a'; // secondary
    default: return '#334455'; // muted
  }
}

// ---------------------------------------------------------------------------
// Platform icon
// ---------------------------------------------------------------------------

function platformIcon(platform?: string): string {
  switch ((platform ?? '').toLowerCase()) {
    case 'x':          return '🐦';
    case 'linkedin':   return '💼';
    case 'facebook':
    case 'meta':       return '📘';
    case 'instagram':  return '📷';
    default:           return '🌐';
  }
}

// ---------------------------------------------------------------------------
// Time-in-stage helper
// ---------------------------------------------------------------------------

function timeInStage(task: MockTask): string {
  const anchor = task.startedAt ?? task.createdAt;
  const end    = task.completedAt ?? new Date().toISOString();
  const diffMs = new Date(end).getTime() - new Date(anchor).getTime();
  const mins   = Math.floor(diffMs / 60_000);
  if (mins < 60)  return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// ---------------------------------------------------------------------------
// Bottleneck bar color
// ---------------------------------------------------------------------------

function bottleneckColor(count: number): { color: string; pulse: boolean } {
  if (count > 25) return { color: '#ff00aa', pulse: true  };
  if (count >= 10) return { color: '#ffaa00', pulse: false };
  return { color: '#00ff88', pulse: false };
}

// ---------------------------------------------------------------------------
// Pipeline Task Card (pipeline-specific, inline)
// ---------------------------------------------------------------------------

interface PipelineCardProps {
  task: MockTask;
  index: number;
}

const cardVariants = {
  hidden:  { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.04, duration: 0.2, ease: 'easeOut' as const },
  }),
};

function PipelineCard({ task, index }: PipelineCardProps) {
  const t = task as MockTask;
  const clientName =
    (t.inputs?.clientName as string | undefined) ??
    (t.inputs?.clientId as string | undefined) ??
    'Unknown Client';

  const borderColor = priorityBorderColor(task.priority);
  const icon        = platformIcon(t.platform);
  const timeStr     = timeInStage(t);
  const agentLabel  = task.agentId ? task.agentId : 'UNASSIGNED';

  return (
    <motion.div
      custom={index}
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      style={{ borderLeftColor: borderColor }}
      className="
        w-full
        bg-[#12121f] hover:bg-[#1a1a2e]
        border border-[rgba(255,255,255,0.06)] border-l-[3px]
        rounded
        cursor-pointer
        transition-colors duration-150
        flex flex-col gap-1
        p-2
        min-h-[100px]
      "
    >
      {/* Top — client name */}
      <div className="text-[10px] text-secondary font-sans leading-none truncate">
        {clientName}
      </div>

      {/* Middle — content preview (title), 2-line clamp */}
      <div className="text-[11px] text-primary font-sans leading-snug line-clamp-2 flex-1">
        {task.title}
      </div>

      {/* Bottom row — platform icon + agent + time */}
      <div className="flex items-center justify-between mt-auto pt-1 border-t border-[rgba(255,255,255,0.06)]">
        <span
          className="text-[11px] leading-none"
          aria-label={t.platform ?? 'platform'}
        >
          {icon}
        </span>
        <span className="font-mono text-[9px] text-neon-cyan truncate max-w-[60px]">
          {agentLabel.length > 10 ? agentLabel.slice(-8) : agentLabel}
        </span>
        <span className="font-mono text-[9px] text-secondary tabular-nums">
          {timeStr}
        </span>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Kanban Column
// ---------------------------------------------------------------------------

interface KanbanColumnProps {
  col: ColumnDef;
  tasks: MockTask[];
}

function KanbanColumn({ col, tasks }: KanbanColumnProps) {
  const count = tasks.length;
  const { color: bnColor, pulse: bnPulse } = bottleneckColor(count);

  return (
    <div className="flex flex-col flex-1 min-w-0 h-full">
      {/* Column header */}
      <div className="flex-shrink-0 px-2 pt-2 pb-0">
        <div className="flex items-center justify-between mb-1">
          <span className={`font-mono text-[10px] font-bold tracking-widest ${col.headerColor}`}>
            {col.label}
          </span>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[9px] text-secondary tabular-nums">
              {col.throughputHr}/hr
            </span>
            <span
              className="
                font-mono text-[9px] tabular-nums
                px-1 py-0 rounded-sm
                bg-[rgba(255,255,255,0.05)]
                text-primary
                border border-[rgba(255,255,255,0.08)]
              "
            >
              {count}
            </span>
          </div>
        </div>

        {/* Bottleneck indicator bar */}
        <div
          className="w-full h-[3px] rounded-full mb-2"
          style={{
            backgroundColor: bnColor,
            boxShadow: bnPulse ? `0 0 8px ${bnColor}` : undefined,
            animation: bnPulse ? 'bottleneck-pulse 1.2s ease-in-out infinite' : undefined,
          }}
        />
      </div>

      {/* Scrollable task list */}
      <div
        className="flex-1 overflow-y-auto px-2 pb-2 flex flex-col gap-1.5 min-h-0"
        style={{
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(255,255,255,0.08) transparent',
        }}
      >
        {tasks.map((task, i) => (
          <PipelineCard key={task.id} task={task} index={i} />
        ))}
        {tasks.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <span className="font-mono text-[9px] text-muted tracking-widest">
              EMPTY
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PipelineView — full-page 7-column Kanban
// ---------------------------------------------------------------------------

export function PipelineView() {
  const tasks = useTaskStore(s => s.tasks) as MockTask[];

  const columnTasks = useMemo<Record<PipelineStage, MockTask[]>>(() => {
    const buckets: Record<PipelineStage, MockTask[]> = {
      queued:      [],
      in_progress: [],
      review:      [],
      approved:    [],
      scheduled:   [],
      published:   [],
      failed:      [],
    };

    for (const task of tasks) {
      const stage = resolveStage(task);
      buckets[stage].push(task);
    }

    return buckets;
  }, [tasks]);

  return (
    <>
      {/* Inject bottleneck-pulse keyframe once */}
      <style>{`
        @keyframes bottleneck-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
      `}</style>

      <div
        className="flex h-full w-full overflow-hidden bg-void"
        style={{ gap: '1px', backgroundColor: 'rgba(255,255,255,0.04)' }}
      >
        {COLUMNS.map(col => (
          <div
            key={col.key}
            className="flex-1 min-w-0 h-full bg-void flex flex-col"
          >
            <KanbanColumn col={col} tasks={columnTasks[col.key]} />
          </div>
        ))}
      </div>
    </>
  );
}
