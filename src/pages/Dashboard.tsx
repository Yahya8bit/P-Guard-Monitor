import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { RobotIntrouvable } from '../auth/guards';
import { BatteryCard } from '../components/dashboard/BatteryCard';
import { KpiCard } from '../components/dashboard/KpiCard';
import { StatusBar } from '../components/dashboard/StatusBar';
import { TrendChart } from '../components/dashboard/TrendChart';
import { AlertsStrip } from '../components/dashboard/AlertsStrip';
import { LastPositionMap } from '../components/dashboard/LastPositionMap';
import {
  fetchBatterySamples,
  fetchDashboard,
  fetchIncidentBreakdown,
  fetchInfoStats,
  fetchLastKnownTrack,
  fetchMetricTrend,
  fetchRecentAlerts,
  getRobot,
} from '../services/api';
import type { InfoStats, LastKnownTrack } from '../services/api';
import type { TrendMetric } from '../services/mock';
import type { Alert, BatterySample, DashboardSummary, Period, Robot, TrendSeries } from '../types/contract';

type Breakdown = { obstacles: number; emergencyStops: number; total: number };

// ── KPI alert-state system (one generic mechanism) ───────────────────────────
// SINGLE SOURCE OF TRUTH: per-KPI { sentiment, alertAt, warnAt? }. ONLY KPIs with
// a real, honest threshold appear here; everything else stays calm-neutral.
//   battery   : higher-better — alert < 30%, warning < 50% (low battery = bad)
//   incidents : higher-worse  — thresholds are PER-DAY rates (value / periodDays),
//               so a normal month doesn't sit permanently red: ~0.3/day is routine
//               ops for this unit; alert only above 0.8/day, amber above 0.5/day.
type Sent = 'higher-better' | 'higher-worse';
type KpiState = 'calm' | 'warning' | 'alert';
const KPI_ALERTS: Record<'battery' | 'incidents', { sentiment: Sent; alertAt: number; warnAt?: number }> = {
  battery: { sentiment: 'higher-better', alertAt: 30, warnAt: 50 },
  incidents: { sentiment: 'higher-worse', alertAt: 0.8, warnAt: 0.5 },
};

function kpiState(value: number, cfg: { sentiment: Sent; alertAt: number; warnAt?: number }): KpiState {
  if (cfg.sentiment === 'higher-better') {
    if (value < cfg.alertAt) return 'alert';
    if (cfg.warnAt !== undefined && value < cfg.warnAt) return 'warning';
  } else {
    if (value > cfg.alertAt) return 'alert';
    if (cfg.warnAt !== undefined && value > cfg.warnAt) return 'warning';
  }
  return 'calm';
}

// Map state → tile fill. Tiles are NEUTRAL (plain surface) by default; a colored
// fill appears ONLY for a real state — warning = amber, alert = red. Calm = no
// fill, so the row stays quiet and the one thing that's actually wrong stands out.
const stateFill = (state: KpiState): string | undefined =>
  state === 'alert' ? 'danger' : state === 'warning' ? 'warning' : undefined;

// Per-metric chart config: which KPI the trend chart shows when its card is
// clicked (CHANGE A). Title/subtitle/color all switch with the selection.
const METRICS: Record<TrendMetric, { title: string; subtitle: string; color: string }> = {
  rounds: {
    title: 'Rondes effectuées par jour',
    subtitle: 'Rondes terminées (Automatic_end)',
    color: 'var(--accent)',
  },
  incidents: {
    title: 'Incidents par jour',
    subtitle: "Obstacles + arrêts d'urgence (proxy)",
    color: 'var(--danger)',
  },
  charges: {
    title: 'Cycles de charge par jour',
    subtitle: 'Mises en charge (docking)',
    color: '#8B5CF6',
  },
  disponibilite: {
    title: 'Disponibilité par jour',
    subtitle: '% opérationnel — journaux (variation réelle)',
    color: 'var(--accent)',
  },
};

