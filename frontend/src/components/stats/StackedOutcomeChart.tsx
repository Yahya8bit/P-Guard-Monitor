import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useT } from '../../theme/LanguageContext';

interface Row {
  label: string;
  [key: string]: string | number;
}

interface Props {
  data: Row[];
  successKey: string;
  failKey: string;
  successName: string;
  failName: string;
}

// Generic stacked outcome bar chart — teal for success, danger for fail.
// Shows "Aucune donnée sur la période" when data is empty.
export function StackedOutcomeChart({ data, successKey, failKey, successName, failName }: Props) {
  const t = useT();
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-sm text-muted">{t('stats.noDataPeriod')}</p>
      </div>
    );
  }

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
          <Bar dataKey={successKey} name={successName} stackId="s" fill="#0d9488" maxBarSize={36} isAnimationActive={false} />
          <Bar dataKey={failKey}    name={failName}    stackId="s" fill="var(--danger)" radius={[2, 2, 0, 0]} maxBarSize={36} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
