# Data layer — real P-Guard logs (standing context)

> Merge this section into the repo's `CLAUDE.md`. It is the data contract the
> mock service layer must implement. Frontend-first: no backend yet. All data is
> served from `src/services/*` reading committed JSON; JWT/REST slot in later.
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
