# P-Guard Monitor

Supervision console for Enova Robotics' P-Guard autonomous security robots.
React 18 + TypeScript SPA (Vite) — real-time fleet overview, per-robot
dashboards, statistics, alerts, and PDF/CSV reports, all derived from ~2 years
of real patrol logs from a single P-Guard unit.

Frontend-first: a deterministic mock service layer serves committed,
log-derived JSON behind a frozen data contract, so a real REST/JWT backend can
swap in later with zero UI change.

## Quick start

```bash
npm install
npm run dev        # Vite dev server with HMR
```

Demo accounts (password `demo` for all):

| Email | Role | Sees |
|-------|------|------|
| `ops@enova.local` | superadmin | all robots, Gestion (assign robots to admins) |
| `admin@enova.local` | admin | assigned robots, full log-derived detail |
| `client@site.tn` | client | one robot, results-only view |

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | dev server (HMR) |
| `npm run build` | typecheck (`tsc --noEmit`) + production build |
| `npm run lint` | ESLint |
| `npm run preview` | serve the production build |

## Architecture

```
src/
├── types/contract.ts   # frozen data contract — every shape crossing the service boundary
├── services/
│   ├── api.ts          # the only module pages import; swap bodies for fetch later
│   ├── mock.ts         # deterministic data + KPI derivations (clock frozen at 2026-06-01)
│   ├── random.ts       # seeded PRNG (mulberry32) — no Math.random, reloads reproduce
│   └── data/*.json     # log-derived seeds (KPIs, GPS tracks)
├── auth/               # mock auth context (localStorage) + route guards
├── components/         # AppShell, Sidebar, TopBar, dashboard/, stats/
├── pages/              # Login, Fleet, Dashboard, Statistiques, Alertes, Rapports, Gestion, Paramètres
├── lib/report.ts       # jsPDF/CSV report generation (same stats source as the pages)
└── theme/              # dark-default theme + language contexts
```

Key rules:

- **Frozen contract** — `src/types/contract.ts` is the single source of truth;
  the mock returns exactly these shapes.
- **Deterministic data** — clock pinned to `NOW = 2026-06-01`, seeded PRNG,
  no wall clock, no `Math.random`. `PG-001` is the one real unit; others are
  seeded fiction.
- **Access enforced twice** — role/robot access lives in both route guards
  (`src/auth/guards.tsx`) and components, never CSS-hidden.

## Roles & routing

- `/login` → `/fleet` (superadmin + admin) → `/robots/:id/{dashboard,statistiques,alertes,rapports,parametres}`
- Clients skip the fleet view and land directly on their robot's dashboard.
- `/gestion` (superadmin + admin): assign robots to admins / one robot per client.

## Data

KPIs (rounds, incidents, charge cycles, availability) and the patrol map are
derived from real P-Guard logs spanning Jun 2024 → Jun 2026, covering a
mid-life redeployment from Sousse/Monastir (TN) to Bietigheim (DE). Battery is
event-sampled at dock/undock — rendered stepped/scattered, never as a smooth
line. See `CLAUDE.md` for the full data-quality rules and KPI derivations.

## Stack

React 18 · TypeScript · Vite · Tailwind CSS · Recharts · react-leaflet · react-router · jsPDF
