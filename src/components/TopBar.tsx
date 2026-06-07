import { ThemeToggle } from './ThemeToggle';

interface Props {
  title: string;
  onMenu?: () => void;
}

// Top bar = page title + theme toggle only. User identity + Logout now live at
// the bottom of the sidebar (reference layout).
export function TopBar({ title, onMenu }: Props) {
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
      <h1 className="text-[26px] font-semibold tracking-tight">{title}</h1>

      <div className="ml-auto flex items-center gap-4">
        <ThemeToggle />
      </div>
    </header>
  );
}
