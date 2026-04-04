# MVP Completion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring the existing Vite+React dashboard to full MVP acceptance criteria — NavigationRail, 5-route routing, Zustand stores, 50-agent/200-task mock data, 7-column pipeline, Framer Motion stagger animations, ECharts sparklines, tabbed agent flyout, and MetricsRow with delta badges.

**Architecture:** Stay on Vite SPA (no Next.js migration). Add react-router-dom for client-side routing, Zustand for global state, Framer Motion for animations, ECharts for charts. Existing components are refactored in-place, new views are added as route pages.

**Tech Stack:** React 19, Vite 6, react-router-dom 7, Zustand 5, Framer Motion 11, echarts-for-react + echarts 5, lucide-react, TanStack Table v8

---

## Task 1: Install New Dependencies

**Files:**
- Modify: `packages/web/package.json`

**Step 1: Install packages**

Run:
```bash
pnpm --filter @omniscient/web add react-router-dom zustand framer-motion echarts echarts-for-react lucide-react @tanstack/react-table
```

**Step 2: Verify**

Run: `pnpm --filter @omniscient/web dev` — should start without errors.

**Step 3: Commit**

```bash
git add packages/web/package.json pnpm-lock.yaml
git commit -m "feat(web): add router, zustand, framer-motion, echarts, lucide deps"
```

---

## Task 2: Zustand Stores — Replace useState Hooks with Global State

**Files:**
- Create: `packages/web/src/stores/agentStore.ts`
- Create: `packages/web/src/stores/taskStore.ts`
- Create: `packages/web/src/stores/alertStore.ts`
- Create: `packages/web/src/stores/metricsStore.ts`

**Rationale:** Zustand replaces the scattered useState+useEffect hooks. Each store handles initial fetch, WS subscriptions, and exposes state. Components just `useAgentStore(s => s.agents)`.

### agentStore.ts

```typescript
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

export const useAgentStore = create<AgentState>((set, get) => ({
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
    set(s => ({
      agents: s.agents.map(a => a.id === agentId ? { ...a, ...data } : a),
    })),
}));
```

Follow same pattern for `taskStore`, `alertStore`, `metricsStore` — extracting logic from existing hooks.

### taskStore.ts

- State: `tasks: Task[]`, `loading: boolean`
- Actions: `fetchTasks()`, `updateTaskStatus(id, status)`, `addTask(task)`
- Init from `mockTasks`, fetch overwrites if API available

### alertStore.ts

- State: `alerts: Alert[]`, `filter: 'all' | 'critical' | 'warning' | 'info' | 'resolved'`
- Actions: `fetchAlerts()`, `addAlert(alert)`, `setFilter(filter)`
- Keep last 100 alerts

### metricsStore.ts

- State: `metrics: MetricsSnapshot`, `loading: boolean`
- Actions: `fetchMetrics()`, `updateMetrics(snapshot)`

**Step 2: Wire WS subscriptions**

Create: `packages/web/src/lib/socket-init.ts`

This file connects the socket and dispatches to stores — called once in `main.tsx`:

```typescript
import { io } from 'socket.io-client';
import { useAgentStore } from '../stores/agentStore';
import { useTaskStore } from '../stores/taskStore';
import { useAlertStore } from '../stores/alertStore';
import { useMetricsStore } from '../stores/metricsStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const socket = io(API_URL, {
  transports: ['websocket'],
  reconnection: true,
  reconnectionAttempts: Infinity,
});

export function initSocketListeners() {
  socket.on('agent:heartbeat', (data) => {
    useAgentStore.getState().updateFromHeartbeat(data.agentId, {
      status: data.status,
      lastHeartbeat: data.timestamp,
      cpuPercent: data.cpuPercent,
      memoryPercent: data.memoryPercent,
      taskCounter: data.taskCounter,
      queueDepth: data.queueDepth,
    });
  });

  socket.on('agent:status_change', ({ agentId, to }) => {
    useAgentStore.getState().updateAgent(agentId, { status: to });
  });

  socket.on('task:status_change', ({ taskId, to, agentId }) => {
    useTaskStore.getState().updateTaskStatus(taskId, to);
  });

  socket.on('task:created', () => {
    useTaskStore.getState().fetchTasks();
  });

  socket.on('alert:new', (alert) => {
    useAlertStore.getState().addAlert(alert);
  });

  socket.on('metrics:update', (snapshot) => {
    useMetricsStore.getState().updateMetrics(snapshot);
  });

  socket.on('connect', () => console.log('[ws] connected'));
  socket.on('disconnect', () => console.log('[ws] disconnected'));
}
```

