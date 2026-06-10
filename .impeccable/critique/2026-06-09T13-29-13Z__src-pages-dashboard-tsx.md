---
target: Dashboard (src/pages/Dashboard.tsx)
total_score: 35
p0_count: 0
p1_count: 0
timestamp: 2026-06-09T13-29-13Z
slug: src-pages-dashboard-tsx
---
# Critique (re-run #3) — Dashboard (src/pages/Dashboard.tsx)

After P2 pass: tooltips (clarify), skeleton loading (harden), keyboard 1-4 accelerator (efficiency).

## Design Health Score: 35/40 (Good, edge of Excellent) — was 30, was 26.

1 Visibility 4 (+1, skeleton); 2 Match 4; 3 User control 3; 4 Consistency 4;
5 Error prevention 3; 6 Recognition 4 (+1, info affordances + hint); 7 Flexibility 3 (+1, keyboard 1-4);
8 Aesthetic 4; 9 Error recovery 3; 10 Help/docs 3 (+2, inline tooltips).

## Anti-Patterns Verdict
- Clean. Real ops-console feel, calm field, color for state only, self-documenting labels.
- detect.mjs: 0 findings, exit 0. Prior P1s + side-stripe stay resolved.
- Introduced em-dash in hint line FIXED (comma); aria-labels ASCII.

## What Improved Since 30
1. Help 1->3: every murky KPI explains itself on hover/focus; Disponibilite flagged provisional.
2. Visibility 3->4: DashboardSkeleton mirrors real footprint, reduced-motion aware.
3. Recognition 4 + Flexibility 3: info icons + explicit hint + 1-4 keys.

## Remaining (minor / deferred — capped for read-only board)
- Custom date range deferred: needs getMetricTrend arbitrary-span support in mock.
- Error Prevention / User Control / Recovery (3 each): capped on read-only surface.
- Minor: StatusBar mobile truncation; 5 equal KPI cards mild identical-grid; pre-existing em-dash METRICS subtitle Dashboard.tsx:71 (not mine).
