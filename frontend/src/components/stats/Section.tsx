import type { ReactNode } from 'react';

// Titled card wrapper for a statistics section (matches the dashboard chart card).
export function Section({ title, subtitle, action, children }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="surface-card p-card">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[18px] font-medium">{title}</h3>
          {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </div>
      {children}
    </section>
  );
}
