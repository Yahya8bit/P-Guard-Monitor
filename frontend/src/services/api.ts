// Everything here hits the real Django backend and returns the frozen contract shapes.
import type {
  Alert,
  AlertResolution,
  BatterySample,
  DashboardSummary,
  Deployment,
  Granularity,
  InfoStats,
  LastKnownTrack,
  PatrolTrack,
  Period,
  RangeDays,
  ReportMeta,
  Robot,
  RobotState,
  StatsBundle,
  TrendMetric,
  TrendSeries,
  User,
} from '../types/contract';
import { apiFetch, setToken } from './http';

export async function listRobots(): Promise<Robot[]> {
  return apiFetch<Robot[]>('/robots/');
}

export async function getRobot(id: string): Promise<Robot | undefined> {
  return apiFetch<Robot>(`/robots/${id}/`).catch(() => undefined);
}

export async function fetchDashboard(robotId: string, period: Period): Promise<DashboardSummary> {
  return apiFetch<DashboardSummary>(`/robots/${robotId}/dashboard/?period=${period}`);
}

export async function fetchMetricTrend(
  robotId: string,
  period: Period,
  metric: TrendMetric,
): Promise<TrendSeries> {
  return apiFetch<TrendSeries>(`/robots/${robotId}/trend/?period=${period}&metric=${metric}`);
}

export async function fetchBatterySamples(robotId: string, period: Period): Promise<BatterySample[]> {
  return apiFetch<BatterySample[]>(`/robots/${robotId}/battery/?period=${period}`);
}

export async function fetchIncidentBreakdown(robotId: string, period: Period) {
  return apiFetch<{ obstacles: number; emergencyStops: number; total: number }>(
    `/robots/${robotId}/incidents-breakdown/?period=${period}`,
  );
}

export async function fetchRecentAlerts(robotId: string, limit = 4): Promise<Alert[]> {
  return apiFetch<Alert[]>(`/robots/${robotId}/alerts/?limit=${limit}`);
}

export async function fetchRobotAlerts(robotId: string): Promise<Alert[]> {
  return apiFetch<Alert[]>(`/robots/${robotId}/alerts/`);
}

export async function fetchAlertResolutions(): Promise<Record<string, AlertResolution>> {
  return apiFetch<Record<string, AlertResolution>>('/alerts/resolutions/');
}
export async function submitAlertResolution(
  id: string,
  payload: { status: 'resolved' | 'unresolved'; note: string; resolvedBy: string },
): Promise<Record<string, AlertResolution>> {
  return apiFetch<Record<string, AlertResolution>>(`/alerts/${id}/resolve/`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
export async function submitAlertReopen(id: string): Promise<Record<string, AlertResolution>> {
  return apiFetch<Record<string, AlertResolution>>(`/alerts/${id}/reopen/`, { method: 'POST' });
}

export async function fetchReportHistory(robotId: string): Promise<ReportMeta[]> {
  return apiFetch<ReportMeta[]>(`/robots/${robotId}/reports/`);
}

export async function fetchPatrolTracks(opts: {
  robotId?: string;
  deployment?: Deployment;
  fromDate?: string;
  toDate?: string;
}): Promise<PatrolTrack[]> {
  const params = new URLSearchParams();
  if (opts.robotId) params.set('robotId', opts.robotId);
  if (opts.deployment) params.set('deployment', opts.deployment);
  if (opts.fromDate) params.set('fromDate', opts.fromDate);
  if (opts.toDate) params.set('toDate', opts.toDate);
  return apiFetch<PatrolTrack[]>(`/patrol-tracks/?${params.toString()}`);
}

// Report content reads the SAME stats source as the dashboard/Statistiques, so a
// generated report matches what those pages show for the period.
export async function fetchStatsForReport(robotId: string, days: number): Promise<StatsBundle> {
  return apiFetch<StatsBundle>(`/robots/${robotId}/statistics/?days=${days}&granularity=daily`);
}

export async function fetchStatistics(
  robotId: string,
  days: RangeDays,
  gran: Granularity,
): Promise<StatsBundle> {
  return apiFetch<StatsBundle>(`/robots/${robotId}/statistics/?days=${days}&granularity=${gran}`);
}

export async function fetchInfoStats(robotId: string, days: number): Promise<InfoStats | null> {
  return apiFetch<InfoStats | null>(`/robots/${robotId}/info-stats/?days=${days}`);
}

export type { InfoStats };

// ── Gestion (assignment) ─────────────────────────────────────────────────────
export async function fetchUsers(): Promise<User[]> {
  return apiFetch<User[]>('/users/');
}
// assign/unassign a robot to an admin, then return the fresh user list
export async function setAdminAssignment(robotId: string, adminId: string | null): Promise<User[]> {
  return apiFetch<User[]>(`/robots/${robotId}/assign-admin/`, {
    method: 'POST',
    body: JSON.stringify({ adminId }),
  });
}
export async function setClientAssignment(robotId: string, clientId: string): Promise<User[]> {
  return apiFetch<User[]>(`/robots/${robotId}/assign-client/`, {
    method: 'POST',
    body: JSON.stringify({ clientId }),
  });
}
// Quick-assign flow: password optional (backend falls back to "demo" if omitted).
export async function createClientUser(name: string, email: string, password?: string): Promise<User[]> {
  return apiFetch<User[]>('/clients/', { method: 'POST', body: JSON.stringify({ name, email, password }) });
}

// Creation (superadmin). Backend rejects on validation errors (400 + detail) →
// apiFetch throws, caught by the page.
export async function createAdmin(name: string, email: string, password: string): Promise<User[]> {
  return apiFetch<User[]>('/admins/', { method: 'POST', body: JSON.stringify({ name, email, password }) });
}
export async function deleteAdmin(adminId: string): Promise<User[]> {
  return apiFetch<User[]>(`/admins/${adminId}/`, { method: 'DELETE' });
}
export async function deleteClient(clientId: string): Promise<User[]> {
  return apiFetch<User[]>(`/clients/${clientId}/`, { method: 'DELETE' });
}
export async function createClientAccount(name: string, email: string, password: string): Promise<User[]> {
  return apiFetch<User[]>('/clients/', { method: 'POST', body: JSON.stringify({ name, email, password }) });
}
export async function createRobot(input: {
  name: string;
  site: string;
  state: RobotState;
  commissionedAt: string;
}): Promise<Robot[]> {
  return apiFetch<Robot[]>('/robots/create/', { method: 'POST', body: JSON.stringify(input) });
}

export async function fetchLastKnownTrack(robotId: string): Promise<LastKnownTrack | null> {
  return apiFetch<LastKnownTrack | null>(`/robots/${robotId}/last-known-track/`);
}
export type { LastKnownTrack };

export async function login(email: string, password: string): Promise<User> {
  const { access, user } = await apiFetch<{ access: string; user: User }>('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(access);
  return user;
}

// ── Paramètres (account security) ────────────────────────────────────────────
export async function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiFetch<{ detail: string }>('/auth/change-password/', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
export async function fetchNotificationPref(): Promise<boolean> {
  return (await apiFetch<{ enabled: boolean }>('/auth/notifications/')).enabled;
}
export async function setNotificationPref(enabled: boolean): Promise<boolean> {
  return (await apiFetch<{ enabled: boolean }>('/auth/notifications/', {
    method: 'PATCH',
    body: JSON.stringify({ enabled }),
  })).enabled;
}
