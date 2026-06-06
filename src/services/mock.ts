import type {
  Alert,
  AlertSeverity,
  AlertType,
  BatterySample,
  DashboardSummary,
  Granularity,
  Period,
  Robot,
  TrendSeries,
  User,
} from '../types/contract';
import { rngFor } from './random';

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
      // Disponibilité: formula is TODO (CLAUDE.md). value is a placeholder the
      // UI renders as "—"; do NOT treat it as a real availability figure.
      availability: { value: 0, unit: '%' },
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

// Selectable daily-count metrics for the trend chart. Each maps to a DayRow
// field, so a metric's bars over a period sum to that KPI card's total.
export type TrendMetric = 'rounds' | 'incidents' | 'charges';
const METRIC_FIELD: Record<TrendMetric, keyof DayRow> = {
  rounds: 'completed', // "Rondes effectuées" = Automatic_end
  incidents: 'incidents',
  charges: 'charges',
};

// Daily trend for the chosen count metric (bars). Plots the SAME field as the
// matching KPI card so the per-day bars sum to the card total for the period.
export function getMetricTrend(robotId: string, period: Period, metric: TrendMetric): TrendSeries {
  const rows = buildSeries(robotId);
  const days = periodDays(period);
  const field = METRIC_FIELD[metric];
  return {
    metric,
    granularity: 'daily',
    points: rows.slice(rows.length - days).map((r) => ({ t: r.date, value: r[field] as number })),
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
const ALERT_KINDS: { type: AlertType; severity: AlertSeverity; description: string }[] = [
  { type: 'obstacle', severity: 'info', description: 'Piéton détecté — ralentissement temporaire' },
  { type: 'obstacle', severity: 'warning', description: 'Obstacle imprévu — contournement effectué' },
  { type: 'emergency_stop', severity: 'critical', description: "Arrêt d'urgence déclenché — ronde interrompue" },
  { type: 'docking_failed', severity: 'warning', description: 'Échec de docking — intervention manuelle requise' },
  { type: 'system', severity: 'info', description: 'Mise à jour du firmware appliquée' },
  { type: 'system', severity: 'warning', description: 'Perte temporaire du signal GPS' },
  { type: 'obstacle', severity: 'critical', description: "Collision évitée — freinage d'urgence" },
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

  const count = Math.min(6, ALERT_KINDS.length);
  const list: Alert[] = [];
  let cursor = NOW.getTime();
  for (let i = 0; i < count; i++) {
    // step back a seeded 1.5h..14h between each event (most recent first)
    cursor -= Math.round((1.5 + rnd() * 12.5) * 3_600_000);
    const kind = ALERT_KINDS[order[i]];
    list.push({
      id: `${robotId}-AL-${i}`,
      robotId,
      type: kind.type,
      severity: kind.severity,
      occurredAt: new Date(cursor).toISOString(),
      missionId: rnd() > 0.4 ? `M-${1000 + Math.floor(rnd() * 9000)}` : null,
      description: kind.description,
      mediaUrl: null,
      acknowledged: rnd() > 0.6,
    });
  }
  alertsCache.set(robotId, list); // already newest-first (cursor decreases)
  return list;
}

// Latest `limit` alerts for a robot, most recent first.
export function getRecentAlerts(robotId: string, limit = 4): Alert[] {
  return buildAlerts(robotId).slice(0, limit);
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
  };
  roundsSuccess: { label: string; completed: number; interrupted: number }[];
  emergency: { label: string; value: number }[];
  distance: { label: string; value: number }[];
  hourly: { matrix: number[][]; max: number };
}

export function getStatistics(robotId: string, days: RangeDays, gran: Granularity): StatsBundle {
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
    },
    roundsSuccess,
    emergency,
    distance,
    hourly: hourlyActivity(robotId, days),
  };
}
