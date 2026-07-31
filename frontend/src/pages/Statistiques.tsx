import { useEffect, useState } from 'react';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { useParams } from 'react-router-dom';
import { useT } from '../theme/LanguageContext';
import { ActivityHeatmap } from '../components/stats/ActivityHeatmap';
import { AutonomieChart } from '../components/stats/AutonomieChart';
import { MissionDonut } from '../components/stats/MissionDonut';
import { OperationRow } from '../components/stats/OperationRow';
import { OutcomeDonut } from '../components/stats/OutcomeDonut';
import { PatrolMap } from '../components/stats/PatrolMap';
import { Section } from '../components/stats/Section';
import { SimpleBars } from '../components/stats/SimpleBars';
import { StackedOutcomeChart } from '../components/stats/StackedOutcomeChart';
import { StackedRoundsChart } from '../components/stats/StackedRoundsChart';
import { StatTile } from '../components/stats/StatTile';
import { fetchInfoStats, fetchPatrolTracks, fetchStatistics } from '../services/api';
import type { InfoStats } from '../services/api';
import { NOW } from '../services/clock';
import type { Granularity, PatrolTrack, RangeDays, StatsBundle } from '../types/contract';

const GRAN_KEYS: { key: Granularity; tKey: string }[] = [
  { key: 'daily',   tKey: 'stats.gran.daily' },
  { key: 'weekly',  tKey: 'stats.gran.weekly' },
  { key: 'monthly', tKey: 'stats.gran.monthly' },
];
const RANGE_KEYS: { key: RangeDays; tKey: string }[] = [
  { key: 7,  tKey: 'stats.range.7' },
  { key: 30, tKey: 'stats.range.30' },
  { key: 90, tKey: 'stats.range.90' },
];

