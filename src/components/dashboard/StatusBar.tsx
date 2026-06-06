import type { Robot } from '../../types/contract';
import { REGION_LABEL, STATE_META } from '../../lib/format';

// Thin vertical divider between status-bar items.
function Sep() {
  return <span className="h-4 w-px shrink-0 bg-border" aria-hidden />;
}

// Compact full-width status bar (~48px) that replaces the old tall hero. One
// horizontal row: state dot+label (status-colored) · robot name · ID · route ·
// current mission, separated by thin dividers. No boxed mission strip, no large
// heading — all the hero's facts on a single line to reclaim vertical space.
export function StatusBar({ robot }: { robot: Robot }) {
  const meta = STATE_META[robot.state];
  return (
    <section className="surface-card flex h-12 items-center gap-3 overflow-hidden px-4 text-sm">
      <span className={`flex shrink-0 items-center gap-1.5 font-medium ${meta.color}`}>
        <span className="text-base leading-none">●</span>
        {meta.label}
      </span>
      <Sep />
      <span className="shrink-0 font-semibold tracking-tight">{robot.name}</span>
      <Sep />
      <span className="shrink-0 text-muted">{robot.id}</span>
      <Sep />
      <span className="shrink-0 text-muted">
        {robot.site} · {REGION_LABEL[robot.region]}
      </span>
      <Sep />
      <span className="truncate text-muted">
        Mission&nbsp;: <span className="text-text">{robot.currentMission ?? 'aucune'}</span>
      </span>
    </section>
  );
}
