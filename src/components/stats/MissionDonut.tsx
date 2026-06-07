import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';

// Mission-completion donut (composition view). Reads the SAME numbers as the
// "Taux de réussite des missions" tile and the stacked-bar timeline — completed
// + interrupted come straight from the shared StatsBundle.summary, so all three
// always show the identical split for the selected period.
export function MissionDonut({
  completed,
  interrupted,
  total,
  rate,
}: {
  completed: number;
  interrupted: number;
  total: number;
  rate: number;
}) {
  const data = [
    { name: 'Terminées', value: completed, color: 'var(--success)' },
    { name: 'Interrompues', value: interrupted, color: 'var(--danger)' },
  ];

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
        {/* center label: completion rate % + total rounds below */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[34px] font-bold leading-none text-text">{rate}%</span>
          <span className="card-subtext mt-1">{total} rondes</span>
        </div>
      </div>

      {/* legend with period-scaled counts */}
      <div className="mt-3 flex items-center justify-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="text-base leading-none text-success">●</span>
          Terminées {completed}
        </span>
        <span className="text-muted">·</span>
        <span className="flex items-center gap-1.5">
          <span className="text-base leading-none text-danger">●</span>
          Interrompues {interrupted}
        </span>
      </div>
    </div>
  );
}
