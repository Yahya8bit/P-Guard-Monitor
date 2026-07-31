import { NavLink, useNavigate } from 'react-router-dom';
import { Bot, ChartNoAxesColumnDecreasing, FileText, LogOut, Settings, TriangleAlert, User as UserIcon, House } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useT } from '../theme/LanguageContext';
import { LogoBadge } from './LogoBadge';

const SECTION_KEYS = [
  { key: 'dashboard',    tKey: 'nav.dashboard',    icon: House },
  { key: 'statistiques', tKey: 'nav.statistiques', icon: ChartNoAxesColumnDecreasing },
  { key: 'alertes',      tKey: 'nav.alertes',      icon: TriangleAlert },
  { key: 'rapports',     tKey: 'nav.rapports',     icon: FileText },
] as const;

interface Props {
  activeRobotId: string;
  onNavigate?: () => void;
}

export function Sidebar({ activeRobotId, onNavigate }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const showFleet = user?.role === 'superadmin' || user?.role === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // active = fully filled accent rectangle, dark text/icon on it
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    [
      'ml-5 mb-1 flex h-11 w-[85%] items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium transition-colors',
      isActive ? 'bg-accent text-[#04201d]' : 'text-text/80 hover:text-text hover:bg-surface-2',
    ].join(' ');

  const sectionLabelCls = 'ml-5 mb-1 mt-6 text-[10px] font-medium uppercase tracking-wider text-muted';

  return (
    <nav className="flex h-full flex-col p-4" aria-label="Navigation principale">
      {/* logo in a bordered card */}
      <div className="mb-3 flex items-center gap-3 rounded-[10px] border border-border bg-surface-2/50 p-3">
        <LogoBadge sizeClass="h-11 w-11" mode="auto" />
        <span className="text-lg font-semibold leading-tight tracking-tight">
          P-Guard <span className="text-accent">Monitor</span>
        </span>
      </div>

      {/* brand row: status dot + P-GUARD, MONITOR pill */}
      <div className="mb-4 flex items-center justify-between px-1">
        <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
          <span className="h-1.5 w-1.5 rounded-full bg-accent" />
          P-Guard
        </span>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
          Monitor
        </span>
      </div>

      <div className="flex flex-1 flex-col overflow-y-auto">
        {showFleet && (
          <NavLink to="/fleet" className={linkCls} onClick={onNavigate} end>
            <Bot size={18} />
            {t('nav.fleet')}
          </NavLink>
        )}

        <div className={sectionLabelCls}>
          {t('nav.robot')} {activeRobotId}
        </div>
        {SECTION_KEYS.map((s) => (
          <NavLink key={s.key} to={`/robots/${activeRobotId}/${s.key}`} className={linkCls} onClick={onNavigate}>
            <s.icon size={18} />
            {t(s.tKey)}
          </NavLink>
        ))}

        <div className={sectionLabelCls}>
          {t('nav.administration')}
        </div>
        {showFleet && (
          <NavLink to="/gestion" className={linkCls} onClick={onNavigate}>
            <UserIcon size={18} />
            {t('nav.gestion')}
          </NavLink>
        )}
        <NavLink to="/parametres" className={linkCls} onClick={onNavigate}>
          <Settings size={18} />
          {t('nav.parametres')}
        </NavLink>
      </div>

      {user && (
        <div className="mt-3">
          <div className="px-3 pb-2">
            <div className="text-sm font-medium leading-tight">{user.name}</div>
            <div className="text-[11px] uppercase tracking-wide text-muted">{user.role}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="ml-5 flex h-11 w-[85%] items-center gap-3 rounded-[10px] px-3 text-[15px] font-medium text-text/80 transition-colors hover:bg-surface-2 hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger"
          >
            <LogOut size={18} />
            {t('topbar.logout')}
          </button>
        </div>
      )}
    </nav>
  );
}
