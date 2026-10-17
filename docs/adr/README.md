# Architecture Decision Records (ADRs)

An ADR is a one-page note: **what we decided, what else we considered, and why.** Interviewers ask "why X over Y?" — these are the written answers.

Rules: one decision per file · never edit an accepted ADR's decision; write a new one that *supersedes* it · status is `Proposed`, `Accepted` or `Superseded by NNNN`.

| # | Decision | Status |
|---|---|---|
| [0001](0001-monorepo-typescript-python.md) | Monorepo: TypeScript everywhere, Python only for the pipeline | Accepted |
| [0002](0002-supabase-postgres.md) | Supabase (Postgres + Auth + RLS), not Neon | Accepted |
| [0003](0003-pure-engine-rule-dsl.md) | Eligibility engine is a pure function over a JSON rule format | Accepted |
| [0004](0004-api-hosting-vercel-functions.md) | API runs as Vercel Functions in Mumbai, not Render/Fly | Accepted |
| [0005](0005-llm-groq-structured-output.md) | Groq open models with structured output for rule extraction | Accepted |
| [0006](0006-voice-sarvam-with-device-fallback.md) | Sarvam STT/TTS with on-device fallback and cached prompts | Accepted |
| [0007](0007-offline-strategy.md) | Offline-first only in the citizen app; dashboard online in v1 | Accepted |

## Template
```markdown
# NNNN — Title
Status: Proposed | Accepted | Superseded by NNNN · Date: YYYY-MM-DD

## Context        — what problem forces a decision
## Options        — 2–4 real alternatives, one line each
## Decision       — what we picked
## Why            — the 2–3 reasons that actually decided it
## Consequences   — what gets easier, what gets harder, what we must watch
```
