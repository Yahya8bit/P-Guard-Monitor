# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repo.

## Git conventions

- No AI attribution anywhere: no `Co-Authored-By: Claude ...` trailers in
  commit messages, no "🤖 Generated with Claude Code" footer in PR bodies.
  Plain subject + body only.

## Commands

- `npm run dev` — Vite dev server (HMR).
- `npm run build` — typecheck (`tsc --noEmit`) then `vite build`. Fails on any type error.
- `npm run lint` — ESLint over repo (flat config, `typescript-eslint` + react-hooks/react-refresh).
- `npm run preview` — serve production build.
- `node serve.mjs` — static server of project root at `http://localhost:3000` (SPA fallback to `index.html`). For screenshot workflow, NOT dev/HMR.
- `node screenshot.mjs http://localhost:3000 [label]` — Puppeteer screenshot into `temporary screenshots/`.

No test runner — no `test` script, no test files. "Verification" = `npm run build` (typecheck) + `npm run lint` + screenshot comparison flow below.

## Architecture

React 18 + TS SPA (Vite). Source under `src/`. Three things drive design, must stay in sync: **frozen data contract**, **deterministic mock service layer**, **role-based routing**.

- **Data contract — `src/types/contract.ts`.** Single source of truth for every shape crossing service boundary (`User`, `Robot`, `DashboardSummary`, `Alert`, `PatrolPath`, etc.). Frozen on purpose: mock returns exactly these shapes so real REST/JWT backend swaps in with zero UI change.

- **Service layer — `src/services/`.** Three tiers:
  - `api.ts` — only thing pages import. Async functions return contract shapes, small fake `delay()` so loading states exercisable. Swap bodies for `fetch` later; call sites unchanged.
  - `mock.ts` — deterministic data + KPI derivations. Clock FROZEN at `NOW = 2026-06-01` over Jun-2024→Jun-2026 span; nothing reads wall clock. `ROBOTS`/`USERS` live here. `PG-001` only real unit (totals pinned to seed params in design rules below); other units seeded fiction. Assignment mutations (`setRobotAdmin`, `assignRobotToClient`, `addAdmin`…) mutate in-memory state.
  - `random.ts` — `mulberry32` PRNG seeded via `hashStr`. No `Math.random` anywhere — reloads reproduce identical numbers. Real log-derived JSON in `src/services/data/*.json` (`kpi_seed`, `gps_seed`).

- **Auth — `src/auth/`.** `AuthContext` persists user to `localStorage` (`pguard-user`); `restore()` is JWT validation slot later. `guards.tsx` holds `landingPath`, `canAccessRobot`, `RequireAuth`/`RequireRole`/`RequireRobotAccess` route gates. Access enforced in BOTH routing and components — never CSS-hidden.

- **Routing — `src/App.tsx`.** `/login`; `/fleet` (superadmin+admin); `/robots/:id/*` nested under `AppShell` (dashboard, statistiques, alertes, rapports, parametres); `/gestion` (superadmin+admin). Clients have no fleet view — land directly on their one robot. Provider nesting (`src/main.tsx`): Theme → Language → Auth → BrowserRouter → App.

- **Reports — `src/lib/report.ts`.** jsPDF/CSV generation reads SAME stats source (`getStatistics`) as dashboard/Statistiques pages — report matches what pages show for period.

- **Components** split: `dashboard/` (StatusBar, KpiCard, TrendChart, BatteryCard, Alerts), `stats/` (charts + `PatrolMap` via react-leaflet), shell (`AppShell`, `Sidebar`, `TopBar`). Theme (dark default) + Language are React contexts in `src/theme/`.

---

# CLAUDE.md — Frontend Website Rules

## Always Do First

– **Load `frontend-design` skill** at `./plugin/plugins/frontend-design` before any frontend code. No skipping, every session.

## Reference Images

– Reference image given: replicate layout, spacing, typography, color with precision. Placeholder content throughout (images via `https://placehold.co/`, generic copy). Add nothing beyond reference.

– No reference image: build from scratch with craft (see guardrails below).

– Screenshot output, compare against reference, fix differences, screenshot again. Minimum 2 comparison rounds. Stop only when no visible differences left, or user says stop.

## Local Server

– **Everything served on localhost** — screenshot from `file:///` URL not acceptable.

– Start dev server: `node serve.mjs` (serves project root at `http://localhost:3000`)

– `serve.mjs` in project root. Run in background before any screenshot step.

– Check server already up before starting again. One instance at a time.

## Screenshot Workflow

– Puppeteer at `/home/yahia/p-guard/node_modules/puppeteer`. Chrome executable at `/home/yahia/.cache/puppeteer/chrome/linux-149.0.7827.22/chrome-linux64/chrome`.

– **Screenshots always from localhost:** `node screenshot.mjs http://localhost:3000`

– Each screenshot written to `./temporary screenshots/screenshot-N.png`, auto-incremented, never overwritten.

– Label: `node screenshot.mjs http://localhost:3000 label` → saves as `screenshot-N-label.png`

– `screenshot.mjs` in project root. Do not modify.

