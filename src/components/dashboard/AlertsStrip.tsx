import { Link } from 'react-router-dom';
import type { Alert } from '../../types/contract';
import { ALERT_SEVERITY_COLOR, ALERT_TYPE_LABEL, relativeFromNow } from '../../lib/format';
import { NOW } from '../../services/mock';

// "Alertes récentes" panel (CHANGE B): the latest alerts for this robot, newest
// first, with a "Voir tout" link to the full alerts page. Relative times are
// measured against the frozen mock clock (NOW) so they stay stable.
export function AlertsStrip({ robotId, alerts }: { robotId: string; alerts: Alert[] }) {
  const nowMs = NOW.getTime();

  return (
    <section className="surface-card p-card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[18px] font-medium">Alertes récentes</h3>
        <Link
          to={`/robots/${robotId}/alertes`}
          className="text-[13px] text-muted transition-colors hover:text-accent"
        >
          Voir tout →
        </Link>
      </div>

      {alerts.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">Aucune alerte récente</p>
      ) : (
        <ul className="divide-y divide-border">
          {/* row mapping: severity dot (color by severity) · type label · relative
              time · short description */}
          {alerts.map((a) => (
            <li key={a.id} className="flex items-center gap-3 py-2.5 text-sm">
              <span className={`text-base leading-none ${ALERT_SEVERITY_COLOR[a.severity]}`} aria-hidden>
                ●
              </span>
              <span className="w-32 shrink-0 font-medium">{ALERT_TYPE_LABEL[a.type]}</span>
              <span className="w-24 shrink-0 text-muted">{relativeFromNow(a.occurredAt, nowMs)}</span>
              <span className="truncate text-muted">{a.description}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
