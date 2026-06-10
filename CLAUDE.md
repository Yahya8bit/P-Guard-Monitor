# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — Vite dev server (HMR) for the app.
- `npm run build` — typecheck (`tsc --noEmit`) then `vite build`. Build fails on any type error.
- `npm run lint` — ESLint over the repo (flat config, `typescript-eslint` + react-hooks/react-refresh).
- `npm run preview` — serve the production build.
- `node serve.mjs` — static server of the project root at `http://localhost:3000` (SPA fallback to `index.html`). Used by the screenshot workflow, NOT the dev/HMR flow.
- `node screenshot.mjs http://localhost:3000 [label]` — Puppeteer screenshot into `temporary screenshots/`.

No test runner is configured — there is no `test` script and no test files. "Verification" here means `npm run build` (typecheck) + `npm run lint` + the screenshot comparison flow below.

## Architecture

React 18 + TS SPA (Vite). Source under `src/`. Three things drive the design and must stay in sync: the **frozen data contract**, the **deterministic mock service layer**, and the **role-based routing**.

- **Data contract — `src/types/contract.ts`.** Single source of truth for every shape crossing the service boundary (`User`, `Robot`, `DashboardSummary`, `Alert`, `PatrolPath`, etc.). Frozen on purpose: the mock returns exactly these shapes so a real REST/JWT backend swaps in with zero UI change.

- **Service layer — `src/services/`.** Three tiers:
  - `api.ts` — the only thing pages import. Async functions returning contract shapes, with a small fake `delay()` so loading states are exercisable. Swap these bodies for `fetch` later; call sites don't change.
  - `mock.ts` — deterministic data + KPI derivations. Clock is FROZEN at `NOW = 2026-06-01` over a Jun-2024→Jun-2026 span; nothing reads the wall clock. `ROBOTS`/`USERS` live here. `PG-001` is the one real unit (totals pinned to seed params in the design rules below); other units are seeded fiction. Assignment mutations (`setRobotAdmin`, `assignRobotToClient`, `addAdmin`…) mutate in-memory state.
  - `random.ts` — `mulberry32` PRNG seeded via `hashStr`. No `Math.random` anywhere, so reloads reproduce identical numbers. Real log-derived JSON lives in `src/services/data/*.json` (`kpi_seed`, `gps_seed`).

- **Auth — `src/auth/`.** `AuthContext` persists the user to `localStorage` (`pguard-user`); `restore()` is where JWT validation slots in later. `guards.tsx` holds `landingPath`, `canAccessRobot`, and the `RequireAuth`/`RequireRole`/`RequireRobotAccess` route gates. Access is enforced in BOTH routing and components — never CSS-hidden.

- **Routing — `src/App.tsx`.** `/login`; `/fleet` (superadmin+admin); `/robots/:id/*` nested under `AppShell` (dashboard, statistiques, alertes, rapports, parametres); `/gestion` (superadmin+admin). Clients have no fleet view — they land directly on their one robot. Provider nesting (`src/main.tsx`): Theme → Language → Auth → BrowserRouter → App.

- **Reports — `src/lib/report.ts`.** jsPDF/CSV generation reading the SAME stats source (`getStatistics`) as the dashboard/Statistiques pages, so a report matches what those pages show for the period.

- **Components** split into `dashboard/` (StatusBar, KpiCard, TrendChart, BatteryCard, Alerts), `stats/` (charts + `PatrolMap` via react-leaflet), and shell (`AppShell`, `Sidebar`, `TopBar`). Theme (dark default) + Language are React contexts in `src/theme/`.

---

# CLAUDE.md — Frontend Website Rules

## Always Do First

– **Load the `frontend-design` skill** at `./plugin/plugins/frontend-design` before writing any frontend code. No skipping, no exceptions, every single session.

## Reference Images

– When a reference image is given: replicate the layout, spacing, typography, and color with precision. Use placeholder content throughout (images via `https://placehold.co/`, generic copy). Nothing gets added or improved beyond what the reference shows.

– When there is no reference image: build from scratch with genuine craft (see guardrails below).

– Take a screenshot of the output, compare it against the reference, fix what is off, and screenshot again. Run at least 2 comparison rounds. Only stop when there are no visible differences left, or the user says to.

## Local Server

– **Everything gets served on localhost** — taking a screenshot from a `file:///` URL is not acceptable.

– Spin up the dev server using `node serve.mjs` (this serves the project root at `http://localhost:3000`)

