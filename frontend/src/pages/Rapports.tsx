import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Section } from '../components/stats/Section';
import { useT } from '../theme/LanguageContext';
import { fetchReportHistory, fetchStatsForReport, getRobot } from '../services/api';
import { NOW } from '../services/mock';
import { generateReport, type ReportSelection } from '../lib/report';
import type { Period, ReportMeta } from '../types/contract';

const PERIOD_META: { key: string; days: number; meta: Period; tKey: string }[] = [
  { key: '7',     days: 7,                           meta: '7d',     tKey: 'reports.period.7d' },
  { key: '30',    days: 30,                          meta: '30d',    tKey: 'reports.period.30d' },
  { key: '90',    days: 90,                          meta: 'custom', tKey: 'reports.period.90d' },
  { key: 'month', days: Math.max(1, NOW.getUTCDate()), meta: 'custom', tKey: 'reports.period.month' },
];

const CONTENT_KEYS: { key: keyof ReportSelection; tKey: string }[] = [
  { key: 'reussite',     tKey: 'stats.op.rondes' },
  { key: 'rondes',       tKey: 'reports.content.rounds' },
  { key: 'incidents',    tKey: 'reports.content.incidents' },
  { key: 'cycles',       tKey: 'reports.content.charges' },
  { key: 'distance',     tKey: 'stats.tile.distance' },
  { key: 'disponibilite',tKey: 'reports.content.availability' },
];

const PERIOD_META_LABEL: Record<Period, string> = { '7d': '7 j', '30d': '30 j', custom: 'Custom' };

export function Rapports() {
  const { id = '' } = useParams();
  const t = useT();
  const [periodKey, setPeriodKey] = useState('30');
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [selection, setSelection] = useState<ReportSelection>({
    reussite: true,
    rondes: true,
    incidents: true,
    cycles: true,
    distance: true,
    disponibilite: false,
  });
  const [history, setHistory] = useState<ReportMeta[]>([]);
  const [reportToDelete, setReportToDelete] = useState<ReportMeta | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchReportHistory(id).then(setHistory);
  }, [id]);

  const toggle = (k: keyof ReportSelection) => setSelection((s) => ({ ...s, [k]: !s[k] }));

  // generate + download a report for the given period/format using the same
  // stats source as the dashboard (consistency), then prepend it to the history.
  const generate = async (days: number, periodLabel: string, meta: Period, fmt: 'csv' | 'pdf') => {
    setBusy(true);
    try {
      const [bundle, robot] = await Promise.all([fetchStatsForReport(id, days), getRobot(id)]);
      generateReport({ robotName: robot?.name ?? id, robotId: id, periodLabel, bundle, selection, format: fmt });
      setHistory((h) => [
        {
          id: `${id}-R-new-${Date.now()}`,
          robotId: id,
          period: meta,
          format: fmt,
          generatedAt: new Date().toISOString(),
          sizeKb: 40 + Math.floor(Math.random() * 200),
        },
        ...h,
      ]);
    } finally {
      setBusy(false);
    }
  };

  const onGenerate = () => {
    const p = PERIOD_META.find((x) => x.key === periodKey)!;
    generate(p.days, t(p.tKey as Parameters<typeof t>[0]), p.meta, format);
  };

  // re-download a past report: regenerate from current data for its period/format
  const reDownload = (r: ReportMeta) => {
    const days = r.period === '7d' ? 7 : r.period === '30d' ? 30 : 90;
    generate(days, PERIOD_META_LABEL[r.period], r.period, r.format);
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <Section title={t('reports.generate.title')} subtitle={t('reports.generate.subtitle')}>
        <div className="flex flex-col gap-5">
          <div>
            <div className="mb-2 text-sm font-medium">{t('reports.period.label')}</div>
            <div className="flex flex-wrap gap-1 rounded-btn border border-border p-0.5">
              {PERIOD_META.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriodKey(p.key)}
                  className={[
                    'rounded-[6px] px-3 py-1.5 text-sm transition-colors',
                    periodKey === p.key ? 'bg-accent font-medium text-[#04201d]' : 'text-muted hover:text-text',
                  ].join(' ')}
                >
                  {t(p.tKey as Parameters<typeof t>[0])}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">{t('reports.content.label')}</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CONTENT_KEYS.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selection[c.key]}
                    onChange={() => toggle(c.key)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  {t(c.tKey as Parameters<typeof t>[0])}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 text-sm font-medium">{t('reports.format.label')}</div>
              <div className="flex gap-1 rounded-btn border border-border p-0.5">
                {(['csv', 'pdf'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={[
                      'rounded-[6px] px-3 py-1.5 text-sm uppercase transition-colors',
                      format === f ? 'bg-accent font-medium text-[#04201d]' : 'text-muted hover:text-text',
                    ].join(' ')}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <button type="button" onClick={onGenerate} disabled={busy} className="btn-accent px-5 py-2.5 disabled:opacity-60">
              {busy ? t('reports.generate.busy') : t('reports.generate.btn')}
            </button>
          </div>
        </div>
      </Section>

      <Section
        title={t('reports.history.title')}
        subtitle={t('reports.history.subtitle')}
        action={history.length > 0 ? (
          <button
            type="button"
            onClick={() => setClearConfirmOpen(true)}
            className="rounded-btn border border-danger/40 px-3 py-1.5 text-xs text-danger hover:border-danger hover:bg-danger/10"
          >
            {t('reports.history.clear')}
          </button>
        ) : undefined}
      >
        <div className="divide-y divide-border">
          {history.map((r) => (
            <div key={r.id} className="group flex items-center gap-4 py-3 text-sm">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-btn bg-surface-2 text-accent">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M7 3h7l5 5v13H7zM14 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  {t('reports.history.row.title', { period: PERIOD_META_LABEL[r.period], fmt: r.format.toUpperCase() })}
                </div>
                <div className="text-xs text-muted">
                  {new Date(r.generatedAt).toLocaleDateString()} · {r.sizeKb} KB
                </div>
              </div>
              <button
                type="button"
                onClick={() => reDownload(r)}
                disabled={busy}
                className="shrink-0 rounded-btn border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
              >
                {t('reports.history.download')}
              </button>
              <button
                type="button"
                aria-label={t('reports.history.delete.aria')}
                onClick={() => setReportToDelete(r)}
                className="shrink-0 rounded p-1 text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100 focus-visible:opacity-100"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14H6L5 6" />
                  <path d="M10 11v6M14 11v6" />
                  <path d="M9 6V4h6v2" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </Section>

      {clearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setClearConfirmOpen(false)}>
          <div className="w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-base font-semibold text-text">{t('reports.history.clearConfirm.title')}</h2>
            <p className="mb-6 text-sm text-muted">{t('reports.confirm.irreversible')}</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setClearConfirmOpen(false)} className="rounded-btn border border-border px-4 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text">
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => { setHistory([]); setClearConfirmOpen(false); }}
                className="rounded-btn bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}

      {reportToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setReportToDelete(null)}>
          <div className="w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-base font-semibold text-text">{t('reports.history.deleteConfirm.title')}</h2>
            <p className="mb-6 text-sm text-muted">{t('reports.confirm.irreversible')}</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReportToDelete(null)} className="rounded-btn border border-border px-4 py-2 text-sm text-muted hover:bg-surface-2 hover:text-text">
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setHistory((h) => h.filter((x) => x.id !== reportToDelete.id));
                  setReportToDelete(null);
                }}
                className="rounded-btn bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
