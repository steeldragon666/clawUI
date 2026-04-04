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
