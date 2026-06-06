import type { ReactNode } from 'react';

// Titled card wrapper for a statistics section (matches the dashboard chart card).
export function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <section className="surface-card p-card">
      <div className="mb-4">
        <h3 className="text-[18px] font-medium">{title}</h3>
        {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}
