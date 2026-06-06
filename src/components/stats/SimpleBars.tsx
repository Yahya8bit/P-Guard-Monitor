import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Row = { label: string; value: number };

// Single-series bar chart (used for Arrêts d'urgence and Distance). Bar color is
// passed as a CSS var so it themes correctly. `unit` shows in the tooltip.
export function SimpleBars({ data, color, name, unit }: { data: Row[]; color: string; name: string; unit?: string }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} stroke="var(--border)" interval="preserveStartEnd" minTickGap={20} />
          <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} stroke="var(--border)" />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)', opacity: 0.4 }}
            contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }}
            formatter={(v: number) => [`${v}${unit ?? ''}`, name]}
          />
          <Bar dataKey="value" name={name} fill={color} radius={[2, 2, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
