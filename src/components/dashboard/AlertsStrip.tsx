import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Alert } from '../../types/contract';
import { NOW, type AlertResolution } from '../../services/mock';
import { fetchAlertResolutions } from '../../services/api';
import { AlertRow } from './AlertRow';

// "Alertes récentes" — a compact, scannable log feed (newest first).
// Mappings (commented for reference):
//   severity → color/label: info=accent/Info · warning=warning/Alerte ·
//     critical=danger/Critique  (ALERT_SEVERITY_COLOR / _LABEL)
//   type → icon: obstacle=triangle · emergency_stop=octagon · docking_failed=plug
//     · system=gear  (ALERT_TYPE_ICON)
// Each row: [severity-tinted type-icon chip] [type + severity] [time] [desc].
// Critical rows get a red background wash (.alert-row--critical).
export function AlertsStrip({ robotId, alerts }: { robotId: string; alerts: Alert[] }) {
  const nowMs = NOW.getTime();
  // live resolution status per alert (default "open" when no entry)
  const [res, setRes] = useState<Record<string, AlertResolution>>({});
  useEffect(() => {
    fetchAlertResolutions().then(setRes);
  }, []);

  return (
    <section className="surface-card p-card">
      <div className="mb-2 flex items-center justify-between">
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
        <div className="divide-y divide-border">
          {alerts.map((a) => (
            <AlertRow key={a.id} alert={a} nowMs={nowMs} status={res[a.id]?.status ?? 'open'} />
          ))}
        </div>
      )}
    </section>
  );
}
