import { batteryColor } from '../../lib/format';

// "Niveau batterie" KPI-row card (5th card): big % value in the status color +
// a one-line caption noting the value is event-sampled (no chart). Sizes to its
// content like the other four cards.
export function BatteryCard({ battery }: { battery: number }) {
  return (
    <div className="surface-card p-card">
      <div className="flex items-start justify-between">
        <span className="text-base text-muted">Niveau batterie</span>
        {/* battery icon */}
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-muted">
          <rect x="2" y="7" width="16" height="10" rx="2" />
          <path d="M22 10v4" strokeLinecap="round" />
        </svg>
      </div>

      <div className="mt-3">
        <span className={`text-[44px] font-semibold leading-none tracking-tight ${batteryColor(battery)}`}>
          {battery}%
        </span>
      </div>

      {/* event-sampled, not continuous — caption only, no chart */}
      <p className="card-subtext mt-2">Relevé au dock/départ</p>
    </div>
  );
}
