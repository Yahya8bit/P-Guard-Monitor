import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Download, FileText, RefreshCw, Settings2, Sparkles, Trash2 } from 'lucide-react';
import { Section } from '../components/stats/Section';
import { useT } from '../theme/LanguageContext';
import { useLang } from '../theme/LanguageContext';
import { fetchReportHistory, fetchStatsForReport, getRobot } from '../services/api';
import { NOW } from '../services/clock';
import { formatDateTime } from '../lib/format';
import { generateReport, type ReportSelection } from '../lib/report';
import type { Period, ReportMeta, Robot } from '../types/contract';

const PERIOD_META: { key: string; days: number; meta: Period; tKey: string }[] = [
  { key: '7',     days: 7,                           meta: '7d',     tKey: 'reports.period.7d' },
  { key: '30',    days: 30,                          meta: '30d',    tKey: 'reports.period.30d' },
  { key: '90',    days: 90,                          meta: 'custom', tKey: 'reports.period.90d' },
  { key: 'month', days: Math.max(1, NOW.getUTCDate()), meta: 'custom', tKey: 'reports.period.month' },
];

const CONTENT_KEYS: { key: keyof ReportSelection; tKey: string }[] = [
  { key: 'reussite',     tKey: 'reports.content.successRate' },
  { key: 'rondes',       tKey: 'reports.content.rounds' },
  { key: 'incidents',    tKey: 'reports.content.incidents' },
  { key: 'cycles',       tKey: 'reports.content.charges' },
  { key: 'distance',     tKey: 'stats.tile.distance' },
  { key: 'disponibilite',tKey: 'reports.content.availability' },
];

const PERIOD_META_LABEL: Record<Period, string> = { '7d': '7 j', '30d': '30 j', custom: 'Custom' };

