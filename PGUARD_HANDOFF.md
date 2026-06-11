# P-Guard Monitor — Handoff Document

---

## §1 — Project overview

P-Guard Monitor is a React 18 + TypeScript SPA for monitoring P-Guard security robots. It displays real log-derived KPIs, GPS patrol tracks, alert feeds, and reports for three roles: superadmin, admin, and client.

---

## §2 — Stack

- React 18 + TypeScript + Vite
- Tailwind CSS (real config, CSS var tokens, dark/light theme)
- Recharts (charts)
- react-router-dom (routing + route guards)
- react-leaflet + leaflet (GPS patrol maps)
- jsPDF + jspdf-autotable (PDF reports)
- Inter font (Google Fonts)
- info_seed.json added to src/services/data/
- derive_info.py added to scripts/

---

## §3 — Auth & roles

Three demo users (password: `demo`):

| Email | Role | Access |
|---|---|---|
| ops@enova.local | superadmin | All robots; Gestion (assign robots to admins) |
| admin@enova.local | admin | Assigned robots; full log-derived detail; Gestion (assign robot per client) |
| client@site.tn | client | One robot; results-only (4 KPIs + Rapports); no Gestion, no event journal |

Route guards enforced in routing AND components (never CSS-hidden).

---

## §4 — Pages

### Login
- Left panel: branded hero image (pguard.png → optimized to robot-hero.webp for Vercel)
- Right panel: email/password form, role demo switcher chips
- `login-bg` gradient fallback if image fails

### Fleet (`/fleet`)
- Superadmin + admin only; client redirected to their robot
- Search input + status filter chips
- Deterministic sort: attention-first (offline/maintenance before running/charging/docked)
- 4-column grid at xl breakpoint
- Mission line hidden when robot has no active mission (aucune)

### Dashboard (`/robots/:id/dashboard`)
- Row 1: StatusBar hero (state badge, mission, battery %)
- Row 2: 4 KPI tiles — Rondes effectuées, Incidents détectés, Cycles de charge, Disponibilité (TODO placeholder)
- Row 3: Dernière position et trajet (mini-map showing last GPS track; primary robot PG-001 only)
- Chart + alerts row stretches to fill viewport
- Disponibilité par jour chart removed (redundant with tile click-to-swap)
- KPI alarms calibrated on per-day rates (incidents: warnAt 0.5/day, alertAt 0.8/day)
- Error state: DashboardLoadError component + retry button on critical fetch failure

### Statistiques (`/robots/:id/statistiques`)
- Operation selector: Rondes / Amarrages / Retours station / Autonomie chips; one donut + chart row swaps on selection
- 4 tiles: Durée moy. ronde, Arrêts d'urgence, Taux d'autonomie, Distance totale
- Taux d'autonomie = line chart in selector row, not standalone card
- Patrol map: full tracks for selected period, one Polyline per track, fitBounds

### Alertes (`/robots/:id/alertes`)
- Alert feed with severity chips (info / warning / critical)
- Critical row wash
- Currently mocked data

### Rapports (`/robots/:id/rapports`)
- PDF + CSV generation via jsPDF / native CSV
- Reads same stats source as Dashboard/Statistiques (consistent numbers)

### Gestion (`/gestion`)
- Superadmin + admin only
- Assign robots to admins; assign one robot per client
- Add/remove admins

### Paramètres (`/robots/:id/parametres`)
- Theme toggle (dark/light), language toggle (FR/EN — EN not wired, marked à venir)

---

## §5 — Data contract (frozen)

See `src/types/contract.ts`. Mock returns exactly these shapes; real REST/JWT backend swaps in with zero UI change.

Key types: `User`, `Robot`, `DashboardSummary`, `KpiValue`, `TrendSeries`, `BatterySample`, `Alert`, `GpsPoint`, `PatrolPath`, `ReportMeta`.

---

## §6 — Service layer

