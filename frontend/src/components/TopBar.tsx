import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useT } from '../theme/LanguageContext';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  title: string;
  onMenu?: () => void;
  showLogout?: boolean;
}

// Top bar = page title + theme toggle (+ Logout on sidebar-less pages). Pages
// inside AppShell already expose Logout in the sidebar, so they pass
// showLogout={false}; standalone pages like Fleet keep it here so logout stays
// reachable even with zero accessible robots.
export function TopBar({ title, onMenu, showLogout = true }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-border bg-bg/80 px-5 backdrop-blur">
      {onMenu && (
        <button
          type="button"
          onClick={onMenu}
          aria-label={t('shell.openMenu')}
          className="grid h-9 w-9 place-items-center rounded-btn border border-border text-muted hover:text-text lg:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
      )}
      <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>

      <div className="ml-auto flex items-center gap-4">
        <ThemeToggle />
        {showLogout && user && (
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 rounded-btn px-3 py-2 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger"
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
