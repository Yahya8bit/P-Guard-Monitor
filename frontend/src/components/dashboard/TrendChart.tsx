import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import type { Period, TrendSeries } from '../../types/contract';

const PERIODS: { key: Period; label: string }[] = [
  { key: '7d', label: '7 j' },
  { key: '30d', label: '30 j' },
];

interface Props {
  series: TrendSeries;
  period: Period;
  onPeriod: (p: Period) => void;
  title: string;
  subtitle: string;
  color: string; // bar color for the selected metric (CSS var or hex)
  percent?: boolean; // % metric (Disponibilité): fixed 0–100 axis + % tooltip
}

// Daily trend as bars, period-switchable (7d / 30d). Title, subtitle and bar
// color are driven by the selected KPI card. `percent` switches to a 0–100 axis
// for the Disponibilité metric (a rate, not a count).
export function TrendChart({ series, period, onPeriod, title, subtitle, color, percent }: Props) {
  const data = series.points.map((p) => ({ ...p, label: p.t.slice(5) }));

  // count metrics: y-axis max = data max + 1, integer ticks. percent metric:
  // fixed 0–100 axis with quarter ticks.
  const dataMax = data.reduce((m, d) => Math.max(m, d.value), 0);
  const yMax = percent ? 100 : dataMax + 1;
  const yTicks = percent ? [0, 25, 50, 75, 100] : Array.from({ length: yMax + 1 }, (_, i) => i);

  return (
    // COMPACT: chart sizes to its content (no flex-1 grow) — a 0–3 count range
    // doesn't need a tall plot. Fixed short plot height below.
    <section className="surface-card flex flex-col p-card">
      <div className="mb-4 flex items-center justify-between">
        <div>
          {/* title/subtitle reflect the selected KPI (CHANGE A) */}
          <h3 className="text-[18px] font-medium">{title}</h3>
          <p className="text-[13px] text-muted">{subtitle}</p>
        </div>
        <div className="flex gap-1 rounded-btn border border-border p-0.5">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => onPeriod(p.key)}
              className={[
                'rounded-[6px] px-2.5 py-1 text-xs transition-colors',
                period === p.key ? 'bg-accent text-[#04201d] font-medium' : 'text-muted hover:text-text',
              ].join(' ')}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* COMPACT: short fixed plot height — bars stay readable, no empty space */}
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fill: 'var(--text-muted)', fontSize: 13 }}
              stroke="var(--border)"
              interval="preserveStartEnd"
              minTickGap={24}
            />
            <YAxis
              domain={[0, yMax]}
              ticks={yTicks}
              allowDecimals={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 13 }}
              stroke="var(--border)"
            />
            <Tooltip
              cursor={{ stroke: 'var(--border)' }}
              contentStyle={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                fontSize: 12,
                color: 'var(--text)',
              }}
              formatter={(v: number) => [percent ? `${v}%` : v, title]}
            />
            {/* one bar per day (whole counts, no smooth interpolation); color
                tracks the selected metric */}
            <Bar dataKey="value" fill={color} radius={[2, 2, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
