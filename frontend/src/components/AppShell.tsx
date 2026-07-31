import { useEffect, useRef, useState } from 'react';
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
  const mainRef = useRef<HTMLElement>(null);

  // Reset scroll on every navigation — without this the new page fades in at
  // whatever scroll offset the previous page was left at, which reads as a
  // jump/glitch no matter how smooth the fade itself is.
  useEffect(() => {
    mainRef.current?.scrollTo(0, 0);
  }, [location.pathname]);

  const activeRobotId = id ?? user?.assignedRobotIds[0] ?? '';
  const section = location.pathname.split('/').filter(Boolean).pop() ?? 'dashboard';
  const titleKey = TITLE_KEYS[section] ?? 'title.dashboard';
  const title = t(titleKey);

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="hidden w-[300px] shrink-0 border-r border-border bg-surface lg:block">
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
        <TopBar
          title={title}
          activeRobotId={id ? activeRobotId : undefined}
          onMenu={() => setDrawerOpen(true)}
          showLogout={false}
          showTitle={false}
        />
        <main ref={mainRef} className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6">
          <ErrorBoundary>
            {/* keyed by path so each page navigation eases in */}
            <div key={location.pathname} className="page-fade">
              <Outlet />
            </div>
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