// Minutes → "1 h 12 min" / "47 min".
function formatDuration(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}

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
export default function Statistiques() {
  type OpTab = 'rondes' | 'amarrages' | 'retours' | 'autonomie';
  const { id = '' } = useParams();
  const t = useT();
  const [gran, setGran] = useState<Granularity>('daily');
  const [range, setRange] = useState<RangeDays>(30);
  const [opTab, setOpTab] = useState<OpTab>('rondes');
  const [data, setData] = useState<StatsBundle | null>(null);
  const [infoStats, setInfoStats] = useState<InfoStats | null>(null);
  const [tracks, setTracks] = useState<PatrolTrack[]>([]);

  useEffect(() => {
    let live = true;
    fetchStatistics(id, range, gran).then((d) => live && setData(d));
    fetchInfoStats(id, range).then((d) => live && setInfoStats(d));
    return () => {
      live = false;
    };
  }, [id, range, gran]);

  // GPS tracks for the selected period — date filter driven by the same range.
  useEffect(() => {
    let live = true;
    const toDate = NOW.toISOString().slice(0, 10);
    const fromDate = new Date(NOW.getTime() - range * 86_400_000).toISOString().slice(0, 10);
    fetchPatrolTracks({ robotId: id, fromDate, toDate }).then((t) => live && setTracks(t));
    return () => {
      live = false;
    };
  }, [id, range]);

  if (!data) return <StatsSkeleton />;
  const s = data.summary;

  return (
    <div className="flex w-full flex-col gap-6">
      {/* 1. Filter bar */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted">{t('stats.gran.label')}</span>
          <Segmented options={GRAN_KEYS.map(g => ({ key: g.key, label: t(g.tKey as Parameters<typeof t>[0]) }))} value={gran} onChange={setGran} />
        </div>
        <div className="flex items-center gap-2">
          <Segmented options={RANGE_KEYS.map(r => ({ key: r.key, label: t(r.tKey as Parameters<typeof t>[0]) }))} value={range} onChange={setRange} />
        </div>
      </div>

      {/* keyed by gran+range so switching the filter bar eases the new totals in */}
      <div key={`${gran}-${range}`} className="fade-in grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={t('stats.tile.duration')} value={formatDuration(s.avgRoundMin)} />
        <StatTile label={t('stats.tile.estops')} value={s.emergencyStops} />
        <StatTile label={t('stats.tile.autonomy')} value={`${s.autonomie}%`} />
        <StatTile label={t('stats.tile.distance')} value={`${s.distanceKm} km`} />
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Segmented<OpTab>
            options={[
              { key: 'rondes',    label: t('stats.op.rondes') },
              { key: 'amarrages', label: t('stats.op.amarrages') },
              { key: 'retours',   label: t('stats.op.retours') },
              { key: 'autonomie', label: t('stats.op.autonomie') },
            ]}
            value={opTab}
            onChange={setOpTab}
          />
        </div>

        {/* keyed by opTab so switching the operation tab eases the new panel in */}
        <div key={opTab} className="fade-in">
        {opTab === 'rondes' && (
          <OperationRow
            donutTitle={t('stats.op.rondes.donut')}
            chartTitle={t('stats.op.rondes.chart')}
            donut={
              <MissionDonut
                completed={s.completed}
                interrupted={s.emergencyStops}
                total={s.total}
                rate={s.missionRate}
                completedLabel={t('stats.op.rondes.completed')}
                interruptedLabel={t('stats.op.rondes.interrupted')}
              />
            }
            chart={<StackedRoundsChart data={data.roundsSuccess} />}
          />
        )}

        {opTab === 'amarrages' && (
          infoStats ? (
            <OperationRow
              donutTitle={t('stats.op.amarrages.donut')}
              chartTitle={t('stats.op.amarrages.chart')}
              donut={
                <OutcomeDonut
                  successCount={infoStats.docking.procedures_succeeded}
                  failCount={infoStats.docking.procedures_failed}
                  total={infoStats.docking.procedures_total}
                  successLabel={t('stats.op.amarrages.success')}
                  failLabel={t('stats.op.amarrages.fail')}
                  centerLabel={t('stats.op.amarrages.center')}
                />
              }
              chart={
                <StackedOutcomeChart
                  data={infoStats.docking.daily}
                  successKey="succeeded"
                  failKey="failed"
                  successName={t('stats.op.amarrages.success')}
                  failName={t('stats.op.amarrages.fail')}
                />
              }
            />
          ) : (
            <div className="surface-card p-card flex h-56 items-center justify-center">
              <p className="text-sm text-muted">{t('stats.noData')}</p>
            </div>
          )
        )}

        {opTab === 'autonomie' && (() => {
          const autoRate = s.autonomie;
          const teleRate = Math.max(0, 100 - autoRate);
          const autoLabel = t('stats.op.autonomie.auto');
          const teleLabel = t('stats.op.autonomie.tele');
          const donutData = [
            { name: autoLabel, value: autoRate, color: '#0d9488' },
            { name: teleLabel, value: teleRate, color: '#f59e0b' },
          ];
          return (
            <OperationRow
              donutTitle={t('stats.op.autonomie.donut')}
              chartTitle={t('stats.op.autonomie.chart')}
              donut={
                <div>
                  <div className="relative h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={donutData} dataKey="value" innerRadius="64%" outerRadius="92%" paddingAngle={2} stroke="none" isAnimationActive={false}>
                          {donutData.map((d) => <Cell key={d.name} fill={d.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-[34px] font-bold leading-none text-text">{autoRate}%</span>
                      <span className="card-subtext mt-1">{t('stats.op.autonomie.label')}</span>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-center gap-4 text-sm">
                    <span className="flex items-center gap-1.5">
                      <span className="text-base leading-none" style={{ color: '#0d9488' }}>●</span>
                      {autoLabel} {autoRate}%
                    </span>
                    <span className="text-muted">·</span>
                    <span className="flex items-center gap-1.5">
                      <span className="text-base leading-none" style={{ color: '#f59e0b' }}>●</span>
                      {teleLabel} {teleRate.toFixed(1)}%
                    </span>
                  </div>
                </div>
              }
              chart={<AutonomieChart data={data.autonomieTrend} avg={s.autonomie} />}
            />
          );
        })()}

        {opTab === 'retours' && (
          infoStats ? (
            <OperationRow
              donutTitle={t('stats.op.retours.donut')}
              chartTitle={t('stats.op.retours.chart')}
              donut={
                <OutcomeDonut
                  successCount={infoStats.back_home.home_reached}
                  failCount={infoStats.back_home.not_reached}
                  total={infoStats.back_home.returns_total}
                  successLabel={t('stats.op.retours.success')}
                  failLabel={t('stats.op.retours.fail')}
                  centerLabel={t('stats.op.retours.center')}
                />
              }
              chart={
                <StackedOutcomeChart
                  data={infoStats.back_home.daily}
                  successKey="reached"
                  failKey="not_reached"
                  successName={t('stats.op.retours.success')}
                  failName={t('stats.op.retours.fail')}
                />
              }
            />
          ) : (
            <div className="surface-card p-card flex h-56 items-center justify-center">
              <p className="text-sm text-muted">{t('stats.noData')}</p>
            </div>
          )
        )}
        </div>
      </div>

      {/* 4 + 5 side by side on wide screens */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Section title={t('stats.section.emergency')}>
          <SimpleBars data={data.emergency} color="var(--danger)" name={t('stats.section.emergency')} />
        </Section>
        <Section title={t('stats.section.distance')}>
          <SimpleBars data={data.distance} color="var(--accent)" name={t('stats.tile.distance')} unit=" km" />
        </Section>
      </div>

      <Section title={t('stats.section.heatmap')}>
        <ActivityHeatmap matrix={data.hourly.matrix} max={data.hourly.max} />
      </Section>

      <Section title={t('stats.patrol.title')}>
        {tracks.length === 0 ? (
          <MapEmptyState
            message={
              id !== 'PG-001'
                ? t('dash.map.noGps')
                : t('stats.patrol.noData')
            }
          />
        ) : (
          <PatrolMap tracks={tracks} />
        )}
      </Section>
    </div>
  );
}

// Styled placeholder matching the map container height — shown when no tracks
// are available, either because the robot has no GPS data or the period is empty.
function MapEmptyState({ message }: { message: string }) {
  return (
    <div
      className="flex items-center justify-center overflow-hidden rounded-btn border border-border bg-surface-2"
      style={{ height: '500px' }}
    >
      <div className="flex flex-col items-center gap-3 text-center">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted opacity-40">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
          <line x1="8" y1="2" x2="8" y2="18" />
          <line x1="16" y1="6" x2="16" y2="22" />
        </svg>
        <p className="text-sm text-muted">{message}</p>
      </div>
    </div>
  );
}

// Loading state: reserve the page footprint (filter bar + 4 tiles + paired
// chart sections + heatmap + GPS) with shimmer blocks, matching the dashboard's
// skeleton treatment so loads feel consistent across the app.
function StatsSkeleton() {
  const t = useT();
  return (
    <div className="flex w-full flex-col gap-6" aria-busy="true" aria-label={t('stats.loading.label')}>
      <div className="skeleton h-9 w-72" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="skeleton h-[120px] w-full" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="skeleton h-[320px] w-full" />
        <div className="skeleton h-[320px] w-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="skeleton h-[260px] w-full" />
        <div className="skeleton h-[260px] w-full" />
      </div>
      <div className="skeleton h-[200px] w-full" />
      <div className="skeleton h-[420px] w-full" />
    </div>
  );
}