// The one fully-built page. Status hero + four KPI cards + one period-switchable
// trend chart, all wired to the mock service. Everything re-fetches when the
// robot id or the selected period changes.
export function Dashboard() {
  const { id = '' } = useParams();
  const [period, setPeriod] = useState<Period>('30d');
  // selected trend metric — defaults to Rondes effectuées (CHANGE A)
  const [metric, setMetric] = useState<TrendMetric>('rounds');
  const [robot, setRobot] = useState<Robot | null>(null);
  const [robotMissing, setRobotMissing] = useState(false);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<TrendSeries | null>(null);

  const [infoStats, setInfoStats] = useState<InfoStats | null>(null);
  const [battery, setBattery] = useState<BatterySample[]>([]);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [lastTrack, setLastTrack] = useState<LastKnownTrack | null | undefined>(undefined);
  // network failure on the data the page can't render without; retryKey re-runs
  // the failed effects when the user clicks Réessayer
  const [loadError, setLoadError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    getRobot(id)
      .then((r) => {
        setRobot(r ?? null);
        setRobotMissing(!r); // accessible id that doesn't resolve to a real robot
      })
      .catch(() => setLoadError(true));
    // secondary data: a failure degrades to the empty/absent state, never blocks
    fetchRecentAlerts(id, 5).then(setAlerts).catch(() => setAlerts([]));
    fetchInfoStats(id, 30).then(setInfoStats).catch(() => setInfoStats(null));
    fetchLastKnownTrack(id).then(setLastTrack).catch(() => setLastTrack(null));
  }, [id, retryKey]);

  // trend re-fetches when robot, period OR the selected metric changes
  useEffect(() => {
    let live = true;
    fetchMetricTrend(id, period, metric)
      .then((t) => live && setTrend(t))
      .catch(() => live && setLoadError(true));
    return () => {
      live = false;
    };
  }, [id, period, metric, retryKey]);


  useEffect(() => {
    let live = true;
    Promise.all([
      fetchDashboard(id, period),
      fetchBatterySamples(id, period),
      fetchIncidentBreakdown(id, period),
    ])
      .then(([s, b, br]) => {
        if (!live) return;
        setSummary(s);
        setBattery(b);
        setBreakdown(br);
      })
      .catch(() => live && setLoadError(true));
    return () => {
      live = false;
    };
  }, [id, period, retryKey]);

  // Keyboard accelerator: number keys 1–4 flip the trend metric so power users
  // don't have to reach for the cards. Ignored with modifiers or while typing.
  useEffect(() => {
    const KEYS: Record<string, TrendMetric> = { '1': 'rounds', '2': 'incidents', '3': 'charges', '4': 'disponibilite' };
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const m = KEYS[e.key];
      if (m) setMetric(m);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  if (robotMissing) return <RobotIntrouvable />;
  if (loadError) {
    return (
      <DashboardLoadError
        onRetry={() => {
          setLoadError(false);
          setRetryKey((k) => k + 1);
        }}
      />
    );
  }
  if (!robot || !summary || !trend || !breakdown) {
    return <DashboardSkeleton />;
  }

  const k = summary.kpis;

  // Secondary-line values, all derived from the same mock data as the cards:
  const periodDays = period === '7d' ? 7 : 30;
  // daily average rounds = period total / days (French decimal comma)
  const roundsPerDay = (k.rounds.value / periodDays).toFixed(1).replace('.', ',');
  // mean battery % across this period's dock-phase samples (event-sampled)
  const dockSamples = battery.filter((s) => s.phase === 'dock');
  const dockBatteryAvg = dockSamples.length
    ? Math.round(dockSamples.reduce((a, s) => a + s.pct, 0) / dockSamples.length)
    : null;

  // alert-capable tiles resolve their fill from the threshold config; neutral
  // tiles (Rondes, Cycles, Disponibilité) pass a fixed calm fill below.
  const batteryFill = stateFill(kpiState(summary.status.battery, KPI_ALERTS.battery));
  // incidents threshold is a per-day rate — normalize the period total first
  const incidentsFill = stateFill(kpiState(k.incidents.value / periodDays, KPI_ALERTS.incidents));

  // Full-width column, natural content height (status bar + KPI row + compact
  // chart + alerts strip); the shell's <main> scrolls if it overflows.
  return (
    <div className="flex min-h-screen w-full flex-col gap-6">
      <StatusBar robot={robot} />

      {/* KPI sentiment (drives the delta-badge color in KpiCard):
            Rondes        -> higher-better (more completed rounds = good)
            Incidents     -> higher-worse  (more incidents = bad)
            Cycles charge  -> neutral       (more/less isn't inherently good/bad)
            Disponibilité  -> higher-better (no delta yet — still placeholder) */}
      {/* 5-card row: Batterie + 4 KPIs. repeat(5,1fr) = equal width; default
          align-items:stretch makes every card the height of the tallest one
          (Incidents, with its extra caption line), so all five are identical
          rectangles regardless of content. */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <BatteryCard battery={summary.status.battery} fill={batteryFill} />
        <KpiCard
          label="Rondes effectuées"
          value={k.rounds.value}
          deltaPct={k.rounds.deltaPct}
          sentiment="higher-better"
          subtext={`Total période : ${k.rounds.value} · ~${roundsPerDay}/jour`}
          icon="M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7"
          hint="Rondes terminées automatiquement (Automatic_end) sur la période."
          selected={metric === 'rounds'}
          onSelect={() => setMetric('rounds')}
        />
        <KpiCard
          label="Incidents détectés"
          value={k.incidents.value}
          deltaPct={k.incidents.deltaPct}
          sentiment="higher-worse"
          subtext={`${breakdown.obstacles} obstacles · ${breakdown.emergencyStops} arrêts d'urgence`}
          note="≠ détections de sécurité"
          icon="M12 3l9 16H3zM12 10v4M12 17h.01"
          hint="Proxy opérationnel : obstacles + arrêts d'urgence rencontrés par le robot. Ce ne sont pas des détections de sécurité."
          tone="danger"
          fill={incidentsFill}
          selected={metric === 'incidents'}
          onSelect={() => setMetric('incidents')}
        />
        <KpiCard
          label="Cycles de charge"
          value={k.chargeCycles.value}
          deltaPct={k.chargeCycles.deltaPct}
          sentiment="neutral"
          subtext={
            infoStats
              ? `Batt. médiane au dock : ${infoStats.docking.battery_at_dock_median}%`
              : dockBatteryAvg !== null
                ? `Batt. moy. au dock : ~${dockBatteryAvg}%`
                : undefined
          }
          icon="M13 2L4 14h6l-1 8 9-12h-6z"
          hint="Nombre de mises en charge (docking) enregistrées sur la période."
          selected={metric === 'charges'}
          onSelect={() => setMetric('charges')}
        />
        <KpiCard
          label="Disponibilité"
          value={`${k.availability.value}%`}
          subtext="Disponibilité opérationnelle (journaux)"
          icon="M12 8v4l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          hint="Estimation opérationnelle dérivée des journaux d'état. Formule provisoire, susceptible d'évoluer."
          selected={metric === 'disponibilite'}
          onSelect={() => setMetric('disponibilite')}
        />
      </div>

      {/* discoverability + power-user hint: cards drive the chart; 1–4 do the same */}
      <p className="-mt-2 text-xs text-muted">
        Cliquez une carte pour l'afficher dans le graphique, ou touches{' '}
        <kbd className="rounded border border-border px-1 font-sans text-[11px]">1</kbd>–
        <kbd className="rounded border border-border px-1 font-sans text-[11px]">4</kbd>.
      </p>

      {/* balanced two-column rhythm (reference pairs two bottom panels): trend
          chart | alerts side by side on wide screens, stacked on narrow. */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <TrendChart
          series={trend}
          period={period}
          onPeriod={setPeriod}
          title={METRICS[metric].title}
          subtitle={METRICS[metric].subtitle}
          color={METRICS[metric].color}
          percent={metric === 'disponibilite'}
        />
        <AlertsStrip robotId={id} alerts={alerts} />
      </div>


      {/* Row 3: last known track + position mini-map */}
      <section className="surface-card flex flex-col p-card">
        <div className="mb-3">
          <h3 className="text-[18px] font-medium">Dernière position et trajet</h3>
          <p className="text-[13px] text-muted">
            {lastTrack
              ? `Dernier trajet journalisé — ${lastTrack.date.split('-').reverse().join('/')}`
              : 'Dernier trajet journalisé'}
          </p>
        </div>
        {lastTrack === undefined ? (
          <div className="flex h-[300px] items-center justify-center">
            <span className="text-sm text-muted">Chargement…</span>
          </div>
        ) : lastTrack === null ? (
          <div className="flex h-[300px] items-center justify-center">
            <span className="text-sm text-muted">Aucune donnée GPS disponible pour ce robot</span>
          </div>
        ) : (
          <LastPositionMap track={lastTrack} />
        )}
      </section>
    </div>
  );
}

// Network-failure state: shown when data the page can't render without fails to
// load. Plain language + a retry action, per the error-recovery heuristic.
function DashboardLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[60vh] w-full items-center justify-center" role="alert">
      <div className="surface-card flex max-w-md flex-col items-center gap-4 p-card text-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          <h2 className="text-[18px] font-medium">Impossible de charger le tableau de bord</h2>
          <p className="mt-1 text-sm text-muted">
            Les données du robot n'ont pas pu être récupérées. Vérifiez votre connexion, puis réessayez.
          </p>
        </div>
        <button
          onClick={onRetry}
          className="rounded-btn bg-accent px-4 py-2 text-sm font-medium text-[#04201d] transition-colors hover:bg-accent-press focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          Réessayer
        </button>
      </div>
    </div>
  );
}

// Loading state: reserve the real layout footprint (status strip + 5 KPI cards +
// chart + alerts) with shimmer blocks, so content drops in without a jump.
function DashboardSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6" aria-busy="true" aria-label="Chargement du tableau de bord">
      <div className="skeleton h-12 w-full" />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton h-[148px] w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="skeleton h-[296px] w-full" />
        <div className="skeleton h-[296px] w-full" />
      </div>
    </div>
  );
}
