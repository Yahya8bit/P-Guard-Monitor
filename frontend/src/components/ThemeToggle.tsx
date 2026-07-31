import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

// Theme switch. Persisted via ThemeContext (localStorage pguard-theme).
// `bare` drops the bordered/filled box (used in the TopBar, which already has
// its own icon-row treatment) — the boxed default stays for places like Login
// where it needs contrast against a background image.
export function ThemeToggle({ bare = false }: { bare?: boolean } = {}) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? 'Passer en thème clair' : 'Passer en thème sombre'}
      title={isDark ? 'Thème clair' : 'Thème sombre'}
      className={[
        'grid h-11 w-11 place-items-center rounded-md p-2 transition-colors hover:text-accent',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent active:translate-y-px',
        bare ? 'text-muted' : ['border', isDark ? 'border-surface-2 bg-surface-2 text-text' : 'border-surface-2 bg-surface text-text/70'].join(' '),
      ].join(' ')}
    >
      {isDark ? <Sun size={20} strokeWidth={1.8} /> : <Moon size={20} strokeWidth={1.8} />}
    </button>
  );
}
