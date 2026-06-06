const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

// 7×24 heatmap of round start times (jours × heures). Intensity = rounds in that
// cell, encoded as opacity over the teal accent CSS var (theme-legible, no
// hardcoded hex). Empty cells use the surface token.
export function ActivityHeatmap({ matrix, max }: { matrix: number[][]; max: number }) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* hour axis (every 3h to stay readable) */}
        <div className="mb-1 flex pl-10 text-[10px] text-muted">
          {Array.from({ length: 24 }, (_, h) => (
            <div key={h} className="flex-1 text-center">
              {h % 3 === 0 ? `${h}h` : ''}
            </div>
          ))}
        </div>
        {matrix.map((row, d) => (
          <div key={d} className="mb-1 flex items-center">
            <div className="w-10 shrink-0 text-[11px] text-muted">{DAYS[d]}</div>
            <div className="flex flex-1 gap-0.5">
              {row.map((count, h) => {
                // floor at 0.06 so a non-zero cell is always visible
                const intensity = count === 0 ? 0 : 0.06 + (count / max) * 0.94;
                return (
                  <div
                    key={h}
                    title={`${DAYS[d]} ${h}h — ${count} ronde${count > 1 ? 's' : ''}`}
                    className="h-5 flex-1 rounded-[2px]"
                    style={{
                      backgroundColor: count === 0 ? 'var(--surface-2)' : 'var(--accent)',
                      opacity: count === 0 ? 1 : intensity,
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
        {/* legend */}
        <div className="mt-2 flex items-center gap-2 pl-10 text-[11px] text-muted">
          <span>moins</span>
          {[0.1, 0.35, 0.6, 0.85, 1].map((o) => (
            <span key={o} className="h-3 w-5 rounded-[2px]" style={{ backgroundColor: 'var(--accent)', opacity: o }} />
          ))}
          <span>plus</span>
        </div>
      </div>
    </div>
  );
}
