import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, Activity, Info } from 'lucide-react';
import type { Alert, AlertResolution, AlertSeverity, AlertStatus } from '../../types/contract';
import { fetchAlertResolutions } from '../../services/api';
import { ALERT_SEVERITY_COLOR, formatDateTime } from '../../lib/format';
import { useT, useLang } from '../../theme/LanguageContext';

// Same severity icon set + table shape as the Alertes page, condensed to fit
// a dashboard card (no filters/summary cards, just the row list).
const SEV_ICON: Record<AlertSeverity, typeof AlertTriangle> = {
  critical: AlertTriangle,
  warning: Activity,
  info: Info,
};
const ALERT_TYPE_TKEY: Record<Alert['type'], string> = {
  obstacle: 'alert.type.obstacle',
  emergency_stop: 'alert.type.estop',
  docking_failed: 'alert.type.docking',
  system: 'alert.type.system',
};
const ALERT_SEV_TKEY: Record<AlertSeverity, string> = {
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

export function AlertsStrip({ robotId, alerts }: { robotId: string; alerts: Alert[] }) {
  const t = useT();
  const { lang } = useLang();
  const [res, setRes] = useState<Record<string, AlertResolution>>({});
  useEffect(() => {
    fetchAlertResolutions().then(setRes);
  }, []);

  return (
    <section className="surface-card min-w-0 p-card">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[18px] font-medium">{t('alerts.strip.title')}</h3>
        <Link
          to={`/robots/${robotId}/alertes`}
          className="text-[13px] text-muted transition-colors hover:text-accent"
        >
          {t('alerts.strip.viewAll')}
        </Link>
      </div>

      {alerts.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{t('alerts.strip.empty')}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-sm">
            <tbody className="divide-y divide-border">
              {alerts.map((a) => {
                const status = res[a.id]?.status ?? 'open';
                const Icon = SEV_ICON[a.severity];
                return (
                  <tr key={a.id} className="transition-colors hover:bg-surface-2/60">
                    <td className="py-2.5 pr-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${ALERT_SEVERITY_COLOR[a.severity]}`}>
                        <Icon size={14} strokeWidth={2} />
                        {t(ALERT_SEV_TKEY[a.severity] as Parameters<typeof t>[0])}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="font-medium">{t(ALERT_TYPE_TKEY[a.type] as Parameters<typeof t>[0])}</div>
                      <div className="truncate text-xs text-muted">
                        {a.descKey ? t(a.descKey as Parameters<typeof t>[0]) : a.description}
                      </div>
                    </td>
                    <td className="py-2.5 pr-3 text-xs tabular-nums text-muted">
                      {formatDateTime(a.occurredAt, lang as 'fr' | 'en')}
                    </td>
                    <td className="py-2.5 pr-1 text-right">
                      <span className={`rounded-full border border-current px-2 py-0.5 text-[11px] font-medium ${ALERT_STATUS_COLOR[status]}`}>
                        {t(ALERT_STATUS_TKEY[status] as Parameters<typeof t>[0])}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