– After save, read PNG from `temporary screenshots/` with Read tool — Claude views and analyzes from there.

– Comparisons precise: "heading is 32px but reference shows ~24px", "card gap is 16px but should be 24px"

– Check: spacing/padding, font size/weight/line-height, colors (exact hex), alignment, border-radius, shadows, image sizing

## Output Defaults

– **Stack:** React 18 + TypeScript + Vite + Tailwind (real config, **not** CDN) + Recharts + react-router. Vite SPA under `src/` — not single inline `index.html`. See App-shell, data-contract, data-layer sections below.

– Tailwind reads semantic CSS vars from Theme section. No `cdn.tailwindcss.com`.

– Data from mock service in `src/services/*` (committed JSON / seeded placeholders), never hardcoded in components. See data-layer section.

– `https://placehold.co/WIDTHxHEIGHT` only for genuinely missing media; prefer real `brand_assets/` + `public/` assets.

– All layouts mobile-first

## Brand Assets

– Before design work, check `brand_assets/` folder. May hold logos, color guides, style guides, images.

– If asset exists, use it. No placeholders when real assets exist.

– Logo in folder gets used. Defined palette means exact values — no invented brand colors.

## Anti-Generic Guardrails

– **Colors:** Default Tailwind palette (indigo-500, blue-600, etc.) off table. Build palette from custom brand color.

– **Shadows:** No flat `shadow-md`. Layered, color-tinted shadows at low opacity.

– **Typography:** Headings and body get different fonts. Pair display/serif with clean sans-serif. Large headings tight tracking (`-0.03em`), body generous line-height (`1.7`).

– **Gradients:** Stack multiple radial gradients. Grain + texture via SVG noise filter.

– **Animations:** `transform` and `opacity` only. `transition-all` never. Spring-like easing.

– **Interactive states:** hover, focus-visible, active required on every clickable element. No skipping.

– **Images:** Gradient overlay on top (`bg-gradient-to-t from-black/60`), color treatment via `mix-blend-multiply`.

– **Spacing:** Consistent tokens always. Random Tailwind steps not acceptable.

– **Depth:** Surface hierarchy (base → elevated → floating). Everything flat at same level not good enough.

## Hard Rules

– Add nothing not in reference

– Goal: match reference, not improve it

– One screenshot pass never enough

– `transition-all` never used

– Default Tailwind blue/indigo cannot be primary color

---

# Data layer — real P-Guard logs (standing context)

> Data contract mock service layer must implement. Frontend-first: no backend
> yet. All data served from `src/services/*` reading committed JSON; JWT/REST
> slot in later.
>
> SCOPE RULE: app surfaces ONLY what is derivable from P-Guard logs.
> Anything not derivable removed (no `simulé` fillers).

## Source data

- One real P-Guard unit, ~2 years of logs (Jun 2024 → Jun 2026).
- Redeployed mid-life: GPS starts Tunisia (Sousse/Monastir, ~35.817, 10.591),
  later Germany (~48.97, 9.43). Patrol-path map must handle both regions.
- Two raw sources (pre-processed offline into cleaned dataset below):
  - `Info/` — daily JSON event logs, one folder per category. Keys are
    numbered-prefix strings (`"0-Info"`, `"1-Mission_name"`, …).
  - `report/` — daily `.log` state-machine files, foldered by month.
  - `kilometrage.json` — cumulative odometry snapshot.

## Cleaned dataset (what the mock actually reads)

Mock service reads committed JSON under `src/services/data/`, produced by
offline ETL from raw archives. Components and seeded generators target THIS
shape, never raw logs.

> Until ETL output committed, mocks use seeded placeholder data of same shape,
> tagged so it's obvious it isn't real yet.

## Data-quality rules the ETL/mock must honor

- Dedup key is `(category, normalized calendar date)`. Padded vs unpadded
  filenames (`...-11-3.json` vs `...-11-03.json`) are SAME day re-exported
  with recomputed floats — NOT byte-identical. Never dedup by content hash; keep
  ISO / later re-export as canonical.
- Date parsing per-value, not per-folder: try ISO `YYYY-M-D` first, fall back
  to day-first `D-M-YYYY`. Both formats appear inside same category.
- Branch on `"0-Info"` field (`start` / `end` / `docking` / `undocking`).
  Numbered keys SHIFT between record types (`end` record has no Distance, so
  its lat/lon are `6-`/`7-` not `7-`/`8-`). Never read by positional index.
- `Distance` is string, sometimes literal `"Unknown"` — coerce to
  number or treat as missing; never assume numeric.
- `report/` files are `.log`, not JSON. Line format:
  `TIMESTAMP [event_tag] STATE : <state>| MISSION : <m> | DISTANCE_TRAVELLED : <km>`.
  `DISTANCE_TRAVELLED` is cumulative-per-day (monotonic).
- Ignore junk: `.swp`, `.gitignore`, `*_backup.json`.
- `Mission` file holds MULTIPLE rounds/day (start…end sequences). End note
  `Automatic_end` = completed, `Emergency_pressed` = aborted.
