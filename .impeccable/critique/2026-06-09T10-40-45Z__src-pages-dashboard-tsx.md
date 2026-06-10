---
target: Dashboard (src/pages/Dashboard.tsx)
total_score: 30
p0_count: 0
p1_count: 0
timestamp: 2026-06-09T10-40-45Z
slug: src-pages-dashboard-tsx
---
# Critique (re-run) — Dashboard (src/pages/Dashboard.tsx)

Post-fix re-score. Top-3 issues from prior run shipped (calm tiles, selected-card affordance, side-stripe removed).

## Design Health Score: 30/40 (Good) — up from 26 (Acceptable)

1 Visibility 3; 2 Match real world 4; 3 User control 3; 4 Consistency 4 (+1);
5 Error prevention 3; 6 Recognition vs recall 3 (+1); 7 Flexibility 2;
8 Aesthetic/minimalist 4 (+2); 9 Error recovery 3; 10 Help/docs 1.

## Anti-Patterns Verdict
- Product slop RESOLVED: neutral field, color reserved for state, one red alert stands alone. Light theme calm.
- detect.mjs: 0 findings, exit 0.
- Side-stripe (prior detector-miss): FIXED, inset 3px removed, confirmed absent from built CSS.
- No new regressions.

## What's Working (new)
1. Calm-by-default tiles via stateFill() returning undefined for calm.
2. Discoverable + accessible selection: persistent ring + aria-pressed + focus-visible.
3. Legible deltas (unfavorable Rondes delta now danger-red on neutral, not washed on teal).

## Remaining Issues (all P2 — deferred by user scope)
[P2] Help/docs (score 1): no inline tooltips for proxy / availability-TODO / threshold. Cmd: clarify.
[P2] Loading = bare text, no skeleton; layout jump. Cmd: harden.
[P2/P3] Efficiency (score 2): no keyboard shortcuts, only 7d/30d (no custom range). Cmd: layout.
Minor: 5 equal-size KPI cards = mild identical-grid; StatusBar truncates mission on mobile.
