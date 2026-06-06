import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { landingPath } from '../auth/guards';
import { ThemeToggle } from '../components/ThemeToggle';

const DEMO = [
  { email: 'ops@enova.local', role: 'Superadmin — toute la flotte' },
  { email: 'admin@enova.local', role: 'Admin — robots assignés' },
  { email: 'client@site.tn', role: 'Client — un robot' },
];

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('ops@enova.local');
  const [password, setPassword] = useState('demo');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const user = await login(email, password);
      navigate(landingPath(user), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Échec de connexion');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-screen place-items-center p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <img src="/logo.png" alt="P-Guard" className="mb-3 h-12 w-12 rounded-card" />
          <h1 className="text-2xl">P-Guard Monitor</h1>
          <p className="mt-1 text-sm text-muted">Supervision de la flotte de patrouille</p>
        </div>

        <form onSubmit={submit} className="surface-card p-6">
          <label className="mb-1 block text-sm text-muted" htmlFor="email">
            Email
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
            Mot de passe
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
            {busy ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>

        <div className="mt-4 text-center text-xs text-muted">
          <p className="mb-2">Comptes démo (mot de passe&nbsp;: <code className="text-text">demo</code>)</p>
          <div className="flex flex-col gap-1.5">
            {DEMO.map((d) => (
              <button
                key={d.email}
                type="button"
                onClick={() => {
                  setEmail(d.email);
                  setPassword('demo');
                }}
                className="rounded-btn border border-border px-3 py-1.5 text-left transition-colors hover:border-accent hover:text-text"
              >
                <span className="font-medium text-text">{d.email}</span> — {d.role}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
