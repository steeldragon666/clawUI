import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { FleetView } from './pages/FleetView';
import { PipelineView } from './pages/PipelineView';
import { CalendarView } from './pages/CalendarView';
import { ClientsView } from './pages/ClientsView';
import { CostsView } from './pages/CostsView';
import { AnalyticsView } from './pages/AnalyticsView';
import { ApprovalsView } from './pages/ApprovalsView';
import { PublishView } from './pages/PublishView';
import { GuardrailsView } from './pages/GuardrailsView';
import { HypervisorView } from './pages/HypervisorView';
import { IntelligenceView } from './pages/IntelligenceView';
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
          <Route path="/costs" element={<CostsView />} />
          <Route path="/analytics" element={<AnalyticsView />} />
          <Route path="/approvals" element={<ApprovalsView />} />
          <Route path="/publish" element={<PublishView />} />
          <Route path="/guardrails" element={<GuardrailsView />} />
          <Route path="/hypervisor" element={<HypervisorView />} />
          <Route path="/intelligence" element={<IntelligenceView />} />
          <Route path="/settings" element={<SettingsView />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
