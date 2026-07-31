import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Users, UserPlus } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { Section } from '../components/stats/Section';
import { useT } from '../theme/LanguageContext';
import {
  createAdmin,
  createClientAccount,
  createClientUser,
  createRobot,
  deleteAdmin,
  deleteClient,
  fetchUsers,
  listRobots,
  setAdminAssignment,
  setClientAssignment,
} from '../services/api';
import { STATE_META } from '../lib/format';
import type { Robot, RobotState, User } from '../types/contract';

// Derive robot → owner from the user list (assignedRobotIds is the source).
const adminIdOf = (users: User[], rid: string) =>
  users.find((u) => u.role === 'admin' && u.assignedRobotIds.includes(rid))?.id ?? null;
const clientOf = (users: User[], rid: string) =>
  users.find((u) => u.role === 'client' && u.assignedRobotIds.includes(rid)) ?? null;

export default function Gestion() {
  const { user } = useAuth();
  const t = useT();
  const [users, setUsers] = useState<User[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = () => Promise.all([fetchUsers(), listRobots()]).then(([u, r]) => {
    setUsers(u);
    setRobots(r);
    setLoaded(true);
  });

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const admins = useMemo(() => users.filter((u) => u.role === 'admin'), [users]);
  const clients = useMemo(() => users.filter((u) => u.role === 'client'), [users]);

  // hold both views until users + robots arrive, so no "0 robots / 0 admins"
  // flash and no empty form lists before the fetch resolves.
  if (!loaded) return <GestionSkeleton />;

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      {/* breadcrumb + title + description, same pattern as Rapports */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            <Users size={13} />
            {t('mgmt.header.breadcrumb')}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('mgmt.header.breadcrumb')}</h1>
          <p className="mt-1 text-sm text-muted">{t('mgmt.header.subtitle')}</p>
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="flex items-center gap-2 rounded-btn border border-border px-3 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-text disabled:opacity-60"
        >
          <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          {t('reports.refresh')}
        </button>
      </div>

      {user?.role === 'superadmin' ? (
        <SuperadminView users={users} robots={robots} admins={admins} setUsers={setUsers} setRobots={setRobots} />
      ) : (
        <AdminView users={users} robots={robots} clients={clients} meId={user?.id ?? ''} setUsers={setUsers} />
      )}
    </div>
  );
}

