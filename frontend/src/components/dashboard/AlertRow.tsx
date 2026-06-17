import type { Alert } from '../../types/contract';
import {
  ALERT_SEVERITY_COLOR,
  ALERT_TYPE_ICON,
  relativeFromNow,
} from '../../lib/format';
import type { AlertStatus } from '../../services/mock';
import { useT } from '../../theme/LanguageContext';
import { useLang } from '../../theme/LanguageContext';

const ALERT_TYPE_TKEY: Record<Alert['type'], string> = {
  obstacle: 'alert.type.obstacle',
  emergency_stop: 'alert.type.estop',
  docking_failed: 'alert.type.docking',
  system: 'alert.type.system',
};
const ALERT_SEV_TKEY: Record<Alert['severity'], string> = {
  info: 'alert.sev.info',
  warning: 'alert.sev.warning',
  critical: 'alert.sev.critical',
};
const ALERT_STATUS_COLOR: Record<AlertStatus, string> = {
  open: 'text-warning',
  resolved: 'text-success',
  unresolved: 'text-danger',
};
const ALERT_STATUS_TKEY: Record<AlertStatus, string> = {
  open: 'alert.status.open',
  resolved: 'alert.status.resolved',
  unresolved: 'alert.status.unresolved',
};

export function AlertRow({
  alert: a,
  nowMs,
  status,
  onClick,
  active,
}: {
  alert: Alert;
  nowMs: number;
  status: AlertStatus;
  onClick?: () => void;
  active?: boolean;
}) {
  const t = useT();
  const { lang } = useLang();
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex w-full items-center gap-3 rounded-[6px] px-2 py-2 text-left transition-colors',
        onClick ? 'cursor-pointer hover:bg-surface-2' : 'cursor-default',
        active ? 'bg-surface-2 ring-1 ring-inset ring-accent' : '',
        a.severity === 'critical' ? 'alert-row--critical' : '',
      ].join(' ')}
    >
      <span className="alert-chip shrink-0" data-sev={a.severity}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d={ALERT_TYPE_ICON[a.type]} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>

      <div className="w-36 shrink-0">
        <div className="truncate text-sm font-semibold">{t(ALERT_TYPE_TKEY[a.type] as Parameters<typeof t>[0])}</div>
        <div className={`text-[11px] font-medium ${ALERT_SEVERITY_COLOR[a.severity]}`}>
          {t(ALERT_SEV_TKEY[a.severity] as Parameters<typeof t>[0])}
        </div>
      </div>

      <span className="w-20 shrink-0 text-xs tabular-nums text-muted">{relativeFromNow(a.occurredAt, nowMs, lang)}</span>

      <span className="min-w-0 flex-1 truncate text-sm text-muted">
        {a.descKey ? t(a.descKey as Parameters<typeof t>[0]) : a.description}
      </span>

      <span className={`shrink-0 rounded-full border border-current px-2 py-0.5 text-[11px] font-medium ${ALERT_STATUS_COLOR[status]}`}>
        {t(ALERT_STATUS_TKEY[status] as Parameters<typeof t>[0])}
      </span>
    </button>
  );
}
