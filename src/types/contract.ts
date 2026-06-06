// Frozen data contract — mirrors CLAUDE.md exactly. The mock service in
// src/services/* returns these shapes; real ETL JSON / REST swaps in later
// with zero UI change. Do NOT drift these types.

export type Role = 'superadmin' | 'admin' | 'client';
export type RobotState = 'running' | 'charging' | 'docked' | 'maintenance' | 'offline';
export type Region = 'tunisia' | 'germany';
export type Period = '7d' | '30d' | 'custom';
export type Granularity = 'daily' | 'weekly' | 'monthly';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  assignedRobotIds: string[];
}

export interface Robot {
  id: string;
  name: string;
  site: string;
  region: Region;
  state: RobotState;
  currentMission: string | null;
  battery: number;
  commissionedAt: string;
}

export interface KpiValue {
  value: number;
  unit: 'count' | '%';
  deltaPct?: number;
  sparkline?: number[];
}

export interface DashboardSummary {
  robotId: string;
  period: Period;
  status: {
    state: RobotState;
    currentMission: string | null;
    battery: number;
    lastSeen: string;
  };
  kpis: {
    rounds: KpiValue; // Rondes effectuées
    incidents: KpiValue; // OPERATIONAL proxy (obstacle + e-stop)
    chargeCycles: KpiValue; // Cycles de charge
    availability: KpiValue; // % — TODO formula; placeholder until fixed
  };
}

export interface TrendPoint {
  t: string;
  value: number;
}
export interface TrendSeries {
  metric: string;
  granularity: Granularity;
  points: TrendPoint[];
}

// Battery is EVENT-SAMPLED at dock/undock — render stepped/scatter with gaps.
export interface BatterySample {
  t: string;
  pct: number;
  phase: 'dock' | 'undock';
}

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertType = 'obstacle' | 'emergency_stop' | 'docking_failed' | 'system';
export interface Alert {
  id: string;
  robotId: string;
  type: AlertType;
  severity: AlertSeverity;
  occurredAt: string;
  missionId: string | null;
  description: string;
  mediaUrl: string | null;
  acknowledged: boolean;
}

export interface GpsPoint {
  t: string;
  lat: number;
  lng: number;
  region: Region;
}
export interface PatrolPath {
  robotId: string;
  period: Period;
  points: GpsPoint[];
}

export interface ReportMeta {
  id: string;
  robotId: string;
  period: Period;
  format: 'pdf' | 'csv';
  generatedAt: string;
  sizeKb: number;
}