– `serve.mjs` is in the project root. Get it running in the background before any screenshot step.

– Check whether the server is already up before starting it again. One instance at a time.

## Screenshot Workflow

– Puppeteer lives at `/home/yahia/p-guard/node_modules/puppeteer`. The Chrome executable is at `/home/yahia/.cache/puppeteer/chrome/linux-149.0.7827.22/chrome-linux64/chrome`.

– **Screenshots always come from localhost:** `node screenshot.mjs http://localhost:3000`

– Each screenshot is written to `./temporary screenshots/screenshot-N.png`, auto-incremented and never overwritten.

– To attach a label: `node screenshot.mjs http://localhost:3000 label` → saves as `screenshot-N-label.png`

– `screenshot.mjs` is in the project root. Do not modify it.

– Once the screenshot is saved, read the PNG from `temporary screenshots/` using the Read tool — Claude can view and analyze it from there.

– Comparisons need to be precise: “heading is 32px but reference shows ~24px”, “card gap is 16px but should be 24px”

– Go through: spacing/padding, font size/weight/line-height, colors (exact hex), alignment, border-radius, shadows, image sizing

## Output Defaults

– **Stack:** React 18 + TypeScript + Vite + Tailwind (real config, **not** CDN) + Recharts + react-router. This is a Vite SPA under `src/` — not a single inline `index.html`. See the App-shell, data-contract, and data-layer sections below.

– Tailwind reads the semantic CSS vars defined in the Theme section. No `cdn.tailwindcss.com`.

– Data comes from the mock service in `src/services/*` (committed JSON / seeded placeholders), never hardcoded in components. See the data-layer section.

– `https://placehold.co/WIDTHxHEIGHT` only for genuinely missing media; prefer real `brand_assets/` + `public/` assets.

– All layouts are mobile-first

## Brand Assets

– Before starting any design work, look through the `brand_assets/` folder. It could have logos, color guides, style guides, or images.

– If something is in there, use it. Placeholders have no place when real assets exist.

– A logo in the folder gets used. A defined color palette means those exact values get used — no making up brand colors.

## Anti-Generic Guardrails

– **Colors:** The default Tailwind palette (indigo-500, blue-600, etc.) is off the table. Build the palette from a custom brand color.

– **Shadows:** Flat `shadow-md` is not an option. Build depth with layered, color-tinted shadows at low opacity.

– **Typography:** Headings and body text get different fonts. Pair a display or serif with a clean sans-serif. Large headings get tight tracking (`-0.03em`), body text gets generous line-height (`1.7`).

– **Gradients:** Stack multiple radial gradients on top of each other. Bring in grain and texture through an SVG noise filter.

– **Animations:** Stick to `transform` and `opacity` only. `transition-all` is never used. Easing should feel spring-like.

– **Interactive states:** hover, focus-visible, and active states are required on every clickable element. No skipping.

– **Images:** Layer a gradient overlay (`bg-gradient-to-t from-black/60`) on top, and apply a color treatment using `mix-blend-multiply`.

– **Spacing:** Every spacing decision follows consistent tokens. Random Tailwind steps are not acceptable.

– **Depth:** Build with a surface hierarchy in mind (base → elevated → floating). Everything sitting flat at the same level is not good enough.

## Hard Rules

– Nothing gets added that is not already in the reference

– The goal is to match the reference, not make it better

– One screenshot pass is never enough

– `transition-all` is never used

– Default Tailwind blue or indigo cannot be the primary color

---

# Data layer — real P-Guard logs (standing context)

> Data contract the mock service layer must implement. Frontend-first: no backend
> yet. All data is served from `src/services/*` reading committed JSON; JWT/REST
> slot in later.
>
> SCOPE RULE: the app surfaces ONLY what is derivable from the P-Guard logs.
> Anything not derivable from the logs has been removed (no `simulé` fillers).

## Source data

- One real P-Guard unit, ~2 years of logs (Jun 2024 → Jun 2026).
- Redeployed mid-life: GPS starts in Tunisia (Sousse/Monastir, ~35.817, 10.591),
  later moves to Germany (~48.97, 9.43). Patrol-path map must handle both regions.
- Two raw sources (pre-processed offline into the cleaned dataset below):
  - `Info/` — daily JSON event logs, one folder per category. Keys are
    numbered-prefix strings (`"0-Info"`, `"1-Mission_name"`, …).
  - `report/` — daily `.log` state-machine files, foldered by month.
  - `kilometrage.json` — cumulative odometry snapshot.