- `src/services/api.ts` — only thing pages import; async functions returning contract shapes with fake `delay()`
- `src/services/mock.ts` — deterministic data, frozen clock `NOW = 2026-06-01`, in-memory mutation for assignments
- `src/services/random.ts` — `mulberry32` PRNG via `hashStr`; no `Math.random`
- `src/services/data/kpi_seed.json` — real log-derived KPI aggregates
- `src/services/data/gps_seed.json` — real GPS patrol tracks
- `src/services/data/info_seed.json` — docking, obstacle, back_home aggregates (see §12)

---

## §7 — Theme system

Dark default, light toggle. Persisted in `localStorage` (`pguard-theme`). Semantic CSS vars in `src/index.css`; Tailwind reads them via `tailwind.config.js`.

Key tokens: `--bg`, `--surface`, `--surface-2`, `--border`, `--text`, `--text-muted`, `--accent` (teal), `--success`, `--warning`, `--danger`.

KPI tile fills: `data-fill` attribute on `.surface-card` drives themed saturated tile colors (deep/mid/soft/muted/warning/danger/danger-calm).

---

## §8 — GPS maps

- react-leaflet + Leaflet installed
- CartoDB Positron (light) / Dark All tiles
- `key={theme}` on TileLayer forces remount on theme change
- Statistiques: full patrol tracks for selected period, one Polyline per track, fitBounds
- Dashboard: last track only (`getLastKnownTrack`), one Polyline + CircleMarker start (white fill, teal border) + position marker end (teal halo + dot), fitBounds to track, scrollWheelZoom disabled
- Primary robot (PG-001) only; empty state for all others
- Leaflet CSS imported in map components; explicit container height required (300px dashboard, 500px stats)

---

## §9 — Reports

`src/lib/report.ts` — jsPDF/CSV generation reading `getStatistics` (same source as Dashboard/Statistiques). Report numbers always match what pages show for the period.

---

## §10 — Seed parameters (log-derived)

- Date span: Jun 2024 → Jun 2026 (~2 years)
- Rounds: 969 total, 58% Automatic_end (562) / 42% aborted (407)
- Distance: cumulative ≈350 km
- Battery: dock samples 9%–100%, avg ~71%; ~3875 dock readings
- Regions: Tunisia (Sousse/Monastir ~35.817, 10.591) earlier → Germany (~48.97, 9.43) later

---

## §11 — Design tokens summary

```
Accent teal:   #12B3A6 (dark) / #00A090 (light)
Charcoal:      #4D4D4D
Card radius:   14px (dark) / 16px (light)
Spacing base:  4px; card pad 20px; section gap 24–32px
Font:          Inter, system-ui fallback
```

Chart palette: accent teal, slate `#5B7A86`, violet `#8B5CF6`, amber `#E0A030`, danger red for thresholds.

---

## §12 — Info.zip data

### Source files
Info.zip contains 6 categories:
- Docking: 175 files
- Obstacle: 64 files
- Back_home: 112 files
- Inspecting: 21 files
- Mission: 234 files
- Teleoperation: 259 files

### ETL script
`scripts/derive_info.py` processes raw Info.zip → `src/services/data/info_seed.json`.

### Docking schema
- `0-Info == "docking"`, `1-State` ∈ {start, failed, success, "restart n=X"}, `4-Battery`
- Procedure = start → next start
- **Real figures:** 906 procedures, 829 succeeded, 91.5% success rate, 2.1 attempts mean, battery median 76%

### Obstacle schema
- Fields: `0-Date`, `1-Hour`, `4-Delay` (seconds string)
- **Real figures:** 216 events, delay mean 16.6s

### Back_home schema
- `0-Info == "end"`, `4-Notes` ∈ {Home_reached, Emergency_pressed}
- **Real figures:** 999 reached / 71 emergency = 93.4% success

### Inspecting
- Thin data (41 starts), not charted

### Mission names
- 69 distinct route filenames
- No semantic type field — operation type derived from log category, not mission name

