import type {
  Alert,
  AlertSeverity,
  AlertType,
  BatterySample,
  DashboardSummary,
  Granularity,
  Period,
  ReportMeta,
  Robot,
  Role,
  RobotState,
  TrendSeries,
  User,
} from '../types/contract';
import { rngFor } from './random';
// Real (log-derived) Disponibilité + Taux d'autonomie. Behind the same service
// interface, so FastAPI can swap this JSON for a real endpoint later.
import kpiSeed from './data/kpi_seed.json';
// Real (log-derived) GPS patrol tracks, one polyline per round.
import gpsSeed from './data/gps_seed.json';
// Real (log-derived) Info/ stats (docking, obstacles, back_home, composition).
import infoSeed from './data/info_seed.json';

// ---------------------------------------------------------------------------
// Fixed clock + span. The real unit logged Jun 2024 -> Jun 2026 (CLAUDE.md),
// so we freeze "now" at the end of that span. Everything below is derived
// deterministically from these, never from the wall clock or Math.random.
// ---------------------------------------------------------------------------
export const NOW = new Date('2026-06-01T20:00:00Z');
const SPAN_START = new Date('2024-06-01T00:00:00Z');
const DAY_MS = 86_400_000;
const TOTAL_DAYS = Math.round((NOW.getTime() - SPAN_START.getTime()) / DAY_MS);

const isoDate = (d: Date) => d.toISOString().slice(0, 10);
const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY_MS);

// ---------------------------------------------------------------------------
// Fleet. PG-001 is THE real unit — redeployed mid-life Tunisia -> Germany, and
// its totals are pinned to the CLAUDE.md seed params (969 rounds, 350 km).
// The other units are seeded fiction so the fleet view has cards to show.
// ---------------------------------------------------------------------------
export const ROBOTS: Robot[] = [
  {
    id: 'PG-001',
    name: 'Patrouilleur 01',
    site: 'Sousse (TN) → Bietigheim (DE)',
    region: 'germany',
    state: 'running',
    currentMission: 'Ronde nocturne — Secteur B',
    battery: 71,
    commissionedAt: '2024-06-01',
  },
  {
    id: 'PG-002',
    name: 'Patrouilleur 02',
    site: 'Monastir (TN)',
    region: 'tunisia',
    state: 'charging',
    currentMission: null,
    battery: 48,
    commissionedAt: '2024-09-12',
  },
  {
    id: 'PG-003',
    name: 'Patrouilleur 03',
    site: 'Bietigheim (DE)',
    region: 'germany',
    state: 'docked',
    currentMission: null,
    battery: 93,
    commissionedAt: '2025-02-03',
  },
  {
    id: 'PG-004',
    name: 'Patrouilleur 04',
    site: 'Sousse (TN)',
    region: 'tunisia',
    state: 'maintenance',
    currentMission: null,
    battery: 22,
    commissionedAt: '2025-05-20',
  },
];

// Three demo users (password `demo`) — exactly the table in CLAUDE.md.
export const USERS: User[] = [
  {
    id: 'u-ops',
    name: 'Centre Opérations',
    email: 'ops@enova.local',
    role: 'superadmin',
    assignedRobotIds: ROBOTS.map((r) => r.id),
  },
  {
    id: 'u-admin',
    name: 'Admin Enova',
    email: 'admin@enova.local',
    role: 'admin',
    assignedRobotIds: ['PG-001', 'PG-002'],
  },
  {
    id: 'u-client',
    name: 'Client Site',
    email: 'client@site.tn',
    role: 'client',
    assignedRobotIds: ['PG-001'],
  },
];

// ---------------------------------------------------------------------------
// ASSIGNMENT STORE (Gestion). USERS above is the single MUTABLE source of who
// can access which robot (assignedRobotIds). These mutators change it in place,
// so new assignments take effect on the next login, in the fleet view, and in
// the route guards. Rules enforced here: a robot has AT MOST ONE admin and AT
// MOST ONE client; a client has EXACTLY ONE robot (admins can have many).
// ---------------------------------------------------------------------------
// Persist assignments so they survive reloads (in-memory alone resets on a hard
// refresh). USERS is hydrated from localStorage at module load and saved on every
// mutation, so the fleet view and guards reflect the latest assignments.
const USERS_KEY = 'pguard-users';
// Seed snapshot taken before hydration, so corrupt/empty localStorage can never
// leave the app without the demo users or their baseline robot assignments.
const USER_SEED: User[] = USERS.map((u) => ({ ...u, assignedRobotIds: [...u.assignedRobotIds] }));
const ROLES: Role[] = ['superadmin', 'admin', 'client'];
function isValidUser(u: unknown): u is User {
  if (!u || typeof u !== 'object') return false;
  const c = u as User;
  return (
    typeof c.id === 'string' && c.id.length > 0 &&
    typeof c.email === 'string' && c.email.length > 0 &&
    ROLES.includes(c.role) &&
    Array.isArray(c.assignedRobotIds) &&
    c.assignedRobotIds.every((r) => typeof r === 'string' && r.length > 0)
  );
}
function saveUsers(): void {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(USERS));
  } catch {
    /* SSR / no storage */
  }
}
(function hydrateUsers() {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as unknown;
      if (Array.isArray(saved) && saved.length > 0 && saved.every(isValidUser)) {
        USERS.length = 0;
        for (const u of saved) USERS.push(u);
      } else {
        localStorage.removeItem(USERS_KEY); // corrupt/empty store — keep the seed
      }
    }
    // The demo users must always exist and (for admin/client) keep at least one
    // robot — a broken saved store must never strand a login on zero robots.
    for (const seed of USER_SEED) {
      const live = USERS.find((u) => u.email.toLowerCase() === seed.email.toLowerCase());
      if (!live) {
        USERS.push({ ...seed, assignedRobotIds: [...seed.assignedRobotIds] });
      } else if (live.assignedRobotIds.length === 0) {
        live.assignedRobotIds = [...seed.assignedRobotIds];
      }
    }
  } catch {
    /* ignore */
  }
})();