**Step 3: Update main.tsx**

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initSocketListeners } from './lib/socket-init';
import './styles/globals.css';

initSocketListeners();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

**Step 4: Commit**

```bash
git add packages/web/src/stores/ packages/web/src/lib/socket-init.ts packages/web/src/main.tsx
git commit -m "feat(web): add Zustand stores and centralized WS subscriptions"
```

---

## Task 3: React Router + AppShell + NavigationRail

**Files:**
- Create: `packages/web/src/components/layout/NavigationRail.tsx`
- Create: `packages/web/src/components/layout/AppShell.tsx`
- Create: `packages/web/src/pages/FleetView.tsx`
- Create: `packages/web/src/pages/PipelineView.tsx`
- Create: `packages/web/src/pages/CalendarView.tsx`
- Create: `packages/web/src/pages/ClientsView.tsx`
- Create: `packages/web/src/pages/SettingsView.tsx`
- Modify: `packages/web/src/App.tsx`

### NavigationRail.tsx

Per MVP spec: 64px collapsed, 220px on hover, 5 items, active indicator.

```typescript
import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Kanban, Calendar, Users, Settings } from 'lucide-react';
import { motion } from 'framer-motion';

const NAV_ITEMS = [
  { to: '/', icon: Activity, label: 'Fleet' },
  { to: '/pipeline', icon: Kanban, label: 'Pipeline' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/clients', icon: Users, label: 'Clients' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export function NavigationRail() {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.nav
      className="h-full bg-panel border-r border-border-subtle flex flex-col items-center py-4 overflow-hidden z-30"
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
            `flex items-center gap-3 w-full h-12 px-5 transition-colors relative ${
              isActive
                ? 'text-neon-cyan'
                : 'text-secondary hover:text-primary'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <div className="absolute left-0 top-1 bottom-1 w-[3px] bg-neon-cyan glow-cyan rounded-r" />
              )}
              <Icon size={20} className="shrink-0" />
              <motion.span
                className="font-mono text-xs tracking-wider whitespace-nowrap overflow-hidden"
                animate={{ opacity: expanded ? 1 : 0, width: expanded ? 'auto' : 0 }}
                transition={{ duration: 0.2 }}
              >
                {label}
              </motion.span>
            </>
          )}
        </NavLink>
      ))}

      {/* Bottom branding */}
      <div className="mt-auto">
        <span className="font-mono text-[10px] text-muted">
          {expanded ? 'CARBON PROJECT' : 'C'}
        </span>
      </div>
    </motion.nav>
  );
}
```

### AppShell.tsx

CSS Grid: NavRail column 1, StatusBar row 1, content row 2.

```typescript
import { Outlet } from 'react-router-dom';
import { NavigationRail } from './NavigationRail';
import { StatusBar } from './StatusBar';
import { CommandPalette } from '../ui/CommandPalette';

