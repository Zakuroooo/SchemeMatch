# SchemeMatch — rules for Claude Code

Owner: Pranay Sarkar. He is learning while building: teach every change in simple English, one Hinglish line for hard parts, point to files/lines, end big changes with 2 check questions.

## Read first
`docs/00-README.md` → PRD → ARCHITECTURE (+ `docs/adr/`) → DATA → DESIGN → BUILD-PLAN → CLAUDE-CODE-PLAYBOOK. Never build features not in the PRD without asking.

## Working rules
- One feature per session; plan mode for anything touching >2 files.
- Small commits after each working step (his commit history must show steady real work). No Co-Authored-By/Claude lines in commits.
- Engine/API changes ship with tests; run them and show real output before saying done.
- Never store name, phone or Aadhaar. Never print or commit secrets (env vars only).
- Free tiers only (Vercel, Supabase, Upstash, R2, Groq, Sarvam credits, Expo EAS).
- Never claim users or metrics that weren't measured; label targets as targets.
- Use context7 for current library docs before writing code against a library.

## Design assets
- Follow docs/DESIGN.md. Every prompt goes in `docs/design-refs/PROMPTS.md`.
- Concept images: `~/Desktop/portfolio/tools/gen.py` (Hugging Face Space, Qwen-Image; tokens in portfolio `.env`, never print them).
- HD/batch images: Kaggle free T4 (`~/Desktop/portfolio/kaggle/*/run.py`, account pranaysarkar04) — swap the anime model for a non-anime one for this project.
- Video: Gemini Veo 3.1, then `~/Desktop/portfolio/tools/worldvid.sh` for scroll-scrub encoding (use a non-anime upscaler).
- Generate assets only after Pranay approves the prompt list.

## Agent tools
- **REA (MCP `rea`)** — when he says "reverse engineer X", use REA, outside-in, evidence-first; follow docs/REVERSE-ENGINEERING.md. Only targets he owns or is authorised to examine (his own builds, public web pages observed in a browser). Never decompile third-party apps, bypass protections, or copy their code/content.
- **Agent-Reach (CLI + skill `agent-reach`)** — web/YouTube/RSS/GitHub reading for research. Zero-config channels only. Cookie-based platforms only with a secondary account, never his main accounts; ask before configuring any.
- Security testing is out of scope until staging exists (see docs/PRIVACY-SECURITY.md).
