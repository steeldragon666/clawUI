import { useState } from 'react';
import { motion } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

type EventType = 'llm' | 'tool' | 'action' | 'error';

interface SessionEvent {
  id: string;
  type: EventType;
  name: string;
  startMs: number;
  durationMs: number;
  tokens?: number;
  model?: string;
  status: 'success' | 'error';
  details?: string;
}

interface SessionData {
  sessionId: string;
  totalMs: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  cacheHits: number;
  cost: number;
  status: 'completed' | 'failed';
  events: SessionEvent[];
}

export interface SessionWaterfallProps {
  agentId: string;
  agentName: string;
}

// ─── Mock data generator (deterministic via agentId hash) ─────────────────────

function hashCode(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function generateMockSession(agentId: string): SessionData {
  const seed = hashCode(agentId);
  // Deterministic jitter: vary each event's duration slightly based on seed
  const jitter = (base: number, slot: number) =>
    Math.round(base + ((seed >> slot) & 0xf) * 10);

  const sessionIdHex = (seed >>> 0).toString(16).padStart(8, '0');

  const templateEvents: Omit<SessionEvent, 'id' | 'startMs'>[] = [
    {
      type: 'llm',
      name: 'Analyze content brief',
      durationMs: jitter(1800, 0),
      tokens: 280,
      model: 'nemotron-3-super',
      status: 'success',
      details: 'Parsed brand guidelines, target audience, campaign objectives',
    },
    {
      type: 'tool',
      name: 'fetch_brand_voice',
      durationMs: jitter(900, 2),
      status: 'success',
      details: 'Retrieved brand_voice.json from context store — tone: confident, inclusive',
    },
    {
      type: 'llm',
      name: 'Generate draft post',
      durationMs: jitter(3200, 4),
      tokens: 520,
      model: 'claude-sonnet-4',
      status: 'success',
      details: 'Generated 3 variant posts for review. Selected variant B for downstream refinement.',
    },
    {
      type: 'tool',
      name: 'check_content_policy',
      durationMs: jitter(600, 6),
      status: 'success',
      details: 'NeMo Guardrails — PASS. No policy violations detected. Safety score: 0.98',
    },
    {
      type: 'llm',
      name: 'Refine for platform',
      durationMs: jitter(1400, 8),
      tokens: 190,
      model: 'nemotron-nano-3',
      status: 'success',
      details: 'Adapted copy for Instagram: 280 chars, emoji density +12%, hashtag slots reserved',
    },
    {
      type: 'tool',
      name: 'validate_hashtags',
      durationMs: jitter(300, 10),
      status: 'success',
      details: 'Verified 7 hashtags against trending database. 2 replaced for higher reach.',
    },
    {
      type: 'tool',
      name: 'check_rate_limits',
      durationMs: jitter(200, 12),
      status: 'success',
      details: 'API quota: 83% available. Publish window: OK. No throttling required.',
    },
    {
      type: 'llm',
      name: 'Final quality review',
      durationMs: jitter(1100, 14),
      tokens: 157,
      model: 'nemotron-3-super',
      status: 'success',
      details: 'Quality score: 0.94. Brand alignment: 0.97. Approved for publish queue.',
    },
    {
      type: 'action',
      name: 'queue_for_publish',
      durationMs: jitter(400, 16),
      status: 'success',
      details: 'Enqueued to publish_queue:instagram with priority=HIGH. Job ID: pq_8a3f2c',
    },
  ];

  // Build timeline: events start immediately after previous ends (with 50ms gap)
  let cursor = 0;
  const events: SessionEvent[] = templateEvents.map((ev, i) => {
    const start = cursor;
    cursor += ev.durationMs + 50;
    return { ...ev, id: `evt-${i}`, startMs: start };
  });

  const totalMs = cursor;
  const totalTokens = events.reduce((s, e) => s + (e.tokens ?? 0), 0);
  const inputTokens = Math.round(totalTokens * 0.54);
  const outputTokens = totalTokens - inputTokens;

  return {
    sessionId: sessionIdHex,
    totalMs,
    totalTokens,
    inputTokens,
    outputTokens,
    cacheHits: 2,
    cost: parseFloat((totalTokens * 0.0000026).toFixed(4)),
    status: 'completed',
    events,
  };
}

// ─── Styling constants ────────────────────────────────────────────────────────

const EVENT_COLORS: Record<EventType, { bar: string; border: string; text: string; hex: string }> = {
  llm:    { bar: 'bg-[#00f0ff]/15',  border: 'border-l-[#00f0ff]', text: 'text-[#00f0ff]', hex: '#00f0ff' },
  tool:   { bar: 'bg-[#ffaa00]/15',  border: 'border-l-[#ffaa00]', text: 'text-[#ffaa00]', hex: '#ffaa00' },
  action: { bar: 'bg-[#00ff88]/15',  border: 'border-l-[#00ff88]', text: 'text-[#00ff88]', hex: '#00ff88' },
  error:  { bar: 'bg-[#ff00aa]/15',  border: 'border-l-[#ff00aa]', text: 'text-[#ff00aa]', hex: '#ff00aa' },
};

const EVENT_ICONS: Record<EventType, string> = {
  llm:    '⬡',
  tool:   '⚙',
  action: '▶',
  error:  '✗',
};

const EVENT_LABELS: Record<EventType, string> = {
  llm:    'LLM',
  tool:   'TOOL',
  action: 'ACT',
  error:  'ERR',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${ms}ms`;
}

function formatDuration(ms: number): string {
  const s = ms / 1000;
  const mins = Math.floor(s / 60);
  const secs = (s % 60).toFixed(1);
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function formatCost(cost: number): string {
  return `$${cost.toFixed(4)}`;
}

interface TooltipProps {
  event: SessionEvent;
}

function EventTooltip({ event }: TooltipProps) {
  const colors = EVENT_COLORS[event.type];
  return (
    <div
      className="absolute z-50 left-0 top-full mt-1 w-64 rounded-sm border border-white/10 bg-[#0d0d18] p-2.5 shadow-2xl pointer-events-none"
      style={{ boxShadow: `0 4px 24px rgba(0,0,0,0.7), 0 0 12px ${colors.hex}22` }}
    >
      <div className={`text-[9px] font-mono tracking-widest mb-1 ${colors.text}`}>
        {EVENT_LABELS[event.type]} — {event.status.toUpperCase()}
      </div>
      <div className="font-mono text-[11px] text-[#e0e0e8] mb-1.5">{event.name}</div>
      {event.model && (
        <div className="font-mono text-[9px] text-[#6a6a7a] mb-1">
          MODEL: <span className="text-[#e0e0e8]">{event.model}</span>
        </div>
      )}
      <div className="font-mono text-[9px] text-[#6a6a7a] mb-1">
        DURATION: <span className="text-[#e0e0e8] tabular-nums">{formatMs(event.durationMs)}</span>
        {event.tokens != null && (
          <> &nbsp;|&nbsp; TOKENS: <span className="text-[#e0e0e8] tabular-nums">{event.tokens.toLocaleString()}</span></>
        )}
      </div>
      {event.details && (
        <div className="font-mono text-[9px] text-[#6a6a7a] leading-relaxed border-t border-white/[0.06] pt-1.5 mt-1.5">
          {event.details}
        </div>
      )}
    </div>
  );
}

interface WaterfallBarProps {
  event: SessionEvent;
  totalMs: number;
  index: number;
}

function WaterfallBar({ event, totalMs, index }: WaterfallBarProps) {
  const [hovered, setHovered] = useState(false);
  const colors = EVENT_COLORS[event.type];

  const leftPct = (event.startMs / totalMs) * 100;
  const widthPct = Math.max((event.durationMs / totalMs) * 100, 1.2); // min visible width

  return (
    <motion.div
      className="relative flex items-center h-[28px] group"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.055, ease: 'easeOut' }}
    >
      {/* Row background on hover */}
      <div
        className={`absolute inset-0 rounded-sm transition-colors duration-150 ${hovered ? 'bg-white/[0.03]' : ''}`}
      />

      {/* Left label — fixed width 130px */}
      <div className="relative z-10 flex items-center gap-1.5 w-[130px] shrink-0 pr-2">
        <span className={`font-mono text-[9px] tracking-widest ${colors.text} opacity-70`}>
          {EVENT_LABELS[event.type]}
        </span>
        <span className={`font-mono text-[9px] ${colors.text}`}>{EVENT_ICONS[event.type]}</span>
        <span
          className="font-mono text-[10px] text-[#9a9aaa] truncate"
          title={event.name}
        >
          {event.name}
        </span>
      </div>

      {/* Timeline track */}
      <div className="relative flex-1 h-full flex items-center">
        {/* Subtle grid lines (inherited from parent, just the bar area) */}
        <div
          className="relative"
          style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center' }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {/* The bar itself */}
          <motion.div
            className={`absolute h-[18px] rounded-sm border-l-2 ${colors.bar} ${colors.border} cursor-default`}
            style={{
              left: `${leftPct}%`,
              width: `${widthPct}%`,
              boxShadow: hovered ? `0 0 8px ${colors.hex}44, inset 0 0 8px ${colors.hex}11` : undefined,
            }}
            initial={{ scaleX: 0, originX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.35, delay: index * 0.055 + 0.1, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Inner label — only shown if bar is wide enough */}
            {widthPct > 8 && (
              <span
                className={`absolute inset-0 flex items-center pl-1.5 font-mono text-[9px] ${colors.text} opacity-80 whitespace-nowrap overflow-hidden`}
              >
                {formatMs(event.durationMs)}
                {event.tokens != null && ` · ${event.tokens}t`}
              </span>
            )}
          </motion.div>

          {/* Right-side label (outside the bar) */}
          <div
            className={`absolute font-mono text-[9px] whitespace-nowrap ${colors.text} opacity-60`}
            style={{ left: `calc(${leftPct + widthPct}% + 4px)` }}
          >
            {formatMs(event.durationMs)}
            {event.tokens != null && ` · ${event.tokens}t`}
          </div>

          {/* Tooltip */}
          {hovered && (
            <div className="absolute z-50" style={{ left: `${leftPct}%`, top: 0 }}>
              <EventTooltip event={event} />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Time axis ────────────────────────────────────────────────────────────────

interface TimeAxisProps {
  totalMs: number;
}

function TimeAxis({ totalMs }: TimeAxisProps) {
  const totalSec = totalMs / 1000;
  // Tick interval: aim for ~6–8 ticks
  const rawInterval = totalSec / 7;
  const interval = rawInterval < 1 ? 0.5 : rawInterval < 2 ? 1 : rawInterval < 5 ? 2 : 5;

  const ticks: number[] = [];
  for (let t = 0; t <= totalSec + 0.001; t += interval) {
    ticks.push(parseFloat(t.toFixed(2)));
  }

  return (
    <div className="relative w-full h-6 mb-0.5 ml-[130px]">
      {ticks.map(tick => {
        const pct = (tick / totalSec) * 100;
        return (
          <div
            key={tick}
            className="absolute top-0 flex flex-col items-center"
            style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
          >
            <span className="font-mono text-[8px] text-[#334455] tabular-nums">
              {tick === 0 ? '0s' : `${tick % 1 === 0 ? tick : tick.toFixed(1)}s`}
            </span>
            <div className="w-px h-1.5 bg-[#334455]/60 mt-0.5" />
          </div>
        );
      })}
      {/* NOW marker */}
      <div
        className="absolute top-0 flex flex-col items-center pointer-events-none"
        style={{ left: '100%', transform: 'translateX(-50%)' }}
      >
        <span className="font-mono text-[8px] text-[#00f0ff] tracking-widest">NOW</span>
        <div
          className="w-px h-1.5 bg-[#00f0ff] mt-0.5"
          style={{ boxShadow: '0 0 4px #00f0ff' }}
        />
      </div>
    </div>
  );
}

// ─── Grid overlay for the track area ─────────────────────────────────────────

interface TrackGridProps {
  totalMs: number;
  rowCount: number;
}

function TrackGrid({ totalMs, rowCount }: TrackGridProps) {
  const totalSec = totalMs / 1000;
  const rawInterval = totalSec / 7;
  const interval = rawInterval < 1 ? 0.5 : rawInterval < 2 ? 1 : rawInterval < 5 ? 2 : 5;

  const ticks: number[] = [];
  for (let t = 0; t <= totalSec + 0.001; t += interval) {
    ticks.push(parseFloat(t.toFixed(2)));
  }

  const rowH = 28; // px per row
  const totalH = rowCount * rowH;

  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{ left: '130px' }}
    >
      {ticks.map(tick => {
        const pct = (tick / totalSec) * 100;
        return (
          <div
            key={tick}
            className="absolute top-0 w-px"
            style={{
              left: `${pct}%`,
              height: `${totalH}px`,
              background: tick === 0
                ? 'rgba(255,255,255,0.05)'
                : 'rgba(255,255,255,0.03)',
            }}
          />
        );
      })}
      {/* NOW line */}
      <div
        className="absolute top-0 w-px"
        style={{
          left: '100%',
          height: `${totalH}px`,
          background: '#00f0ff',
          boxShadow: '0 0 6px #00f0ff88',
          opacity: 0.6,
        }}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function SessionWaterfall({ agentId }: SessionWaterfallProps) {
  const session = generateMockSession(agentId);

  const llmEvents = session.events.filter(e => e.type === 'llm');
  const toolEvents = session.events.filter(e => e.type === 'tool');
  const actionEvents = session.events.filter(e => e.type === 'action');
  const errorEvents = session.events.filter(e => e.type === 'error');

  return (
    <div className="flex flex-col h-full bg-[#0a0a0f] font-mono select-none overflow-hidden">

      {/* ── Session header ── */}
      <div className="shrink-0 px-3 py-2.5 border-b border-white/[0.06]">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[9px] tracking-widest text-[#334455]">SESSION</span>
            <span className="text-[11px] text-[#e0e0e8] tabular-nums">{session.sessionId}</span>
            <span className="text-[#334455]">•</span>
            <span className="text-[11px] text-[#9a9aaa] tabular-nums">{formatDuration(session.totalMs)}</span>
            <span className="text-[#334455]">•</span>
            <span className="text-[11px] text-[#9a9aaa] tabular-nums">{session.totalTokens.toLocaleString()} tokens</span>
            <span className="text-[#334455]">•</span>
            <span className="text-[11px] text-[#9a9aaa] tabular-nums">{formatCost(session.cost)}</span>
          </div>
          <span
            className={`text-[9px] tracking-widest px-2 py-0.5 rounded-sm border font-bold ${
              session.status === 'completed'
                ? 'text-[#00ff88] border-[#00ff88]/30 bg-[#00ff88]/10'
                : 'text-[#ff00aa] border-[#ff00aa]/30 bg-[#ff00aa]/10'
            }`}
          >
            {session.status.toUpperCase()}
          </span>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="shrink-0 px-3 py-1.5 border-b border-white/[0.06] flex items-center gap-4">
        {(
          [
            { type: 'llm' as EventType, label: 'LLM Call' },
            { type: 'tool' as EventType, label: 'Tool Call' },
            { type: 'action' as EventType, label: 'Action' },
            { type: 'error' as EventType, label: 'Error' },
          ] as { type: EventType; label: string }[]
        ).map(({ type, label }) => (
          <div key={type} className="flex items-center gap-1.5">
            <div
              className="w-3 h-2 rounded-sm border-l-2"
              style={{
                background: `${EVENT_COLORS[type].hex}22`,
                borderLeftColor: EVENT_COLORS[type].hex,
              }}
            />
            <span className="text-[9px] text-[#6a6a7a] tracking-wider">{label}</span>
          </div>
        ))}
        <div className="ml-auto text-[9px] text-[#334455] tabular-nums">
          {session.events.length} events &nbsp;·&nbsp; {llmEvents.length} LLM &nbsp;·&nbsp; {toolEvents.length} tools &nbsp;·&nbsp; {actionEvents.length} actions
          {errorEvents.length > 0 && <> &nbsp;·&nbsp; <span className="text-[#ff00aa]">{errorEvents.length} errors</span></>}
        </div>
      </div>

      {/* ── Waterfall timeline ── */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pt-2 pb-1">
        <TimeAxis totalMs={session.totalMs} />

        <div className="relative">
          <TrackGrid totalMs={session.totalMs} rowCount={session.events.length} />

          <div className="flex flex-col gap-0">
            {session.events.map((event, i) => (
              <WaterfallBar
                key={event.id}
                event={event}
                totalMs={session.totalMs}
                index={i}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Token summary footer ── */}
      <motion.div
        className="shrink-0 px-3 py-2 border-t border-white/[0.06] bg-[#0c0c14]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      >
        <div className="flex items-center gap-0 flex-wrap">
          {[
            { label: 'TOTAL TOKENS', value: session.totalTokens.toLocaleString(), color: '#e0e0e8' },
            { label: 'INPUT', value: session.inputTokens.toLocaleString(), color: '#9a9aaa' },
            { label: 'OUTPUT', value: session.outputTokens.toLocaleString(), color: '#9a9aaa' },
            { label: 'COST', value: formatCost(session.cost), color: '#00ff88' },
            { label: 'CACHE HITS', value: String(session.cacheHits), color: '#ffaa00' },
          ].map(({ label, value, color }, i, arr) => (
            <div key={label} className="flex items-center">
              <div className="flex items-baseline gap-1 px-2 first:pl-0">
                <span className="text-[8px] tracking-widest text-[#334455]">{label}:</span>
                <span
                  className="text-[10px] tabular-nums font-bold"
                  style={{ color }}
                >
                  {value}
                </span>
              </div>
              {i < arr.length - 1 && (
                <span className="text-[#334455] text-[10px]">|</span>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