// ── Superadmin: assign robots to admins ──────────────────────────────────────
function SuperadminView({
  users,
  robots,
  admins,
  setUsers,
  setRobots,
}: {
  users: User[];
  robots: Robot[];
  admins: User[];
  setUsers: (u: User[]) => void;
  setRobots: (r: Robot[]) => void;
}) {
  const [adminToDelete, setAdminToDelete] = useState<User | null>(null);
  const [adminToAssign, setAdminToAssign] = useState<User | null>(null);

  const handleDeleteAdmin = async () => {
    if (!adminToDelete) return;
    const updated = await deleteAdmin(adminToDelete.id);
    setUsers(updated);
    setAdminToDelete(null);
  };

  const t = useT();
  const unassigned = robots.filter((r) => adminIdOf(users, r.id) === null).length;

  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <StatBox label={t('mgmt.stat.robots')} value={robots.length} />
        <StatBox label={t('mgmt.stat.admins')} value={admins.length} />
        <StatBox label={t('mgmt.stat.unassigned')} value={unassigned} />
      </div>

      <CreationPanel onUsers={setUsers} onRobots={setRobots} />

      <Section title={t('mgmt.admins.title')} subtitle={t('mgmt.admins.subtitle')}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted">
                <th className="py-2 pr-4 font-medium">{t('mgmt.admins.col.name')}</th>
                <th className="py-2 pr-4 font-medium">{t('mgmt.admins.col.email')}</th>
                <th className="py-2 pr-4 font-medium">{t('mgmt.admins.col.robots')}</th>
                <th className="py-2 pr-1 text-right font-medium">{t('mgmt.admins.col.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {admins.map((a) => {
                const count = a.assignedRobotIds.length;
                const canDelete = admins.length > 1;
                return (
                  <tr key={a.id} className="h-[60px] transition-colors hover:bg-surface-2/60">
                    <td className="py-2.5 pr-4 font-medium text-text">{a.name}</td>
                    <td className="py-2.5 pr-4 text-muted">{a.email}</td>
                    <td className="py-2.5 pr-4">
                      <span className={count === 0 ? 'text-warning' : 'text-text'}>
                        {count} robot{count !== 1 ? 's' : ''}
                      </span>
                    </td>
                    <td className="py-2.5 pr-1">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setAdminToAssign(a)}
                          className="rounded-btn border border-border px-2.5 py-1.5 text-xs font-medium text-text transition-colors hover:border-accent hover:text-accent"
                        >
                          {t('mgmt.admins.manage')}
                        </button>
                        {canDelete && (
                          <button
                            type="button"
                            aria-label={t('mgmt.admins.deleteAria', { name: a.name })}
                            onClick={() => setAdminToDelete(a)}
                            className="rounded p-1.5 text-muted transition-colors hover:text-danger"
                          >
                            <TrashIcon />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Section>

      <ConfirmModal
        open={adminToDelete !== null}
        name={adminToDelete?.name ?? ''}
        onConfirm={handleDeleteAdmin}
        onCancel={() => setAdminToDelete(null)}
      />

      {adminToAssign && (
        <RobotAssignModal
          admin={adminToAssign}
          users={users}
          robots={robots}
          onUsers={setUsers}
          onClose={() => setAdminToAssign(null)}
        />
      )}
    </>
  );
}

// ── Admin: assign each of MY robots to one client ────────────────────────────
function AdminView({
  users,
  robots,
  clients,
  meId,
  setUsers,
}: {
  users: User[];
  robots: Robot[];
  clients: User[];
  meId: string;
  setUsers: (u: User[]) => void;
}) {
  const t = useT();
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [createFor, setCreateFor] = useState<string | null>(null);
  const [clientToDelete, setClientToDelete] = useState<User | null>(null);

  // only robots assigned to ME — can't see/touch others
  const myRobotIds = users.find((u) => u.id === meId)?.assignedRobotIds ?? [];
  const myRobots = robots.filter((r) => myRobotIds.includes(r.id));

  const assign = async (rid: string, clientId: string) => {
    if (!clientId) return;
    setUsers(await setClientAssignment(rid, clientId));
  };

  const createAndAssign = async (rid: string) => {
    if (!newName.trim() || !newEmail.trim()) return;
    const updated = await createClientUser(newName.trim(), newEmail.trim(), newPwd.trim() || undefined);
    const created = [...updated].reverse().find((u) => u.email === newEmail.trim());
    if (created) setUsers(await setClientAssignment(rid, created.id));
    setNewName('');
    setNewEmail('');
    setNewPwd('');
    setCreateFor(null);
  };

  const handleDeleteClient = async () => {
    if (!clientToDelete || clientToDelete.id === meId) return;
    setUsers(await deleteClient(clientToDelete.id));
    setClientToDelete(null);
  };

  return (
    <>
      <Section title={t('mgmt.myrobots.title')} subtitle={t('mgmt.myrobots.subtitle')}>
        {myRobots.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">{t('mgmt.myrobots.none')}</p>
        ) : (
          <div className="flex flex-col gap-3">
            {myRobots.map((r) => {
              const current = clientOf(users, r.id);
              return (
                <div key={r.id} className="rounded-btn border border-border p-3 transition-colors hover:bg-surface-2/60">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-medium">
                      {r.name} <span className="text-muted">({r.id})</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted">{t('mgmt.clients.assign')}</span>
                      {current ? (
                        <>
                          <span className="text-text">{current.name}</span>
                          <button
                            type="button"
                            aria-label={t('mgmt.clients.deleteAria', { name: current.name })}
                            onClick={() => setClientToDelete(current)}
                            className="rounded p-0.5 text-muted hover:text-danger"
                          >
                            <TrashIcon />
                          </button>
                        </>
                      ) : (
                        <span className="text-warning">{t('mgmt.clients.none')}</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select
                      value={current?.id ?? ''}
                      onChange={(e) => assign(r.id, e.target.value)}
                      className="rounded-btn border border-border bg-surface-2 px-2 py-1.5 text-sm"
                    >
                      <option value="">{t('mgmt.myrobots.choose')}</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.email})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setCreateFor(createFor === r.id ? null : r.id)}
                      className="rounded-btn border border-border px-3 py-1.5 text-sm text-muted hover:text-accent"
                    >
                      {t('mgmt.myrobots.newClient')}
                    </button>
                  </div>

                  {createFor === r.id && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        placeholder={t('mgmt.form.name')}
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="rounded-btn border border-border bg-surface-2 px-2 py-1.5 text-sm"
                      />
                      <input
                        placeholder={t('mgmt.form.email')}
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="rounded-btn border border-border bg-surface-2 px-2 py-1.5 text-sm"
                      />
                      <input
                        type="password"
                        placeholder={t('mgmt.form.password')}
                        value={newPwd}
                        onChange={(e) => setNewPwd(e.target.value)}
                        className="rounded-btn border border-border bg-surface-2 px-2 py-1.5 text-sm"
                      />
                      <button type="button" onClick={() => createAndAssign(r.id)} className="btn-accent px-3 py-1.5 text-sm">
                        {t('mgmt.myrobots.createAssign')}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {clients.length > 0 && (
        <Section title={t('mgmt.clients.title')} subtitle={t('mgmt.clients.subtitle')}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted">
                  <th className="py-2 pr-4 font-medium">{t('mgmt.clients.col.name')}</th>
                  <th className="py-2 pr-4 font-medium">{t('mgmt.clients.col.email')}</th>
                  <th className="py-2 pr-1 text-right font-medium">{t('mgmt.clients.col.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clients.map((c) => (
                  <tr key={c.id} className="h-[60px] transition-colors hover:bg-surface-2/60">
                    <td className="py-2.5 pr-4 font-medium text-text">{c.name}</td>
                    <td className="py-2.5 pr-4 text-muted">{c.email}</td>
                    <td className="py-2.5 pr-1 text-right">
                      <button
                        type="button"
                        aria-label={t('mgmt.clients.deleteAria', { name: c.name })}
                        onClick={() => setClientToDelete(c)}
                        className="rounded p-1.5 text-muted transition-colors hover:text-danger"
                      >
                        <TrashIcon />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <ConfirmModal
        open={clientToDelete !== null}
        name={clientToDelete?.name ?? ''}
        prefix="le client"
        onConfirm={handleDeleteClient}
        onCancel={() => setClientToDelete(null)}
      />
    </>
  );
}

// Loading state: generic footprint covering both the superadmin (stat row +
// two-column) and admin layouts, matching the app-wide skeleton treatment.
function GestionSkeleton() {
  const t = useT();
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6" aria-busy="true" aria-label={t('mgmt.loading')}>
      <div className="skeleton h-[180px] w-full" />
      <div className="grid grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="skeleton h-[96px] w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <div className="skeleton h-[280px] w-full" />
        <div className="skeleton h-[280px] w-full" />
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-card p-card text-center">
      <div className="text-[32px] font-bold leading-none text-accent">{value}</div>
      <div className="mt-1 text-sm text-muted">{label}</div>
    </div>
  );
}

const inputCls = 'w-full rounded-btn border border-border bg-surface-2 px-3 py-1.5 text-sm outline-none focus:border-accent';

// Superadmin-only creation: add an admin, a client, or a robot. Each persists via
// the service layer (addAdmin/addClient/addRobot → localStorage) and refreshes the
// live list. Validation errors (required, duplicate email/robot name) surface here.
function CreationPanel({ onUsers, onRobots }: { onUsers: (u: User[]) => void; onRobots: (r: Robot[]) => void }) {
  const t = useT();
  return (
    <section className="surface-card p-card">
      <div className="mb-4 flex items-center gap-2 text-[15px]">
        <UserPlus size={16} className="text-accent" />
        <span className="font-medium">{t('mgmt.add.title')}</span>
        <span className="text-muted">— {t('mgmt.add.subtitle')}</span>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <UserForm role="admin" title={t('mgmt.form.addAdmin')} onDone={onUsers} />
        <RobotForm onDone={onRobots} />
      </div>
    </section>
  );
}

function UserForm({ role, title, onDone }: { role: 'admin' | 'client'; title: string; onDone: (u: User[]) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const t = useT();
  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      const fn = role === 'admin' ? createAdmin : createClientAccount;
      onDone(await fn(name, email, pwd));
      setName('');
      setEmail('');
      setPwd('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('mgmt.form.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-btn border border-border p-3">
      <div className="mb-2 text-sm font-medium">{title}</div>
      <div className="flex flex-col gap-2">
        <input className={inputCls} placeholder={t('mgmt.form.name')} value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputCls} placeholder={t('mgmt.form.email')} value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={inputCls} type="password" placeholder={t('mgmt.form.password')} value={pwd} onChange={(e) => setPwd(e.target.value)} />
        {err && <p className="text-xs text-danger">{err}</p>}
        <button type="button" onClick={submit} disabled={busy} className="btn-accent px-3 py-1.5 text-sm disabled:opacity-50">
          {t('mgmt.form.add')}
        </button>
      </div>
    </div>
  );
}

function RobotForm({ onDone }: { onDone: (r: Robot[]) => void }) {
  const t = useT();
  const [name, setName] = useState('');
  const [site, setSite] = useState('');
  const [state, setState] = useState<RobotState>('docked');
  const [date, setDate] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setErr(null);
    setBusy(true);
    try {
      onDone(await createRobot({ name, site, state, commissionedAt: date }));
      setName('');
      setSite('');
      setDate('');
    } catch (e) {
      setErr(e instanceof Error ? e.message : t('mgmt.form.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-btn border border-border p-3">
      <div className="mb-2 text-sm font-medium">{t('mgmt.form.addRobot')}</div>
      <div className="flex flex-col gap-2">
        <input className={inputCls} placeholder={t('mgmt.form.name')} value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputCls} placeholder={t('mgmt.form.site')} value={site} onChange={(e) => setSite(e.target.value)} />
        <select className={inputCls} value={state} onChange={(e) => setState(e.target.value as RobotState)}>
          {(Object.keys(STATE_META) as RobotState[]).map((s) => (
            <option key={s} value={s}>
              {t(`fleet.state.${s}` as Parameters<typeof t>[0])}
            </option>
          ))}
        </select>
        <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        {err && <p className="text-xs text-danger">{err}</p>}
        <button type="button" onClick={submit} disabled={busy} className="btn-accent px-3 py-1.5 text-sm disabled:opacity-50">
          {t('mgmt.form.add')}
        </button>
      </div>
    </div>
  );
}

function RobotAssignModal({ admin, users, robots, onUsers, onClose }: {
  admin: User;
  users: User[];
  robots: Robot[];
  onUsers: (u: User[]) => void;
  onClose: () => void;
}) {
  const t = useT();
  const [query, setQuery] = useState('');
  const [quick, setQuick] = useState<'all' | 'assigned' | 'unassigned'>('all');

  const shownRobots = robots.filter((r) => {
    const q = query.trim().toLowerCase();
    const matchText = !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
    const owner = adminIdOf(users, r.id);
    const matchQuick = quick === 'all' || (quick === 'assigned' ? owner !== null : owner === null);
    return matchText && matchQuick;
  });

  const toggle = async (rid: string) => {
    const cur = adminIdOf(users, rid);
    const next = cur === admin.id ? null : admin.id;
    onUsers(await setAdminAssignment(rid, next));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="flex w-full max-w-lg flex-col rounded-card border border-border bg-surface shadow-xl"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <div className="font-semibold text-text">{t('mgmt.robots.modal.title', { name: admin.name })}</div>
            <div className="text-xs text-muted">{admin.email}</div>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-muted hover:text-text">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-border px-5 py-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('mgmt.robots.search')}
            className="min-w-[160px] flex-1 rounded-btn border border-border bg-surface-2 px-3 py-1.5 text-sm outline-none focus:border-accent"
          />
          <div className="flex gap-1 rounded-btn border border-border p-0.5">
            {(['all', 'assigned', 'unassigned'] as const).map((k) => (
              <button
                key={k}
                onClick={() => setQuick(k)}
                className={[
                  'rounded-[6px] px-2.5 py-1 text-xs transition-colors',
                  quick === k ? 'bg-accent font-medium text-[#04201d]' : 'text-muted hover:text-text',
                ].join(' ')}
              >
                {k === 'all' ? t('mgmt.robots.filterAll') : k === 'assigned' ? t('mgmt.robots.filterAssigned') : t('mgmt.robots.filterUnassigned')}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-2">
          {shownRobots.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">{t('mgmt.robots.noMatch')}</p>
          ) : (
            <div className="divide-y divide-border">
              {shownRobots.map((r) => {
                const ownerId = adminIdOf(users, r.id);
                const owner = users.find((u) => u.id === ownerId);
                const mine = ownerId === admin.id;
                return (
                  <label key={r.id} className="flex cursor-pointer items-center gap-3 py-2.5 text-sm">
                    <input type="checkbox" checked={mine} onChange={() => toggle(r.id)} className="h-4 w-4 accent-[var(--accent)]" />
                    <span className="w-40 shrink-0 font-medium">
                      {r.name} <span className="text-muted">({r.id})</span>
                    </span>
                    <span className="text-muted">
                      {owner ? (
                        <>{t('mgmt.robots.owner.label')} <span className="text-text">{owner.name}</span></>
                      ) : (
                        <span className="text-warning">{t('mgmt.robots.unassigned.badge')}</span>
                      )}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border px-5 py-3 text-right">
          <button type="button" onClick={onClose} className="rounded-btn border border-border px-4 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text">
            {t('mgmt.robots.close')}
          </button>
        </div>
      </div>
    </div>
  );
}

function TrashIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

function ConfirmModal({ open, name, prefix, onConfirm, onCancel }: {
  open: boolean;
  name: string;
  prefix?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const t = useT();
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-2 text-base font-semibold text-text">{t('mgmt.confirm.delete', { prefix: prefix ? `${prefix} ` : '', name })}</h2>
        <p className="mb-6 text-sm text-muted">{t('mgmt.confirm.irreversible')}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-btn border border-border px-4 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text"
          >
            {t('mgmt.confirm.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="rounded-btn bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {t('mgmt.confirm.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
