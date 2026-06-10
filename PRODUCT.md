# Product

## Register

product

## Users

Three operator tiers monitoring P-Guard security patrol robots, each with a different scope:

- **Superadmin** — oversees the whole fleet; assigns robots to admins. Context: central operations.
- **Admin** — assigned robots only; deep log-derived detail (event journal, per-mission + state-machine breakdowns, GPS patrol path); assigns one robot per client.
- **Client** — one robot, results-only (the four KPIs + reports). Context: a site owner checking their unit, not an operator.

Primary job: at a glance, know whether a robot is doing its rounds, charging normally, and whether anything went wrong (obstacles, emergency stops, failed dockings). Secondary: pull a report for a period, trace a patrol path, audit alerts.

## Product Purpose

A monitoring dashboard for a real P-Guard unit with ~2 years of operational logs (Jun 2024 → Jun 2026), redeployed mid-life from Tunisia to Germany. Everything surfaced is **derivable from the logs** — rounds completed, operational incidents, charge cycles, battery (event-sampled at dock/undock), availability, GPS patrol paths. No fabricated telemetry, no zone-coverage maps the data can't support.

Frontend-first: data comes from a deterministic mock service behind a frozen contract; a real REST/JWT backend swaps in later with zero UI change. Success = an operator trusts the numbers because they trace directly to the logs, and the UI never invents a metric it can't back.

## Brand Personality

Calm, precise, trustworthy. A quiet operations console, not a hype surface. Voice is plain and factual (French UI): state what happened, label proxies honestly (incidents are an *operational* proxy, not security detections), flag unsettled metrics (availability formula is TODO) rather than faking confidence. Enova teal accent on charcoal neutral; restraint over decoration.

## Anti-references

- Flashy "security SaaS" dark-neon dashboards (glowing edges, saturated gradients as decoration).
- NOC video-wall clutter: dense gauge clusters and dials that look busy but say little.
- Gradient-heavy marketing dashboards where visual drama outweighs data legibility.
- Any metric presented with false confidence (smooth battery line from event-sampled data; a hardcoded availability number).

## Design Principles

1. **Honest data, honest labels.** Every number traces to the logs. Proxies and placeholders are named as such (operational incidents, TODO availability). Never render a metric the data can't support.
2. **Event-sampled, not continuous.** Battery and similar dock/undock samples render stepped/scatter with gaps — the chart shape tells the truth about sampling.
3. **Scope by role, enforced twice.** Access differs by role (superadmin → admin → client) and is gated in routing AND components, never CSS-hidden.
4. **Calm by default, loud only when it matters.** Tiles stay neutral; warning/alert color appears only for KPIs with a real, honest threshold (low battery, high incidents).
5. **Frozen contract.** The mock returns exact contract shapes so the real backend is a drop-in. UI targets the contract, never the raw logs.

## Accessibility & Inclusion

Best-effort, no formal WCAG level committed. In practice: legible contrast on both themes (dark default, light toggle, persisted), `prefers-reduced-motion` honored, transform/opacity-only animations, and hover + focus-visible + active states on every interactive element. Color is never the sole signal — status carries a label alongside its tint.
