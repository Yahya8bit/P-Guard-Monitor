import { useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { changePassword } from '../services/api';
import { useT } from '../theme/LanguageContext';
import type { Role } from '../types/contract';

// Page-local card shell — deliberately not the shared <Section> component:
// this page needs no border-radius/shadow/heading-size tuned for its own spec
// (12px radius, no shadow, 16px heading) without touching every other page
// that uses <Section>.
function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="rounded-[12px] border border-border bg-surface p-6">
      <h2 className="text-[16px] font-semibold">{title}</h2>
      {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export default function Parametres() {
  const { user } = useAuth();
  const t = useT();

  const ROLE_LABEL: Record<Role, string> = {
    superadmin: t('settings.role.superadmin'),
    admin:      t('settings.role.admin'),
    client:     t('settings.role.client'),
  };

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t('title.parametres')}</h1>
        <p className="mt-1 text-sm text-muted">{t('settings.header.subtitle')}</p>
      </div>

      <div className="flex flex-col gap-5">
        <Card title={t('settings.identity.title')} subtitle={t('settings.identity.subtitle')}>
          {user && (
            <dl className="flex flex-col gap-3.5">
              {([
                [t('settings.account.name'),   user.name],
                [t('settings.account.email'),  user.email],
                [t('settings.account.role'),   ROLE_LABEL[user.role]],
                [t('settings.account.tenant'), user.id],
              ] as [string, string][]).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <dt className="text-muted">{k}</dt>
                  <dd className="font-semibold text-text">{v}</dd>
                </div>
              ))}
            </dl>
          )}
        </Card>

        <Card title={t('settings.pwd.title')} subtitle={t('settings.pwd.subtitle')}>
          <PasswordForm />
        </Card>
      </div>
    </div>
  );
}

const fieldCls = 'w-[385px] max-w-full rounded-[8px] border border-border bg-surface-2 px-3 text-sm outline-none focus:border-accent';
const labelCls = 'mb-2 block text-sm font-semibold';

// Always-visible password-change form (own card, not a click-to-expand row).
function PasswordForm() {
  const t = useT();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (next !== confirm) {
      setError(t('settings.pwd.mismatch'));
      return;
    }
    setBusy(true);
    try {
      await changePassword(current, next);
      setCurrent('');
      setNext('');
      setConfirm('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('mgmt.form.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div>
        <label className={labelCls} htmlFor="pwd-current">{t('settings.pwd.current')}</label>
        <input
          id="pwd-current"
          type="password"
          required
          autoComplete="current-password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className={`${fieldCls} h-[38px]`}
        />
      </div>
      <div>
        <label className={labelCls} htmlFor="pwd-new">{t('settings.pwd.new')}</label>
        <input
          id="pwd-new"
          type="password"
          required
          autoComplete="new-password"
          value={next}
          onChange={(e) => setNext(e.target.value)}
          className={`${fieldCls} h-[38px]`}
        />
      </div>
      <div>
        <label className={labelCls} htmlFor="pwd-confirm">{t('settings.pwd.confirm')}</label>
        <input
          id="pwd-confirm"
          type="password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className={`${fieldCls} h-[38px]`}
        />
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      {success && <p className="text-xs text-success">{t('settings.pwd.success')}</p>}
      <button
        type="submit"
        disabled={busy}
        className="btn-accent h-[38px] w-fit rounded-[8px] px-4 text-sm disabled:opacity-50"
      >
        {t('settings.pwd.save')}
      </button>
    </form>
  );
}
