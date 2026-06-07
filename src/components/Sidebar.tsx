import { NavLink, useNavigate } from 'react-router-dom';
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
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const showGestion = user?.role === 'superadmin' || user?.role === 'admin';
  const showFleet = showGestion;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const linkCls = ({ isActive }: { isActive: boolean }) =>
    [
      'flex items-center gap-3 rounded-btn px-3 py-3 text-base transition-colors',
      isActive
        ? 'bg-surface-2 text-accent font-medium ring-1 ring-inset ring-border'
        : 'text-muted hover:text-text hover:bg-surface-2',
    ].join(' ');

  // REFERENCE LAYOUT (nexasverse): three vertical zones in a full-height column —
  // brand anchored top with breathing room, nav in the middle (flex-1), and the
  // user identity + Logout pinned to the bottom. Logout was moved off the top bar.
  return (
    <nav className="flex h-full flex-col p-4" aria-label="Navigation principale">
      {/* brand — clear header: 44px mark, 19px name, generous padding all round */}
      <div className="mb-8 flex items-center gap-3 px-3 pb-3 pt-4">
        <img src="/logo-transparent.png" alt="" className="h-14 w-14 object-contain" />
        <span className="text-[20px] font-semibold tracking-tight">
          P-Guard <span className="text-accent">Monitor</span>
        </span>
      </div>

      {/* nav — middle, takes the remaining height */}
      <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
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
          <NavLink key={s.key} to={`/robots/${activeRobotId}/${s.key}`} className={linkCls} onClick={onNavigate}>
            <Icon d={s.icon} />
            {s.label}
          </NavLink>
        ))}

        {showGestion && (
          <>
            <div className="px-3 pb-1 pt-3 text-[11px] uppercase tracking-wider text-muted">Administration</div>
            <NavLink to="/gestion" className={linkCls} onClick={onNavigate}>
              <Icon d="M16 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
              Gestion
            </NavLink>
          </>
        )}
      </div>

      {/* user + Logout — pinned bottom */}
      {user && (
        <div className="mt-4 border-t border-border pt-4">
          <div className="px-2 pb-3">
            <div className="text-sm font-medium leading-tight">{user.name}</div>
            <div className="text-[11px] uppercase tracking-wide text-muted">{user.role}</div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-btn px-3 py-3 text-base text-muted transition-colors hover:bg-surface-2 hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger"
          >
            <Icon d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d={d} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
