import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

const SEGMENTS = [
  { key: 'rondes',          label: 'Rondes',          color: '#0d9488' },
  { key: 'amarrages',       label: 'Amarrages',       color: '#0ea5e9' },
  { key: 'retours_station', label: 'Retours station', color: '#8b5cf6' },
  { key: 'inspections',     label: 'Inspections',     color: '#f59e0b' },
] as const;

type Counts = { rondes: number; amarrages: number; retours_station: number; inspections: number };

// Operations composition donut — 4 categories from info_seed.composition,
// filtered to the selected period by the parent. Center = total count.
export function OperationsDonut({ counts }: { counts: Counts }) {
  const total = SEGMENTS.reduce((a, s) => a + counts[s.key], 0);
  const data = SEGMENTS.map((s) => ({ name: s.label, value: counts[s.key], color: s.color }));

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
          <span className="card-subtext mt-1">opérations</span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm">
        {SEGMENTS.map((s) => (
          <span key={s.key} className="flex items-center gap-1.5">
            <span className="text-base leading-none" style={{ color: s.color }}>●</span>
            {s.label} {counts[s.key]}
          </span>
        ))}
      </div>
    </div>
  );
}
