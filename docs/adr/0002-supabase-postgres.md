# 0002 — Supabase (Postgres + Auth + RLS), not Neon
Status: Accepted · Date: 2026-10-18

## Context
Need Postgres, login for field workers/admins only, and per-organisation data isolation. Free tier only.

## Options
1. Supabase: Postgres + Auth + Row-Level Security + storage, Mumbai region.
2. Neon Postgres + Auth.js + hand-written authorization.
3. Self-hosted Postgres.

## Decision
Supabase, region `ap-south-1` (Mumbai).

## Why
- Auth + RLS in one place: "a worker sees only their organisation's screenings" becomes a database policy, not app code that can be forgotten.
- Already proven in FollowUp (same patterns, same mistakes avoided); Supabase MCP is connected for migrations and advisors.
- Mumbai region keeps latency low and data in India.

## Consequences
- Free projects **pause after ~7 days without activity** → a weekly keep-alive ping (cron) and a note in RUNBOOK.
- 500 MB DB limit is plenty for schemes + anonymous screenings; watch it in RUNBOOK.
- Migrations live in `supabase/migrations/` and are reviewed like code; RLS policies get tests (TESTING.md).
