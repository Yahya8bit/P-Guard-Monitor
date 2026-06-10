import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Section } from '../components/stats/Section';
import { useTheme } from '../theme/ThemeContext';
import { useLang } from '../theme/LanguageContext';
import type { Role } from '../types/contract';

const ROLE_LABEL: Record<Role, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  client: 'Client',
};

// Backend-dependent settings — shown disabled with an honest "à venir" note,
// never faked with forms that don't save.
const PLACEHOLDERS = [
  { label: 'Changer le mot de passe', desc: 'Mise à jour des identifiants' },
  { label: 'Préférences de notification', desc: 'E-mail / push par type d’alerte' },
  { label: 'Sessions & appareils', desc: 'Révoquer les sessions actives' },
];

export function Parametres() {
  const { theme, toggle } = useTheme(); // LIVE: real app theme
  const { lang, setLang } = useLang(); // LIVE: UI language (FR / EN)
  const { user, logout } = useAuth(); // LIVE: mock auth user
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {/* 1. Apparence — LIVE theme toggle + fixed language */}
      <Section title="Apparence" subtitle="Préférences d’affichage">
        <div className="flex items-center justify-between gap-4 py-2">
          <div>
            <div className="text-sm font-medium">Thème</div>
            <div className="text-xs text-muted">Clair ou sombre</div>
          </div>
          {/* wired to the existing ThemeContext — flips the whole app */}
          <div className="flex gap-1 rounded-btn border border-border p-0.5">
            <button
              onClick={() => theme !== 'light' && toggle()}
              className={[
                'rounded-[6px] px-3 py-1.5 text-sm transition-colors',
                theme === 'light' ? 'bg-accent font-medium text-[#04201d]' : 'text-muted hover:text-text',
              ].join(' ')}
            >
              Clair
            </button>
            <button
              onClick={() => theme !== 'dark' && toggle()}
              className={[
                'rounded-[6px] px-3 py-1.5 text-sm transition-colors',
                theme === 'dark' ? 'bg-accent font-medium text-[#04201d]' : 'text-muted hover:text-text',
              ].join(' ')}
            >
              Sombre
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border py-2 pt-3">
          <div>
            <div className="text-sm font-medium">Langue</div>
            <div className="text-xs text-muted">Français ou English</div>
          </div>
          {/* LIVE language switch (persisted) */}
          <div className="flex gap-1 rounded-btn border border-border p-0.5">
            {([
              ['fr', 'Français'],
              ['en', 'English'],
            ] as const).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setLang(key)}
                className={[
                  'rounded-[6px] px-3 py-1.5 text-sm transition-colors',
                  lang === key ? 'bg-accent font-medium text-[#04201d]' : 'text-muted hover:text-text',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </Section>

      {/* 2. Compte — read-only from the mock auth user */}
      <Section title="Compte" subtitle="Informations de connexion">
        {user && (
          <dl className="divide-y divide-border">
            {[
              ['Nom', user.name],
              ['E-mail', user.email],
              ['Rôle', ROLE_LABEL[user.role]],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-2.5 text-sm">
                <dt className="text-muted">{k}</dt>
                <dd className="font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="mt-4 rounded-btn border border-border px-4 py-2 text-sm text-muted transition-colors hover:border-danger hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-danger"
        >
          Se déconnecter
        </button>
      </Section>

      {/* 3. Notifications & sécurité — placeholders (need backend) */}
      <Section title="Notifications & sécurité" subtitle="Nécessite un backend (à venir)">
        <ul className="divide-y divide-border">
          {PLACEHOLDERS.map((p) => (
            <li key={p.label} className="flex items-center justify-between gap-4 py-3 opacity-60">
              <div>
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-xs text-muted">{p.desc}</div>
              </div>
              <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted">
                à venir · nécessite le backend
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
