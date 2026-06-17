import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useT } from '../theme/LanguageContext';
import { AlertRow } from '../components/dashboard/AlertRow';
import { fetchAlertResolutions, fetchRobotAlerts, submitAlertReopen, submitAlertResolution } from '../services/api';
import { NOW, type AlertResolution, type AlertStatus } from '../services/mock';
import {
  ALERT_SEVERITY_COLOR,
  formatDateTime,
} from '../lib/format';
import { useLang } from '../theme/LanguageContext';
import type { Alert, AlertSeverity, AlertType } from '../types/contract';

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
  const t = useT();
  const { lang } = useLang();
  const nowMs = NOW.getTime();

  const ALERT_TYPE_TKEY: Record<string, Parameters<typeof t>[0]> = {
    obstacle: 'alert.type.obstacle',
    emergency_stop: 'alert.type.estop',
    docking_failed: 'alert.type.docking',
    system: 'alert.type.system',
  };
  const ALERT_SEV_TKEY: Record<string, Parameters<typeof t>[0]> = {
    info: 'alert.sev.info',
    warning: 'alert.sev.warning',
    critical: 'alert.sev.critical',
  };
  const ALERT_STATUS_TKEY: Record<string, Parameters<typeof t>[0]> = {
    open: 'alert.status.open',
    resolved: 'alert.status.resolved',
    unresolved: 'alert.status.unresolved',
  };
  const ALERT_STATUS_COLOR: Record<string, string> = {
    open: 'text-warning',
    resolved: 'text-success',
    unresolved: 'text-danger',
  };

  const TYPE_TABS: { key: AlertType | 'all'; label: string }[] = [
    { key: 'all',           label: t('alerts.type.all') },
    { key: 'obstacle',      label: t('alerts.type.obstacle') },
    { key: 'emergency_stop',label: t('alerts.type.estop') },
    { key: 'docking_failed',label: t('alerts.type.docking') },
    { key: 'system',        label: t('alerts.type.system') },
  ];
  const SEV_TABS: { key: AlertSeverity | 'all'; label: string }[] = [
    { key: 'all',      label: t('alerts.sev.all') },
    { key: 'info',     label: t('alerts.sev.info') },
    { key: 'warning',  label: t('alerts.sev.warning') },
    { key: 'critical', label: t('alerts.sev.critical') },
  ];
  const STATUS_TABS: { key: 'all' | AlertStatus; label: string }[] = [
    { key: 'all',        label: t('alerts.status.all') },
    { key: 'open',       label: t('alerts.status.open') },
    { key: 'resolved',   label: t('alerts.status.resolved') },
    { key: 'unresolved', label: t('alerts.status.unresolved') },
  ];
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
    setRes(await submitAlertResolution(selected.id, { status: resType, note: note.trim(), resolvedBy: user?.name ?? t('common.unknown') }));
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
          <div className="mb-1 text-xs text-muted">{t('alerts.filter.type')}</div>
          <Tabs options={TYPE_TABS} value={typeF} onChange={setTypeF} />
        </div>
        <div>
          <div className="mb-1 text-xs text-muted">{t('alerts.filter.severity')}</div>
          <Tabs options={SEV_TABS} value={sevF} onChange={setSevF} />
        </div>
        <div>
          <div className="mb-1 text-xs text-muted">{t('alerts.filter.status')}</div>
          <Tabs options={STATUS_TABS} value={statusF} onChange={setStatusF} />
        </div>
        <div>
          <div className="mb-1 text-xs text-muted">{t('alerts.filter.period')}</div>
          <Tabs options={RANGES.map((r) => ({ key: r, label: t(`stats.range.${r}` as Parameters<typeof t>[0]) }))} value={rangeF} onChange={setRangeF} />
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
                {t('alerts.count', { n: filtered.length, s: filtered.length > 1 ? 's' : '' })}
              </div>
              {filtered.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted">{t('alerts.empty')}</p>
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
            <p className="py-10 text-center text-sm text-muted">{t('alerts.select')}</p>
          ) : (
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[18px] font-medium">{t(ALERT_TYPE_TKEY[selected.type])}</h3>
                <span className={`text-sm font-medium ${ALERT_SEVERITY_COLOR[selected.severity]}`}>
                  {t(ALERT_SEV_TKEY[selected.severity])}
                </span>
              </div>

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">{t('alert.detail.date')}</dt>
                  <dd className="text-right font-medium">{formatDateTime(selected.occurredAt, lang as 'fr' | 'en')}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-muted">{t('alert.detail.type')}</dt>
                  <dd className="font-medium">{t(ALERT_TYPE_TKEY[selected.type])}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted">{t('alert.detail.status')}</dt>
                  <dd>
                    <span
                      className={`rounded-full border border-current px-2 py-0.5 text-[11px] font-medium ${ALERT_STATUS_COLOR[statusOf(selected)]}`}
                    >
                      {t(ALERT_STATUS_TKEY[statusOf(selected)])}
                    </span>
                  </dd>
                </div>
              </dl>

              <p className="mt-4 rounded-btn border border-border bg-surface-2 p-3 text-sm">
                {selected.descKey ? t(selected.descKey as Parameters<typeof t>[0]) : selected.description}
              </p>

              {selected.missionId && (
                <Link
                  to={`/robots/${id}/rapports?mission=${selected.missionId}`}
                  className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
                >
                  {t('alert.detail.mission', { id: selected.missionId })}
                </Link>
              )}

              {/* RESOLUTION — untreated: pick outcome + required note; treated:
                  show note/resolvedBy/resolvedAt + allow re-open. */}
              <div className="mt-5 border-t border-border pt-4">
                {selRes ? (
                  <div className="space-y-2 text-sm">
                    <div className="text-muted">{t('alerts.resolve.noteLabel')}</div>
                    <p className="rounded-btn border border-border bg-surface-2 p-3">{selRes.note}</p>
                    <div className="text-xs text-muted">
                      {t('alerts.resolve.by', { name: selRes.resolvedBy, date: formatDateTime(selRes.resolvedAt, lang as 'fr' | 'en') })}
                    </div>
                    <button
                      type="button"
                      onClick={doReopen}
                      className="mt-1 rounded-btn border border-border px-3 py-1.5 text-sm text-muted hover:border-accent hover:text-accent"
                    >
                      {t('alerts.resolve.reopen')}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="text-sm font-medium">{t('alerts.resolve.title')}</div>
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
                          {t(ALERT_STATUS_TKEY[k])}
                        </button>
                      ))}
                    </div>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      placeholder={t('alerts.resolve.note')}
                      className="w-full resize-none rounded-btn border border-border bg-surface-2 px-3 py-2 text-sm outline-none focus:border-accent"
                    />
                    <button
                      type="button"
                      onClick={doResolve}
                      disabled={!note.trim()}
                      className="btn-accent w-full px-4 py-2 disabled:opacity-50"
                    >
                      {t('alerts.resolve.submit')}
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
