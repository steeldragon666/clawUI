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
