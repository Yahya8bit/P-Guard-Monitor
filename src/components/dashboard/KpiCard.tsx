import type { ReactNode } from 'react';

// Per-KPI sentiment: does a rise help or hurt this metric? Drives the delta
// badge COLOR (the arrow still shows the real direction). Assigned per card in
// Dashboard.tsx next to the KPI definitions.
export type Sentiment = 'higher-better' | 'higher-worse' | 'neutral';

interface Props {
  label: string;
  value: ReactNode;
  icon: string; // svg path
  note?: string; // small clarifier under the value (e.g. proxy / TODO)
  deltaPct?: number;
  sentiment?: Sentiment;
  subtext?: ReactNode; // muted "compared to what" line under the value
  placeholder?: boolean; // renders the "data not yet derivable" treatment
  onSelect?: () => void; // if set, card is clickable and drives the trend chart
  active?: boolean; // highlighted when it's the selected trend metric
}

// KPI card: label top-left, big accent number, secondary value, icon top-right.
// `placeholder` is used for Disponibilité — formula is TODO, so we never show a
// fake percentage (CLAUDE.md: clearly-labelled placeholder, no fabrication).
export function KpiCard({ label, value, icon, note, deltaPct, sentiment = 'neutral', subtext, placeholder, onSelect, active }: Props) {
  const up = deltaPct !== undefined && deltaPct >= 0;

  // Delta badge color is chosen by SENTIMENT, not by arrow direction:
  //   neutral / no change -> muted (no good-bad signal)
  //   favorable move       -> success (green/teal)
  //   unfavorable move     -> danger (red)
  // "favorable" = the metric moved the way that's good for it (up for
  // higher-better, down for higher-worse). The ▲/▼ arrow below is independent
  // and always reflects the real sign of deltaPct.
  const deltaColor = (() => {
    if (sentiment === 'neutral' || deltaPct === undefined || deltaPct === 0) return 'text-muted';
    const favorable = sentiment === 'higher-better' ? deltaPct > 0 : deltaPct < 0;
    return favorable ? 'text-success' : 'text-danger';
  })();

  // CHANGE A: when onSelect is set the card selects the trend metric.
  // EQUAL-SIZE: every card shares ONE box style (surface-card: same 1px border,
  // radius, p-card padding; box-sizing is border-box globally via Tailwind
  // preflight). The active highlight is an INSET ring (ring-inset) — drawn
  // inside the box via box-shadow, so it never adds to the layout size. Result:
  // selecting a card changes only its outline, never its width/height.
  const selectable = !!onSelect;
  return (
    <div
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      onClick={onSelect}
      onKeyDown={selectable ? (e) => (e.key === 'Enter' || e.key === ' ') && onSelect!() : undefined}
      className={[
        'surface-card p-card',
        selectable ? 'cursor-pointer transition-shadow hover:ring-1 hover:ring-inset hover:ring-accent/50' : '',
        active ? 'ring-2 ring-inset ring-accent' : '',
      ].join(' ')}
    >
      {/* SCALE-UP: label 16px, icon 22px, value 44px */}
      <div className="flex items-start justify-between">
        <span className="text-base text-muted">{label}</span>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-muted">
          <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <div className="mt-3 flex items-end gap-2">
        {/* placeholder: show the provided label (e.g. "à venir") at a smaller
            size so the card reads as upcoming, not a broken empty number. */}
        <span
          className={`font-semibold leading-none tracking-tight ${
            placeholder ? 'text-2xl text-muted' : 'text-[44px] text-accent'
          }`}
        >
          {placeholder ? (value ?? '—') : value}
        </span>
        {!placeholder && deltaPct !== undefined && (
          <span className={`mb-1 text-xs font-medium ${deltaColor}`}>
            {up ? '▲' : '▼'} {Math.abs(deltaPct)}%
          </span>
        )}
      </div>

      {/* secondary "compared to what" line, shared muted token (.card-subtext) */}
      {subtext && <p className="card-subtext mt-1.5">{subtext}</p>}

      {/* optional smaller third-line note (no sparkline — removed as filler) */}
      {note && <p className="mt-2 text-[11px] leading-tight text-muted">{note}</p>}
    </div>
  );
}
