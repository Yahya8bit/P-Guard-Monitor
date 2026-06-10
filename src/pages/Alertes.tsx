import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AlertRow } from '../components/dashboard/AlertRow';
import { fetchAlertResolutions, fetchRobotAlerts, submitAlertReopen, submitAlertResolution } from '../services/api';
import { NOW, type AlertResolution, type AlertStatus } from '../services/mock';
import {
  ALERT_SEVERITY_COLOR,
  ALERT_SEVERITY_LABEL,
  ALERT_STATUS_META,
  ALERT_TYPE_LABEL,
  formatDateTime,
} from '../lib/format';
import type { Alert, AlertSeverity, AlertType } from '../types/contract';

const TYPE_TABS: { key: AlertType | 'all'; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'obstacle', label: 'Obstacles' },
  { key: 'emergency_stop', label: "Arrêts d'urgence" },
  { key: 'docking_failed', label: 'Docking' },
  { key: 'system', label: 'Système' },
];
const SEV_TABS: { key: AlertSeverity | 'all'; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'info', label: 'Info' },
  { key: 'warning', label: 'Alerte' },
  { key: 'critical', label: 'Critique' },
];
const STATUS_TABS: { key: 'all' | AlertStatus; label: string }[] = [
  { key: 'all', label: 'Toutes' },
  { key: 'open', label: 'En cours' },
  { key: 'resolved', label: 'Résolu' },
  { key: 'unresolved', label: 'Non résolu' },
];
const RANGES = [7, 30, 90] as const;

