import type { ReactNode } from 'react';
import { Section } from './Section';

interface Props {
  donutTitle: string;
  chartTitle: string;
  donut: ReactNode;
  chart: ReactNode;
}

// Layout row for an operation: donut (1/3) beside stacked chart (2/3).
// Stacks vertically on small screens (donut above chart).
export function OperationRow({ donutTitle, chartTitle, donut, chart }: Props) {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="xl:col-span-1">
        <Section title={donutTitle}>
          {donut}
        </Section>
      </div>
      <div className="xl:col-span-2">
        <Section title={chartTitle}>
          {chart}
        </Section>
      </div>
    </div>
  );
}
