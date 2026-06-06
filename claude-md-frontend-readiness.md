# Frontend readiness — app shell, tokens, data contract, mocks

> Companion to the data-layer section. That file owns data-quality rules + KPI
> derivations; THIS file owns the UI shell, design tokens, the frozen data
> contract the mock service exposes, mock auth, and seed parameters.
> Stack: React 18 + TS + Vite + Tailwind (real config) + Recharts + react-router.

## App shell & layout (borrowed IA, Enova brand)

- **Flow:** Login → fleet view (robot cards) → click robot → its detail pages.
  Client skips the fleet list and lands directly on their one robot.
- **Left sidebar** (persistent): Dashboard, Statistiques, Alertes, Rapports,
  Gestion, Paramètres. `Gestion` is hidden for clients.
- **Status hero** (top of Dashboard): robot state + current mission + battery,
  styled as a prominent strip (the Robotiq "Running / Program:" pattern).
- **KPI card row:** four cards — label (top-left), big accent number, secondary
  value, icon (top-right). Cards = Rondes, Incidents, Cycles de charge,
  Disponibilité. Battery lives in the hero, not a card.
- **Trend chart:** one chart below the cards, period-switchable. Bar/area style.
- **Time-range selector:** Daily / Weekly / Monthly + 7d / 30d, centered above
  charts (the Robotiq prev/next/range pattern).
- Adopt Robotiq's STRUCTURE only — not its blue, logo, or arm-specific charts.

## Theme — dark default, light toggle

Persist choice (localStorage `pguard-theme`). Default dark. Semantic CSS vars;
Tailwind reads them. Enova teal accent, charcoal neutral (sampled from logo).

```css
/* DARK (default) */
:root[data-theme="dark"] {
  --bg:        #0F1416;
  --surface:   #161D1F;
  --surface-2: #1E2629;
  --border:    #2A3338;
  --text:      #E6EBEA;
  --text-muted:#8A9794;
  --accent:    #12B3A6;   /* brighter teal pops on dark */
  --accent-press:#00A090;
  --success:   #2ECC9A;
  --warning:   #E0A030;
  --danger:    #E5484D;
}
/* LIGHT */
:root[data-theme="light"] {
  --bg:        #F4F6F6;
  --surface:   #FFFFFF;
  --surface-2: #EEF2F1;
  --border:    #DCE3E1;
  --text:      #1A2426;
  --text-muted:#5E6E6B;
  --accent:    #00A090;   /* deeper teal reads better on white */
  --accent-press:#008575;
  --success:   #1FA97F;
  --warning:   #C2851C;
  --danger:    #D43A3F;
}
```

- **Brand constants:** Enova teal `#00A090` (wordmark-bright `#12B3A6`),
  charcoal `#4D4D4D`.
- **Radius:** cards 10px, buttons/inputs 8px. **Spacing base:** 4px; card pad
  20px; section gap 24–32px. **Font:** Inter (fallback system-ui), headings 600.
- **Chart palette:** accent teal, slate `#5B7A86`, violet `#8B5CF6`, amber
  `#E0A030`; danger red for thresholds/markers.
- **State colors:** running→success, charging→accent, docked→muted,
  maintenance→warning, offline→muted, aborted/critical→danger.

## Frozen data contract (mock service surface — do NOT drift)

```ts
type Role        = 'superadmin' | 'admin' | 'client';
type RobotState  = 'running' | 'charging' | 'docked' | 'maintenance' | 'offline';
type Region      = 'tunisia' | 'germany';
type Period      = '7d' | '30d' | 'custom';
type Granularity = 'daily' | 'weekly' | 'monthly';

interface User { id: string; name: string; email: string;
  role: Role; assignedRobotIds: string[]; }

interface Robot { id: string; name: string; site: string; region: Region;
  state: RobotState; currentMission: string | null;
  battery: number; commissionedAt: string; }

interface KpiValue { value: number; unit: 'count' | '%';
  deltaPct?: number; sparkline?: number[]; }

interface DashboardSummary {
  robotId: string; period: Period;
  status: { state: RobotState; currentMission: string | null;
            battery: number; lastSeen: string };
  kpis: {
    rounds:        KpiValue;   // Rondes effectuées
    incidents:     KpiValue;   // OPERATIONAL proxy (obstacle + e-stop)
    chargeCycles:  KpiValue;   // Cycles de charge
    availability:  KpiValue;   // % — TODO formula; placeholder until fixed
  };
}

interface TrendPoint  { t: string; value: number; }
interface TrendSeries { metric: string; granularity: Granularity; points: TrendPoint[]; }

// Battery is EVENT-SAMPLED at dock/undock — render stepped/scatter with gaps.
interface BatterySample { t: string; pct: number; phase: 'dock' | 'undock'; }

type AlertSeverity = 'info' | 'warning' | 'critical';
type AlertType = 'obstacle' | 'emergency_stop' | 'docking_failed' | 'system';
interface Alert { id: string; robotId: string; type: AlertType;
  severity: AlertSeverity; occurredAt: string; missionId: string | null;
  description: string; mediaUrl: string | null; acknowledged: boolean; }

interface GpsPoint   { t: string; lat: number; lng: number; region: Region; }
interface PatrolPath { robotId: string; period: Period; points: GpsPoint[]; }

interface ReportMeta { id: string; robotId: string; period: Period;
  format: 'pdf' | 'csv'; generatedAt: string; sizeKb: number; }
```

Mock service in `src/services/*` returns exactly these shapes. Seeded placeholder
data now; real ETL JSON later — zero UI change because the contract is frozen.

## Mock auth (JWT-shaped, swappable later)

Wrap in an auth context exposing `{ user, login, logout }`. Three demo users
(password `demo` for all, mock only):

| email | role | sees |
|-------|------|------|
| `ops@enova.local` | superadmin | all robots; Gestion (assign robots to admins) |
| `admin@enova.local` | admin | assigned robots; full log-derived detail; Gestion (assign one robot per client) |
| `client@site.tn` | client | one robot; results-only (4 KPIs + Rapports); no Gestion, no event journal |

Route guards — enforce in routing AND in components (not CSS-hidden):
- `/fleet` — superadmin + admin only; client → redirect to `/robots/:theirId/dashboard`.
- `/robots/:id/*` — id must be in `assignedRobotIds` (superadmin bypasses).
- `/gestion` — superadmin + admin only.
- No telemetry route exists at all (removed).

## Seed parameters (log-derived — keep placeholders realistic)

- Date span: **Jun 2024 → Jun 2026** (~2 years).
- Rounds: **969 total**, **58% Automatic_end** (562) / 42% aborted (407).
- Distance: cumulative **≈350 km**.
- Battery: dock samples range **9%–100%**, avg **~71%**; ~3875 dock readings
  drive the event-sampled battery scatter (never a smooth line).
- Regions: **Tunisia** (Sousse/Monastir ~35.817, 10.591) earlier →
  **Germany** (~48.97, 9.43) later. Patrol map must switch basemap region.
- Availability: **TODO** — placeholder value, clearly labelled, until the
  `report/` state-duration formula is settled.
