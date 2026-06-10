import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Section } from '../components/stats/Section';
import { fetchReportHistory, fetchStatsForReport, getRobot } from '../services/api';
import { NOW } from '../services/mock';
import { generateReport, type ReportSelection } from '../lib/report';
import type { Period, ReportMeta } from '../types/contract';

const PERIODS = [
  { key: '7', label: '7 j', days: 7, meta: '7d' as Period },
  { key: '30', label: '30 j', days: 30, meta: '30d' as Period },
  { key: '90', label: '90 j', days: 90, meta: 'custom' as Period },
  { key: 'month', label: 'Mois en cours', days: Math.max(1, NOW.getUTCDate()), meta: 'custom' as Period },
];

const CONTENT: { key: keyof ReportSelection; label: string }[] = [
  { key: 'reussite', label: 'Réussite des missions' },
  { key: 'rondes', label: 'Rondes' },
  { key: 'incidents', label: 'Incidents' },
  { key: 'cycles', label: 'Cycles de charge' },
  { key: 'distance', label: 'Distance' },
  { key: 'disponibilite', label: 'Disponibilité (si dispo)' },
];

const PERIOD_LABEL: Record<Period, string> = { '7d': '7 jours', '30d': '30 jours', custom: 'Personnalisé' };

export function Rapports() {
  const { id = '' } = useParams();
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
    const p = PERIODS.find((x) => x.key === periodKey)!;
    generate(p.days, p.label, p.meta, format);
  };

  // re-download a past report: regenerate from current data for its period/format
  const reDownload = (r: ReportMeta) => {
    const days = r.period === '7d' ? 7 : r.period === '30d' ? 30 : 90;
    generate(days, PERIOD_LABEL[r.period], r.period, r.format);
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      {/* 1. Générer un rapport */}
      <Section title="Générer un rapport" subtitle="Fichier généré localement à partir des données du robot">
        <div className="flex flex-col gap-5">
          <div>
            <div className="mb-2 text-sm font-medium">Période</div>
            <div className="flex flex-wrap gap-1 rounded-btn border border-border p-0.5">
              {PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setPeriodKey(p.key)}
                  className={[
                    'rounded-[6px] px-3 py-1.5 text-sm transition-colors',
                    periodKey === p.key ? 'bg-accent font-medium text-[#04201d]' : 'text-muted hover:text-text',
                  ].join(' ')}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="mb-2 text-sm font-medium">Contenu</div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CONTENT.map((c) => (
                <label key={c.key} className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selection[c.key]}
                    onChange={() => toggle(c.key)}
                    className="h-4 w-4 accent-[var(--accent)]"
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-2 text-sm font-medium">Format</div>
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
              {busy ? 'Génération…' : 'Générer'}
            </button>
          </div>
        </div>
      </Section>

      {/* 2. Historique des rapports */}
      <Section title="Historique des rapports" subtitle="Rapports précédemment générés pour ce robot">
        <div className="divide-y divide-border">
          {history.map((r) => (
            <div key={r.id} className="flex items-center gap-4 py-3 text-sm">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-btn bg-surface-2 text-accent">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M7 3h7l5 5v13H7zM14 3v5h5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-medium">
                  Rapport {PERIOD_LABEL[r.period]} · {r.format.toUpperCase()}
                </div>
                <div className="text-xs text-muted">
                  {new Date(r.generatedAt).toLocaleDateString('fr-FR')} · {r.sizeKb} Ko
                </div>
              </div>
              <button
                type="button"
                onClick={() => reDownload(r)}
                disabled={busy}
                className="shrink-0 rounded-btn border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-60"
              >
                Télécharger
              </button>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