- `Docking` records carry `4-Battery` at dock/undock only — battery is
  EVENT-SAMPLED, not continuous.

## Dashboard KPIs — all log-derived

Dashboard layout: status hero (with battery) + 4 KPI cards + 1 trend chart.

| KPI | Real-data source | Notes |
|-----|------------------|-------|
| Niveau batterie (hero) | `4-Battery` at dock/undock | EVENT-SAMPLED — render stepped / scatter with gaps, never smooth continuous line |
| Rondes effectuées | Count of `Automatic_end` mission ends | — |
| Incidents détectés | Obstacle events + emergency stops | OPERATIONAL proxy, NOT security detections — label as such in UI |
| Cycles de charge | Docking event count, with battery delta | — |
| Disponibilité | TODO — see open questions | formula unsettled |

REMOVED (not derivable from logs):
- `Couverture de zone` — no zone map in data.
- Telemetry (CPU / RAM / LiDAR) — not in archive. Telemetry view
  + its client-side role guard deleted entirely.

## Roles (three-tier — overrides the cahier des charges' two-tier)

Telemetry gone — no longer admin/client differentiator. Roles now
differ by SCOPE and log-derived DEPTH:

- Superadmin: all robots; assigns robots to admins.
- Admin: assigned robots only; deeper log-derived detail (event journal,
  per-mission + state-machine breakdowns, GPS patrol path); assigns one robot
  per client.
- Client: one robot; results-only view (four KPIs + reports), no internal
  detail.

## Open questions — do NOT fabricate

- **Disponibilité formula undecided.** Do NOT use kilometrage's
  `dynamic / (dynamic + static)` — yields ~0.5% (fraction of time *moving*,
  not availability). Leaning toward `report/` state durations
  (operational states vs Waiting / Pause / EmergencyStop / off). Leave `TODO`
  + clearly-labelled placeholder until formula fixed.
- **Teleoperation and Obstacle record schemas not yet characterized** (their
  `2-Date` is `None`, differ from Mission/Docking/Back_home). Both
  log-derived, just uninspected — `TODO` until characterized.

## Bonus KPIs the data supports (all log-derived)

Mission completion rate, e-stop count, autonomy rate (teleop vs autonomous),
obstacle count + avg delay, activity heatmap, real GPS patrol-path map.

---

# Frontend readiness — app shell, tokens, data contract, mocks

> Companion to data-layer section above. That section owns data-quality rules
> + KPI derivations; THIS section owns UI shell, design tokens, frozen
> data contract mock service exposes, mock auth, seed parameters.
> Stack: React 18 + TS + Vite + Tailwind (real config) + Recharts + react-router.

## App shell & layout (borrowed IA, Enova brand)

- **Flow:** Login → fleet view (robot cards) → click robot → detail pages.
  Client skips fleet list, lands directly on their one robot.
- **Left sidebar** (persistent): Dashboard, Statistiques, Alertes, Rapports,
  Gestion, Paramètres. `Gestion` hidden for clients.
- **Status hero** (top of Dashboard): robot state + current mission + battery,
  prominent strip (Robotiq "Running / Program:" pattern).
- **KPI card row:** four cards — label (top-left), big accent number, secondary
  value, icon (top-right). Cards = Rondes, Incidents, Cycles de charge,
  Disponibilité. Battery in hero, not card.
- **Trend chart:** one chart below cards, period-switchable. Bar/area style.
- **Time-range selector:** Daily / Weekly / Monthly + 7d / 30d, centered above
  charts (Robotiq prev/next/range pattern).
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
data now; real ETL JSON later — zero UI change because contract frozen.

## Mock auth (JWT-shaped, swappable later)

Wrap in auth context exposing `{ user, login, logout }`. Three demo users
(password `demo` for all, mock only):

| email | role | sees |
|-------|------|------|
| `ops@enova.local` | superadmin | all robots; Gestion (assign robots to admins) |
| `admin@enova.local` | admin | assigned robots; full log-derived detail; Gestion (assign one robot per client) |
| `client@site.tn` | client | one robot; results-only (4 KPIs + Rapports); no Gestion, no event journal |

Route guards — enforce in routing AND components (not CSS-hidden):
- `/fleet` — superadmin + admin only; client → redirect to `/robots/:theirId/dashboard`.
- `/robots/:id/*` — id must be in `assignedRobotIds` (superadmin bypasses).
- `/gestion` — superadmin + admin only.
- No telemetry route at all (removed).

## Seed parameters (log-derived — keep placeholders realistic)

- Date span: **Jun 2024 → Jun 2026** (~2 years).
- Rounds: **969 total**, **58% Automatic_end** (562) / 42% aborted (407).
- Distance: cumulative **≈350 km**.
- Battery: dock samples range **9%–100%**, avg **~71%**; ~3875 dock readings
  drive event-sampled battery scatter (never smooth line).
- Regions: **Tunisia** (Sousse/Monastir ~35.817, 10.591) earlier →
  **Germany** (~48.97, 9.43) later. Patrol map must switch basemap region.
- Availability: **TODO** — placeholder value, clearly labelled, until
  `report/` state-duration formula settled.