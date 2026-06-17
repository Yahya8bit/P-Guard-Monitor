import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { landingPath } from '../auth/guards';
import { LogoBadge } from '../components/LogoBadge';
import { ThemeToggle } from '../components/ThemeToggle';
import { useT } from '../theme/LanguageContext';

const ROLE_CARDS = [
  {
    role: 'Superadmin',
    email: 'ops@enova.local',
    descKey: 'login.role.superadmin.desc' as const,
    icon: 'M3 21h18M5 21V7l8-4v18M19 21V11l-6-3M9 9h.01M9 13h.01M9 17h.01',
  },
  {
    role: 'Admin',
    email: 'admin@enova.local',
    descKey: 'login.role.admin.desc' as const,
    icon: 'M12 2l8 4v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z',
  },
  {
    role: 'Client',
    email: 'client@site.tn',
    descKey: 'login.role.client.desc' as const,
    icon: 'M16 21v-2a4 4 0 00-8 0v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  },
];

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const t = useT();
  const [email, setEmail] = useState('ops@enova.local');
  const [password, setPassword] = useState('demo');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const doLogin = async (mail: string, pass: string) => {
    setBusy(true);
    setError(null);
    try {
      const user = await login(mail, pass);
      navigate(landingPath(user), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('login.error'));
    } finally {
      setBusy(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    doLogin(email, password);
  };

  // role card click: prefill the fields (so they're visible) AND sign in
  const pickRole = (mail: string) => {
    setEmail(mail);
    setPassword('demo');
    doLogin(mail, 'demo');
  };

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* LEFT — branded image panel (top banner on narrow, 55% on wide).
          login-bg gradient sits behind as a fallback if the image fails. */}
      <aside className="login-bg relative h-44 shrink-0 overflow-hidden lg:h-auto lg:w-[55%]">
        <img
          src="/robot-hero.webp"
          alt=""
          loading="eager"
          fetchPriority="high"
          style={{ backgroundImage: 'url("data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDABALDA4MChAODQ4SERATGCgaGBYWGDEjJR0oOjM9PDkzODdASFxOQERXRTc4UG1RV19iZ2hnPk1xeXBkeFxlZ2P/2wBDARESEhgVGC8aGi9jQjhCY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2NjY2P/wAARCAAKAAoDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDNgfTr5Y4bhPJKRHDp2HTJ9eatDw/pBHFxOR6huD+lcx2H0rQSeYIoEsmMf3jTdNX3MpVmlsj/2Q==")', backgroundSize: 'cover', filter: 'blur(0)' }}
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* subtle extra darkening for text legibility (image has a baked gradient) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/15 to-black/30" />
        {/* soft top-left scrim that fades to transparent — no hard edges, just
            enough to anchor the brand over the bright water */}
        <div className="pointer-events-none absolute left-0 top-0 h-48 w-2/3 bg-gradient-to-br from-black/45 via-black/10 to-transparent" />

        {/* top-left brand — no box; legibility from soft drop/text-shadow */}
        <div className="absolute left-6 top-6 flex items-center gap-4">
          <LogoBadge sizeClass="h-14 w-14" mode="always" />
          <span className="text-[28px] font-semibold tracking-tight text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.75)]">
            P-Guard <span className="text-accent">Monitor</span>
          </span>
        </div>

        {/* bottom-left headline (hidden on the short narrow banner) */}
        <div className="absolute bottom-8 left-6 right-6 hidden max-w-xl lg:block">
          <h2 className="text-3xl font-semibold leading-tight tracking-tight text-white">
            {t('login.headline')}
          </h2>
          <p className="mt-3 text-base text-white/80">
            {t('login.tagline')}
          </p>
        </div>
      </aside>

      {/* RIGHT — form panel */}
      <main className="relative flex flex-1 items-center justify-center bg-bg p-6 sm:p-10">
        <div className="absolute right-4 top-4">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-sm">
          <h1 className="text-2xl font-semibold tracking-tight">{t('login.title')}</h1>
          <p className="mt-1 text-sm text-muted">{t('login.subtitle')}</p>

          <form onSubmit={submit} className="mt-6">
            <label className="mb-1 block text-sm text-muted" htmlFor="email">
              {t('login.email')}
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              className="mb-4 w-full rounded-btn border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent focus-visible:ring-1 focus-visible:ring-accent"
            />

            <label className="mb-1 block text-sm text-muted" htmlFor="password">
              {t('login.password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="mb-4 w-full rounded-btn border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent focus-visible:ring-1 focus-visible:ring-accent"
            />

            {error && (
              <p className="mb-4 rounded-btn border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}

            <button type="submit" disabled={busy} className="btn-accent w-full px-4 py-2.5 disabled:opacity-60">
              {busy ? t('login.submitting') : t('login.submit')}
            </button>
          </form>

          <div className="mt-6">
            <p className="mb-2 text-xs text-muted">
              {t('login.demoHint')}
            </p>
            <div className="flex flex-col gap-2">
              {ROLE_CARDS.map((r) => (
                <button
                  key={r.email}
                  type="button"
                  disabled={busy}
                  onClick={() => pickRole(r.email)}
                  className="surface-card flex items-center gap-3 p-3 text-left transition-colors hover:border-accent disabled:opacity-60"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-btn bg-surface-2 text-accent">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                      <path d={r.icon} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{r.role}</span>
                    <span className="block truncate text-xs text-muted">{t(r.descKey)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
