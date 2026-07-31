import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Bot, ChevronDown, Globe } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useT, useLang } from '../theme/LanguageContext';
import { fetchAlertResolutions, fetchRobotAlerts, listRobots } from '../services/api';
import type { Robot } from '../types/contract';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  title: string;
  activeRobotId?: string;
  onMenu?: () => void;
  showLogout?: boolean;
  showTitle?: boolean;
}

// Top bar: robot-scope selector (when inside a robot section) or the page
// title, current user, and a right-hand cluster of language/theme/notifications/
// account controls. `showLogout` keeps a Logout button here for pages rendered
// outside AppShell's sidebar (see Fleet.tsx) — AppShell pages get it from the
// sidebar footer instead and pass showLogout={false}. `showTitle` is off for
// AppShell pages with no robot scope (Gestion/Paramètres) since they already
// render their own in-page header; Fleet (standalone) keeps it as its only heading.
export function TopBar({ title, activeRobotId, onMenu, showLogout = true, showTitle = true }: Props) {
  const { user, logout } = useAuth();
  const { lang, setLang } = useLang();
  const t = useT();
  const navigate = useNavigate();
  const [robots, setRobots] = useState<Robot[]>([]);
  const [openAlerts, setOpenAlerts] = useState(0);

  useEffect(() => {
    if (activeRobotId) listRobots().then(setRobots).catch(() => setRobots([]));
  }, [activeRobotId]);

  useEffect(() => {
    if (!activeRobotId) {
      setOpenAlerts(0);
      return;
    }
    let live = true;
    Promise.all([fetchRobotAlerts(activeRobotId), fetchAlertResolutions()])
      .then(([alerts, res]) => {
        if (!live) return;
        const statusOf = (id: string): 'open' | 'resolved' | 'unresolved' => res[id]?.status ?? 'open';
        setOpenAlerts(alerts.filter((a) => statusOf(a.id) === 'open').length);
      })
      .catch(() => live && setOpenAlerts(0));
    return () => {
      live = false;
    };
  }, [activeRobotId]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // swap the robot id in the current path, keep the section (dashboard/statistiques/...)
  const onRobotChange = (rid: string) => {
    const parts = window.location.pathname.split('/');
    const idx = parts.indexOf('robots');
    if (idx !== -1 && parts[idx + 1]) {
      parts[idx + 1] = rid;
      navigate(parts.join('/'));
    }
  };

  const initials = (user?.name ?? '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center gap-4 border-b border-border bg-bg px-5">
      {onMenu && (
        <button
          type="button"
          onClick={onMenu}
          aria-label={t('shell.openMenu')}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-btn border border-border text-muted hover:text-text lg:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
      )}

      {activeRobotId ? (
        <div className="relative shrink-0">
          <Bot size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
          <select
            value={activeRobotId}
            onChange={(e) => onRobotChange(e.target.value)}
            className="appearance-none rounded-btn border border-border bg-surface-2 py-2 pl-8 pr-8 text-sm font-medium outline-none focus:border-accent"
          >
            {robots.map((r) => (
              <option key={r.id} value={r.id}>
                {`${t('nav.robot')} (${r.id})`}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted" />
        </div>
      ) : showTitle ? (
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
      ) : null}

      <div className="ml-auto flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}
          className="flex items-center gap-1.5 rounded-btn px-2.5 py-2 text-xs font-medium text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <Globe size={16} />
          {lang.toUpperCase()}
        </button>
        <ThemeToggle bare />
        <button
          type="button"
          aria-label={t('topbar.notifications')}
          className="relative grid h-11 w-11 place-items-center rounded-btn text-muted transition-colors hover:bg-surface-2 hover:text-text"
        >
          <Bell size={18} strokeWidth={1.8} />
          {openAlerts > 0 && (
            <span className="absolute right-1.5 top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-bold leading-none text-white">
              {openAlerts}
            </span>
          )}
        </button>
        {user && (
          <div className="ml-1 flex items-center gap-2 pl-1">
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-accent text-xs font-bold text-[#04201d]">
              {initials}
            </span>
            <span className="hidden text-xs text-muted md:inline">{user.email}</span>
          </div>
        )}
        {showLogout && user && (
          <button
            type="button"
            onClick={handleLogout}
            className="ml-1 flex items-center gap-2 rounded-btn px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {t('topbar.logout')}
          </button>
        )}
      </div>
    </header>
  );
}
