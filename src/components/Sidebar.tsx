import { NavLink } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

// Robot-scoped sections + the global Gestion link. `Gestion` is removed from
// the list entirely for clients (not just hidden) — the route guard backs this.
const SECTIONS = [
  { key: 'dashboard', label: 'Dashboard', icon: 'M3 13h8V3H3zM13 21h8V11h-8zM13 3v6h8V3zM3 21h8v-6H3z' },
  { key: 'statistiques', label: 'Statistiques', icon: 'M4 20V10M10 20V4M16 20v-8M22 20H2' },
  { key: 'alertes', label: 'Alertes', icon: 'M12 3l9 16H3zM12 10v4M12 17h.01' },
  { key: 'rapports', label: 'Rapports', icon: 'M7 3h7l5 5v13H7zM14 3v5h5M9 13h8M9 17h8' },
  { key: 'parametres', label: 'Paramètres', icon: 'M12 9a3 3 0 100 6 3 3 0 000-6zM19 12l2 1-2 4-2-1M5 12l-2 1 2 4 2-1' },
] as const;

interface Props {
  activeRobotId: string;
  onNavigate?: () => void;
}

export function Sidebar({ activeRobotId, onNavigate }: Props) {
  const { user } = useAuth();
  const showGestion = user?.role === 'superadmin' || user?.role === 'admin';
  const showFleet = showGestion;

  // SCALE-UP: nav rows ~16px text, 14px vertical padding (py-3.5) so the nav
  // feels substantial; icons bumped to 22px in the Icon component below.
  const linkCls = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-3 rounded-btn px-3 py-3.5 text-base transition-colors',
      isActive
        ? 'bg-surface-2 text-accent font-medium ring-1 ring-inset ring-border'
        : 'text-muted hover:text-text hover:bg-surface-2',
    ].join(' ');

  return (
    <nav className="flex h-full flex-col gap-1 p-3" aria-label="Navigation principale">
      {/* SCALE-UP: logo mark 40px, wordmark 18px */}
      <div className="mb-3 flex items-center gap-3 px-2 py-1">
        <img src="/logo.png" alt="" className="h-10 w-10 rounded" />
        <span className="text-[18px] font-semibold tracking-tight">P-Guard Monitor</span>
      </div>

      {showFleet && (
        <NavLink to="/fleet" className={linkCls} onClick={onNavigate} end>
          <Icon d="M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7" />
          Flotte
        </NavLink>
      )}

      <div className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-wider text-muted">
        Robot {activeRobotId}
      </div>
      {SECTIONS.map((s) => (
        <NavLink
          key={s.key}
          to={`/robots/${activeRobotId}/${s.key}`}
          className={linkCls}
          onClick={onNavigate}
        >
          <Icon d={s.icon} />
          {s.label}
        </NavLink>
      ))}

      {showGestion && (
        <>
          <div className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-wider text-muted">
            Administration
          </div>
          <NavLink to="/gestion" className={linkCls} onClick={onNavigate}>
            <Icon d="M16 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
            Gestion
          </NavLink>
        </>
      )}
    </nav>
  );
}

function Icon({ d }: { d: string }) {
  // SCALE-UP: nav icons 18px -> 22px
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