export function AppShell() {
  return (
    <div className="h-screen w-screen bg-void text-primary font-sans overflow-hidden grid grid-cols-[64px_1fr] grid-rows-[48px_1fr] relative">
      {/* Background Grid Pattern */}
      <div className="fixed inset-0 grid-underlay pointer-events-none" />

      <CommandPalette />

      {/* Nav Rail — spans both rows */}
      <div className="row-span-2 z-30">
        <NavigationRail />
      </div>

      {/* Status Bar — row 1, col 2 */}
      <StatusBar />

      {/* Main content — row 2, col 2 */}
      <main className="overflow-hidden">
        <Outlet />
      </main>
    </div>
  );
}
```

### FleetView.tsx

Extracts the current DashboardShell inner content into a routable page:

```typescript
import { PanelFrame } from '../components/layout/PanelFrame';
import { AgentGrid } from '../components/dashboard/AgentGrid';
import { TaskPipeline } from '../components/dashboard/TaskPipeline';
import { InfrastructurePanel } from '../components/dashboard/InfrastructurePanel';
import { AlertFeed } from '../components/dashboard/AlertFeed';
import { ScheduleTimeline } from '../components/dashboard/ScheduleTimeline';
import { PerformanceMetricsPanel } from '../components/dashboard/PerformanceMetricsPanel';

export function FleetView() {
  return (
    <div className="h-full grid grid-cols-[3fr_2fr] grid-rows-[1fr_auto_auto] gap-1 p-1 min-h-0">
      <PanelFrame title="Live Agent Fleet" className="row-span-1 border-neon-cyan/20">
        <AgentGrid />
      </PanelFrame>
      <PanelFrame title="Active Task Pipeline" className="row-span-1">
        <TaskPipeline />
      </PanelFrame>
      <PanelFrame title="Schedule Timeline" className="col-span-2 h-[140px]">
        <ScheduleTimeline />
      </PanelFrame>
      <div className="col-span-2 grid grid-cols-[1fr_1fr_2fr] gap-1 h-[220px]">
        <PanelFrame title="Performance Metrics" className="border-neon-cyan/20">
          <PerformanceMetricsPanel />
        </PanelFrame>
        <PanelFrame title="Infrastructure & Capacity" className="border-neon-green/20">
          <InfrastructurePanel />
        </PanelFrame>
        <PanelFrame title="Error & Alert Feed" className="border-neon-magenta/20">
          <AlertFeed />
        </PanelFrame>
      </div>
    </div>
  );
}
```

### PipelineView.tsx, CalendarView.tsx, ClientsView.tsx, SettingsView.tsx

Pipeline gets the full-page 7-column Kanban (Task 5). Others are placeholder panels:

```typescript
export function CalendarView() {
  return (
    <div className="h-full flex items-center justify-center font-mono text-secondary text-sm">
      CONTENT CALENDAR — AVAILABLE IN BETA
    </div>
  );
}
```

### App.tsx — Router setup

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { FleetView } from './pages/FleetView';
import { PipelineView } from './pages/PipelineView';
import { CalendarView } from './pages/CalendarView';
import { ClientsView } from './pages/ClientsView';
import { SettingsView } from './pages/SettingsView';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<FleetView />} />
          <Route path="/pipeline" element={<PipelineView />} />
          <Route path="/calendar" element={<CalendarView />} />
          <Route path="/clients" element={<ClientsView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
```

**Commit:**

```bash
git add packages/web/src/
git commit -m "feat(web): add NavigationRail, AppShell, React Router with 5 routes"
```

---

## Task 4: Expand Mock Data to MVP Scale (50 agents, 20 clients, 200 tasks, 50 alerts)

**Files:**
- Rewrite: `packages/web/src/lib/mock.ts`

Generate:
- **4 servers**: `srv-alpha-01` (15 agents), `srv-alpha-02` (15), `srv-beta-01` (12), `srv-beta-02` (8)
- **20 clients**: realistic company names, 2-4 platforms each
- **50 agents**: status distribution 35 working, 8 idle, 4 error, 3 offline. Roles: 15 content-writers, 10 schedulers, 10 publishers, 8 monitors, 7 researchers
- **200 tasks**: Queued(25), InProgress(30), Review(15), Approved(20), Scheduled(35), Published(65), Failed(10). Realistic social media content previews.
- **50 alerts**: 15 agent errors, 10 task failures, 8 rate limit warnings, 5 server health, 7 SLA warnings, 5 resolved
- **24h metric history**: 24 data points per metric with realistic daily pattern (low midnight-6am, ramp 7-10am, steady 10am-4pm, taper 4-10pm)