## Cleaned dataset (what the mock actually reads)

The mock service reads committed JSON under `src/services/data/`, produced by an
offline ETL from the raw archives. Components and seeded generators target THIS
shape, never the raw logs.

> Until the ETL output is committed, mocks use seeded placeholder data of the
> same shape, tagged so it's obvious it isn't real yet.

## Data-quality rules the ETL/mock must honor

- Dedup key is `(category, normalized calendar date)`. Padded vs unpadded
  filenames (`...-11-3.json` vs `...-11-03.json`) are the SAME day re-exported
  with recomputed floats — NOT byte-identical. Never dedup by content hash; keep
  the ISO / later re-export as canonical.
- Date parsing is per-value, not per-folder: try ISO `YYYY-M-D` first, fall back
  to day-first `D-M-YYYY`. Both formats appear inside the same category.
- Branch on the `"0-Info"` field (`start` / `end` / `docking` / `undocking`).
  Numbered keys SHIFT between record types (an `end` record has no Distance, so
  its lat/lon are `6-`/`7-` not `7-`/`8-`). Never read by positional index.
- `Distance` is a string and is sometimes the literal `"Unknown"` — coerce to
  number or treat as missing; never assume numeric.
- `report/` files are `.log`, not JSON. Line format:
  `TIMESTAMP [event_tag] STATE : <state>| MISSION : <m> | DISTANCE_TRAVELLED : <km>`.
  `DISTANCE_TRAVELLED` is cumulative-per-day (monotonic).
- Ignore junk: `.swp`, `.gitignore`, `*_backup.json`.
- A `Mission` file holds MULTIPLE rounds/day (start…end sequences). End note
  `Automatic_end` = completed, `Emergency_pressed` = aborted.
- `Docking` records carry `4-Battery` at dock/undock only — battery is
  EVENT-SAMPLED, not continuous.

## Dashboard KPIs — all log-derived

Dashboard layout: status hero (with battery) + 4 KPI cards + 1 trend chart.

| KPI | Real-data source | Notes |
|-----|------------------|-------|
| Niveau batterie (hero) | `4-Battery` at dock/undock | EVENT-SAMPLED — render stepped / scatter with gaps, never a smooth continuous line |
| Rondes effectuées | Count of `Automatic_end` mission ends | — |
| Incidents détectés | Obstacle events + emergency stops | OPERATIONAL proxy, NOT security detections — label as such in the UI |
| Cycles de charge | Docking event count, with battery delta | — |
| Disponibilité | TODO — see open questions | formula unsettled |

REMOVED (not derivable from logs):
- `Couverture de zone` — no zone map in the data.
- Telemetry (CPU / RAM / LiDAR) — not present in the archive. The telemetry view
  and its client-side role guard are deleted entirely.

## Roles (three-tier — overrides the cahier des charges' two-tier)

Telemetry is gone, so it is no longer the admin/client differentiator. Roles now
differ by SCOPE and by log-derived DEPTH:

- Superadmin: all robots; assigns robots to admins.
- Admin: assigned robots only; deeper log-derived detail (event journal,
  per-mission + state-machine breakdowns, GPS patrol path); assigns one robot
  per client.
- Client: one robot; results-only view (the four KPIs + reports), no internal
  detail.

## Open questions — do NOT fabricate

- **Disponibilité formula is undecided.** Do NOT use kilometrage's
  `dynamic / (dynamic + static)` — it yields ~0.5% (fraction of time *moving*,
  not availability). Leaning toward deriving from `report/` state durations
  (operational states vs Waiting / Pause / EmergencyStop / off). Leave a `TODO`
  and a clearly-labelled placeholder until the formula is fixed.
- **Teleoperation and Obstacle record schemas not yet characterized** (their
  `2-Date` is `None`, so they differ from Mission/Docking/Back_home). Both are
  log-derived, just uninspected — `TODO` until characterized.

## Bonus KPIs the data supports (all log-derived)

Mission completion rate, e-stop count, autonomy rate (teleop vs autonomous),
obstacle count + avg delay, activity heatmap, real GPS patrol-path map.

---

# Frontend readiness — app shell, tokens, data contract, mocks

> Companion to the data-layer section above. That section owns data-quality rules
> + KPI derivations; THIS section owns the UI shell, design tokens, the frozen
> data contract the mock service exposes, mock auth, and seed parameters.
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
