# BUILD PLAN — SchemeMatch (≈5 weeks at your hours)

## Golden rules
1. **Commit small, every study day** (a reviewer reads your commit history — it must show real, steady work).
2. **You explain before you merge:** for every change, you can say what it does and why, in English, in 1 minute.
3. **Tests first for the engine** — it is the heart; it must be 100% right.
4. Never claim users or numbers you didn't measure.

```mermaid
gantt
    title SchemeMatch build
    dateFormat YYYY-MM-DD
    section Week 1 — Data & engine
    Monorepo + CI + Postgres schema        :w1a, 2026-10-19, 2d
    20 schemes curated by hand (golden set) :w1b, after w1a, 3d
    Eligibility engine + 120 profile tests  :w1c, after w1a, 4d
    section Week 2 — API & pipeline
    Fastify API + Zod + Redis cache         :w2a, after w1c, 3d
    Rule-extraction pipeline + eval report  :w2b, after w1c, 4d
    section Week 3 — Web
    Field-worker dashboard (offline queue)  :w3a, after w2a, 4d
    Admin rule-review screen                :w3b, after w2b, 3d
    section Week 4 — Mobile + voice
    Expo app screens + offline engine       :w4a, after w3a, 4d
    Voice gateway (Sarvam + fallback)       :w4b, after w3a, 3d
    section Week 5 — Polish & proof
    Landing page (3D, Veo, generated art)   :w5a, after w4a, 3d
    k6 load test, Playwright, README, demo  :w5b, after w4a, 3d
    Pilot outreach (NGO / NSS unit)         :w5c, after w4a, 5d
```

## What you learn each week (for interviews)

| Week | You must be able to explain |
|---|---|
| 1 | Schema design, foreign keys, why the engine is a pure function, unit testing |
| 2 | REST design, validation, caching, rate limiting; LLM structured output; precision/recall |
| 3 | Offline-first, idempotency keys, React state, forms |
| 4 | React Native vs React, Expo, device APIs, fallback design |
| 5 | Load testing (p95/p99), Lighthouse, deployment, observability |

## Definition of done for v1
- Live web demo + Android APK + 90-second video in README.
- README has: problem, architecture diagram, eval table (rule accuracy, 2 models compared), k6 latency table, test count, honest limitations.
- Every number on the resume is reproducible from the repo.

## Resume bullets this should produce (draft — real numbers only after measuring)
- Built a voice-first eligibility platform across **60 schemes** in **4 languages** for web and Android from one TypeScript codebase.
- Measured LLM rule extraction at **X% F1** on a hand-labelled golden set, blocking unsupported rules with source-quote verification.
- Served eligibility at **p95 Y ms** under **50 req/s** (k6), with idempotent offline sync for field workers.
