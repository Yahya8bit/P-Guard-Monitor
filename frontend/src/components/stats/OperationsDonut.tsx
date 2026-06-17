import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { useT } from '../../theme/LanguageContext';

const SEGMENT_KEYS = [
  { key: 'rondes',          tKey: 'stats.op.rondes',    color: '#0d9488' },
  { key: 'amarrages',       tKey: 'stats.op.amarrages', color: '#0ea5e9' },
  { key: 'retours_station', tKey: 'stats.op.retours',   color: '#8b5cf6' },
  { key: 'inspections',     tKey: 'stats.op.inspections', color: '#f59e0b' },
] as const;

type Counts = { rondes: number; amarrages: number; retours_station: number; inspections: number };

export function OperationsDonut({ counts }: { counts: Counts }) {
  const t = useT();
  const total = SEGMENT_KEYS.reduce((a, s) => a + counts[s.key], 0);
  const data = SEGMENT_KEYS.map((s) => ({ name: t(s.tKey as Parameters<typeof t>[0]), value: counts[s.key], color: s.color }));

  return (
    <div>
      <div className="relative h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius="64%"
              outerRadius="92%"
              paddingAngle={2}
              stroke="none"
              isAnimationActive={false}
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[34px] font-bold leading-none text-text">{total}</span>
          <span className="card-subtext mt-1">{t('stats.op.operations')}</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
        {SEGMENT_KEYS.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="text-base leading-none" style={{ color: s.color }}>●</span>
            {t(s.tKey as Parameters<typeof t>[0])} {counts[s.key]}
          </span>
        ))}
      </div>
    </div>
  );
}
