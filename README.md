# SchemeMatch

A voice-first app that tells Indian citizens, in their own language, which government welfare schemes they are likely eligible for, why, which documents they need and where to apply.

**Status:** Week 3. Engine, API and the AI rule-extraction pipeline are built. The staging API (testing only; rules are AI-checked, not yet human-reviewed) is at https://schemematch-api-zakuroooos-projects.vercel.app/schemes. AI rule extraction, measured on 10 held-out schemes it never saw: **F1 0.53** for the best model (22 conditions, AI-checked labels, below the 0.90 target): [reports/eval-2026-10-21-heldout.md](reports/eval-2026-10-21-heldout.md). Dev-set run: [reports/eval-2026-10-20.md](reports/eval-2026-10-20.md).

The whole story in simple English: [docs/STORY.md](docs/STORY.md) · build log: [docs/PROGRESS.md](docs/PROGRESS.md).

Start with the design docs: [docs/00-README.md](docs/00-README.md).
