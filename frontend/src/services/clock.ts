// Frozen "now" — the real unit's logs span Jun 2024 -> Jun 2026, so the app
// clock is pinned to the end of that span instead of the wall clock. Backend
// endpoints use the same frozen date (see backend/pguard/views.py NOW).
export const NOW = new Date('2026-06-01T20:00:00Z');
