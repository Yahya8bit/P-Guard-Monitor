import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { Section } from '../components/stats/Section';
import {
  createAdmin,
  createClientAccount,
  createClientUser,
  createRobot,
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

export function Gestion() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [robots, setRobots] = useState<Robot[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    Promise.all([fetchUsers(), listRobots()]).then(([u, r]) => {
      setUsers(u);
      setRobots(r);
      setLoaded(true);
    });
  }, []);

  const admins = useMemo(() => users.filter((u) => u.role === 'admin'), [users]);
  const clients = useMemo(() => users.filter((u) => u.role === 'client'), [users]);

  // hold both views until users + robots arrive, so no "0 robots / 0 admins"
  // flash and no empty form lists before the fetch resolves.
  if (!loaded) return <GestionSkeleton />;

  if (user?.role === 'superadmin') {
    return <SuperadminView users={users} robots={robots} admins={admins} setUsers={setUsers} setRobots={setRobots} />;
  }
  // admin
  return <AdminView users={users} robots={robots} clients={clients} meId={user?.id ?? ''} setUsers={setUsers} />;
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
  const [selectedAdmin, setSelectedAdmin] = useState<string>('');
  const sel = selectedAdmin || admins[0]?.id || '';

  // ROBOT SEARCH/FILTER — only affects which rows are shown; counts + assignment
  // still use the full `robots` list, so toggling persists and totals stay right.
  const [query, setQuery] = useState('');
  const [quick, setQuick] = useState<'all' | 'assigned' | 'unassigned'>('all');
  const shownRobots = robots.filter((r) => {
    const q = query.trim().toLowerCase();
    const matchText = !q || r.name.toLowerCase().includes(q) || r.id.toLowerCase().includes(q);
    const owner = adminIdOf(users, r.id);
    const matchQuick = quick === 'all' || (quick === 'assigned' ? owner !== null : owner === null);
    return matchText && matchQuick;
  });

  const unassigned = robots.filter((r) => adminIdOf(users, r.id) === null).length;

  // toggle the selected admin's ownership of a robot (assign or unassign)
  const toggle = async (rid: string) => {
    const cur = adminIdOf(users, rid);
    const next = cur === sel ? null : sel;
    setUsers(await setAdminAssignment(rid, next));
  };

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <CreationPanel onUsers={setUsers} onRobots={setRobots} />

      <div className="grid grid-cols-3 gap-4">
        <StatBox label="Robots" value={robots.length} />
        <StatBox label="Admins" value={admins.length} />
        <StatBox label="Non assignés" value={unassigned} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
        <Section title="Admins" subtitle="Sélectionnez un admin">
          <div className="flex flex-col gap-1">
            {admins.map((a) => {
              const count = a.assignedRobotIds.length;
              return (
                <button
                  key={a.id}
                  onClick={() => setSelectedAdmin(a.id)}
                  className={[
                    'rounded-btn px-3 py-2 text-left text-sm transition-colors',
                    sel === a.id ? 'bg-surface-2 text-accent ring-1 ring-inset ring-border' : 'text-muted hover:bg-surface-2',
                  ].join(' ')}
                >
                  <div className="font-medium text-text">{a.name}</div>
                  <div className="text-xs text-muted">
                    {a.email} · {count} robot{count > 1 ? 's' : ''}
                  </div>
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Robots" subtitle={`Cochez les robots de ${admins.find((a) => a.id === sel)?.name ?? 'cet admin'}`}>
          {/* search + quick filter (rows only; assignment/counts unaffected) */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher (nom ou ID)…"
              className="min-w-[200px] flex-1 rounded-btn border border-border bg-surface-2 px-3 py-1.5 text-sm outline-none focus:border-accent"
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
                  {k === 'all' ? 'Tous' : k === 'assigned' ? 'Assignés' : 'Non assignés'}
                </button>
              ))}
            </div>
          </div>

          {shownRobots.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted">Aucun robot ne correspond.</p>
          ) : (
            <div className="divide-y divide-border">
              {shownRobots.map((r) => {
              const ownerId = adminIdOf(users, r.id);
              const owner = users.find((u) => u.id === ownerId);
              const mine = ownerId === sel;
              return (
                <label key={r.id} className="flex cursor-pointer items-center gap-3 py-2.5 text-sm">
                  <input type="checkbox" checked={mine} onChange={() => toggle(r.id)} className="h-4 w-4 accent-[var(--accent)]" />
                  <span className="w-40 shrink-0 font-medium">
                    {r.name} <span className="text-muted">({r.id})</span>
                  </span>
                  <span className="text-muted">
                    {owner ? (
                      <>Admin : <span className="text-text">{owner.name}</span></>
                    ) : (
                      <span className="text-warning">Non assigné</span>
                    )}
                  </span>
                </label>
              );
              })}
            </div>
          )}
        </Section>
      </div>
    </div>
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
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [createFor, setCreateFor] = useState<string | null>(null);

  // only robots assigned to ME — can't see/touch others
  const myRobotIds = users.find((u) => u.id === meId)?.assignedRobotIds ?? [];
  const myRobots = robots.filter((r) => myRobotIds.includes(r.id));

  const assign = async (rid: string, clientId: string) => {
    if (!clientId) return;
    setUsers(await setClientAssignment(rid, clientId)); // one robot per client (replaces)
  };

  const createAndAssign = async (rid: string) => {
    if (!newName.trim() || !newEmail.trim()) return;
    const updated = await createClientUser(newName.trim(), newEmail.trim());
    const created = [...updated].reverse().find((u) => u.email === newEmail.trim());
    if (created) setUsers(await setClientAssignment(rid, created.id));
    setNewName('');
    setNewEmail('');
    setCreateFor(null);
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Section title="Mes robots" subtitle="Attribuez chaque robot à un client (un robot par client)">
        {myRobots.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">Aucun robot assigné.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {myRobots.map((r) => {
              const current = clientOf(users, r.id);
              return (
                <div key={r.id} className="rounded-btn border border-border p-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-medium">
                      {r.name} <span className="text-muted">({r.id})</span>
                    </div>
                    <div className="text-sm">
                      <span className="text-muted">Client : </span>
                      {current ? <span className="text-text">{current.name}</span> : <span className="text-warning">Aucun</span>}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <select
                      value={current?.id ?? ''}
                      onChange={(e) => assign(r.id, e.target.value)}
                      className="rounded-btn border border-border bg-surface-2 px-2 py-1.5 text-sm"
                    >
                      <option value="">Choisir un client…</option>
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
                      Nouveau client
                    </button>
                  </div>

                  {createFor === r.id && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <input
                        placeholder="Nom"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="rounded-btn border border-border bg-surface-2 px-2 py-1.5 text-sm"
                      />
                      <input
                        placeholder="E-mail"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        className="rounded-btn border border-border bg-surface-2 px-2 py-1.5 text-sm"
                      />
                      <button type="button" onClick={() => createAndAssign(r.id)} className="btn-accent px-3 py-1.5 text-sm">
                        Créer & assigner
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Section>
    </div>
  );
}

// Loading state: generic footprint covering both the superadmin (stat row +
// two-column) and admin layouts, matching the app-wide skeleton treatment.
function GestionSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6" aria-busy="true" aria-label="Chargement de la gestion">
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
  return (
    <Section title="Ajouter" subtitle="Créer un admin, un client ou un robot">
      <div className="grid gap-6 lg:grid-cols-3">
        <UserForm role="admin" title="Ajouter un admin" onDone={onUsers} />
        <UserForm role="client" title="Ajouter un client" onDone={onUsers} />
        <RobotForm onDone={onRobots} />
      </div>
    </Section>
  );
}

function UserForm({ role, title, onDone }: { role: 'admin' | 'client'; title: string; onDone: (u: User[]) => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pwd, setPwd] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
      setErr(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-btn border border-border p-3">
      <div className="mb-2 text-sm font-medium">{title}</div>
      <div className="flex flex-col gap-2">
        <input className={inputCls} placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputCls} placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className={inputCls} type="password" placeholder="Mot de passe" value={pwd} onChange={(e) => setPwd(e.target.value)} />
        {err && <p className="text-xs text-danger">{err}</p>}
        <button type="button" onClick={submit} disabled={busy} className="btn-accent px-3 py-1.5 text-sm disabled:opacity-50">
          Ajouter
        </button>
      </div>
    </div>
  );
}

function RobotForm({ onDone }: { onDone: (r: Robot[]) => void }) {
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
      setErr(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-btn border border-border p-3">
      <div className="mb-2 text-sm font-medium">Ajouter un robot</div>
      <div className="flex flex-col gap-2">
        <input className={inputCls} placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputCls} placeholder="Site d'affectation" value={site} onChange={(e) => setSite(e.target.value)} />
        <select className={inputCls} value={state} onChange={(e) => setState(e.target.value as RobotState)}>
          {(Object.keys(STATE_META) as RobotState[]).map((s) => (
            <option key={s} value={s}>
              {STATE_META[s].label}
            </option>
          ))}
        </select>
        <input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        {err && <p className="text-xs text-danger">{err}</p>}
        <button type="button" onClick={submit} disabled={busy} className="btn-accent px-3 py-1.5 text-sm disabled:opacity-50">
          Ajouter
        </button>
      </div>
    </div>
  );
}
