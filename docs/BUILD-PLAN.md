# BUILD PLAN — SchemeMatch (6 weeks, ~2–3 h/day alongside placement prep)

## Golden rules
1. **Commit small, every study day.** A reviewer reads your history: it must show steady, real work — not two giant commits. Aim for 2–5 commits per study day, each one working step (see CONTRIBUTING.md).
2. **You explain before you merge:** for every change you can say what it does and why, in English, in 1 minute.
3. **Tests before engine code.** The 120 profiles are written before the engine.
4. Never claim users or numbers you didn't measure.
5. Every week ends with one **buffer day** — catch-up, not new features. If a week slips, cut from v2, never from tests.

```mermaid
gantt
    title SchemeMatch v1 build
    dateFormat YYYY-MM-DD
    axisFormat %d %b
    section W1 Data + engine
    Monorepo, CI, Supabase schema         :w1a, 2026-10-19, 2d
    Golden guide + label 10 schemes       :w1b, after w1a, 2d
    120 profiles (tests first) + engine   :w1c, after w1b, 2d
    Buffer day                            :milestone, m1, 2026-10-25, 0d
    section W2 Engine + API
    Label 20 more schemes                 :w2a, 2026-10-26, 2d
    Engine done, 100% branch coverage     :w2b, 2026-10-26, 3d
    Fastify API + Zod + rate limit        :w2c, after w2b, 3d
    section W3 Pipeline + discovery
    Rule-extraction pipeline + validators :w3a, 2026-11-02, 3d
    Eval run: 2 models, first report      :w3b, after w3a, 2d
    5 discovery conversations             :w3c, 2026-11-02, 6d
    section W4 Web
    Admin review UI                       :w4a, 2026-11-09, 2d
    Field-worker dashboard (online)       :w4b, after w4a, 3d
    Staging deploy + RLS tests            :w4c, after w4b, 1d
    section W5 Mobile + voice
    Expo screens + offline engine         :w5a, 2026-11-16, 3d
    Voice: Sarvam + fallback + cached TTS :w5b, after w5a, 2d
    Offline queue + idempotent sync       :w5c, after w5b, 1d
    section W6 Proof + polish
    Landing page (3D, art, Veo)           :w6a, 2026-11-23, 3d
    k6, Playwright, Maestro, README, demo :w6b, 2026-11-23, 4d
    Pilot outreach                        :w6c, 2026-11-23, 6d
```

## Week by week — commit-sized tasks

| Week | Tasks (each ≈ one commit or a few) | Done when |
|---|---|---|
| **W1** | pnpm + Turborepo skeleton · CI workflow · Supabase local + first migration (schemes, rules) · RLS default-deny · `rule.schema.json` · golden GUIDE.md · label 10 schemes · 120 profile JSON files | CI green; 10 golden schemes; profiles committed (engine may be empty, tests red) |
| **W2** | operators + property tests · `all`/`any` three-valued logic · next-question picker · reason builder · label 20 more · Fastify routes `/schemes`, `/eligibility` · Zod · rate limit | all 120 profiles green; API tests green |
| **W3** | fetch + clean + hash · Groq structured output · quote check · eval script + metrics · first eval report · `/screenings` idempotent · discovery calls logged | `reports/eval-*.md` exists with real numbers; ≥ 3 DISCOVERY entries |
| **W4** | Next.js app shell + i18n · admin review screen · worker login (Supabase Auth) · screening form · family list + export · deploy staging | a worker can screen a family on staging in 2 languages |
| **W5** | Expo app: language → questions → results → scheme card · bundled engine + snapshot · Sarvam STT/TTS + device fallback · cached question audio · SQLite queue + sync | airplane-mode test passes on a real Android |
| **W6** | landing page with chosen art direction · k6 warm/cold · Playwright + Maestro · README with numbers + limitations · 90-second demo video · pilot outreach | Definition of done below |

## What you learn each week (for interviews)

| Week | You must be able to explain |
|---|---|
| 1 | Monorepo, CI, schema design, RLS, why tests come before the engine |
| 2 | Three-valued logic, property tests, REST design, validation, rate limiting |
| 3 | LLM structured output, precision/recall/F1, data leakage, error analysis, user interviews |
| 4 | Next.js App Router, auth, RLS in practice, i18n, deployments |
| 5 | React Native vs React, Expo, offline-first, idempotency keys, fallback design |
| 6 | Load testing (warm vs cold p95), E2E testing, writing an honest README |

## Definition of done for v1
- Live web demo + Android APK + 90-second video in README.
- README has: problem, architecture diagram, eval table (2 models, held-out set), k6 table (warm + cold), test count, honest limitations, "built for" (or real pilot numbers if a pilot ran).
- Every number on the resume is reproducible from the repo.

## Resume bullets this should produce (draft — X/Y filled only after measuring)
- Built a voice-first eligibility platform covering **30 schemes** in **4 languages** for web and Android from one TypeScript monorepo, with the same rule engine running online and offline.
- Measured LLM rule extraction at **X F1** on a hand-labelled held-out set, blocking unsupported rules with source-quote verification.
- Served eligibility at **warm p95 Y ms** under **50 req/s** (k6), with idempotent offline sync on the citizen app.
