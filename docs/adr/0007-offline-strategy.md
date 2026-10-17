# 0007 — Offline-first only in the citizen app; dashboard online in v1
Status: Accepted · Date: 2026-10-18

## Context
First draft made both the app and the field-worker dashboard offline-first. Offline sync for an authenticated, multi-user web dashboard (login expiry, conflicts, RLS) is the single most expensive feature in the plan.

## Options
1. Both offline-first (draft plan).
2. App offline-first; dashboard online-only in v1, offline in v2 if a real field worker asks.
3. Neither offline.

## Decision
Option 2.

## Why
- The citizen app needs offline most (Sunita's patchy 4G) and is simpler: anonymous, single user, engine runs locally.
- Cuts ~1 week from the plan without losing the interview story (idempotent sync is still built — in the app).
- DISCOVERY.md conversations decide whether dashboard offline is worth v2.

## Consequences
- App bundles a scheme snapshot (versioned) + the engine; refreshes when online.
- App screenings are queued in SQLite and synced with an idempotency key; tests cover airplane mode.
- Dashboard shows a clear "you are offline" state instead of failing silently.
