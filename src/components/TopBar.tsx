import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  title: string;
  onMenu?: () => void;
}

export function TopBar({ title, onMenu }: Props) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  // SCALE-UP: top bar 56px -> 72px
  return (
    <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b border-border bg-bg/80 px-5 backdrop-blur">
      {onMenu && (
        <button
          type="button"
          onClick={onMenu}
          aria-label="Ouvrir le menu"
          className="grid h-9 w-9 place-items-center rounded-btn border border-border text-muted hover:text-text lg:hidden"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18M3 12h18M3 18h18" strokeLinecap="round" />
          </svg>
        </button>
      )}
      {/* SCALE-UP: page title 26px; user block + logout scaled to match */}
      <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>

      <div className="ml-auto flex items-center gap-4">
        <ThemeToggle />
        {user && (
          <div className="flex items-center gap-4">
            <div className="hidden text-right sm:block">
              <div className="text-base font-medium leading-tight">{user.name}</div>
              <div className="text-xs uppercase tracking-wide text-muted">{user.role}</div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-btn border border-border px-4 py-2 text-base text-muted transition-colors hover:border-danger hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger"
            >
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
