import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import L from 'leaflet';
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import { useAuth } from '../auth/AuthContext';
import { canAccessRobot } from '../auth/guards';
import { TopBar } from '../components/TopBar';
import { listRobots } from '../services/api';
import { REGION_LABEL, STATE_META, attentionLevel, batteryColor } from '../lib/format';
import { useTheme } from '../theme/ThemeContext';
import type { AttentionLevel } from '../lib/format';
import type { Robot } from '../types/contract';
import type { RobotState } from '../types/contract';

// State sort order within the same attention level: running first, then charging,
// docked, offline. Maintenance is always critical so it sorts ahead of these.
const STATE_SORT: Record<RobotState, number> = {
  maintenance: 0, running: 1, charging: 2, docked: 3, offline: 4,
};

// One accent scale keyed off attentionLevel (format.ts). critical = red,
// watch = amber, ok = neutral — applied identically to ring, pill, bar and %.
const LEVEL_RANK: Record<AttentionLevel, number> = { critical: 0, watch: 1, ok: 2 };
const LEVEL_STYLE: Record<AttentionLevel, { ring: string; pill: string; bar: string; pct: string }> = {
  critical: { ring: 'ring-1 ring-inset ring-danger', pill: 'border-danger text-danger', bar: 'bg-danger', pct: 'text-danger' },
  watch: { ring: 'ring-1 ring-inset ring-warning', pill: 'border-warning text-warning', bar: 'bg-warning', pct: 'text-warning' },
  ok: { ring: '', pill: '', bar: 'bg-accent', pct: 'text-text' },
};
// Marker fill colors for the map — same semantic scale as LEVEL_STYLE.
const LEVEL_FILL: Record<AttentionLevel, string> = {
  critical: '#E5484D',
  watch:    '#E0A030',
  ok:       '#2ECC9A',
};
// pill label per level (critical splits maintenance vs critical battery)
const levelLabel = (r: Robot, lvl: AttentionLevel): string =>
  lvl === 'critical' ? (r.state === 'maintenance' ? 'Maintenance requise' : 'Batterie critique') : lvl === 'watch' ? 'Batterie faible' : '';

// TODO: replace with real GPS coordinates from robot telemetry once the
// telemetry endpoint is wired up. These are city-level approximations.
const ROBOT_COORDS: Record<string, [number, number]> = {
  'PG-001': [48.9667, 9.1333],   // currently deployed in Bietigheim (DE)
  'PG-002': [35.7643, 10.8113],  // Monastir (TN)
  'PG-003': [48.9667, 9.1333],   // Bietigheim (DE)
  'PG-004': [35.8245, 10.6346],  // Sousse (TN)
};

const POLL_MS = 8000; // ~8s live refresh

type FleetView = 'cards' | 'map';

type StatusFilter = 'all' | RobotState;
const STATUS_OPTS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Tous' },
  { key: 'running', label: 'En ronde' },
  { key: 'charging', label: 'En charge' },
  { key: 'docked', label: 'À quai' },
  { key: 'maintenance', label: 'Maintenance' },
];

