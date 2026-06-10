// Public mock-service surface. Everything is async + returns the frozen
// contract shapes, so swapping these bodies for real `fetch` calls later needs
// no change at the call sites. Data itself is deterministic (see mock.ts).
import type { Alert, BatterySample, DashboardSummary, Granularity, Period, ReportMeta, Robot, RobotState, TrendSeries, User } from '../types/contract';
import {
  ROBOTS,
  USERS,
  addAdmin,
  addClient,
  addRobot,
  passwordFor,
  getBatterySamples,
  getDashboardSummary,
  getIncidentBreakdown,
  assignRobotToClient,
  createClient,
  getMetricTrend,
  getRecentAlerts,
  getAlertResolutions,
  getPatrolTracks,
  getReportHistory,
  getRobotAlerts,
  getStatistics,
  reopenAlert,
  resolveAlert,
  getInfoStats,
  type AlertResolution,
  type Deployment,
  type PatrolTrack,
  getUsers,
  setRobotAdmin,
  type InfoStats,
  type RangeDays,
  type StatsBundle,
  type TrendMetric,
  getLastKnownTrack,
  type LastKnownTrack,
} from './mock';

// tiny fake latency so loading states are exercisable
const delay = <T>(value: T, ms = 120): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

export async function listRobots(): Promise<Robot[]> {
  return delay(ROBOTS);
}

export async function getRobot(id: string): Promise<Robot | undefined> {
  return delay(ROBOTS.find((r) => r.id === id));
}

export async function fetchDashboard(robotId: string, period: Period): Promise<DashboardSummary> {
  return delay(getDashboardSummary(robotId, period));
}

export async function fetchMetricTrend(
  robotId: string,
  period: Period,
  metric: TrendMetric,
): Promise<TrendSeries> {
  return delay(getMetricTrend(robotId, period, metric));
}

export async function fetchBatterySamples(robotId: string, period: Period): Promise<BatterySample[]> {
  return delay(getBatterySamples(robotId, period));
}

export async function fetchIncidentBreakdown(robotId: string, period: Period) {
  return delay(getIncidentBreakdown(robotId, period));
}

export async function fetchRecentAlerts(robotId: string, limit = 4): Promise<Alert[]> {
  return delay(getRecentAlerts(robotId, limit));
}

export async function fetchRobotAlerts(robotId: string): Promise<Alert[]> {
  return delay(getRobotAlerts(robotId));
}

export async function fetchAlertResolutions(): Promise<Record<string, AlertResolution>> {
  return delay(getAlertResolutions(), 40);
}
export async function submitAlertResolution(
  id: string,
  payload: { status: 'resolved' | 'unresolved'; note: string; resolvedBy: string },
): Promise<Record<string, AlertResolution>> {
  return delay(resolveAlert(id, payload), 40);
}
export async function submitAlertReopen(id: string): Promise<Record<string, AlertResolution>> {
  return delay(reopenAlert(id), 40);
}

export async function fetchReportHistory(robotId: string): Promise<ReportMeta[]> {
  return delay(getReportHistory(robotId));
}

export async function fetchPatrolTracks(opts: {
  robotId?: string;
  deployment?: Deployment;
  fromDate?: string;
  toDate?: string;
}): Promise<PatrolTrack[]> {
  return delay(getPatrolTracks(opts));
}

// Report content reads the SAME stats source as the dashboard/Statistiques, so a
// generated report matches what those pages show for the period.
export async function fetchStatsForReport(robotId: string, days: number): Promise<StatsBundle> {
  return delay(getStatistics(robotId, days, 'daily'));
}

export async function fetchStatistics(
  robotId: string,
  days: RangeDays,
  gran: Granularity,
): Promise<StatsBundle> {
  return delay(getStatistics(robotId, days, gran));
}

export async function fetchInfoStats(robotId: string, days: number): Promise<InfoStats | null> {
  return delay(getInfoStats(robotId, days));
}

export type { InfoStats };

// ── Gestion (assignment) ─────────────────────────────────────────────────────
export async function fetchUsers(): Promise<User[]> {
  return delay(getUsers());
}
// assign/unassign a robot to an admin, then return the fresh user list
export async function setAdminAssignment(robotId: string, adminId: string | null): Promise<User[]> {
  setRobotAdmin(robotId, adminId);
  return delay(getUsers(), 60);
}
export async function setClientAssignment(robotId: string, clientId: string): Promise<User[]> {
  assignRobotToClient(robotId, clientId);
  return delay(getUsers(), 60);
}
export async function createClientUser(name: string, email: string): Promise<User[]> {
  createClient(name, email);
  return delay(getUsers(), 60);
}

// Creation (superadmin). Mock fns throw on validation errors → these reject,
// caught by the page. Same shape a FastAPI POST would have.
export async function createAdmin(name: string, email: string, password: string): Promise<User[]> {
  return delay(addAdmin(name, email, password), 60);
}
export async function createClientAccount(name: string, email: string, password: string): Promise<User[]> {
  return delay(addClient(name, email, password), 60);
}
export async function createRobot(input: {
  name: string;
  site: string;
  state: RobotState;
  commissionedAt: string;
}): Promise<Robot[]> {
  return delay(addRobot(input), 60);
}

// Mock auth: seeded users use `demo`; created users use their stored password.
export async function fetchLastKnownTrack(robotId: string): Promise<LastKnownTrack | null> {
  return delay(getLastKnownTrack(robotId), 80);
}
export type { LastKnownTrack };

export async function login(email: string, password: string): Promise<User> {
  const user = USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  const ok = password === 'demo' || passwordFor(email) === password;
  if (!user || !ok) {
    throw new Error('Identifiants invalides');
  }
  return delay(user, 200);
}
