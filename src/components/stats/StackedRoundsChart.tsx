import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Row = { label: string; completed: number; interrupted: number };

// Stacked bars per period: terminées (success) + interrompues (danger). The two
// stacked segments sum to the bucket's total rounds. Colors are CSS vars =>
// legible in both themes. Counts => bars, never a smooth line.
export function StackedRoundsChart({ data }: { data: Row[] }) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} stroke="var(--border)" interval="preserveStartEnd" minTickGap={20} />
          <YAxis allowDecimals={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} stroke="var(--border)" />
          <Tooltip
            cursor={{ fill: 'var(--surface-2)', opacity: 0.4 }}
            contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }}
          />
          <Legend wrapperStyle={{ fontSize: 12, color: 'var(--text-muted)' }} />
          <Bar dataKey="completed" name="Terminées" stackId="r" fill="var(--success)" maxBarSize={36} isAnimationActive={false} />
          <Bar dataKey="interrupted" name="Interrompues" stackId="r" fill="var(--danger)" radius={[2, 2, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
