import type { ReactNode } from 'react';

// Summary headline tile — same surface-card shell as the dashboard cards.
// `sub` shows the derivation (e.g. "562 / 969") so the number is auditable.
export function StatTile({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="surface-card p-card">
      <div className="text-base text-muted">{label}</div>
      <div className="mt-2 text-[40px] font-semibold leading-none tracking-tight text-accent">{value}</div>
      {sub && <p className="card-subtext mt-2">{sub}</p>}
    </div>
  );
}
