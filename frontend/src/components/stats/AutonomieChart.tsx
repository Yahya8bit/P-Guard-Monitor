import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

type Row = { label: string; value: number };

// Taux d'autonomie per period — % line on a fixed 0–100 axis with a dashed
// reference line at the overall average.
export function AutonomieChart({ data, avg }: { data: Row[]; avg: number }) {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -20 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} stroke="var(--border)" interval="preserveStartEnd" minTickGap={20} />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            allowDecimals={false}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            stroke="var(--border)"
          />
          <Tooltip
            cursor={{ stroke: 'var(--border)' }}
            contentStyle={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12, color: 'var(--text)' }}
            formatter={(v: number) => [`${v.toFixed(1)}%`, "Taux d'autonomie"]}
          />
          <ReferenceLine y={avg} stroke="#94a3b8" strokeDasharray="4 4" />
          <Line type="monotone" dataKey="value" stroke="#0d9488" strokeWidth={2} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
