# PROMPTS — every generated asset, reproducible
*Status (2026-10-18): **Rounds 1 and 1b are superseded.** Art direction changed to real licensed photos for anything with people (see [CREDITS.md](CREDITS.md) and DESIGN.md §6). AI generation is now limited to non-person scenes: documents, stamps, textures, objects. The illustration results below are kept only as a record of what was tried.*

Each entry: id · tool · aspect · prompt · negative · seed · output file · status.

## Shared style blocks
- `STYLE_EDITORIAL` = ", warm editorial illustration, textured paper grain, soft gouache and risograph print feel, limited palette of deep ink blue, marigold and off-white paper, gentle natural light, dignified and hopeful, Indian setting, no text, no watermark"
- `NEG` = "anime, manga, cartoon, chibi, 3d render, plastic, glossy, neon, cyberpunk, stock photo, distorted hands, extra fingers, text, letters, logo, watermark, pity, poverty clichés"
- Rule: show people with dignity and agency — never as objects of pity.

## Round 1 — style test (pick one direction before anything else)
| id | tool | aspect | prompt | status |
|---|---|---|---|---|
| style-a | gen.py (Qwen-Image) | 16:9 | a woman in a cotton sari at the doorway of her home in a Maharashtra town, holding a folder of papers and smiling slightly, morning light + paper-cut layered collage style, ink blue and marigold | generated — failed |
| style-b | gen.py | 16:9 | same scene + risograph print style, two-colour ink blue and marigold, visible grain | generated — closest |
| style-c | gen.py | 16:9 | same scene + painterly gouache editorial illustration | generated — failed |

### Round 1 results — 2026-10-18 · `concepts/style-{a,b,c}.png` · Qwen-Image-Fast (8 steps), 16:9
Exact prompt = `SCENE + style phrase + TAIL`:
- SCENE: "a confident Indian woman around 38 in a simple cotton sari standing at the doorway of her small home in a Maharashtra town, holding a folder of official papers, a slight hopeful smile, morning light"
- TAIL: ", deep ink blue, marigold and off-white paper palette, dignified, no text, no watermark, not anime, not cartoon, not 3d render"

| id | Verdict |
|---|---|
| style-a paper-cut | Failed: flat vector explainer look, barely any cut-paper layering |
| style-b risograph | Closest to distinct: grain, two-colour feel. But it drew fake gibberish script on the poster despite "no text" |
| style-c gouache | Failed: same flat vector look as A, almost no brush texture |

**What we learned:** the fast 8-step model ignores style words and falls back to one generic "explainer" look; all three share one composition. The sari is a Kerala-style white-and-gold kasavu, which is wrong for Maharashtra (use a nauvari or a printed cotton sari). **Next:** run the style test on a stronger model (Kaggle T4 with a general SDXL/Flux checkpoint, more steps), name the technique concretely (e.g. "Indian woodblock / Kalighat-inspired linework", "torn-paper collage with photographed paper texture"), and vary the composition.

## Round 1b — style test on a stronger model (2026-10-18)
- **Tool:** Kaggle T4 kernel `pranaysarkar04/schemematch-style1b`, source in [`tools/kaggle/style1b/run.py`](../../tools/kaggle/style1b/run.py) (prompts are defined there exactly).
- **Model:** `stabilityai/stable-diffusion-xl-base-1.0` (CreativeML Open RAIL++-M, allows commercial use with use restrictions) + `madebyollin/sdxl-vae-fp16-fix`, DPM++ 2M Karras, 40 steps, CFG 6.5, 1344×768, seeds 7 and 42.
- **Matrix:** 4 techniques (Kalighat-inspired, linocut woodblock, torn-paper collage, risograph) × 3 compositions (doorway wide shot in a printed nauvari sari, close-up of hands with phone and stamped papers, field worker with a family on a charpai) = 24 images → `concepts/1b/`.
- **Verdict:** superseded before review: no illustrated people (direction change, 2026-10-18).

## Round 2 — landing page concepts (after style is chosen)
| id | section | aspect | prompt (append chosen style) | status |
|---|---|---|---|---|
| hero-01 | Hero (dark) | 16:9 | a floating stack of official government forms with stamps and seals, pages lifting and folding into a single glowing marigold card, deep ink-blue darkness, cinematic depth of field | proposed |
| problem-01 | Problem (light) | — | replaced by a real photo (CREDITS #6) | superseded |
| how-01 | How it works | 1:1 ×2 | (1) step 1 uses a real photo (CREDITS #7); (2) four simple question cards, (3) a checklist with ticks and one missing paper — photorealistic objects only, no people | proposed |
| ngo-01 | For NGOs (inverted) | — | real photo needed (own photo from a DISCOVERY visit, with consent) | superseded |
| tex-01 | Light sections | 1:1 tile | seamless off-white handmade paper texture, subtle fibres, no objects | proposed |

## Round 3 — icon set (citizen app)
*Icons are symbols, not people, so a generated reference is fine; final icons are hand-made SVG.*
12 icons, 1:1, one consistent prompt pattern: "a single [OBJECT] icon, flat shapes with subtle paper texture, ink blue and marigold on off-white, centered, thick simple silhouette readable at 48px". Objects: pension (elderly hands with coins), scholarship (book + cap), ration (grain sack), farm (plough + sprout), health (cross + heart), house, documents, microphone, location pin, check, cross, bell. *Final icons will likely be redrawn as SVG from the chosen concept — generated images are references, not production icons.*

## Round 4 — video (Gemini Veo 3.1, ~5/day/account)
| id | prompt | use | status |
|---|---|---|---|
| veo-hero | papers lifting off a desk and swirling, folding into one glowing card that settles in the centre, slow camera push, ink-blue dark background, 5–8 s, no text | hero scroll-scrub via worldvid.sh | proposed |
| veo-problem | wind blowing official papers across a dusty town road at golden hour, a hand catches one, 5–8 s, no text | problem section | proposed |

## Pipeline notes
- Concepts: `gen.py` (fast, HF Space). HD finals: Kaggle T4 notebook with a **non-anime** SDXL/Flux checkpoint (confirm licence allows commercial/portfolio use).
- Upscale: `hd.sh`/`worldvid.sh` currently use **anime** Real-ESRGAN models → switch to `realesrgan-x4plus` (general) for this project; `.esr/models` was not found on disk — verify the install first.
- Citizen app ships **no** large images (< 30 MB APK target); art there is small SVG/WebP only.
