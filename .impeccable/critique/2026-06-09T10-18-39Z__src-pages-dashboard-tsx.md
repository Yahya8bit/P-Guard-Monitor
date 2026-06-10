---
target: Dashboard (src/pages/Dashboard.tsx)
total_score: 26
p0_count: 0
p1_count: 2
timestamp: 2026-06-09T10-18-39Z
slug: src-pages-dashboard-tsx
---
# Critique — Dashboard (src/pages/Dashboard.tsx)

Rendered live at /robots/PG-001/dashboard (superadmin), captured dark + light + mobile.

## Design Health Score: 26/40 (Acceptable)

1 Visibility 3; 2 Match real world 4; 3 User control 3; 4 Consistency 3;
5 Error prevention 3; 6 Recognition vs recall 2; 7 Flexibility 2;
8 Aesthetic/minimalist 2; 9 Error recovery 3; 10 Help/docs 1.

## Anti-Patterns Verdict
- Not generic-AI: real Enova identity, honest French domain copy, honest data labels. Passes "AI made this".
- Fails product Restrained floor: 4/5 KPI tiles flooded saturated teal, 1 red = color wall, accent as decoration. Contradicts PRODUCT.md principle 4 (calm by default).
- detect.mjs: 0 findings, exit 0 (clean on gradient-text, eyebrows, glass, grids).
- Detector MISS caught by LLM: .alert-row--critical uses box-shadow inset 3px 0 0 var(--danger) = side-stripe ban (inset shadow, not border-left, so undetected).

## What's Working
1. Honest data labeling (proxy warnings, event-sampled battery, TODO availability).
2. Compact one-line status bar reclaims vertical space.
3. Principled threshold system (single KPI_ALERTS config, no-layout-shift inset ring selection).

## Priority Issues
[P1] KPI color wall — accent as decoration. 4/5 tiles saturated; no visual primary; red alert loses punch. Fix: neutral surface for non-alert KPIs, fill only for true state (low battery, high incidents). Cmd: quieter / colorize.
[P1] Clickable KPI cards drive trend chart with zero affordance. Discoverability + recognition fail. Fix: explicit segmented metric switcher or persistent selected state + aria-pressed. Cmd: clarify / layout.
[P2] Side-stripe on critical alert rows (banned). Fix: drop inset 3px bar, keep bg wash. Cmd: polish AlertRow.tsx.
[P2] Loading = bare text, no skeletons (product register wants skeletons). Cmd: harden / polish.
[P2] No help for domain semantics (proxy, availability-TODO, threshold, card-click). Heuristic 10 = 1. Cmd: clarify.

## Persona Red Flags
- Alex (power user): no keyboard shortcuts, no custom date range, no deep-link metric+period.
- Sam (a11y): alert state leans on color; clickable cards lack aria-pressed/selected; muted subtext on saturated teal borderline contrast — verify 4.5:1.
- Karim (night-shift operator): color wall means "all normal" is already loud; can't distinguish normal from alert at a glance.

## Minor Observations
- StatusBar truncates mission on mobile, no reflow.
- Sidebar uppercase dividers OK (not banned eyebrow).
- Rounds trend Y-axis tops at 2 — sparse; consider weekly aggregation.
- Rondes unfavorable delta should read danger but washes out on teal tile.
