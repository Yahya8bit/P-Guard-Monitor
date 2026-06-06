import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { BatteryCard } from '../components/dashboard/BatteryCard';
import { KpiCard } from '../components/dashboard/KpiCard';
import { StatusBar } from '../components/dashboard/StatusBar';
import { TrendChart } from '../components/dashboard/TrendChart';
import { AlertsStrip } from '../components/dashboard/AlertsStrip';
import {
  fetchBatterySamples,
  fetchDashboard,
  fetchIncidentBreakdown,
  fetchMetricTrend,
  fetchRecentAlerts,
  getRobot,
} from '../services/api';
import type { TrendMetric } from '../services/mock';
import type { Alert, BatterySample, DashboardSummary, Period, Robot, TrendSeries } from '../types/contract';

type Breakdown = { obstacles: number; emergencyStops: number; total: number };

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
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [trend, setTrend] = useState<TrendSeries | null>(null);
  const [battery, setBattery] = useState<BatterySample[]>([]);
  const [breakdown, setBreakdown] = useState<Breakdown | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    getRobot(id).then((r) => setRobot(r ?? null));
    fetchRecentAlerts(id, 4).then(setAlerts);
  }, [id]);

  // trend re-fetches when robot, period OR the selected metric changes
  useEffect(() => {
    let live = true;
    fetchMetricTrend(id, period, metric).then((t) => live && setTrend(t));
    return () => {
      live = false;
    };
  }, [id, period, metric]);

  useEffect(() => {
    let live = true;
    Promise.all([
      fetchDashboard(id, period),
      fetchBatterySamples(id, period),
      fetchIncidentBreakdown(id, period),
    ]).then(([s, b, br]) => {
      if (!live) return;
      setSummary(s);
      setBattery(b);
      setBreakdown(br);
    });
    return () => {
      live = false;
    };
  }, [id, period]);

  if (!robot || !summary || !trend || !breakdown) {
    return <p className="text-sm text-muted">Chargement du tableau de bord…</p>;
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

  // Full-width column, natural content height (status bar + KPI row + compact
  // chart + alerts strip); the shell's <main> scrolls if it overflows.
  return (
    <div className="flex w-full flex-col gap-4">
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
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <BatteryCard battery={summary.status.battery} />
        <KpiCard
          label="Rondes effectuées"
          value={k.rounds.value}
          deltaPct={k.rounds.deltaPct}
          sentiment="higher-better"
          subtext={`Total période : ${k.rounds.value} · ~${roundsPerDay}/jour`}
          icon="M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7"
          onSelect={() => setMetric('rounds')}
          active={metric === 'rounds'}
        />
        <KpiCard
          label="Incidents détectés"
          value={k.incidents.value}
          deltaPct={k.incidents.deltaPct}
          sentiment="higher-worse"
          subtext={`${breakdown.obstacles} obstacles · ${breakdown.emergencyStops} arrêts d'urgence`}
          note="≠ détections de sécurité"
          icon="M12 3l9 16H3zM12 10v4M12 17h.01"
          onSelect={() => setMetric('incidents')}
          active={metric === 'incidents'}
        />
        <KpiCard
          label="Cycles de charge"
          value={k.chargeCycles.value}
          deltaPct={k.chargeCycles.deltaPct}
          sentiment="neutral"
          subtext={dockBatteryAvg !== null ? `Batt. moy. au dock : ~${dockBatteryAvg}%` : undefined}
          icon="M13 2L4 14h6l-1 8 9-12h-6z"
          onSelect={() => setMetric('charges')}
          active={metric === 'charges'}
        />
        <KpiCard
          label="Disponibilité"
          value="à venir"
          placeholder
          subtext="Formule à définir (TODO)"
          note="non dérivable des logs pour l'instant"
          icon="M12 8v4l3 2M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </div>

      <TrendChart
        series={trend}
        period={period}
        onPeriod={setPeriod}
        title={METRICS[metric].title}
        subtitle={METRICS[metric].subtitle}
        color={METRICS[metric].color}
      />

      <AlertsStrip robotId={id} alerts={alerts} />
    </div>
  );
}
