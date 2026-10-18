# ARCHITECTURE — SchemeMatch
*How it works inside. Every part has a diagram. The **why** behind each choice lives in [adr/](adr/README.md); the rule format in [DATA.md](DATA.md).*

## 1. System overview

```mermaid
flowchart TB
    subgraph Clients
        M[Mobile app — Expo / React Native<br/>citizen, offline cache]
        W[Web — Next.js<br/>landing + field-worker dashboard + admin]
    end
    subgraph Backend [API — Fastify + TypeScript on Vercel Functions, Mumbai]
        R[REST routes + Zod validation]
        E[Eligibility engine<br/>pure functions, fully tested]
        V[Voice gateway<br/>Sarvam STT/TTS + fallback]
        J[Vercel Cron<br/>scheme re-check, keep-alive]
        MET[Metrics + structured logs]
    end
    subgraph Data
        PG[(Supabase Postgres + Auth + RLS<br/>Mumbai)]
        RD[(Upstash Redis<br/>rate limit + cache)]
        ST[(Object storage — R2 free<br/>scheme PDFs, audio)]
    end
    subgraph Pipeline [Rule extraction — Python]
        X[Fetch scheme text] --> L[LLM → structured rules JSON]
        L --> H[Human review UI]
        H --> PG
        L --> EV[Eval vs golden set]
    end
    M --> R
    W --> R
    R --> E --> PG
    R --> RD
    R --> V
    J --> PG
    J --> RD
    X --> ST
```

**Why these choices:** see the ADRs — monorepo ([0001](adr/0001-monorepo-typescript-python.md)), Supabase ([0002](adr/0002-supabase-postgres.md)), pure engine ([0003](adr/0003-pure-engine-rule-dsl.md)), Vercel Functions instead of Render/Fly ([0004](adr/0004-api-hosting-vercel-functions.md)), Groq ([0005](adr/0005-llm-groq-structured-output.md)), Sarvam + fallback ([0006](adr/0006-voice-sarvam-with-device-fallback.md)), offline only in the app ([0007](adr/0007-offline-strategy.md)).

## 2. Data model

```mermaid
erDiagram
    SCHEME ||--o{ SCHEME_RULE_VERSION : "versions"
    SCHEME ||--o| SCHEME_RULE_VERSION : "current"
    SCHEME ||--o{ SCHEME_DOCUMENT : "needs"
    SCHEME ||--o{ SCHEME_TEXT : "translated into"
    ORGANISATION ||--o{ WORKER_PROFILE : "employs"
    SCHEME {
        uuid id
        text slug
        text level "central | state"
        text state
        text category
        text official_url "https only"
        text source_hash
        date last_checked
        text status "draft | needs_review | live | retired"
        uuid current_rule_version_id
    }
    SCHEME_RULE_VERSION {
        uuid id
        uuid scheme_id
        int version
        int rule_format_version
        jsonb eligibility "whole all/any tree, DATA.md section 3"
        bool source_quote_check_passed
        uuid reviewed_by
        timestamptz reviewed_at
    }
    SCHEME_DOCUMENT { uuid scheme_id  text doc_key  bool mandatory  jsonb condition }
    SCHEME_TEXT { uuid scheme_id  text lang "hi | mr | bn | en"  text title  text benefit  text how_to_apply }
    ORGANISATION { uuid id  text name }
    WORKER_PROFILE { uuid user_id  uuid org_id  text role "worker | admin" }
    SCREENING ||--o{ MATCH : "produces (Week 3)"
    SCREENING { uuid id  text idempotency_key  text channel  text district  jsonb profile "no name, phone or ID" }
    MATCH { uuid screening_id  uuid scheme_id  uuid rule_version_id  text result  text reason  bool applied }
```

**Why rules are one `jsonb` tree per version, not one row per condition:** eligibility nests (`all` containing `any`), and a flat table can't hold "A AND (B OR C)" without parent pointers. Storing the whole tree per version keeps old versions, so any past screening can still be explained. `SCREENING`/`MATCH` arrive in Week 3 with `POST /screenings`. The live migration is in `supabase/migrations/`.

Privacy rule baked into the schema: **no name, phone or Aadhaar is ever stored** in `SCREENING`.

## 3. Eligibility engine

```mermaid
flowchart LR
    P[Profile<br/>age 38, widow, income 60k,<br/>Maharashtra, OBC, 2 kids] --> F{For each live scheme}
    F --> C[Check every rule<br/>field op value]
    C -->|all pass| OK[Match + reason text<br/>built from rule source_quote]
    C -->|one fails| NO[Not eligible<br/>keep 'closest miss' for analytics]
    C -->|field unknown| ASK[Ask one more question]
```

- Rules are a tree of `all` (AND) / `any` (OR) groups with three-valued logic (PASS / FAIL / UNKNOWN) — exact semantics in [DATA.md](DATA.md) §3.
- Unknown field → the app asks only the questions that would change the result ("adaptive questions"). This keeps the conversation to ~4 questions.
- Output always carries the **reason** and the **official source link**.
- Tested with **120 profiles** whose expected results were written by hand.