Add `Client` interface to shared types and mock client list.

**Commit:**

```bash
git commit -m "feat(web): expand mock data to MVP scale — 50 agents, 20 clients, 200 tasks"
```

---

## Task 5: Full-Page PipelineBoard with 7 Columns

**Files:**
- Create: `packages/web/src/pages/PipelineView.tsx` (full implementation)
- Modify: `packages/web/src/components/dashboard/TaskCard.tsx` — add client name, platform icon, time-in-stage

**Spec**: 7 columns (Queued, In Progress, Review, Approved, Scheduled, Published, Failed). Each column scrolls vertically. Bottleneck indicator bar: green <10, amber 10-25, pink >25. Column headers show task count + throughput rate.

TaskCard updates:
- Client avatar (coloured circle with initials)
- Platform icon (colour-coded per spec)
- Time in stage
- Left border = priority colour (P1=magenta, P2=amber, P3=cyan, P4=muted, P5=dim)

**Commit:**

```bash
git commit -m "feat(web): full-page 7-column PipelineBoard with bottleneck indicators"
```

---

## Task 6: MetricsRow with 6 Cards, Sparklines (ECharts), and Delta Badges

**Files:**
- Create: `packages/web/src/components/dashboard/MetricsRow.tsx`
- Create: `packages/web/src/components/charts/Sparkline.tsx`
- Modify: `packages/web/src/pages/FleetView.tsx` — replace PerformanceMetricsPanel with MetricsRow

**Spec**: 6 equal-width metric cards. Each card: label (body-sm muted), large number (mono-lg), delta badge (green up / pink down vs yesterday), sparkline (120x32px ECharts line, 24 points, metric colour, no axes).

The 6 metrics: Posts Published Today, Queue Depth, Avg Task Duration, Fleet Error Rate, API Budget Consumed, Active Clients.

### Sparkline.tsx (ECharts wrapper)

```typescript
import ReactECharts from 'echarts-for-react';

interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
}

export function Sparkline({ data, color, height = 32 }: SparklineProps) {
  const option = {
    grid: { top: 0, right: 0, bottom: 0, left: 0 },
    xAxis: { show: false, type: 'category', data: data.map((_, i) => i) },
    yAxis: { show: false, type: 'value' },
    series: [{
      type: 'line',
      data,
      smooth: true,
      symbol: 'none',
      lineStyle: { color, width: 1.5 },
      areaStyle: { color: `${color}20` },
    }],
    animation: true,
    animationDuration: 500,
  };

  return <ReactECharts option={option} style={{ height, width: '100%' }} opts={{ renderer: 'svg' }} />;
}
```

**Commit:**

```bash
git commit -m "feat(web): MetricsRow with 6 cards, ECharts sparklines, delta badges"
```

---

## Task 7: Tabbed AgentDetailFlyout (Overview / Log / Tasks)

**Files:**
- Rewrite: `packages/web/src/components/dashboard/AgentDetailFlyout.tsx`

**Spec**: 3 tabs:
1. **Overview**: Current task, client, uptime, CPU/memory gauge rings (ECharts gauge), last 5 task results
2. **Log**: Terminal-style scrolling output, Geist Mono green-on-dark, auto-scroll, last 100 mock log lines
3. **Tasks**: TanStack Table of last 20 tasks — columns: task name, client, duration, status badge, timestamp. Sortable.

Action buttons at bottom with confirm popover for destructive actions (Kill Task).

**Commit:**

```bash
git commit -m "feat(web): tabbed AgentDetailFlyout — Overview, Log, Tasks with gauge charts"
```

---

## Task 8: Framer Motion Animations

