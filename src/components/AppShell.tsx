import { useState } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ErrorBoundary } from './ErrorBoundary';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

// Human title per route section (last path segment).
const TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  statistiques: 'Statistiques',
  alertes: 'Alertes',
  rapports: 'Rapports',
  parametres: 'Paramètres',
  gestion: 'Gestion',
};

// Persistent shell: left sidebar (collapsible under lg) + sticky top bar + the
// routed page in <Outlet>. Used by every authenticated robot/admin page.
export function AppShell() {
  const { user } = useAuth();
  const { id } = useParams();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Sidebar's robot-scoped links need an id even on /gestion — fall back to the
  // user's first accessible robot.
  const activeRobotId = id ?? user?.assignedRobotIds[0] ?? '';
  const section = location.pathname.split('/').filter(Boolean).pop() ?? 'dashboard';
  const title = TITLES[section] ?? 'Dashboard';

  return (
    // h-screen + overflow-hidden locks the shell to exactly one viewport so the
    // content area below the top bar can be a fixed-height flex column (no body
    // scroll); the dashboard relies on this to flex its chart into place.
    <div className="flex h-screen overflow-hidden">
      {/* desktop sidebar */}
      {/* SCALE-UP: sidebar widened 240px -> 280px */}
      <aside className="hidden w-[280px] shrink-0 border-r border-border bg-surface lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <Sidebar activeRobotId={activeRobotId} />
        </div>
      </aside>

      {/* mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-border bg-surface">
            <Sidebar activeRobotId={activeRobotId} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} onMenu={() => setDrawerOpen(true)} />
        {/* flex-1 fills the height under the top bar; min-h-0 lets inner flex
            children shrink; content scrolls here if it exceeds the viewport. */}
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
