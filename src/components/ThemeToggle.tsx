import { useTheme } from '../theme/ThemeContext';

// Top-bar theme switch. Persisted via ThemeContext (localStorage pguard-theme).
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Passer en thème clair' : 'Passer en thème sombre'}
      title={isDark ? 'Thème clair' : 'Thème sombre'}
      className="grid h-11 w-11 place-items-center rounded-btn border border-border bg-surface-2 text-muted transition-colors hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent active:translate-y-px"
    >
      {isDark ? (
        // sun
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
        </svg>
      ) : (
        // moon
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />
        </svg>
      )}
    </button>
  );
}