**Files:**
- Modify: `packages/web/src/components/dashboard/AgentGrid.tsx` — stagger cascade on load
- Modify: `packages/web/src/components/dashboard/AgentCard.tsx` — layout animations
- Modify: `packages/web/src/components/dashboard/AlertFeed.tsx` — alert entrance animation
- Modify: `packages/web/src/components/layout/NavigationRail.tsx` — already animated in Task 3

**Stagger cascade** for AgentGrid:
```typescript
<motion.div
  initial="hidden"
  animate="visible"
  variants={{
    hidden: {},
    visible: { transition: { staggerChildren: 0.05 } },
  }}
>
  {agents.map(agent => (
    <motion.div
      key={agent.id}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
    >
      <AgentCard agent={agent} />
    </motion.div>
  ))}
</motion.div>
```

**Alert entrance**: `AnimatePresence` with slide-in from right + amber flash.

**Commit:**

```bash
git commit -m "feat(web): Framer Motion stagger cascades, layout animations, alert entrances"
```

---

## Task 9: StatusBar Stat Pills per MVP Spec

**Files:**
- Modify: `packages/web/src/components/layout/StatusBar.tsx`

**Spec**: 6 stat pills with dynamic colour logic:
- Agents Online: `47/50` — green >90%, amber >70%, pink <70%
- Tasks Active — primary always
- Posts Today — primary always
- Queue Depth — green <20, amber <50, pink >50
- Error Rate — green <1%, amber <3%, pink >3%
- API Budget — green <50%, amber <80%, pink >80%

Right side: clock (HH:MM:SS updating every second) + alert bell with badge count.

**Commit:**

```bash
git commit -m "feat(web): StatusBar with 6 stat pills, dynamic colour logic, alert bell"
```

---

## Task 10: AgentCard Updates per MVP Spec

**Files:**
- Modify: `packages/web/src/components/dashboard/AgentCard.tsx`

Changes: 200x120px card. Left 3px status border. Top row: Agent ID (mono-sm) + status dot with glow. Middle: current task name truncated 2 lines. Bottom: client name badge, uptime (e.g. `14h 23m`), role badge.

**Commit:**

```bash
git commit -m "feat(web): AgentCard redesign — client badge, uptime, role pill, status border"
```

---

## Task 11: Delete Old Hooks, Clean Up SocketContext

**Files:**
- Delete: `packages/web/src/hooks/useAgents.ts`
- Delete: `packages/web/src/hooks/useTasks.ts`
- Delete: `packages/web/src/hooks/useMetrics.ts`
- Delete: `packages/web/src/hooks/useInfrastructure.ts`
- Delete: `packages/web/src/hooks/useSocket.ts`
- Delete: `packages/web/src/context/SocketContext.tsx`
- Delete: `packages/web/src/components/layout/DashboardShell.tsx`
- Update all imports to use Zustand stores + `socket` from `lib/socket-init.ts`

**Commit:**

```bash
git commit -m "refactor(web): remove old hooks/context, all state now via Zustand stores"
```

---

## Task 12: Final MVP Acceptance Verification

Run through all 16 acceptance criteria from the spec:

1. Dashboard loads <2s, fills viewport, no horizontal scroll
2. All 50 agent cards render grouped by server with correct status colours
3. Click agent opens flyout with smooth slide-in
4. Log tab shows terminal-style Geist Mono green-on-dark
5. StatusBar shows 6 stat pills with correct colour logic + live clock
6. MetricsRow shows 6 cards with sparklines
7. NavigationRail expands on hover
8. `/pipeline` shows 7-column board with 200 tasks
9. Pipeline bottleneck indicators correct
10. AlertFeed shows 50 alerts newest-first with severity colours
11. New alerts animate in with amber flash
12. Design system fully applied: scanlines, grid, glass, neon
13. Text legible at 50" 4K at 3m distance (min 14px body, 20px+ for data)
14. Dark theme only, no light mode
15. Stagger cascade on grid load
16. TypeScript strict mode, zero errors

**Commit:**

```bash
git commit -m "feat: MVP acceptance criteria verified — all 16 checks pass"
```