### info_seed.json structure
```json
{
  "docking": {
    "procedures_total": 906,
    "procedures_succeeded": 829,
    "success_rate": 0.915,
    "attempts_per_procedure": 2.1,
    "battery_at_dock": { "median": 76, "mean": 71, "min": 9, "max": 100 },
    "daily": [{ "date": "YYYY-MM-DD", "procedures": N, "succeeded": N }]
  },
  "obstacles": {
    "events_total": 216,
    "delay_s": { "mean": 16.6 },
    "daily": [{ "date": "YYYY-MM-DD", "events": N, "delay_s_mean": N }]
  },
  "back_home": {
    "returns_total": 1070,
    "home_reached": 999,
    "emergency_pressed": 71,
    "success_rate": 0.934,
    "daily": [{ "date": "YYYY-MM-DD", "reached": N, "emergency": N }]
  },
  "composition": {
    "daily": [{ "date": "YYYY-MM-DD", "autonomous": N, "teleop": N }]
  },
  "data_quality": { ... },
  "method": "derive_info.py"
}
```

---

## §13 — GPS map implementation

- react-leaflet + Leaflet installed (`npm install react-leaflet leaflet @types/leaflet`)
- Tile providers:
  - Light: `https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png`
  - Dark: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
  - (`dark_matter` discontinued — use `dark_all`)
- `key={theme}` on `<TileLayer>` forces fresh mount on theme flip
- **Statistiques (`src/components/stats/PatrolMap.tsx`):**
  - Props: `tracks: PatrolTrack[]`
  - One `<Polyline>` per track (teal `#2dd4bf`, weight 2.5)
  - Start marker: green `#22c55e` CircleMarker + Tooltip "Départ"
  - End marker: red `#ef4444` CircleMarker + Tooltip "Arrivée"
  - `fitBounds` on track change, `maxZoom: 15`, padding [40,40]
  - Container height: 500px explicit
- **Dashboard (`src/components/dashboard/LastPositionMap.tsx`):**
  - Props: `track: LastKnownTrack`
  - One Polyline (teal `#0d9488`, weight 3, opacity 0.8)
  - Start: CircleMarker radius 4, white fill, teal border
  - End halo: CircleMarker radius 16, teal 20% opacity
  - End dot: CircleMarker radius 8, teal fill, white border + Popup (date + mission)
  - `fitBounds` to track, `maxZoom: 18`, `scrollWheelZoom={false}`
  - Container height: 300px explicit
- Primary robot (PG-001) only; `getLastKnownTrack` returns null for others
- `leaflet/dist/leaflet.css` imported at top of each map component
- Leaflet zoom control styled via `src/index.css` to match dark/light theme tokens

---

## §14 — Known issues / next steps

- **Trend arrows on dashboard tiles (▲▼%)** are likely fabricated — need to either compute period-over-period delta from daily seed data or remove them
- **Alert feed is still mocked** — next major task: derive real alerts from info_seed (docking failures → "Docking échoué", EmergencyStop → "Arrêt d'urgence", Obstacle events → "Obstacle") with real dates
- **Language toggle** — English strings not wired; should be marked "à venir" in UI if not implemented
- **Rapports content checkboxes** don't include new KPIs (Amarrages, Retours station, Autonomie)
- **GPS Statistiques map:** tracks render green instead of teal, unexplained red dot, "X trajets affichés" label missing, fitBounds padding too wide
- **Date input on Gestion** is mm/dd/yyyy (US format) — should be dd/mm/yyyy
- **Dark blob artifact** at top-center of some pages (Statistiques, Rapports, Gestion)
- **Simulated robot data generator** not yet built (decided: calibrate on real distributions + show "Données simulées" badge)
- **Hero image on login** optimized to WebP (`robot-hero.webp`, 356KB → 25KB) for Vercel deployment ✓
- **Deployed on Vercel at:** https://p-guard-monitor.vercel.app

---
