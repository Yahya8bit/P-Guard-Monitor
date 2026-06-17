import type { ReactNode } from 'react';

// Summary headline tile — same surface-card shell as the dashboard cards.
// `sub` shows the derivation (e.g. "562 / 969") so the number is auditable.
export function StatTile({ label, value, sub, note }: { label: string; value: ReactNode; sub?: string; note?: string }) {
  return (
    <div className="surface-card p-card">
      <div className="kpi-label text-base font-semibold text-text">{label}</div>
      <div className="kpi-value mt-2 text-[40px] font-bold leading-none tracking-tight text-accent">{value}</div>
      {sub && <p className="card-subtext mt-2">{sub}</p>}
      {note && <p className="mt-1 text-xs text-muted">{note}</p>}
    </div>
  );
}