export default function Rapports() {
  const { id = '' } = useParams();
  const t = useT();
  const { lang } = useLang();
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
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const [reportToDelete, setReportToDelete] = useState<ReportMeta | null>(null);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [robot, setRobot] = useState<Robot | undefined>(undefined);

  useEffect(() => {
    setHistoryLoaded(false);
    fetchReportHistory(id).then((h) => {
      setHistory(h);
      setHistoryLoaded(true);
    });
    getRobot(id).then(setRobot);
  }, [id]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      setHistory(await fetchReportHistory(id));
    } finally {
      setRefreshing(false);
    }
  };

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
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6">
      {/* breadcrumb + title + description, mirrors the reference's page header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted">
            <FileText size={13} />
            {t('reports.header.breadcrumb')}
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{t('title.rapports')}</h1>
          <p className="mt-1 text-sm text-muted">{t('reports.header.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-btn border border-border px-3 py-2 text-sm text-muted transition-colors hover:border-accent hover:text-text disabled:opacity-60"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
            {t('reports.refresh')}
          </button>
          <button type="button" onClick={onGenerate} disabled={busy} className="btn-accent flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-60">
            <Sparkles size={15} />
            {busy ? t('reports.generate.busy') : t('reports.generate.btn')}
          </button>
        </div>
      </div>

      <section className="surface-card p-card">
        <div className="mb-4 flex items-center gap-2 text-[15px]">
          <Settings2 size={16} className="text-accent" />
          <span className="font-medium">{t('reports.generate.title')}</span>
          <span className="text-muted">— {t('reports.gen.caption')}</span>
        </div>
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_auto]">
            <div>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">{t('reports.period.label')}</div>
              <div className="inline-flex w-full gap-1 overflow-x-auto rounded-btn border border-border bg-bg/40 p-0.5 lg:w-auto">
                {PERIOD_META.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPeriodKey(p.key)}
                    className={[
                      'whitespace-nowrap rounded-[6px] px-3 py-1.5 text-sm transition-colors',
                      periodKey === p.key ? 'bg-surface-2 font-medium text-text shadow-sm' : 'text-muted hover:text-text',
                    ].join(' ')}
                  >
                    {t(p.tKey as Parameters<typeof t>[0])}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">{t('reports.format.label')}</div>
              <div className="inline-flex gap-1 rounded-btn border border-border bg-bg/40 p-0.5">
                {(['csv', 'pdf'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setFormat(f)}
                    className={[
                      'whitespace-nowrap rounded-[6px] px-3 py-1.5 text-sm uppercase transition-colors',
                      format === f ? 'bg-surface-2 font-medium text-text shadow-sm' : 'text-muted hover:text-text',
                    ].join(' ')}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wider text-muted">{t('reports.content.label')}</div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
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

          <p className="text-xs text-muted">{t('reports.gen.helper')}</p>
        </div>
      </section>

      <Section
        title={t('reports.history.title')}
        subtitle={t('reports.history.subtitle')}
        action={history.length > 0 ? (
          <button
            type="button"
            onClick={() => setClearConfirmOpen(true)}
            className="text-xs font-medium text-danger hover:underline"
          >
            {t('reports.history.clear')}
          </button>
        ) : undefined}
      >
        {!historyLoaded ? (
          <div className="space-y-2">
            <div className="skeleton mb-2 h-5 w-24" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skeleton h-12 w-full" />
            ))}
          </div>
        ) : history.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">{t('reports.history.empty')}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-[11px] uppercase tracking-wider text-muted">
                  <th className="py-2 pr-3 font-medium">{t('reports.table.scope')}</th>
                  <th className="py-2 pr-3 font-medium">{t('reports.table.robot')}</th>
                  <th className="py-2 pr-3 font-medium">{t('reports.table.period')}</th>
                  <th className="py-2 pr-3 font-medium">{t('reports.table.generated')}</th>
                  <th className="py-2 pr-3 font-medium">{t('reports.table.size')}</th>
                  <th className="py-2 pr-3 font-medium">{t('reports.table.files')}</th>
                  <th className="py-2 pr-1 text-right font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {history.map((r) => (
                  <tr key={r.id} className="h-[68px] transition-colors hover:bg-surface-2/60">
                    <td className="py-2.5 pr-3">
                      <span className="inline-flex items-center rounded-full bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-text">
                        {t('reports.table.scope.robot')}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3">
                      <div className="font-medium">{robot?.name ?? r.robotId}</div>
                      <div className="text-[11px] text-muted">{r.robotId}</div>
                    </td>
                    <td className="py-2.5 pr-3">{PERIOD_META_LABEL[r.period]}</td>
                    <td className="py-2.5 pr-3 text-xs tabular-nums text-muted">
                      {formatDateTime(r.generatedAt, lang as 'fr' | 'en')}
                    </td>
                    <td className="py-2.5 pr-3 text-xs tabular-nums text-muted">{r.sizeKb} KB</td>
                    <td className="py-2.5 pr-3">
                      <div className="flex gap-1.5">
                        {(['pdf', 'csv'] as const).map((f) => (
                          <span
                            key={f}
                            className={
                              r.format === f
                                ? 'inline-flex items-center gap-1 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent'
                                : 'inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[11px] font-medium text-muted opacity-50'
                            }
                          >
                            <FileText size={11} />
                            {f.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="py-2.5 pr-1">
                      <div className="flex items-center justify-end gap-1.5">
                        {(['pdf', 'csv'] as const).map((f) => {
                          const available = r.format === f;
                          return (
                            <button
                              key={f}
                              type="button"
                              aria-label={`${t('reports.history.download')} ${f.toUpperCase()}`}
                              onClick={() => available && reDownload(r)}
                              disabled={!available || busy}
                              className={[
                                'flex items-center gap-1.5 rounded-btn border px-2.5 py-1.5 text-xs font-medium transition-colors',
                                available
                                  ? 'border-border text-text hover:border-accent hover:text-accent'
                                  : 'cursor-not-allowed border-border/50 text-muted opacity-40',
                              ].join(' ')}
                            >
                              <Download size={13} strokeWidth={1.8} />
                              {f.toUpperCase()}
                            </button>
                          );
                        })}
                        <button
                          type="button"
                          aria-label={t('reports.history.delete.aria')}
                          onClick={() => setReportToDelete(r)}
                          className="rounded p-1.5 text-muted transition-colors hover:text-danger"
                        >
                          <Trash2 size={16} strokeWidth={1.8} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {clearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setClearConfirmOpen(false)}>
          <div className="w-full max-w-sm rounded-card border border-border bg-surface p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-2 text-base font-semibold text-text">{t('reports.history.clearConfirm.title')}</h2>
            <p className="mb-6 text-sm text-muted">{t('reports.confirm.irreversible')}</p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setClearConfirmOpen(false)} className="rounded-btn border border-border px-4 py-2 text-sm 
                                                                                          text-muted hover:bg-surface-2 hover:text-text">
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
              <button type="button" onClick={() => setReportToDelete(null)} className="rounded-btn border border-border px-4 py-2 text-sm 
                                                                                        text-muted hover:bg-surface-2 hover:text-text">
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