export function getUsers(): User[] {
  return USERS.map((u) => ({ ...u, assignedRobotIds: [...u.assignedRobotIds] })); // snapshot copy
}
export function adminOfRobot(robotId: string): string | null {
  return USERS.find((u) => u.role === 'admin' && u.assignedRobotIds.includes(robotId))?.id ?? null;
}
export function clientOfRobot(robotId: string): string | null {
  return USERS.find((u) => u.role === 'client' && u.assignedRobotIds.includes(robotId))?.id ?? null;
}
// Give a robot to one admin (or null = unassign). Removed from every other admin
// first so it has a single owner.
export function setRobotAdmin(robotId: string, adminId: string | null): void {
  for (const u of USERS) {
    if (u.role === 'admin') u.assignedRobotIds = u.assignedRobotIds.filter((r) => r !== robotId);
  }
  if (adminId) {
    const a = USERS.find((u) => u.id === adminId);
    if (a && !a.assignedRobotIds.includes(robotId)) a.assignedRobotIds.push(robotId);
  }
  saveUsers();
}
// One robot per client: the client ends up with exactly [robotId], and the robot
// is removed from any other client (a robot maps to a single client).
export function assignRobotToClient(robotId: string, clientId: string): void {
  for (const u of USERS) {
    if (u.role === 'client') u.assignedRobotIds = u.assignedRobotIds.filter((r) => r !== robotId);
  }
  const c = USERS.find((u) => u.id === clientId);
  if (c) c.assignedRobotIds = [robotId];
  saveUsers();
}
let clientSeq = 0;
export function createClient(name: string, email: string): User {
  const u: User = {
    id: `u-client-${Date.now()}-${++clientSeq}`,
    name,
    email,
    role: 'client',
    assignedRobotIds: [],
  };
  USERS.push(u);
  saveUsers();
  return u;
}

// ── Creation (superadmin Gestion) ────────────────────────────────────────────
// ROBOTS is also a mutable persisted source so added robots survive reloads and
// show in the fleet + assignment list. Passwords for created users live in a
// small overlay (the frozen User shape has no password field); login accepts the
// stored password OR "demo".
const ROBOTS_KEY = 'pguard-robots';
function saveRobots(): void {
  try {
    localStorage.setItem(ROBOTS_KEY, JSON.stringify(ROBOTS));
  } catch {
    /* no storage */
  }
}
function isValidRobot(r: unknown): r is Robot {
  return !!r && typeof r === 'object' && typeof (r as Robot).id === 'string' && (r as Robot).id.length > 0;
}
(function hydrateRobots() {
  try {
    const raw = localStorage.getItem(ROBOTS_KEY);
    if (raw) {
      const saved = JSON.parse(raw) as unknown;
      // An empty or malformed saved fleet must never wipe the seed — that would
      // leave every user with zero robots and a /robots/undefined landing.
      if (Array.isArray(saved) && saved.length > 0 && saved.every(isValidRobot)) {
        ROBOTS.length = 0;
        for (const r of saved) ROBOTS.push(r);
      } else {
        localStorage.removeItem(ROBOTS_KEY);
      }
    }
  } catch {
    /* ignore */
  }
})();

