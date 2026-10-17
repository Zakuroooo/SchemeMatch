# ARCHITECTURE — SchemeMatch
*How it works inside. Every part has a diagram.*

## 1. System overview

```mermaid
flowchart TB
    subgraph Clients
        M[Mobile app — Expo / React Native<br/>citizen, offline cache]
        W[Web — Next.js<br/>landing + field-worker dashboard + admin]
    end
    subgraph Backend [API — Node.js + TypeScript, Fastify]
        R[REST routes + Zod validation]
        E[Eligibility engine<br/>pure functions, fully tested]
        V[Voice gateway<br/>Sarvam STT/TTS + fallback]
        J[Background jobs<br/>scheme refresh, reminders]
        MET[Metrics + structured logs]
    end
    subgraph Data
        PG[(Postgres — Neon/Supabase free)]
        RD[(Redis — Upstash free<br/>cache + rate limit + job queue)]
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

**Why these choices (short ADRs):**
- **Fastify + TypeScript** for the API: same language as web and mobile, fast, schema-first. (Python is used only for the pipeline, where ML libraries live.)
- **Postgres** because rules, schemes and analytics are relational and need joins and GROUP BY.
- **Eligibility engine = pure functions** (input profile → output matches). No database inside, so it is easy to unit test 120 profiles.
- **Redis** for caching scheme lists, rate limiting, and a simple job queue (BullMQ).
- Everything fits **free tiers** (section 10).

## 2. Data model

```mermaid
erDiagram
    SCHEME ||--o{ RULE : "has"
    SCHEME ||--o{ DOCUMENT_REQ : "needs"
    SCHEME ||--o{ SCHEME_TEXT : "translated into"
    SCHEME {
        uuid id
        text slug
        text level "central | state"
        text state
        text category "pension, education, farming..."
        text official_url
        date last_checked
        text status "draft | live | retired"
    }
    RULE {
        uuid id
        uuid scheme_id
        text field "age, income, gender, marital, caste, occupation, land_acres..."
        text op "eq | in | lt | lte | gt | gte | between"
        jsonb value
        text source_quote "exact sentence from the official text"
        text reviewed_by
    }
    DOCUMENT_REQ { uuid scheme_id  text doc_key "aadhaar, income_cert..."  bool mandatory }
    SCHEME_TEXT { uuid scheme_id  text lang  text title  text benefit  text how_to_apply }
    SCREENING ||--o{ MATCH : "produces"
    SCREENING {
        uuid id
        text channel "app | dashboard"
        text district
        jsonb profile "no name, no Aadhaar"
        timestamptz created_at
    }
    MATCH { uuid screening_id  uuid scheme_id  text reason  bool applied }
    WORKER ||--o{ SCREENING : "does"
    WORKER { uuid id  text org  text role "worker | admin" }
```

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

- Rules are **AND** inside a group, groups can be **OR** (e.g. "widow OR divorced").
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

## 6. Offline sync (field-worker dashboard + app)

```mermaid
flowchart LR
    A[Screen a family] --> Q[(Local queue<br/>IndexedDB / SQLite)]
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

All inputs validated with **Zod**; errors return clear 400s; rate-limited per IP with Redis.

## 8. Security & privacy
- DPDP-style minimisation: no name/phone/Aadhaar; district-level analytics only.
- Auth only for workers/admins (Supabase Auth or Auth.js); citizens never need to log in.
- Row-level security: a worker sees only their organisation's screenings.
- Secrets only in environment variables; never in code or chat.

## 9. Quality: tests, observability, performance

| Layer | Tool | What |
|---|---|---|
| Engine | Vitest | 120 profile tests, property tests for operators |
| API | Vitest + Supertest | every route, validation errors, idempotency |
| Mobile | Jest + React Native Testing Library | screens, offline state |
| Web | Playwright | screening flow, offline, language switch |
| Pipeline | pytest | quote check, schema validation, eval script |
| Load | k6 | p50/p95/p99 at 10/50/100 req/s → table in README |
| Observability | pino logs + /metrics (Prometheus format) + Grafana Cloud free | latency, error rate, voice fallback rate |
| CI | GitHub Actions | lint, typecheck, tests on every push |

## 10. Free-tier deployment

```mermaid
flowchart LR
    GH[GitHub repo] -->|push| CI[GitHub Actions]
    CI --> VC[Vercel — web]
    CI --> RE[Render / Fly free — API container]
    CI --> EAS[Expo EAS — Android build]
    RE --> NE[(Neon/Supabase Postgres)]
    RE --> UP[(Upstash Redis)]
    RE --> CF[(Cloudflare R2)]
    RE --> SV[Sarvam free credits]
    RE --> GQ[Groq free LLM]
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
├─ pipeline/       Python rule extraction + eval
├─ docs/           these documents
└─ CLAUDE.md
```

Sharing `packages/engine` means the app can check eligibility **offline** with the exact same code the server uses.
