import type { AlertSeverity, AlertType, Region, RobotState } from '../types/contract';

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

// Battery tint by level — green healthy, amber low, red critical.
export function batteryColor(pct: number): string {
  if (pct < 20) return 'text-danger';
  if (pct < 45) return 'text-warning';
  return 'text-success';
}

// Alert type → French row label.
export const ALERT_TYPE_LABEL: Record<AlertType, string> = {
  obstacle: 'Obstacle',
  emergency_stop: "Arrêt d'urgence",
  docking_failed: 'Docking échoué',
  system: 'Système',
};

// Alert severity → dot color token.
export const ALERT_SEVERITY_COLOR: Record<AlertSeverity, string> = {
  info: 'text-muted',
  warning: 'text-warning',
  critical: 'text-danger',
};

// Relative French time vs a reference instant (the frozen mock NOW).
// "il y a 5 min" / "il y a 2 h" / "il y a 3 j".
export function relativeFromNow(iso: string, nowMs: number): string {
  const mins = Math.max(0, Math.round((nowMs - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `il y a ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `il y a ${hours} h`;
  return `il y a ${Math.round(hours / 24)} j`;
}