const PWD_KEY = 'pguard-pwds';
function readPwds(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(PWD_KEY) || '{}');
  } catch {
    return {};
  }
}
export function passwordFor(email: string): string | undefined {
  return readPwds()[email.trim().toLowerCase()];
}
function setPwd(email: string, pwd: string): void {
  const m = readPwds();
  m[email.trim().toLowerCase()] = pwd;
  try {
    localStorage.setItem(PWD_KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

function addUser(name: string, email: string, password: string, role: 'admin' | 'client'): User[] {
  if (!name.trim() || !email.trim() || !password.trim()) throw new Error('Champs requis manquants');
  if (USERS.some((u) => u.email.toLowerCase() === email.trim().toLowerCase())) throw new Error('Email déjà utilisé');
  USERS.push({ id: `u-${role}-${Date.now()}`, name: name.trim(), email: email.trim(), role, assignedRobotIds: [] });
  saveUsers();
  setPwd(email, password);
  return getUsers();
}
export const addAdmin = (name: string, email: string, password: string) => addUser(name, email, password, 'admin');
export const addClient = (name: string, email: string, password: string) => addUser(name, email, password, 'client');

export function removeAdmin(adminId: string): User[] {
  const idx = USERS.findIndex((u) => u.id === adminId);
  if (idx === -1) throw new Error('Admin introuvable');
  const target = USERS[idx];
  if (target.role !== 'admin') throw new Error('Utilisateur non-admin');
  if (target.email.toLowerCase() === 'ops@enova.local') throw new Error('Impossible de supprimer le superadmin');
  const adminCount = USERS.filter((u) => u.role === 'admin').length;
  if (adminCount <= 1) throw new Error('Impossible de supprimer le dernier admin');
  // unassign robots belonging to this admin
  for (const u of USERS) {
    if (u.role === 'admin' || u.role === 'client') {
      u.assignedRobotIds = u.assignedRobotIds.filter((rid) => !target.assignedRobotIds.includes(rid));
    }
  }
  USERS.splice(idx, 1);
  saveUsers();
  return getUsers();
}

export function removeClient(clientId: string): User[] {
  const idx = USERS.findIndex((u) => u.id === clientId);
  if (idx === -1) throw new Error('Client introuvable');
  if (USERS[idx].role !== 'client') throw new Error('Utilisateur non-client');
  USERS.splice(idx, 1);
  saveUsers();
  return getUsers();
}

export function addRobot(input: { name: string; site: string; state: RobotState; commissionedAt: string }): Robot[] {
  const { name, site, state, commissionedAt } = input;
  if (!name.trim() || !site.trim() || !commissionedAt) throw new Error('Champs requis manquants');
  if (ROBOTS.some((r) => r.name.toLowerCase() === name.trim().toLowerCase())) throw new Error('Nom de robot déjà utilisé');
  ROBOTS.push({
    id: `PG-${String(ROBOTS.length + 1).padStart(3, '0')}`,
    name: name.trim(),
    site: site.trim(),
    region: 'germany', // current deployment default (not in the form)
    state,
    currentMission: null,
    battery: 100,
    commissionedAt,
  });
  saveRobots();
  return ROBOTS.map((r) => ({ ...r }));
}

// ---------------------------------------------------------------------------
// THE SINGLE PER-ROBOT DATA SOURCE.
// `buildSeries(robotId)` is the one seeded source for rounds / completed /
// incidents / charges. BOTH the dashboard and the Statistiques page read from
// it (filtered to the selected period), so the same robot + same period yields
// identical numbers on both pages. Distance lives in `distanceByDay` (its own
// stream) and is likewise shared. Memoized so values never shift between calls.
// ---------------------------------------------------------------------------
interface DayRow {
  date: string;
  rounds: number;
  completed: number; // Automatic_end
  incidents: number; // obstacle + e-stop (operational proxy)
  charges: number; // docking cycles
}

const seriesCache = new Map<string, DayRow[]>();

// Scale an integer array so it sums to `target`, fixing rounding drift on the
// busiest day so the headline number is exact (used to pin PG-001 to 969/350).
function normalizeTo(values: number[], target: number): number[] {
  const raw = values.reduce((a, b) => a + b, 0) || 1;
  const scaled = values.map((v) => Math.round((v * target) / raw));
  let drift = target - scaled.reduce((a, b) => a + b, 0);
  // dump the leftover onto the largest day(s)
  const order = scaled.map((_, i) => i).sort((a, b) => scaled[b] - scaled[a]);
  for (let k = 0; drift !== 0; k = (k + 1) % order.length) {
    const i = order[k];
    if (drift > 0) {
      scaled[i]++;
      drift--;
    } else if (scaled[i] > 0) {
      scaled[i]--;
      drift++;
    }
  }
  return scaled;
}

// Allocate `target` completed rounds across days. Each day starts at the locally
// faithful round(rate · started) (capped at started) so ANY window's success
// rate stays ~58%; the small remaining drift to hit EXACTLY `target` lifetime is
// spread thinly across the timeline (stride), so no period is skewed. Result:
// lifetime = exactly target (562/969 ≈ 58%) and local windows ≈ 58% too.
function allocateCapped(counts: number[], target: number): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  const rate = total ? target / total : 0;
  const base = counts.map((c) => Math.min(c, Math.round(c * rate)));
  let drift = target - base.reduce((a, b) => a + b, 0);

  const n = counts.length;
  const stride = Math.max(1, Math.floor(n / (Math.abs(drift) + 1)));
  let cursor = 0;
  let guard = 0;
  while (drift !== 0 && guard < n * 2) {
    let placed = false;
    for (let s = 0; s < n; s++) {
      const i = (cursor + s * stride) % n;
      if (drift > 0 && base[i] < counts[i]) {
        base[i]++;
        drift--;
        cursor = i + 1;
        placed = true;
        break;
      }
      if (drift < 0 && base[i] > 0) {
        base[i]--;
        drift++;
        cursor = i + 1;
        placed = true;
        break;
      }
    }
    if (!placed) break;
    guard++;
  }
  return base;
}

function buildSeries(robotId: string): DayRow[] {
  const cached = seriesCache.get(robotId);
  if (cached) return cached;

  const rnd = rngFor(robotId);
  const rawRounds: number[] = [];
  const rawIncidents: number[] = [];
  const rawCharges: number[] = [];

  for (let i = 0; i < TOTAL_DAYS; i++) {
    // Some days the robot is idle; otherwise 0..4 rounds, weekday-weighted.
    const active = rnd() > 0.18;
    rawRounds.push(active ? Math.floor(rnd() * 4) + (rnd() > 0.5 ? 1 : 0) : 0);
    rawIncidents.push(active && rnd() > 0.72 ? Math.floor(rnd() * 3) : 0);
    rawCharges.push(active ? (rnd() > 0.45 ? 1 : 0) + (rnd() > 0.9 ? 1 : 0) : 0);
  }

  // PG-001 only: pin lifetime rounds to 969 (CLAUDE.md). Others stay seeded.
  const rounds = robotId === 'PG-001' ? normalizeTo(rawRounds, 969) : rawRounds;

  // completed (Automatic_end) anchored to the lifetime success target so the
  // rate is a stable ~58%: PG-001 -> exactly 562; others -> 58% of their total.
  // Capped per day at `rounds` and summing to the target (allocateCapped).
  const roundsTotal = rounds.reduce((a, b) => a + b, 0);
  const completedTarget = robotId === 'PG-001' ? 562 : Math.round(roundsTotal * 0.58);
  const completed = allocateCapped(rounds, completedTarget);

  const rows: DayRow[] = rounds.map((r, i) => ({
    date: isoDate(addDays(SPAN_START, i)),
    rounds: r, // rounds STARTED that day
    // completed = rounds finished via Automatic_end. Anchored lifetime (562 for
    // PG-001); both pages derive mission success from this same field.
    completed: completed[i],
    incidents: rawIncidents[i],
    charges: rawCharges[i],
  }));

  seriesCache.set(robotId, rows);
  return rows;
}

// Number of trailing days a period covers (custom treated as 30d here).
const periodDays = (p: Period) => (p === '7d' ? 7 : 30);

// Sum a DayRow field over the last N days, plus the matching previous window
// for a delta%. Returns the window slice too (for sparklines / trend).
function windowStats(rows: DayRow[], days: number, field: keyof DayRow) {
  const n = rows.length;
  const cur = rows.slice(n - days);
  const prev = rows.slice(Math.max(0, n - 2 * days), n - days);
  const sum = (xs: DayRow[]) => xs.reduce((a, r) => a + (r[field] as number), 0);
  const curSum = sum(cur);
  const prevSum = sum(prev);
  const deltaPct = prevSum === 0 ? undefined : Math.round(((curSum - prevSum) / prevSum) * 100);
  return { curSum, deltaPct, window: cur };
}

export function getDashboardSummary(robotId: string, period: Period): DashboardSummary {
  const robot = ROBOTS.find((r) => r.id === robotId)!;
  const rows = buildSeries(robotId);
  const days = periodDays(period);

  // "Rondes effectuées" counts COMPLETED rounds (Automatic_end), read from the
  // DayRow.completed field — the single source of truth this card and the
  // trend chart (getRoundsTrend) both consume, so their totals always agree.
  const rounds = windowStats(rows, days, 'completed');
  const incidents = windowStats(rows, days, 'incidents');
  const charges = windowStats(rows, days, 'charges');

  return {
    robotId,
    period,
    status: {
      state: robot.state,
      currentMission: robot.currentMission,
      battery: robot.battery,
      lastSeen: NOW.toISOString(),
    },
    kpis: {
      rounds: {
        value: rounds.curSum,
        unit: 'count',
        deltaPct: rounds.deltaPct,
        sparkline: rounds.window.map((r) => r.completed),
      },
      incidents: {
        value: incidents.curSum,
        unit: 'count',
        deltaPct: incidents.deltaPct,
        sparkline: incidents.window.map((r) => r.incidents),
      },
      chargeCycles: {
        value: charges.curSum,
        unit: 'count',
        deltaPct: charges.deltaPct,
        sparkline: charges.window.map((r) => r.charges),
      },
      // Disponibilité: REAL now (log-derived, from kpi_seed.json overall).
      availability: { value: Math.round(kpiSeed.overall.disponibilite), unit: '%' },
    },
  };
}

// Incident proxy broken into its two sources for the KPI caption. The proxy is
// obstacle events + emergency stops (CLAUDE.md); here e-stops are modeled as
// ~1/3 of the proxy and obstacles the remainder. Derived from the SAME period
// total as the Incidents card (no new randomness) so obstacles+e-stops always
// equals the card value.
export function getIncidentBreakdown(
  robotId: string,
  period: Period,
): { obstacles: number; emergencyStops: number; total: number } {
  const rows = buildSeries(robotId);
  const total = windowStats(rows, periodDays(period), 'incidents').curSum;
  const emergencyStops = Math.round(total / 3);
  return { obstacles: total - emergencyStops, emergencyStops, total };
}

// Selectable trend metrics. The count metrics map to a DayRow field; disponibilité
// is a daily % from kpi_seed (REAL, log-derived), not a count.
export type TrendMetric = 'rounds' | 'incidents' | 'charges' | 'disponibilite';
const METRIC_FIELD: Record<'rounds' | 'incidents' | 'charges', keyof DayRow> = {
  rounds: 'completed', // "Rondes effectuées" = Automatic_end
  incidents: 'incidents',
  charges: 'charges',
};

// Daily trend for the chosen metric. Count metrics → DayRow field (bars sum to
// the KPI card). Disponibilité → daily % from kpi_seed aligned to the same dates.
export function getMetricTrend(robotId: string, period: Period, metric: TrendMetric): TrendSeries {
  const rows = buildSeries(robotId);
  const days = periodDays(period);
  const slice = rows.slice(rows.length - days);
  if (metric === 'disponibilite') {
    const dispoByDate = new Map(kpiSeed.daily.map((d) => [d.date, d.disponibilite]));
    return {
      metric,
      granularity: 'daily',
      points: slice.map((r) => ({ t: r.date, value: dispoByDate.get(r.date) ?? kpiSeed.overall.disponibilite })),
    };
  }
  const field = METRIC_FIELD[metric];
  return {
    metric,
    granularity: 'daily',
    points: slice.map((r) => ({ t: r.date, value: r[field] as number })),
  };
}

// Event-sampled battery readings at dock/undock — NEVER a smooth line.
// Each active day yields an undock (post-charge, high) + dock (post-round, low)
// sample, pct clamped to 9..100 (CLAUDE.md range, ~71% mean).
export function getBatterySamples(robotId: string, period: Period): BatterySample[] {
  const rows = buildSeries(robotId);
  const days = periodDays(period);
  const rnd = rngFor(robotId + ':battery');
  const out: BatterySample[] = [];
  for (const row of rows.slice(rows.length - days)) {
    if (row.rounds === 0) continue; // idle day: no events sampled
    const undock = Math.round(82 + rnd() * 18); // 82..100 after charge
    const drop = Math.round(20 + rnd() * 55);
    const dock = Math.max(9, undock - drop); // >= 9
    out.push({ t: `${row.date}T07:30:00Z`, pct: Math.min(100, undock), phase: 'undock' });
    out.push({ t: `${row.date}T19:30:00Z`, pct: dock, phase: 'dock' });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Alerts. Seeded per robot, shaped to the frozen Alert contract. Timestamps are
// spread back from the frozen NOW so "il y a Xh" is stable. Most-recent-first.
// ---------------------------------------------------------------------------
// ALERT RULE — what counts as an alert:
// A docking that recovered on retry is ROUTINE operation, not an alert, so it is
// NOT in this pool. `docking_failed` here means a genuine failure with no
// successful retry (intervention needed), severity warning. Every entry's
// description matches its type, severity and outcome (no "échec … réussie").
// EVENT → SEVERITY — SINGLE SOURCE OF TRUTH. A given description always carries
// the same severity. Routine `info` events are NOT open alerts (no acquittement
// state — see buildAlerts/detail panel); only warning/critical can be open.
//   Info     : routine système (firmware, redémarrage normal), piéton ralenti
//   Alerte   : obstacle ralenti/contourné, perte GPS temporaire, docking
//              récupéré AUTOMATIQUEMENT
//   Critique : collision évitée / freinage d'urgence, arrêt d'urgence (ronde
//              interrompue), docking nécessitant intervention MANUELLE
const ALERT_KINDS: { type: AlertType; severity: AlertSeverity; description: string; descKey: string }[] = [
  { type: 'system',         severity: 'info',     description: 'Mise à jour du firmware appliquée',              descKey: 'alert.desc.firmware' },
  { type: 'system',         severity: 'info',     description: 'Redémarrage normal du système',                  descKey: 'alert.desc.reboot' },
  { type: 'obstacle',       severity: 'info',     description: 'Piéton détecté — ralentissement temporaire',     descKey: 'alert.desc.pedestrian' },
  { type: 'obstacle',       severity: 'warning',  description: 'Obstacle imprévu — contournement effectué',      descKey: 'alert.desc.obstacleWarning' },
  { type: 'system',         severity: 'warning',  description: 'Perte temporaire du signal GPS',                 descKey: 'alert.desc.gpsLoss' },
  { type: 'docking_failed', severity: 'warning',  description: 'Échec de docking — récupéré automatiquement',   descKey: 'alert.desc.dockingWarning' },
  { type: 'emergency_stop', severity: 'critical', description: "Arrêt d'urgence déclenché — ronde interrompue", descKey: 'alert.desc.estop' },
  { type: 'docking_failed', severity: 'critical', description: 'Échec de docking — intervention manuelle requise', descKey: 'alert.desc.dockingCritical' },
  { type: 'obstacle',       severity: 'critical', description: "Collision évitée — freinage d'urgence",          descKey: 'alert.desc.collision' },
];

const alertsCache = new Map<string, Alert[]>();

function buildAlerts(robotId: string): Alert[] {
  const cached = alertsCache.get(robotId);
  if (cached) return cached;

  const rnd = rngFor(robotId + ':alerts');

  // Seeded Fisher-Yates shuffle of the kinds, then take distinct ones — this
  // gives a realistic MIX (no repeated event) instead of random picks that can
  // collide on the same kind.
  const order = ALERT_KINDS.map((_, i) => i);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }

  // ~26 events spread back across ~90 days so the Alertes page has a real list
  // to filter; the dashboard panel just takes the most recent few. The first
  // `order.length` use the shuffle (distinct kinds), then cycle through it.
  const count = 26;
  const list: Alert[] = [];
  let cursor = NOW.getTime();
  for (let i = 0; i < count; i++) {
    // step back a seeded 2h..86h between each event (most recent first)
    cursor -= Math.round((2 + rnd() * 84) * 3_600_000);
    const kind = ALERT_KINDS[order[i % order.length]];
    list.push({
      id: `${robotId}-AL-${i}`,
      robotId,
      type: kind.type,
      severity: kind.severity,
      occurredAt: new Date(cursor).toISOString(),
      missionId: rnd() > 0.4 ? `M-${1000 + Math.floor(rnd() * 9000)}` : null,
      description: kind.description,
      descKey: kind.descKey,
      mediaUrl: null,
      // No seeded resolution — every alert starts "En cours". The resolution
      // status now lives in a user-driven overlay (see resolution store below),
      // not on this field. (rnd() kept to preserve the seeded event sequence.)
      acknowledged: rnd() > 2 ? true : false,
    });
  }
  alertsCache.set(robotId, list); // already newest-first (cursor decreases)
  return list;
}

// Latest `limit` alerts for a robot, most recent first (dashboard panel).
export function getRecentAlerts(robotId: string, limit = 4): Alert[] {
  return buildAlerts(robotId).slice(0, limit);
}

// Full alert list for a robot (Alertes page) — same source as getRecentAlerts.
export function getRobotAlerts(robotId: string): Alert[] {
  return buildAlerts(robotId);
}

// ── Alert resolution overlay (user-driven, persisted) ────────────────────────
// The frozen Alert shape has no resolution field, so the user's outcome lives in
// a separate localStorage map keyed by alert id. No entry = "En cours" (default,
// untreated). resolveAlert closes it (Résolu / Non résolu + required note +
// resolvedBy/resolvedAt); reopenAlert clears it back to En cours.
export type AlertStatus = 'open' | 'resolved' | 'unresolved';
export interface AlertResolution {
  status: 'resolved' | 'unresolved';
  note: string;
  resolvedBy: string;
  resolvedAt: string;
}
const RES_KEY = 'pguard-alert-res';
function readResolutions(): Record<string, AlertResolution> {
  try {
    return JSON.parse(localStorage.getItem(RES_KEY) || '{}');
  } catch {
    return {};
  }
}
function writeResolutions(map: Record<string, AlertResolution>): void {
  try {
    localStorage.setItem(RES_KEY, JSON.stringify(map));
  } catch {
    /* no storage */
  }
}
export function getAlertResolutions(): Record<string, AlertResolution> {
  return readResolutions();
}
export function resolveAlert(
  id: string,
  payload: { status: 'resolved' | 'unresolved'; note: string; resolvedBy: string },
): Record<string, AlertResolution> {
  const map = readResolutions();
  map[id] = { ...payload, resolvedAt: new Date().toISOString() };
  writeResolutions(map);
  return map;
}
export function reopenAlert(id: string): Record<string, AlertResolution> {
  const map = readResolutions();
  delete map[id];
  writeResolutions(map);
  return map;
}

// GPS patrol tracks (one ordered polyline per round). Filter by date range and
// (optionally) deployment region. Same shape a FastAPI endpoint would return.
export type Deployment = 'tunisia' | 'germany';
export interface PatrolTrack {
  date: string;
  mission: string;
  deployment: Deployment;
  points: [number, number][];
}
export function getPatrolTracks(opts: { robotId?: string; deployment?: Deployment; fromDate?: string; toDate?: string }): PatrolTrack[] {
  const { robotId, deployment, fromDate, toDate } = opts;
  // GPS data only exists for PG-001 (the real unit). All other robots have no tracks.
  if (robotId && robotId !== 'PG-001') return [];
  return (gpsSeed.tracks as PatrolTrack[]).filter((t) => {
    if (deployment && t.deployment !== deployment) return false;
    if (fromDate && t.date < fromDate) return false;
    if (toDate && t.date > toDate) return false;
    return true;
  });
}

// Seeded report history (frozen ReportMeta contract) so the Historique list
// isn't empty. Newly generated reports are prepended client-side on the page.
export function getReportHistory(robotId: string): ReportMeta[] {
  const rnd = rngFor(robotId + ':reports');
  const seeds: { period: Period; format: 'pdf' | 'csv'; daysAgo: number }[] = [
    { period: '30d', format: 'pdf', daysAgo: 2 },
    { period: '7d', format: 'csv', daysAgo: 9 },
    { period: 'custom', format: 'pdf', daysAgo: 24 },
    { period: '30d', format: 'csv', daysAgo: 38 },
  ];
  return seeds.map((s, i) => ({
    id: `${robotId}-R-${i}`,
    robotId,
    period: s.period,
    format: s.format,
    generatedAt: new Date(NOW.getTime() - s.daysAgo * 86_400_000).toISOString(),
    sizeKb: 40 + Math.floor(rnd() * 220),
  }));
}

// ===========================================================================
// Statistiques (depth page). Everything below is derived from the SAME daily
// series as the dashboard, so each summary tile equals the sum of its section's
// series over the selected range. Range is a day count; granularity buckets it.
// ===========================================================================
export type RangeDays = 7 | 30 | 90;

// A round that did NOT finish on Automatic_end was interrupted (Emergency_pressed).
const interruptedRounds = (r: DayRow) => r.rounds - r.completed;

// Distance per day in km — OWN seeded stream (':dist') so it doesn't perturb the
// main series' RNG. Normalized so PG-001's lifetime total ≈ 350 km (CLAUDE.md).
const distCache = new Map<string, number[]>();
function distanceByDay(robotId: string): number[] {
  const cached = distCache.get(robotId);
  if (cached) return cached;
  const rnd = rngFor(robotId + ':dist');
  const rows = buildSeries(robotId);
  const raw = rows.map((r) => (r.rounds > 0 ? 0.2 + rnd() * 1.6 : 0));
  const sum = raw.reduce((a, b) => a + b, 0) || 1;
  const factor = robotId === 'PG-001' ? 350 / sum : 1; // pin PG-001 to 350 km
  const arr = raw.map((v) => v * factor);
  distCache.set(robotId, arr);
  return arr;
}

// Total minutes of completed (Automatic_end) rounds per day. Each completed
// round gets a seeded 45–95 min duration from the ':dur' stream (independent of
// the main series, so existing values are untouched). Memoized per robot so a
// given day's total is stable across period windows. The "Durée moyenne de
// ronde" tile divides the period sum by the SAME completed-round count that
// feeds the donut/charts → consistent.
const durCache = new Map<string, number[]>();
function roundMinutesByDay(robotId: string): number[] {
  const cached = durCache.get(robotId);
  if (cached) return cached;
  const rows = buildSeries(robotId);
  const rnd = rngFor(robotId + ':dur');
  const arr = rows.map((r) => {
    let m = 0;
    for (let i = 0; i < r.completed; i++) m += 45 + Math.floor(rnd() * 51); // 45..95 min
    return m;
  });
  durCache.set(robotId, arr);
  return arr;
}

// Group the sliced day-indices into buckets by granularity, with a label each.
function bucketIndices(dates: string[], gran: Granularity): { label: string; rows: number[] }[] {
  if (gran === 'monthly') {
    const map = new Map<string, number[]>();
    dates.forEach((d, i) => {
      const key = d.slice(0, 7); // YYYY-MM
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(i);
    });
    return [...map].map(([label, rows]) => ({ label, rows }));
  }
  if (gran === 'weekly') {
    const out: { label: string; rows: number[] }[] = [];
    for (let i = 0; i < dates.length; i += 7) {
      const rows: number[] = [];
      for (let j = i; j < Math.min(i + 7, dates.length); j++) rows.push(j);
      out.push({ label: `sem. ${dates[i].slice(5)}`, rows });
    }
    return out;
  }
  return dates.map((d, i) => ({ label: d.slice(5), rows: [i] })); // daily MM-DD
}

// 7×24 (jours × heures) activity matrix from round START times. Each started
// round is placed on its weekday and a night-weighted hour (ronde nocturne),
// via the ':hours' stream. Matrix total === total started rounds over the range.
function hourlyActivity(robotId: string, days: number): { matrix: number[][]; max: number } {
  const rows = buildSeries(robotId).slice(-days);
  const rnd = rngFor(robotId + ':hours');
  const matrix = Array.from({ length: 7 }, () => new Array<number>(24).fill(0));
  for (const r of rows) {
    const dow = (new Date(r.date + 'T00:00:00Z').getUTCDay() + 6) % 7; // Mon=0..Sun=6
    for (let k = 0; k < r.rounds; k++) {
      // 70% of rounds at night (18h–05h), 30% daytime (06h–17h)
      const hour = rnd() < 0.7 ? (18 + Math.floor(rnd() * 12)) % 24 : 6 + Math.floor(rnd() * 12);
      matrix[dow][hour]++;
    }
  }
  const max = Math.max(1, ...matrix.flat());
  return { matrix, max };
}

export interface StatsBundle {
  summary: {
    missionRate: number; // %
    completed: number;
    total: number;
    emergencyStops: number;
    dockingRate: number; // %
    dockingSucc: number;
    dockingTotal: number;
    distanceKm: number;
    avgRoundMin: number; // avg completed-round duration (minutes)
    disponibilite: number; // % — REAL (kpi_seed overall)
    autonomie: number; // % — REAL (kpi_seed overall)
  };
  roundsSuccess: { label: string; completed: number; interrupted: number }[];
  emergency: { label: string; value: number }[];
  distance: { label: string; value: number }[];
  dispoTrend: { label: string; value: number }[]; // daily Disponibilité (real values)
  autonomieTrend: { label: string; value: number }[]; // daily Taux d'autonomie (real values)
  hourly: { matrix: number[][]; max: number };
}

// `days` is a number so reports can pass arbitrary windows (e.g. "mois en
// cours"); the Statistiques page passes RangeDays (a subset).
export function getStatistics(robotId: string, days: number, gran: Granularity): StatsBundle {
  const rows = buildSeries(robotId).slice(-days);
  const dist = distanceByDay(robotId).slice(-days);
  const dates = rows.map((r) => r.date);
  const buckets = bucketIndices(dates, gran);

  // Section 3 — stacked: terminées (Automatic_end) + interrompues (Emergency_pressed).
  // The two sum to total rounds for the bucket.
  const roundsSuccess = buckets.map((b) => ({
    label: b.label,
    completed: b.rows.reduce((a, i) => a + rows[i].completed, 0),
    interrupted: b.rows.reduce((a, i) => a + interruptedRounds(rows[i]), 0),
  }));

  // Section 4 — Emergency_pressed events per bucket.
  const emergency = buckets.map((b) => ({
    label: b.label,
    value: b.rows.reduce((a, i) => a + interruptedRounds(rows[i]), 0),
  }));

  // Section 5 — distance summed per bucket (0.1 km precision).
  const distance = buckets.map((b) => ({
    label: b.label,
    value: Math.round(b.rows.reduce((a, i) => a + dist[i], 0) * 10) / 10,
  }));

  // Summary tiles — each equals the sum/derivation of the series above.
  const total = rows.reduce((a, r) => a + r.rounds, 0);
  const completed = rows.reduce((a, r) => a + r.completed, 0);
  const emergencyStops = total - completed; // === Σ emergency.value
  const dockingSucc = rows.reduce((a, r) => a + r.charges, 0);
  const dockingFail = Math.round(dockingSucc * 0.06); // modeled failed attempts (~6%)
  const dockingTotal = dockingSucc + dockingFail;
  const distanceKm = Math.round(distance.reduce((a, b) => a + b.value, 0)); // === Σ bars
  // Durée moyenne de ronde = Σ completed-round minutes / completed count (same
  // `completed` that drives the donut), over the selected period.
  const totalMin = roundMinutesByDay(robotId)
    .slice(-days)
    .reduce((a, b) => a + b, 0);
  const avgRoundMin = completed ? Math.round(totalMin / completed) : 0;

  // Disponibilité — REAL daily values from kpi_seed.json, bucketed by averaging
  // (keeps the real day-to-day variation, including the low days ~50%).
  const dispoByDate = new Map(kpiSeed.daily.map((d) => [d.date, d.disponibilite]));
  const dispoTrend = buckets.map((b) => {
    const vals = b.rows.map((i) => dispoByDate.get(dates[i]) ?? kpiSeed.overall.disponibilite);
    const avg = vals.reduce((a, v) => a + v, 0) / (vals.length || 1);
    return { label: b.label, value: Math.round(avg * 10) / 10 };
  });

  // Taux d'autonomie — REAL daily values from kpi_seed.json, bucketed by
  // averaging (same treatment as dispoTrend).
  const autoByDate = new Map(kpiSeed.daily.map((d) => [d.date, d.autonomie]));
  const autonomieTrend = buckets.map((b) => {
    const vals = b.rows.map((i) => autoByDate.get(dates[i]) ?? kpiSeed.overall.autonomie);
    const avg = vals.reduce((a, v) => a + v, 0) / (vals.length || 1);
    return { label: b.label, value: Math.round(avg * 10) / 10 };
  });

  return {
    summary: {
      missionRate: total ? Math.round((completed / total) * 100) : 0,
      completed,
      total,
      emergencyStops,
      dockingRate: dockingTotal ? Math.round((dockingSucc / dockingTotal) * 100) : 0,
      dockingSucc,
      dockingTotal,
      distanceKm,
      avgRoundMin,
      disponibilite: kpiSeed.overall.disponibilite,
      autonomie: kpiSeed.overall.autonomie,
    },
    roundsSuccess,
    emergency,
    distance,
    dispoTrend,
    autonomieTrend,
    hourly: hourlyActivity(robotId, days),
  };
}

// ---------------------------------------------------------------------------
// Info/ log stats. Only PG-001 has real log history; all others return null.
// `days` filters the composition daily[] for the period; overall aggregates
// (docking rates, battery median, obstacle delay) are always all-time values.

const REAL_ROBOT_ID = 'PG-001';

export interface InfoStats {
  docking: {
    procedures_total: number;
    procedures_succeeded: number;
    procedures_failed: number;
    success_rate: number;
    attempts_per_procedure_mean: number;
    battery_at_dock_median: number;
    daily: { label: string; succeeded: number; failed: number }[];
  };
  obstacles: {
    events_total: number;
    delay_s_mean: number;
  };
  obstaclesPeriod: {
    events_total: number;
    delay_s_mean: number;
  };
  back_home: {
    returns_total: number;
    home_reached: number;
    not_reached: number;
    success_rate: number;
    daily: { label: string; reached: number; not_reached: number }[];
  };
}

export function getInfoStats(robotId: string, days: number): InfoStats | null {
  if (robotId !== REAL_ROBOT_ID) return null;

  const cutoff = new Date(NOW.getTime() - days * 86_400_000).toISOString().slice(0, 10);

  const dockSlice = infoSeed.docking.daily.filter((d) => d.date >= cutoff);
  const dockingDaily = dockSlice.map((d) => ({
    label: d.date.slice(5),
    succeeded: d.succeeded,
    failed: d.failures,
  }));
  const dockTotal = dockSlice.reduce((a, d) => a + d.procedures, 0);
  const dockSucc  = dockSlice.reduce((a, d) => a + d.succeeded, 0);
  const dockFail  = dockTotal - dockSucc;

  const obsSlice = (infoSeed.obstacles.daily as { date: string; count: number; delay_s_total: number }[]).filter((d) => d.date >= cutoff);
  const obsTotal = obsSlice.reduce((a, d) => a + d.count, 0);
  const obsDelayTotal = obsSlice.reduce((a, d) => a + d.delay_s_total, 0);
  const obsDelayMean = obsTotal > 0 ? obsDelayTotal / obsTotal : 0;

  const bhSlice = infoSeed.back_home.daily.filter((d) => d.date >= cutoff);
  const bhDaily = bhSlice.map((d) => ({
    label: d.date.slice(5),
    reached: d.reached,
    not_reached: d.returns - d.reached,
  }));
  const bhTotal   = bhSlice.reduce((a, d) => a + d.returns, 0);
  const bhReached = bhSlice.reduce((a, d) => a + d.reached, 0);

  return {
    docking: {
      procedures_total:            dockTotal,
      procedures_succeeded:        dockSucc,
      procedures_failed:           dockFail,
      success_rate:                infoSeed.docking.success_rate,
      attempts_per_procedure_mean: infoSeed.docking.attempts_per_procedure_mean,
      battery_at_dock_median:      infoSeed.docking.battery_at_dock.median as number,
      daily:                       dockingDaily,
    },
    obstacles: {
      events_total: infoSeed.obstacles.events_total,
      delay_s_mean: infoSeed.obstacles.delay_s.mean as number,
    },
    obstaclesPeriod: {
      events_total: obsTotal,
      delay_s_mean:  obsDelayMean,
    },
    back_home: {
      returns_total: bhTotal,
      home_reached:  bhReached,
      not_reached:   bhTotal - bhReached,
      success_rate:  infoSeed.back_home.success_rate as number,
      daily:         bhDaily,
    },
  };
}

export interface LastKnownTrack {
  date: string;          // ISO YYYY-MM-DD
  mission: string;
  points: [number, number][];
  lastPoint: [number, number];
}

export function getLastKnownTrack(robotId: string): LastKnownTrack | null {
  if (robotId !== REAL_ROBOT_ID) return null;
  const sorted = [...(gpsSeed.tracks as PatrolTrack[])].sort((a, b) => a.date.localeCompare(b.date));
  const last = sorted[sorted.length - 1];
  if (!last || !last.points.length) return null;
  const points = last.points as [number, number][];
  return { date: last.date, mission: last.mission, points, lastPoint: points[points.length - 1] };
}
