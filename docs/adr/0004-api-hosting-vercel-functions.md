# 0004 — API runs as Vercel Functions in Mumbai, not Render/Fly
Status: Accepted · Date: 2026-10-18

## Context
Free hosting for a Fastify API with a target of p95 < 300 ms. The first draft picked "Render / Fly free".

## Options
1. Render free web service.
2. Fly.io.
3. Vercel Functions (Fastify adapter), region `bom1` (Mumbai), same platform as the web app.

## Decision
Option 3. Keep the Fastify app framework-agnostic so moving to a container later is a config change.

## Why
- Render free **spins down after 15 minutes idle; cold start 30–60 s** (Render changelog, Feb 2026) — a citizen on 4G would see a dead app. Fly no longer offers a dependable free tier for new orgs (unverified detail; not worth the risk).
- Vercel Functions start in well under a second, Hobby allows one region → `bom1`, next to Supabase Mumbai.
- One platform for web + API → one set of env vars, preview deployments per PR.

## Consequences
- Serverless: no long-running workers. Background jobs (scheme re-check, keep-alive) use **Vercel Cron**; queueing via Upstash if ever needed (drop BullMQ from the plan).
- DB connections must go through Supabase's pooler (transaction mode).
- k6 numbers must be reported as **warm p95** and **cold-start p95** separately — honest benchmarking.
- Confirm current Fastify-on-Vercel support and Hobby limits with Vercel docs/context7 at build time.
