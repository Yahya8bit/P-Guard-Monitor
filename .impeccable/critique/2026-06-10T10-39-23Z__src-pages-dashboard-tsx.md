---
target: src/pages/Dashboard.tsx
total_score: 28
p0_count: 0
p1_count: 2
timestamp: 2026-06-10T10-39-23Z
slug: src-pages-dashboard-tsx
---
# Design Critique — Dashboard (src/pages/Dashboard.tsx)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | lastSeen exists in contract, never rendered |
| 2 | Match System / Real World | 3 | English "Dashboard"/"Logout" in French UI; cryptic ≠ glyph |
| 3 | User Control and Freedom | 2 | Only 7j/30j; alerts not acknowledgeable from strip |
| 4 | Consistency and Standards | 3 | BatteryCard looks clickable like KpiCards but isn't |
| 5 | Error Prevention | 3 | Hardcoded thresholds with no context shown |
| 6 | Recognition Rather Than Recall | 3 | Keys 1–4 select cards 2–5 — spatial mismatch |
| 7 | Flexibility and Efficiency | 3 | Accelerators exist; metric not in URL |
| 8 | Aesthetic and Minimalist Design | 3 | Always-red incidents tile |
| 9 | Error Recovery | 2 | No fetch .catch anywhere — API failure = infinite skeleton |
| 10 | Help and Documentation | 3 | Inline "i" hints above average |
| **Total** | | **28/40** | **Good** |

## Anti-Patterns Verdict

LLM: passes product slop test; minor tells (text-glyph icons, English page title, permanent red tile). Detector: clean (0 findings, 7 files). A11y quick-pass: 0 unnamed buttons / missing alt / tabindex>0. No failed tile requests. Console: 2 third-party Recharts defaultProps warnings only. Light theme renders fully.

## Priority Issues

- **[P1] Incident alarm miscalibrated — permanent red.** KPI_ALERTS.incidents.alertAt=5 regardless of period (Dashboard.tsx:35). Both robots red under normal ops. Fix: per-day-normalized threshold or drive from unacknowledged critical alerts.
- **[P1] No network error handling.** All fetches (Dashboard.tsx:99–134) lack .catch; failure = infinite skeleton with aria-busy. Fix: error state + Réessayer per region.
- **[P2] Alert descriptions truncated** ("Échec de d…"). Fix: two-line clamp, metadata line for pill+timestamp.
- **[P2] Keyboard bugs.** Keys 1–4 ↔ cards 2–5 mismatch; KpiCard.tsx:56 Space without preventDefault scrolls page.
- **[P2] Red tile AA fail.** White 70% subtext on #e5333b ≈ 3.2:1. Fix: darken fill toward #b91c1c or full-white larger subtext.

## Persona Red Flags

Alex: strip not triageable in place; 30d chart of 0–2 values low-information; metric not in URL. Sam: Space scroll bug; delta sentiment color-only; charts no text alternative; map mouse-only. Positives: aria-pressed, aria-busy, focus-visible, prefers-reduced-motion.

## Minor Observations

- Disponibilité 93% confident while formula TODO — provisionality buried in hover.
- "Cliquez une carte…" helper permanent.
- Dark --danger shipped #ff3b3b vs spec #E5484D.
- Map popup hardcoded #888/#0d9488 — token drift.
- lastSeen + battery time-series have no surface.

## Questions

1. If incidents is always red, what shows the operator something is actually wrong?
2. Why does battery (most interesting time-series) have no chart?
3. Client persona: is a 0/1 bar chart a "result", or is "20 rondes, 18 nuits couvertes / 30" the sentence?
