import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import { useT } from '../../theme/LanguageContext';

interface Props {
  successCount: number;
  failCount: number;
  total: number;
  successLabel: string;
  failLabel: string;
  centerLabel: string;
  note?: string;
}

export function OutcomeDonut({ successCount, failCount, total, successLabel, failLabel, centerLabel, note }: Props) {
  const t = useT();
  if (total === 0) {
    return (
      <div className="flex h-56 items-center justify-center">
        <p className="text-sm text-muted">{t('stats.noDataPeriod')}</p>
      </div>
    );
  }

  const data = [
    { name: successLabel, value: successCount, color: '#0d9488' },
    { name: failLabel,    value: failCount,    color: 'var(--danger)' },
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
          <span className="text-[34px] font-bold leading-none text-text">{total}</span>
          <span className="card-subtext mt-1">{centerLabel}</span>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-center gap-4 text-sm">
        <span className="flex items-center gap-1.5">
          <span className="text-base leading-none" style={{ color: '#0d9488' }}>●</span>
          {successLabel} {successCount}
        </span>
        <span className="text-muted">·</span>
        <span className="flex items-center gap-1.5">
          <span className="text-base leading-none text-danger">●</span>
          {failLabel} {failCount}
        </span>
      </div>
      {note && <p className="mt-2 text-center text-xs text-muted">{note}</p>}
    </div>
  );
}
