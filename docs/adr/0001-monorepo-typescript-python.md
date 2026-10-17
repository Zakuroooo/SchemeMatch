# 0001 — Monorepo: TypeScript everywhere, Python only for the pipeline
Status: Accepted · Date: 2026-10-18

## Context
Four deliverables (mobile app, web, API, rule pipeline) built by one person. The eligibility engine must run **identically** on the server and offline on the phone.

## Options
1. One monorepo (pnpm workspaces + Turborepo), TS for app/web/API/engine, Python for the pipeline.
2. Separate repos per part.
3. All-Python backend (FastAPI) + TS frontends.

## Decision
Option 1.

## Why
- `packages/engine` is imported by both `apps/api` and `apps/mobile` → one source of truth, no drift between online and offline answers.
- One CI, one PR shows a full feature end to end — easier to review and to show in interviews.
- Python stays where it earns its place: LLM/eval tooling (pydantic, pandas, pytest).

## Consequences
- Need pnpm workspaces + Turborepo caching; Expo needs Metro configured for workspaces.
- Rule JSON is the contract between Python and TS → one JSON Schema file (`packages/engine/rule.schema.json`) validated on both sides.
