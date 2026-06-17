import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Section } from '../components/stats/Section';
import { useT } from '../theme/LanguageContext';
import { useTheme } from '../theme/ThemeContext';
import { useLang } from '../theme/LanguageContext';
import type { Role } from '../types/contract';

export function Parametres() {
  const { theme, toggle } = useTheme();
  const { lang, setLang } = useLang();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const t = useT();

  const ROLE_LABEL: Record<Role, string> = {
    superadmin: t('settings.role.superadmin'),
    admin:      t('settings.role.admin'),
    client:     t('settings.role.client'),
  };

  const PLACEHOLDERS = [
    { label: t('settings.notif.password'),  desc: t('settings.notif.password.desc') },
    { label: t('settings.notif.notifs'),    desc: t('settings.notif.notifs.desc') },
    { label: t('settings.notif.sessions'),  desc: t('settings.notif.sessions.desc') },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Section title={t('settings.appearance.title')} subtitle={t('settings.appearance.subtitle')}>
        <div className="flex items-center justify-between gap-4 py-2">
          <div>
            <div className="text-sm font-medium">{t('settings.theme.label')}</div>
            <div className="text-xs text-muted">{t('settings.theme.desc')}</div>
          </div>
          <div className="flex gap-1 rounded-btn border border-border p-0.5">
            <button
              onClick={() => theme !== 'light' && toggle()}
              className={[
                'rounded-[6px] px-3 py-1.5 text-sm transition-colors',
                theme === 'light' ? 'bg-accent font-medium text-[#04201d]' : 'text-muted hover:text-text',
              ].join(' ')}
            >
              {t('settings.theme.light')}
            </button>
            <button
              onClick={() => theme !== 'dark' && toggle()}
              className={[
                'rounded-[6px] px-3 py-1.5 text-sm transition-colors',
                theme === 'dark' ? 'bg-accent font-medium text-[#04201d]' : 'text-muted hover:text-text',
              ].join(' ')}
            >
              {t('settings.theme.dark')}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-border py-2 pt-3">
          <div>
            <div className="text-sm font-medium">{t('settings.lang.label')}</div>
            <div className="text-xs text-muted">{t('settings.lang.desc')}</div>
          </div>
          <div className="flex gap-1 rounded-btn border border-border p-0.5">
            {([['fr', 'Français'], ['en', 'English']] as const).map(([key, label]) => (
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

      <Section title={t('settings.account.title')} subtitle={t('settings.account.subtitle')}>
        {user && (
          <dl className="divide-y divide-border">
            {([
              [t('settings.account.name'),  user.name],
              [t('settings.account.email'), user.email],
              [t('settings.account.role'),  ROLE_LABEL[user.role]],
            ] as [string, string][]).map(([k, v]) => (
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
          {t('settings.account.logout')}
        </button>
      </Section>

      <Section title={t('settings.notif.title')} subtitle={t('settings.notif.subtitle')}>
        <ul className="divide-y divide-border">
          {PLACEHOLDERS.map((p) => (
            <li key={p.label} className="flex items-center justify-between gap-4 py-3 opacity-60">
              <div>
                <div className="text-sm font-medium">{p.label}</div>
                <div className="text-xs text-muted">{p.desc}</div>
              </div>
              <span className="shrink-0 rounded-full border border-border px-2.5 py-1 text-[11px] text-muted">
                {t('settings.notif.coming')}
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
