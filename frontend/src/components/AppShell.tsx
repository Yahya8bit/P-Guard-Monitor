import { useState } from 'react';
import { Outlet, useLocation, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useT } from '../theme/LanguageContext';
import type { TKey } from '../theme/translations';
import { ErrorBoundary } from './ErrorBoundary';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';

const TITLE_KEYS: Record<string, TKey> = {
  dashboard:    'title.dashboard',
  statistiques: 'title.statistiques',
  alertes:      'title.alertes',
  rapports:     'title.rapports',
  parametres:   'title.parametres',
  gestion:      'title.gestion',
};

export function AppShell() {
  const { user } = useAuth();
  const { id } = useParams();
  const location = useLocation();
  const t = useT();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const activeRobotId = id ?? user?.assignedRobotIds[0] ?? '';
  const section = location.pathname.split('/').filter(Boolean).pop() ?? 'dashboard';
  const titleKey = TITLE_KEYS[section] ?? 'title.dashboard';
  const title = t(titleKey);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-[280px] shrink-0 border-r border-border bg-surface lg:block">
        <div className="sticky top-0 h-screen overflow-y-auto">
          <Sidebar activeRobotId={activeRobotId} />
        </div>
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setDrawerOpen(false)} />
          <aside className="absolute left-0 top-0 h-full w-64 border-r border-border bg-surface">
            <Sidebar activeRobotId={activeRobotId} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar title={title} onMenu={() => setDrawerOpen(true)} showLogout={false} />
        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
