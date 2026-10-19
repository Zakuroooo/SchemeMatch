# Contributing to SchemeMatch

## Setup
Prereqs: Node 22 (`.nvmrc`), pnpm 10, Docker, Supabase CLI.

```bash
pnpm install
pnpm test                 # lint/typecheck/test run with: pnpm turbo run lint typecheck test
supabase start            # local Postgres + Auth on ports 553xx (so other local Supabase projects can keep 543xx)
supabase db reset         # re-apply every migration from zero
supabase test db          # pgTAP tests in supabase/tests/
pnpm --filter @schemematch/api dev   # API on http://127.0.0.1:3001
```

Try it: `curl -X POST localhost:3001/eligibility -H 'content-type: application/json' -d '{"profile":{"state":"MH","age":38,"gender":"female"}}'`

TypeScript is pinned to 6.0.x: TypeScript 7 (the native compiler) has no JavaScript API yet, and typescript-eslint, Next.js and Expo still need it.

## Branches and commits
- `main` is always deployable. Work on `feat/<short-name>`, `fix/<short-name>`, `docs/<short-name>`.
- **Small commits, every working step** — one idea per commit, message in [Conventional Commits](https://www.conventionalcommits.org/) style: `feat(engine): add between operator`.
- A commit must leave tests green. Don't mix refactors with behaviour changes.

## Pull requests
Each PR answers, in its description:
1. **What & why** — link the PRD/ADR section.
2. **How I verified it** — commands run and their real output, screenshots for UI.
3. **What I'm unsure about.**

## Definition of done
- [ ] Behaviour matches the PRD/DATA spec; tests prove it (TESTING.md)
- [ ] CI green (lint, typecheck, tests, build)
- [ ] No secrets, no personal data in code, logs or fixtures
- [ ] All user-facing text in translation files (hi, mr, bn, en)
- [ ] Docs/ADR updated if a decision changed
- [ ] I can explain the change in one minute without notes

## Data contributions
New schemes follow DATA.md: official source URL, hash, human review before `live`. Never scrape myScheme.

## Reporting a security issue
Don't open a public issue — email the maintainer (address in the GitHub profile).