## 4. Rule-extraction pipeline (the AI part) + evaluation

```mermaid
sequenceDiagram
    participant A as Admin (you)
    participant P as Pipeline (Python)
    participant L as LLM (Groq, structured output)
    participant G as Golden set (60 hand-made rule sets)
    participant DB as Postgres
    A->>P: add scheme URL
    P->>P: fetch page / PDF → clean text
    P->>L: text + JSON schema of RULE
    L-->>P: rules JSON + source_quote per rule
    P->>P: validate (schema, every quote must exist in the text)
    P->>G: compare with golden answer (offline eval run)
    P->>A: review screen: rule vs quote side by side
    A->>DB: approve → status live
```

**Evaluation (what interviewers will ask about):**
- Metrics: rule-level precision / recall / F1, and "scheme fully correct %".
- **Quote check:** a rule whose `source_quote` is not found in the source text is rejected automatically (stops made-up rules).
- **Error taxonomy:** wrong operator, wrong number, missed rule, invented rule, wrong field. Counted and published.
- Compare 2 models (e.g. a large and a small open model) on accuracy, cost per scheme, latency — a real experiment table for the README.

## 5. Voice flow (reuses the Krishi Mitr pattern)

```mermaid
sequenceDiagram
    participant U as Sunita
    participant App
    participant VG as Voice gateway
    participant S as Sarvam API
    U->>App: taps mic, speaks Marathi
    App->>VG: audio
    VG->>S: speech-to-text
    alt Sarvam OK
        S-->>VG: text
    else timeout / error
        VG-->>App: fallback → device speech recognition
    end
    VG-->>App: text
    App->>App: map answer to field (age=38) + confirm ("Did you say 38?")
    App->>VG: question text → TTS
    VG-->>App: audio (cached per question per language)
```

Audio for fixed questions is generated once and cached (saves free credits).

## 6. Offline sync (citizen app only in v1 — [ADR 0007](adr/0007-offline-strategy.md))

```mermaid
flowchart LR
    A[Save a screening] --> Q[(Local queue<br/>SQLite on device)]
    Q -->|online| S[POST /screenings<br/>with idempotency key]
    S -->|201 or duplicate| D[Remove from queue]
    S -->|network error| B[Retry with back-off]
```

The **idempotency key** (a UUID made on the device) means a retry never creates a duplicate screening — the same "exactly once" idea from your internship XP fix.

## 7. API (v1)

| Method | Path | Purpose |
|---|---|---|
| GET | `/schemes?state=&lang=` | Catalog (cached) |
| POST | `/eligibility` | Profile → matches + next question |
| POST | `/screenings` | Save a screening (idempotent) |
| PATCH | `/matches/:id` | Mark applied |
| GET | `/analytics/demand?district=` | Funnel + top schemes |
| POST | `/voice/stt`, `/voice/tts` | Voice gateway |
| Admin | `/admin/schemes`, `/admin/rules/review` | Add scheme, review extracted rules |

All inputs validated with **Zod**; errors return clear 400s; rate-limited per IP and per install ID with Upstash Redis.

## 8. Security & privacy
- DPDP-style minimisation: no name/phone/Aadhaar; district-level analytics only.
- Auth only for workers/admins (Supabase Auth); citizens never need to log in.
- Row-level security: a worker sees only their organisation's screenings.
- Secrets only in environment variables; never in code or chat.
- Full data inventory and threat model: [PRIVACY-SECURITY.md](PRIVACY-SECURITY.md).

## 9. Quality: tests, observability, performance
Test layers, the 120 profiles and merge gates: [TESTING.md](TESTING.md). Eval of the AI pipeline: [EVALS.md](EVALS.md). Monitoring signals and free-tier limits: [RUNBOOK.md](RUNBOOK.md).

## 10. Free-tier deployment

```mermaid
flowchart LR
    GH[GitHub repo] -->|push / PR| CI[GitHub Actions<br/>lint · typecheck · tests]
    GH --> VC[Vercel — web + API functions<br/>region bom1]
    VC --> CRON[Vercel Cron<br/>scheme re-check, keep-alive]
    CI --> EAS[Expo EAS — Android build]
    VC --> SB[(Supabase Postgres + Auth<br/>Mumbai)]
    VC --> UP[(Upstash Redis)]
    VC --> SV[Sarvam free credits]
    PIPE[Pipeline — runs locally / Kaggle] --> GQ[Groq free LLM]
    PIPE --> SB
```

## 11. Repo layout (monorepo)

```
SchemeMatch/
├─ apps/
│  ├─ mobile/      Expo app (citizen)
│  ├─ web/         Next.js (landing, dashboard, admin)
│  └─ api/         Fastify API
├─ packages/
│  ├─ engine/      eligibility engine (pure TS, shared by api + offline app)
│  └─ i18n/        translations
├─ supabase/       migrations + RLS policies
├─ pipeline/       Python rule extraction + eval
├─ docs/           these documents
└─ CLAUDE.md
```

Sharing `packages/engine` means the app can check eligibility **offline** with the exact same code the server uses.
