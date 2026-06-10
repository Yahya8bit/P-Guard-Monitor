---
target: Fleet
total_score: 29
p0_count: 0
p1_count: 2
timestamp: 2026-06-09T15-10-13Z
slug: src-pages-fleet-tsx
---
## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 4 | Live pulse + count-up timestamp + skeleton loading + card ring states — excellent |
| 2 | Match System / Real World | 3 | French throughout, domain labels accurate; "Cartes/Carte" toggle labeling is slightly ambiguous |
| 3 | User Control and Freedom | 3 | View toggle reversible; missing: filter by state/region |
| 4 | Consistency and Standards | 3 | Consistent with app token system; Leaflet popup uses hardcoded hex instead of CSS vars |
| 5 | Error Prevention | 3 | Nothing destructive; robots with no coords silently excluded from map with no user signal |
| 6 | Recognition Rather Than Recall | 3 | Card badges carry text labels; map markers require click for detail |
| 7 | Flexibility and Efficiency | 2 | No keyboard shortcut for view toggle; no filter by state/region/attention level |
| 8 | Aesthetic and Minimalist Design | 3 | Clean; white Leaflet popup on dark map is a visual intrusion |
| 9 | Error Recovery | 3 | Read-only page; missing-coords robots silently drop off map |
| 10 | Help and Documentation | 2 | No hint that map is city-level approx, not real GPS |
| **Total** | | **29/40** | **Good** |

## Anti-Patterns Verdict

LLM: Passes. No gradient text, no side stripes, no hero-metric template. Main tell: unstyled Leaflet popup (white box on dark theme).
Detector: zero hits (empty JSON array from detect.mjs).

## Priority Issues

[P1] Overlapping markers misrepresent fleet size: PG-001 + PG-003 share coords, map shows 2 dots for 4 robots. Fix: deterministic coord jitter per robot at same site.

[P1] Leaflet popup unstyled — white bg on dark theme. Fix: CSS overrides in index.css for .leaflet-popup-content-wrapper/.leaflet-popup-tip using CSS vars.

[P2] "À surveiller 2" understates severity — one is critical (red), one is watch (amber). Fix: split count by level with separate color per severity.

[P2] Map has no signal that pins are city-level approx. Fix: disclaimer badge "Positions approximatives — GPS réel à venir".

[P3] Hardcoded hex in popup button. Fix: address alongside P1 popup styling.
