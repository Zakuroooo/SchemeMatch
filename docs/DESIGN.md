# DESIGN — SchemeMatch
*How it looks and feels. Based on your taste from the portfolio and FollowUp.*

## 1. Your taste (what we keep)
- **3D objects and depth**, scroll-driven motion, scenes that feel premium — not flat templates.
- **Inverted sections**: dark ↔ light flips between sections for rhythm and contrast.
- **Generated art per section** (made with your Kaggle + Veo pipeline, below), never stock icons or "AI-generic" gradients.
- FollowUp's discipline: real content, calm UI where people work, nothing decorative inside the task flow.

## 2. Two faces, two rules

| Surface | Who | Style |
|---|---|---|
| **Landing page (web)** | Recruiters, NGOs, visitors | Your full taste: 3D hero, scroll story, inverted sections, Veo video, generated art |
| **Citizen app (mobile)** | Sunita on a ₹8,000 phone | Calm, big, fast. Art only as small illustrations. **No 3D** (performance + clarity) |
| **Dashboard (web)** | Meena, admin | FollowUp-style: dense, clear tables, keyboard-friendly |

## 3. Landing page story (scroll)

```mermaid
flowchart TD
    S1["1 · Hero (dark)<br/>3D: stack of official papers floating → a single glowing card 'You qualify'"] --> S2
    S2["2 · Problem (inverted, light)<br/>'4,000 schemes. 40-page PDFs. One widow in Nashik.'<br/>Veo clip: papers blowing away"] --> S3
    S3["3 · How it works (dark)<br/>3 steps animate on scroll: Speak → Answer 4 questions → See what you're owed"] --> S4
    S4["4 · Live demo (light)<br/>try it: pick a persona, see results instantly"] --> S5
    S5["5 · Trust (dark)<br/>every result shows WHY + official link; measured rule accuracy %"] --> S6
    S6["6 · For NGOs (inverted)<br/>dashboard screenshot + 'screen 30 families a day offline'"]
```

## 4. Design tokens (starting point — tune in the build)

| Token | Dark | Light (inverted sections) | Use |
|---|---|---|---|
| `--bg` | `#0B0F14` deep ink | `#F4F1EA` paper | page ground |
| `--fg` | `#EDEAE3` | `#14181D` | text |
| `--accent` | `#F2A93B` marigold | `#C77A0A` | "you qualify", primary buttons (warm, Indian, not tech-blue) |
| `--ok` | `#3FB68B` | `#1E8A63` | eligible |
| `--muted` | `#8A93A0` | `#5D6672` | secondary text |

- **Type:** display = a characterful grotesk (e.g. "Clash Display" or "Space Grotesk" fallback) used sparingly; body = "Inter"-class sans; **Devanagari/Bengali** via Noto Sans Devanagari / Noto Sans Bengali — must be tested, not assumed.
- **Motion:** GSAP + ScrollTrigger on the landing only; respect `prefers-reduced-motion`.
- **3D:** React Three Fiber on the landing hero; lazy-loaded; a static image fallback on low-end devices.

## 5. Citizen app screens

```mermaid
flowchart LR
    A[Language<br/>4 big tiles + flags of script] --> B[Mic screen<br/>one huge mic button, waveform]
    B --> C[Question card<br/>icon + 5 words + read-aloud]
    C --> D[Results<br/>'You qualify for 6' — stacked cards]
    D --> E[Scheme card<br/>benefit · why you · documents ✓/✗ · where]
    E --> F[Saved / reminders]
```

Rules: 48 px+ tap targets, one action per screen, every text has a 🔊 button, icons from the generated art set (consistent style), no colour-only meaning.

## 6. Asset pipeline (your tools — what they really are)
- **Art direction:** warm editorial (paper-cut / risograph / gouache — pick one in Round 1), **not anime**. Your portfolio is anime because it is a personal story; SchemeMatch serves real citizens and must read as trustworthy and dignified.
- **Concept images (fast):** `~/Desktop/portfolio/tools/gen.py` → Hugging Face Space (Qwen-Image), tokens from the portfolio `.env`.
- **HD / batches:** Kaggle free T4 notebooks (`~/Desktop/portfolio/kaggle/*/run.py`, account `pranaysarkar04`, pushed with `kaggle kernels push`). They currently load an **anime** SDXL checkpoint → swap for a general SDXL/Flux checkpoint whose licence allows portfolio use.
- **Upscaling:** `hd.sh` / `worldvid.sh` use **anime** Real-ESRGAN models → use `realesrgan-x4plus` for this project. `.esr/models` was not found on disk; verify before the first run.
- **Video:** Gemini Veo 3.1 for 2 short clips (hero, problem; ~5 generations/day/account), then `worldvid.sh` for scroll-scrub encoding (short GOP, no audio).
- **3D:** simple modelled objects (papers, card, stamp) in React Three Fiber, or a CC0 glTF (Poly Pizza) — check every licence.
- **Mock-ups:** Stitch MCP for quick screen drafts from this doc's tokens.
- Every prompt, seed and output path goes in [design-refs/PROMPTS.md](design-refs/PROMPTS.md). **Nothing is generated until Pranay approves that list.**

## 7. Accessibility & India-specific checks
See also TESTING.md §5 (real-device checks).

Contrast AA in both themes · screen-reader labels in all 4 languages · test on a real low-end Android · test Devanagari and Bengali line height · numbers in Indian format (₹1,20,000).
