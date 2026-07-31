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
  hint?: string; // longer explanation revealed by the info affordance on the label
  deltaPct?: number;
  sentiment?: Sentiment;
  subtext?: ReactNode; // muted "compared to what" line under the value
  placeholder?: boolean; // renders the "data not yet derivable" treatment
  onSelect?: () => void; // if set, card is clickable and drives the trend chart
  selected?: boolean; // this card's metric is the one shown in the trend chart
  emphasized?: boolean; // alert state: danger-tinted fill (see .kpi-alert)
  tone?: 'teal' | 'danger'; // light-theme icon-chip / accent color
  fill?: string; // tile fill key (data-fill): teal depths / warning / danger / muted
}

// KPI card: label top-left, big accent number, secondary value, icon top-right.
// `placeholder` is used for Disponibilité — formula is TODO, so we never show a
// fake percentage (CLAUDE.md: clearly-labelled placeholder, no fabrication).
export function KpiCard({ label, value, icon, note, hint, deltaPct, sentiment = 'neutral', subtext, placeholder, onSelect, selected, emphasized, tone = 'teal', fill }: Props) {
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

  // When onSelect is set the card drives the trend metric. The CURRENTLY-SELECTED
  // card keeps a persistent accent ring so it's obvious which metric the chart is
  // showing and that the cards are interactive at all (aria-pressed exposes the
  // same state to assistive tech). Hover/active/focus-visible rings layer on top.
  // All rings are inset (box-shadow), so the box size never changes.
  const selectable = !!onSelect;
  return (
    <div
      role={selectable ? 'button' : undefined}
      tabIndex={selectable ? 0 : undefined}
      aria-pressed={selectable ? !!selected : undefined}
      onClick={onSelect}
      onKeyDown={selectable ? (e) => (e.key === 'Enter' || e.key === ' ') && onSelect!() : undefined}
      // data-fill drives the LIGHT-only solid tile fill (ignored in dark)
      data-fill={fill}
      className={[
        // dashboard KPI cards: 24px internal padding (p-6) for airier breathing
        'surface-card p-6 transition-all duration-200 ease-out',
        // EMPHASIS: danger-tinted fill when in alert state. Only swaps bg +
        // border-color (same 1px border), so the box size never changes.
        emphasized ? 'kpi-alert' : '',
        selectable
          ? 'cursor-pointer hover:ring-1 hover:ring-inset hover:ring-accent/50 active:ring-2 active:ring-inset active:ring-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent'
          : '',
        // persistent selected state — the metric currently in the chart
        selected ? 'ring-1 ring-inset ring-accent' : '',
      ].join(' ')}
    >
      <div className="flex items-start justify-between">
        <span className="flex items-center gap-1.5">
          <span className="kpi-label text-base font-semibold text-text">{label}</span>
          {hint && <InfoHint label={label} text={hint} />}
        </span>
        {/* icon chip: bare icon on dark, tinted rounded square on light */}
        <span className="kpi-chip" data-tone={tone}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d={icon} strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      <div className="mt-3 flex items-end gap-2">
        {/* placeholder: show the provided label (e.g. "à venir") at a smaller
            size so the card reads as upcoming, not a broken empty number. */}
        <span
          className={`kpi-value font-bold leading-none tracking-tight ${
            placeholder ? 'text-2xl text-muted' : 'text-[40px] text-accent'
          }`}
        >
          {placeholder ? (value ?? '—') : value}
        </span>
        {!placeholder && deltaPct !== undefined && (
          <span className={`kpi-delta mb-1 text-xs font-medium ${deltaColor}`}>
            {up ? '▲' : '▼'} {Math.abs(deltaPct)}%
          </span>
        )}
      </div>

      {/* secondary "compared to what" line, shared muted token (.card-subtext) */}
      {subtext && <p className="card-subtext mt-1.5">{subtext}</p>}

      {/* optional smaller third-line note (no sparkline — removed as filler) */}
      {note && <p className="kpi-note mt-2 text-[11px] leading-tight text-muted">{note}</p>}
    </div>
  );
}

// Small "i" affordance next to a KPI label. Reveals a short explanation on hover
// or keyboard focus (CSS-driven, see .kpi-info in index.css). The trigger sits
// outside the card's click target via stopPropagation so opening the hint never
// also flips the trend metric.
function InfoHint({ label, text }: { label: string; text: string }) {
  return (
    <span className="kpi-info">
      <button
        type="button"
        className="kpi-info__btn"
        aria-label={`Aide pour ${label}. ${text}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        i
      </button>
      <span role="tooltip" className="kpi-info__bubble">
        {text}
      </span>
    </span>
  );
}
