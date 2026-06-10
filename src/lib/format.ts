import type { AlertSeverity, AlertType, Region, RobotState } from '../types/contract';
import type { AlertStatus } from '../services/mock';

// State → French label + the semantic token class to tint it (CLAUDE.md:
// running→success, charging→accent, docked→muted, maintenance→warning,
// offline→muted, aborted/critical→danger).
export const STATE_META: Record<RobotState, { label: string; color: string }> = {
  running: { label: 'En ronde', color: 'text-success' },
  charging: { label: 'En charge', color: 'text-accent' },
  docked: { label: 'À quai', color: 'text-muted' },
  maintenance: { label: 'Maintenance', color: 'text-warning' },
  offline: { label: 'Hors ligne', color: 'text-muted' },
};

export const REGION_LABEL: Record<Region, string> = {
  tunisia: 'Tunisie',
  germany: 'Allemagne',
};

// Single source of truth for battery thresholds (used by every bar + percentage):
//   ok    > 50%  (green)
//   low   20–50% (amber)
//   crit  < 20%  (red)
export type BatteryBand = 'ok' | 'low' | 'crit';
export function batteryBand(pct: number): BatteryBand {
  if (pct < 20) return 'crit';
  if (pct <= 50) return 'low';
  return 'ok';
}
// text tint for the percentage label
export function batteryColor(pct: number): string {
  return { crit: 'text-danger', low: 'text-warning', ok: 'text-success' }[batteryBand(pct)];
}

// Fleet attention level — THE single source for "needs attention". Reuses
// batteryBand so there are no separate battery thresholds anywhere:
//   critical = Maintenance OR battery < 20%
//   watch    = battery 20–50%
//   ok       = battery > 50% and a normal status
// "À surveiller" counts critical + watch; the card accent scale keys off this too.
export type AttentionLevel = 'critical' | 'watch' | 'ok';
export function attentionLevel(state: RobotState, battery: number): AttentionLevel {
  if (state === 'maintenance' || batteryBand(battery) === 'crit') return 'critical';
  if (batteryBand(battery) === 'low') return 'watch';
  return 'ok';
}

// Alert type → French row label.
export const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  obstacle: 'Obstacle',
  emergency_stop: "Arrêt d'urgence",
  docking_failed: 'Docking échoué',
  system: 'Système',
};

// Alert severity → text color token (for the severity label).
export const ALERT_SEVERITY_COLOR: Record<AlertSeverity, string> = {
  info: 'text-accent',
  warning: 'text-warning',
  critical: 'text-danger',
};

// Alert severity → short label.
export const ALERT_SEVERITY_LABEL: Record<AlertSeverity, string> = {
  info: 'Info',
  warning: 'Alerte',
  critical: 'Critique',
};

// Resolution status (user-driven, from the resolution overlay — see mock).
// open = En cours (default), resolved = Résolu, unresolved = Non résolu.
export const ALERT_STATUS_META: Record<AlertStatus, { label: string; color: string }> = {
  open: { label: 'En cours', color: 'text-warning' },
  resolved: { label: 'Résolu', color: 'text-success' },
  unresolved: { label: 'Non résolu', color: 'text-danger' },
};

// Alert type → icon (svg path). obstacle = warning triangle, emergency_stop =
// octagon (stop), docking_failed = plug, system = gear.
export const ALERT_TYPE_ICON: Record<AlertType, string> = {
  obstacle: 'M12 3l9 16H3zM12 9v4M12 17h.01',
  emergency_stop: 'M8 3h8l5 5v8l-5 5H8l-5-5V8zM12 8v4M12 16h.01',
  docking_failed: 'M9 3v4M15 3v4M7 7h10v4a5 5 0 01-10 0zM12 16v5',
  system: 'M12 9a3 3 0 100 6 3 3 0 000-6zM19 12l2 1-2 4-2-1M5 12l-2 1 2 4 2-1',
};

// Exact French date-time, e.g. "7 juin 2026 à 19:30".
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Relative French time vs a reference instant (the frozen mock NOW).
// "il y a 5 min" / "il y a 2 h" / "il y a 3 j".
export function relativeFromNow(iso: string, nowMs: number): string {
  const mins = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}
