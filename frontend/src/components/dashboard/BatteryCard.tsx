import { batteryColor } from '../../lib/format';
import { useT } from '../../theme/LanguageContext';

export function BatteryCard({ battery, fill }: { battery: number; fill?: string }) {
  const t = useT();
  return (
    <div className="surface-card p-6" data-fill={fill}>
      <div className="flex items-start justify-between">
        <span className="kpi-label text-base font-semibold text-text">{t('status.battery')}</span>
        <span className="kpi-chip" data-tone="teal">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="2" y="7" width="16" height="10" rx="2" />
            <path d="M22 10v4" strokeLinecap="round" />
          </svg>
        </span>
      </div>

      <div className="mt-3">
        <span className={`kpi-value text-[40px] font-bold leading-none tracking-tight ${batteryColor(battery)}`}>
          {battery}%
        </span>
      </div>
    </div>
  );
}
