import { PanelFrame } from '../components/layout/PanelFrame';
import { AgentGrid } from '../components/dashboard/AgentGrid';
import { AlertFeed } from '../components/dashboard/AlertFeed';
import { MetricsRow } from '../components/dashboard/MetricsRow';
import { ScheduleTimeline } from '../components/dashboard/ScheduleTimeline';

export function FleetView() {
  return (
    <div className="h-full flex flex-col gap-1 p-1 min-h-0">
      {/* Top 55%: Agent grid (70%) + Alert feed (30%) */}
      <div className="flex-[55] grid grid-cols-[7fr_3fr] gap-1 min-h-0">
        <PanelFrame title="Live Agent Fleet" className="border-neon-cyan/20">
          <AgentGrid />
        </PanelFrame>

        <PanelFrame title="Alert Feed" className="border-neon-magenta/20">
          <AlertFeed />
        </PanelFrame>
      </div>

      {/* Middle: Schedule Timeline (full width, ~140px) */}
      <div className="shrink-0">
        <ScheduleTimeline />
      </div>

      {/* Bottom: MetricsRow — 6 metric cards */}
      <div className="shrink-0 p-1">
        <MetricsRow />
      </div>
    </div>
  );
}