function Tabs<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-btn border border-border p-0.5">
      {options.map((o) => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={[
            'rounded-[6px] px-3 py-1.5 text-sm transition-colors',
            value === o.key ? 'bg-accent font-medium text-[#04201d]' : 'text-muted hover:text-text',
          ].join(' ')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Alertes() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const nowMs = NOW.getTime();
  const [all, setAll] = useState<Alert[]>([]);
  const [res, setRes] = useState<Record<string, AlertResolution>>({});
  const [loaded, setLoaded] = useState(false);
  const [typeF, setTypeF] = useState<AlertType | 'all'>('all');
  const [sevF, setSevF] = useState<AlertSeverity | 'all'>('all');
  const [statusF, setStatusF] = useState<'all' | AlertStatus>('all');
  const [rangeF, setRangeF] = useState<(typeof RANGES)[number]>(90);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    setLoaded(false);
    Promise.all([fetchRobotAlerts(id), fetchAlertResolutions()]).then(([a, r]) => {
      setAll(a);
      setRes(r);
      setLoaded(true);
    });
  }, [id]);

  // live status per alert (default "open" when no resolution entry exists)
  const statusOf = (a: Alert): AlertStatus => res[a.id]?.status ?? 'open';

  // FILTER LOGIC — type, severity, STATUS and day-range combine with AND.
  // Status is the LIVE resolution status (open/resolved/unresolved).
  const filtered = useMemo(() => {
    const cutoff = nowMs - rangeF * 86_400_000;
    return all.filter(
      (a) =>
        (typeF === 'all' || a.type === typeF) &&
        (sevF === 'all' || a.severity === sevF) &&
        (statusF === 'all' || (res[a.id]?.status ?? 'open') === statusF) &&
        new Date(a.occurredAt).getTime() >= cutoff,
    );
  }, [all, res, typeF, sevF, statusF, rangeF, nowMs]);

  const selected = filtered.find((a) => a.id === selectedId) ?? null;
  const selRes = selected ? res[selected.id] : undefined;

  // resolution form state (reset when switching alerts)
  const [resType, setResType] = useState<'resolved' | 'unresolved'>('resolved');
  const [note, setNote] = useState('');
  useEffect(() => {
    setResType('resolved');
    setNote('');
  }, [selectedId]);

  const doResolve = async () => {
    if (!selected || !note.trim()) return; // note REQUIRED to close
    setRes(await submitAlertResolution(selected.id, { status: resType, note: note.trim(), resolvedBy: user?.name ?? 'Inconnu' }));
    setNote('');
  };
  const doReopen = async () => {
    if (!selected) return;
    setRes(await submitAlertReopen(selected.id));
  };

  return (
    <div className="flex w-full flex-col gap-6">
      {/* 1. Filter bar */}
      <div className="surface-card flex flex-wrap items-center gap-x-6 gap-y-3 p-card">
        <div>
          <div className="mb-1 text-xs text-muted">Type</div>
          <Tabs options={TYPE_TABS} value={typeF} onChange={setTypeF} />
        </div>
        <div>
          <div className="mb-1 text-xs text-muted">Sévérité</div>
          <Tabs options={SEV_TABS} value={sevF} onChange={setSevF} />
        </div>
        <div>
          <div className="mb-1 text-xs text-muted">Statut</div>
          <Tabs options={STATUS_TABS} value={statusF} onChange={setStatusF} />
        </div>
        <div>
          <div className="mb-1 text-xs text-muted">Période</div>
          <Tabs options={RANGES.map((r) => ({ key: r, label: `${r} j` }))} value={rangeF} onChange={setRangeF} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        {/* 2. List */}
        <div className="surface-card p-card">
          {/* hold the empty-state until the fetch resolves, so "Aucune alerte"
              never flashes over data that's still loading. */}
          {!loaded ? (
            <div className="space-y-2">
              <div className="skeleton mb-2 h-5 w-24" />
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="skeleton h-12 w-full" />
              ))}
            </div>
          ) : (
            <>
              <div className="mb-2 text-sm text-muted">
                {filtered.length} alerte{filtered.length > 1 ? 's' : ''}
              </div>
              {filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted">Aucune alerte pour ces filtres</p>
              ) : (
                <div className="divide-y divide-border">
                  {filtered.map((a) => (
                    <AlertRow
                      key={a.id}
                      alert={a}
                      nowMs={nowMs}
                      status={statusOf(a)}
                      onClick={() => setSelectedId(a.id)}
                      active={a.id === selectedId}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* 3. Detail panel */}
        <aside className="surface-card h-fit p-card lg:sticky lg:top-4">
          {!selected ? (
            <p className="py-10 text-center text-sm text-muted">Sélectionnez une alerte pour le détail</p>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[18px] font-medium">{ALERT_TYPE_LABEL[selected.type]}</h3>
                <span className={`text-sm font-medium ${ALERT_SEVERITY_COLOR[selected.severity]}`}>
                  {ALERT_SEVERITY_LABEL[selected.severity]}
                </span>
              </div>

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Date</dt>
                  <dd className="text-right font-medium">{formatDateTime(selected.occurredAt)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">Type</dt>
                  <dd className="font-medium">{ALERT_TYPE_LABEL[selected.type]}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">Statut</dt>
                  {/* live resolution status pill */}
                  <dd>
                    <span
                      className={`rounded-full border border-current px-2 py-0.5 text-[11px] font-medium ${ALERT_STATUS_META[statusOf(selected)].color}`}
                    >
                      {ALERT_STATUS_META[statusOf(selected)].label}
                    </span>
                  </dd>
                </div>
              </dl>

              <p className="mt-4 rounded-btn border border-border bg-surface-2 p-3 text-sm">
                {selected.description}
              </p>

              {selected.missionId && (
                <Link
                  to={`/robots/${id}/rapports?mission=${selected.missionId}`}
                  className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
                >
                  Voir la mission {selected.missionId} →
                </Link>
              )}

              {/* RESOLUTION — untreated: pick outcome + required note; treated:
                  show note/resolvedBy/resolvedAt + allow re-open. */}
              <div className="mt-5 border-t border-border pt-4">
                {selRes ? (
                  <div className="space-y-2 text-sm">
                    <div className="text-muted">Note de résolution</div>
                    <p className="rounded-btn border border-border bg-surface-2 p-3">{selRes.note}</p>
                    <div className="text-xs text-muted">
                      Par {selRes.resolvedBy} · {formatDateTime(selRes.resolvedAt)}
                    </div>
                    <button
                      type="button"
                      onClick={doReopen}
                      className="mt-1 rounded-btn border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent"
                    >
                      Rouvrir (En cours)
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm font-medium">Traiter l'alerte</div>
                    <div className="flex gap-1 rounded-btn border border-border p-0.5">
                      {(['resolved', 'unresolved'] as const).map((k) => (
                        <button
                          key={k}
                          onClick={() => setResType(k)}
                          className={[
                            'flex-1 rounded-[6px] px-2.5 py-1.5 text-sm transition-colors',
                            resType === k ? 'bg-accent font-medium text-[#04201d]' : 'text-muted hover:text-text',
                          ].join(' ')}
                        >
                          {ALERT_STATUS_META[k].label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      placeholder="Note de résolution (obligatoire)…"
                      className="w-full resize-none rounded-btn border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={doResolve}
                      disabled={!note.trim()}
                      className="btn-accent w-full px-4 py-2 disabled:opacity-50"
                    >
                      Valider
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