// Fleet overview (superadmin/admin only — clients are redirected to their robot).
// Cards are filtered by assignment in the component, not just hidden by CSS.
export function Fleet() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [robots, setRobots] = useState<Robot[] | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [view, setView] = useState<FleetView>('cards');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [attentionOnly, setAttentionOnly] = useState(false);
  const lastKey = useRef<string>('');

  // Live data: initial load + poll every ~8s. The timestamp only resets when the
  // data actually CHANGES, so with the (currently deterministic) mock it keeps
  // counting up instead of resetting every poll. When the real endpoint streams
  // changes, "last updated" will jump on each real change.
  // TODO: point listRobots() at the real fleet endpoint (WebSocket or REST poll).
  useEffect(() => {
    let alive = true;
    const load = () =>
      listRobots().then((r) => {
        if (!alive) return;
        const key = r.map((x) => `${x.id}:${x.state}:${x.battery}:${x.currentMission}`).join('|');
        setRobots(r);
        if (key !== lastKey.current) {
          lastKey.current = key;
          setUpdatedAt(new Date());
        }
      });
    load();
    const poll = setInterval(load, POLL_MS);
    return () => {
      alive = false;
      clearInterval(poll);
    };
  }, []);

  // 1s ticker so the "last updated" label counts up live.
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const accessible = useMemo(
    () => (robots?.filter((r) => user && canAccessRobot(user, r.id)) ?? [])
      .slice()
      .sort((a, b) => {
        const la = attentionLevel(a.state, a.battery);
        const lb = attentionLevel(b.state, b.battery);
        // 1st: attention (critical → watch → ok)
        // 2nd within same level: state order (running → charging → docked)
        // 3rd: alphabetical ID
        return (
          LEVEL_RANK[la] - LEVEL_RANK[lb] ||
          STATE_SORT[a.state] - STATE_SORT[b.state] ||
          a.id.localeCompare(b.id)
        );
      }),
    [robots, user],
  );

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return accessible.filter((r) => {
      if (attentionOnly && attentionLevel(r.state, r.battery) === 'ok') return false;
      if (statusFilter !== 'all' && r.state !== statusFilter) return false;
      if (q && !r.id.toLowerCase().includes(q) && !r.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [accessible, search, statusFilter, attentionOnly]);

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar title="Flotte" />
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">
        {/* header: count + live-data indicator (only after load) */}
        {robots ? (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted">
              {visible.length} robot{visible.length > 1 ? 's' : ''} accessible
              {visible.length > 1 ? 's' : ''}.
            </p>
            <LiveIndicator updatedAt={updatedAt} now={now} />
          </div>
        ) : (
          <div className="skeleton mb-5 h-5 w-40" />
        )}

        {!robots ? (
          <FleetSkeleton />
        ) : (
          <>
            <SummaryStrip
              robots={accessible}
              attentionOnly={attentionOnly}
              onAttentionClick={() => {
                setAttentionOnly((v) => !v);
                setStatusFilter('all');
              }}
            />

            {/* View toggle — always visible after load */}
            <div className="mt-4 flex items-center gap-2">
              <div className="flex gap-0.5 rounded-btn border border-border p-0.5">
                <ViewToggleBtn
                  active={view === 'cards'}
                  onClick={() => setView('cards')}
                  label="Cartes"
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
                      <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
                    </svg>
                  }
                />
                <ViewToggleBtn
                  active={view === 'map'}
                  onClick={() => setView('map')}
                  label="Carte"
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                      <line x1="8" y1="2" x2="8" y2="18" /><line x1="16" y1="6" x2="16" y2="22" />
                    </svg>
                  }
                />
              </div>
            </div>

            {view === 'cards' ? (
              <>
                {/* filter bar */}
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher (nom ou ID)..."
                    className="min-w-[200px] flex-1 rounded-btn border border-border bg-surface-2 px-3 py-1.5 text-sm outline-none focus:border-accent"
                  />
                  <div className="flex flex-wrap gap-1 rounded-btn border border-border p-0.5">
                    {STATUS_OPTS.map((o) => (
                      <button
                        key={o.key}
                        onClick={() => { setStatusFilter(o.key); setAttentionOnly(false); }}
                        className={[
                          'rounded-[6px] px-3 py-1.5 text-sm transition-colors',
                          !attentionOnly && statusFilter === o.key ? 'bg-accent font-medium text-[#04201d]' : 'text-muted hover:text-text',
                        ].join(' ')}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {visible.length === 0 ? (
                    <p className="col-span-full py-8 text-center text-sm text-muted">Aucun robot ne correspond aux filtres.</p>
                  ) : visible.map((r) => {
                    const meta = STATE_META[r.state];
                    const lvl = attentionLevel(r.state, r.battery);
                    const st = LEVEL_STYLE[lvl];
                    return (
                      <button
                        key={r.id}
                        onClick={() => navigate(`/robots/${r.id}/dashboard`)}
                        className={`surface-card group p-4 text-left transition-transform hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${st.ring}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-medium uppercase tracking-wider text-muted">{r.id}</div>
                            <div className="mt-0.5 text-lg font-semibold tracking-tight">{r.name}</div>
                          </div>
                          <span className={`shrink-0 text-xs font-medium ${meta.color}`}>● {meta.label}</span>
                        </div>

                        {/* attention badge — text label, never color alone (a11y) */}
                        {lvl !== 'ok' && (
                          <div className={`mt-2 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${st.pill}`}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 3l9 16H3zM12 10v4M12 17h.01" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {levelLabel(r, lvl)}
                          </div>
                        )}

                        <div className="mt-2 text-sm text-muted">
                          {r.site} · {REGION_LABEL[r.region]}
                        </div>

                        <div className="mt-3">
                          <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-muted">Batterie</span>
                            <span className={st.pct}>{r.battery}%</span>
                          </div>
                          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
                            <div className={`h-full rounded-full ${st.bar}`} style={{ width: `${r.battery}%` }} />
                          </div>
                        </div>

                        {r.currentMission && (
                          <div className="mt-3 truncate text-sm">
                            <span className="text-muted">Mission&nbsp;: </span>
                            {r.currentMission}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="mt-4">
                <FleetMap robots={visible} onNavigate={(id) => navigate(`/robots/${id}/dashboard`)} />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

// Small segmented-control button used by the view toggle.
function ViewToggleBtn({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-sm transition-colors',
        active ? 'bg-accent font-medium text-[#04201d]' : 'text-muted hover:text-text',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
  );
}

// Fits the map view to all marker positions on mount.
function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
    } else if (points.length === 1) {
      map.setView(points[0], 13);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]); // intentionally only on mount; coords are static until real telemetry lands
  return null;
}

// Fleet map: one CircleMarker per robot, colored by attentionLevel.
// Clicking a marker opens a popup with condensed robot info + navigation link.
function FleetMap({ robots, onNavigate }: { robots: Robot[]; onNavigate: (id: string) => void }) {
  const { theme } = useTheme();
  const tileUrl =
    theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  const positioned = robots.map((r) => ({ r, coords: ROBOT_COORDS[r.id] })).filter((x) => x.coords);
  const points = positioned.map((x) => x.coords);
  const center: [number, number] = points[0] ?? [35.8245, 10.6346];

  return (
    <div className="overflow-hidden rounded-btn border border-border" style={{ height: '450px' }}>
      <MapContainer
        center={center}
        zoom={10}
        scrollWheelZoom={false}
        attributionControl={false}
        style={{ height: '100%', width: '100%', background: 'var(--surface-2)' }}
      >
        <TileLayer key={theme} url={tileUrl} />
        {positioned.map(({ r, coords }) => {
          const lvl = attentionLevel(r.state, r.battery);
          const fill = LEVEL_FILL[lvl];
          const meta = STATE_META[r.state];
          return (
            <CircleMarker
              key={r.id}
              center={coords}
              radius={11}
              pathOptions={{ color: fill, fillColor: fill, fillOpacity: 0.85, weight: 2.5 }}
            >
              <Popup minWidth={180}>
                <div style={{ fontFamily: 'system-ui, sans-serif', lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '2px' }}>{r.name}</div>
                  <div style={{ fontSize: '11px', color: '#888', marginBottom: '6px' }}>{r.id} · {r.site}</div>
                  <div style={{ fontSize: '12px', marginBottom: '2px' }}>
                    <span style={{ color: fill }}>●</span>
                    &nbsp;{meta.label}
                  </div>
                  <div style={{ fontSize: '12px', marginBottom: '2px' }}>Batterie&nbsp;: {r.battery}%</div>
                  <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                    {r.currentMission ?? 'Aucune mission en cours'}
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate(r.id)}
                    style={{
                      background: '#12B3A6',
                      color: '#04201d',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    Voir le tableau de bord
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
        <FitBounds points={points} />
      </MapContainer>
    </div>
  );
}

// Live-data indicator: pulsing dot + "updated Xs ago", refreshed by the 1s tick.
function LiveIndicator({ updatedAt, now }: { updatedAt: Date | null; now: number }) {
  if (!updatedAt) return null;
  const secs = Math.max(0, Math.round((now - updatedAt.getTime()) / 1000));
  const label = secs < 60 ? `il y a ${secs} s` : `il y a ${Math.round(secs / 60)} min`;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted" aria-live="polite">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
      </span>
      Mis à jour {label}
    </span>
  );
}

// One-glance fleet summary: online count, per-status breakdown, attention count,
// average battery. Derived from the currently-visible robots.
function SummaryStrip({
  robots,
  attentionOnly,
  onAttentionClick,
}: {
  robots: Robot[];
  attentionOnly: boolean;
  onAttentionClick: () => void;
}) {
  const total = robots.length;
  const online = robots.filter((r) => r.state !== 'offline').length;
  // same helper as the cards: count everything that is critical OR watch.
  const attention = robots.filter((r) => attentionLevel(r.state, r.battery) !== 'ok').length;
  const avgBattery = total ? Math.round(robots.reduce((s, r) => s + r.battery, 0) / total) : 0;
  // per-status counts, only for states actually present
  const byState = (['running', 'charging', 'docked', 'maintenance', 'offline'] as RobotState[])
    .map((s) => ({ s, n: robots.filter((r) => r.state === s).length }))
    .filter((x) => x.n > 0);

  return (
    <section className="surface-card flex flex-wrap items-center gap-x-6 gap-y-3 px-5 py-3" aria-label="Résumé de la flotte">
      <Stat label="En ligne" value={`${online}/${total}`} />
      <div className="h-8 w-px bg-border" aria-hidden />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {byState.map(({ s, n }) => (
          <span key={s} className="inline-flex items-center gap-1.5 text-sm">
            <span className={`text-base leading-none ${STATE_META[s].color}`}>●</span>
            <span className="text-muted">{STATE_META[s].label}</span>
            <span className="font-semibold tabular-nums">{n}</span>
          </span>
        ))}
      </div>
      <div className="h-8 w-px bg-border" aria-hidden />
      <button
        type="button"
        onClick={onAttentionClick}
        className={`inline-flex items-baseline gap-1.5 rounded px-1 transition-colors hover:bg-surface-2 ${attentionOnly ? 'ring-1 ring-warning' : ''}`}
        title={attentionOnly ? 'Réinitialiser le filtre' : 'Filtrer les robots à surveiller'}
      >
        <span className="text-xs text-muted">À surveiller</span>
        <span className={`text-base font-semibold tabular-nums ${attention > 0 ? 'text-warning' : ''}`}>{attention}</span>
      </button>
      <Stat label="Batterie moy." value={`${avgBattery}%`} tone={batteryColor(avgBattery)} />
    </section>
  );
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-base font-semibold tabular-nums ${tone ?? ''}`}>{value}</span>
    </span>
  );
}

// Loading state: reserve the card-grid footprint with shimmer blocks, matching
// the skeleton treatment on the dashboard + statistiques pages.
function FleetSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true" aria-label="Chargement de la flotte">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="skeleton h-[176px] w-full" />
      ))}
    </div>
  );
}
