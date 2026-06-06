import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ActivityHeatmap } from '../components/stats/ActivityHeatmap';
import { Section } from '../components/stats/Section';
import { SimpleBars } from '../components/stats/SimpleBars';
import { StackedRoundsChart } from '../components/stats/StackedRoundsChart';
import { StatTile } from '../components/stats/StatTile';
import { StubCard } from '../components/stats/StubCard';
import { fetchStatistics } from '../services/api';
import type { RangeDays, StatsBundle } from '../services/mock';
import type { Granularity } from '../types/contract';

const GRANS: { key: Granularity; label: string }[] = [
  { key: 'daily', label: 'Quotidien' },
  { key: 'weekly', label: 'Hebdomadaire' },
  { key: 'monthly', label: 'Mensuel' },
];
const RANGES: { key: RangeDays; label: string }[] = [
  { key: 7, label: '7 j' },
  { key: 30, label: '30 j' },
  { key: 90, label: '90 j' },
];

// Reusable segmented control for the filter bar.
function Segmented<T extends string | number>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-btn border border-border p-0.5">
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

// Statistiques — the depth page. Filter bar drives all sections; summary tiles
// equal the sums of their underlying series (see mock getStatistics).
export function Statistiques() {
  const { id = '' } = useParams();
  const [gran, setGran] = useState<Granularity>('daily');
  const [range, setRange] = useState<RangeDays>(30);
  const [data, setData] = useState<StatsBundle | null>(null);

  useEffect(() => {
    let live = true;
    fetchStatistics(id, range, gran).then((d) => live && setData(d));
    return () => {
      live = false;
    };
  }, [id, range, gran]);

  if (!data) return <p className="text-sm text-muted">Chargement des statistiques…</p>;
  const s = data.summary;

  return (
    <div className="flex w-full flex-col gap-4">
      {/* 1. Filter bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Période</span>
          <Segmented options={GRANS} value={gran} onChange={setGran} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">Plage</span>
          <Segmented options={RANGES} value={range} onChange={setRange} />
        </div>
      </div>

      {/* 2. Summary tiles — derived from the series below */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Taux de réussite des missions"
          value={`${s.missionRate}%`}
          sub={`${s.completed} terminées / ${s.total} totales`}
        />
        <StatTile label="Arrêts d'urgence" value={s.emergencyStops} sub="Emergency_pressed (sur la plage)" />
        <StatTile
          label="Taux de réussite amarrage"
          value={`${s.dockingRate}%`}
          sub={`${s.dockingSucc} réussis / ${s.dockingTotal} tentatives`}
        />
        <StatTile label="Distance totale" value={`${s.distanceKm} km`} sub="Cumul sur la plage" />
      </div>

      {/* 3. Réussite des rondes (stacked) */}
      <Section title="Réussite des rondes" subtitle="Terminées (Automatic_end) vs interrompues (Emergency_pressed)">
        <StackedRoundsChart data={data.roundsSuccess} />
      </Section>

      {/* 4 + 5 side by side on wide screens */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Section title="Arrêts d'urgence" subtitle="Événements Emergency_pressed dans le temps">
          <SimpleBars data={data.emergency} color="var(--danger)" name="Arrêts d'urgence" />
        </Section>
        <Section title="Distance parcourue" subtitle="Distance cumulée par période (km)">
          <SimpleBars data={data.distance} color="var(--accent)" name="Distance" unit=" km" />
        </Section>
      </div>

      {/* 6. Activité par heure (heatmap) */}
      <Section title="Activité par heure" subtitle="Démarrages de ronde — jours × heures">
        <ActivityHeatmap matrix={data.hourly.matrix} max={data.hourly.max} />
      </Section>

      {/* 7 + 8 stubs — clearly labelled, no fabricated values */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <StubCard title="Taux d'autonomie (autonome vs téléopéré)" message="À venir — schéma Teleoperation à analyser" />
        <StubCard title="Trajet de patrouille (GPS)" message="À venir — carte" />
      </div>
    </div>
  );
}
