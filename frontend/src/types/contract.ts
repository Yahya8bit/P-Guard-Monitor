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
  descKey?: string;
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

export type TrendMetric = 'rounds' | 'incidents' | 'charges' | 'disponibilite';

export type AlertStatus = 'open' | 'resolved' | 'unresolved';
export interface AlertResolution {
  status: 'resolved' | 'unresolved';
  note: string;
  resolvedBy: string;
  resolvedAt: string;
}

export type Deployment = 'tunisia' | 'germany';
export interface PatrolTrack {
  date: string;
  mission: string;
  deployment: Deployment;
  points: [number, number][];
}

export type RangeDays = 7 | 30 | 90;

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
    disponibilite: number; // % — real (kpi_seed overall)
    autonomie: number; // % — real (kpi_seed overall)
  };
  roundsSuccess: { label: string; completed: number; interrupted: number }[];
  emergency: { label: string; value: number }[];
  distance: { label: string; value: number }[];
  dispoTrend: { label: string; value: number }[]; // daily Disponibilité (real values)
  autonomieTrend: { label: string; value: number }[]; // daily Taux d'autonomie (real values)
  hourly: { matrix: number[][]; max: number };
}

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

export interface LastKnownTrack {
  date: string; // ISO YYYY-MM-DD
  mission: string;
  points: [number, number][];
  lastPoint: [number, number];
}
