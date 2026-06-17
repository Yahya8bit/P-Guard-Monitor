import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { useT } from '../../theme/LanguageContext';

export function MissionDonut({
  completed,
  interrupted,
  total,
  rate,
  completedLabel,
  interruptedLabel,
}: {
  completed: number;
  interrupted: number;
  total: number;
  rate: number;
  completedLabel?: string;
  interruptedLabel?: string;
}) {
  const t = useT();
  const cLabel = completedLabel ?? t('stats.op.rondes.completed');
  const iLabel = interruptedLabel ?? t('stats.op.rondes.interrupted');
  const data = [
    { name: cLabel, value: completed, color: 'var(--success)' },
    { name: iLabel, value: interrupted, color: 'var(--danger)' },
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
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[34px] font-bold leading-none text-text">{rate}%</span>
          <span className="card-subtext mt-1">{total} {t('stats.op.rondes')}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="text-base leading-none text-success">●</span>
          {cLabel} {completed}
        </span>
        <span className="text-muted">·</span>
        <span className="flex items-center gap-1.5">
          <span className="text-base leading-none text-danger">●</span>
          {iLabel} {interrupted}
        </span>
      </div>
    </div>
  );
}
