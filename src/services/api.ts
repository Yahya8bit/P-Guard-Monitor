// Public mock-service surface. Everything is async + returns the frozen
// contract shapes, so swapping these bodies for real `fetch` calls later needs
// no change at the call sites. Data itself is deterministic (see mock.ts).
import type { Alert, BatterySample, DashboardSummary, Granularity, Period, Robot, TrendSeries, User } from '../types/contract';
import {
  ROBOTS,
  USERS,
  getBatterySamples,
  getDashboardSummary,
  getIncidentBreakdown,
  getMetricTrend,
  getRecentAlerts,
  getStatistics,
  type RangeDays,
  type StatsBundle,
  type TrendMetric,
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

export async function fetchStatistics(
  robotId: string,
  days: RangeDays,
  gran: Granularity,
): Promise<StatsBundle> {
  return delay(getStatistics(robotId, days, gran));
}

// Mock auth: any of the three demo users + password `demo`. Shaped like a real
// login (returns the user record a JWT would carry) so REST/JWT drops in later.
export async function login(email: string, password: string): Promise<User> {
  const user = USERS.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || password !== 'demo') {
    throw new Error('Identifiants invalides');
  }
  return delay(user, 200);
}
