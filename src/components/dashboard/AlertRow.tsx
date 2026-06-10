import type { Alert } from '../../types/contract';
import {
  ALERT_SEVERITY_COLOR,
  ALERT_SEVERITY_LABEL,
  ALERT_STATUS_META,
  ALERT_TYPE_ICON,
  ALERT_TYPE_LABEL,
  relativeFromNow,
} from '../../lib/format';
import type { AlertStatus } from '../../services/mock';

// One alert row, shared by the dashboard "Alertes récentes" panel and the full
// Alertes page. Layout: [severity-tinted type-icon chip] [type + severity]
// [relative time] [description]. Critical rows get a red background wash.
// `onClick`/`active` are used by the Alertes page (row selection → detail).
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
  const st = ALERT_STATUS_META[status];
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
        <div className="truncate text-sm font-semibold">{ALERT_TYPE_LABEL[a.type]}</div>
        <div className={`text-[11px] font-medium ${ALERT_SEVERITY_COLOR[a.severity]}`}>
          {ALERT_SEVERITY_LABEL[a.severity]}
        </div>
      </div>

      <span className="w-20 shrink-0 text-xs tabular-nums text-muted">{relativeFromNow(a.occurredAt, nowMs)}</span>

      <span className="min-w-0 flex-1 truncate text-sm text-muted">{a.description}</span>

      {/* resolution status pill (live, from the resolution overlay) */}
      <span className={`shrink-0 rounded-full border border-current px-2 py-0.5 text-[11px] font-medium ${st.color}`}>
        {st.label}
      </span>
    </button>
  );
}
