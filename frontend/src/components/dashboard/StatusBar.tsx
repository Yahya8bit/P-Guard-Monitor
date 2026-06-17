import type { Robot } from '../../types/contract';
import { STATE_META } from '../../lib/format';
import { useT } from '../../theme/LanguageContext';

function Sep() {
  return <span className="h-4 w-px shrink-0 bg-border" aria-hidden />;
}

export function StatusBar({ robot }: { robot: Robot }) {
  const t = useT();
  const meta = STATE_META[robot.state];
  const stateLabel = t(`fleet.state.${robot.state}` as Parameters<typeof t>[0]);
  const regionLabel = robot.region === 'tunisia' ? t('fleet.region.tunisia') : t('fleet.region.germany');
  return (
    <section className="surface-card flex h-12 items-center gap-3 overflow-hidden px-4 text-sm">
      <span className={`flex shrink-0 items-center gap-1.5 font-medium ${meta.color}`}>
        <span className="text-base leading-none">●</span>
        {stateLabel}
      </span>
      <Sep />
      <span className="shrink-0 font-semibold tracking-tight">{robot.name}</span>
      <Sep />
      <span className="shrink-0 text-muted">{robot.id}</span>
      <Sep />
      <span className="shrink-0 text-muted">
        {robot.site} · {regionLabel}
      </span>
      <Sep />
      <span className="truncate text-muted">
        {t('status.mission')}&nbsp;: <span className="text-text">{robot.currentMission ?? t('status.noMission').toLowerCase()}</span>
      </span>
    </section>
  );
}
