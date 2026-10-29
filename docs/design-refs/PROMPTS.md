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

## Round 3 — app object renders (2026-10-26)
- **Why:** the app redesign needs premium pictures. Objects only, never people (rule above).
- **Tool:** Kaggle T4 kernel `pranaysarkar04/schemematch-app-assets`, source in [`tools/kaggle/app-assets/run.py`](../../tools/kaggle/app-assets/run.py) (exact prompts there). Same model and licence as Round 1b: SDXL base 1.0 + fp16-fix VAE, DPM++ 2M Karras, 32 steps, CFG 6.0, 1024×1024, seed 11.
- **Matrix:** 10 objects (coin, card, women = bangles + marigold, pension = piggy bank, family = clay house, gas, bank = passbook, shield, papers + wax seal, glass ribbon) × 2 lights (warm cream, dark) = 20.
- **Verdict (read by eye, every image):**
  - Kept: coin, women, pension, family, papers and ribbon (both lights), dark bank. Resized to 640 px JPEG for the design canvas.
  - Rejected: card (both: fake printed text), warm bank (faint fake text), gas (both: a blue vase, not a cylinder), shield (a bowl and an orb).
  - The whole dark set came out on grey or lavender, not black.

## Round 3b — re-renders of the rejects (2026-10-26)
Stricter prompts: a "completely blank, unprinted" card, a "red steel LPG cylinder with a regulator", a "heraldic shield", "pitch black background" and "typography, label, print" in the negative prompt; seeds 11 and 23. Same kernel, version 2. 28 images.
- **Kept:** warm bank (seed 23, a blank notebook), warm card (11), warm gas (11, a red cylinder with a regulator); dark bank (23), card (23), family (23), papers (23), pension (11), ribbon (11), women (11). The dark set is now really black.
- **Rejected:**
  - every shield (both lights, both seeds): a crowned eagle crest, which looks like a real national emblem. This app must never look official.
  - dark coin (both seeds): a Bitcoin symbol;
  - dark gas: a horizontal tank and a fire extinguisher;
  - warm gas seed 23: looks like an extinguisher.
- **Next:** an umbrella for insurance, a dark gas cylinder, a dark coin with "no symbols".

## Round 4 — palette-matched sets for the chosen palettes (2026-10-27)
Pranay picked palettes 11 (Lumière: cream, burgundy, dusty pink) and 04 (stone grey, charcoal, signal red), and asked for no irrelevant images. **Rule from here: every picture shows what its text is about.** The glass ribbon and the bangles were dropped.
- **Kernel v4:** 9 objects (hero still life, coins on a passbook, reading glasses on coins, house, gas, passbook, umbrella over a house, ration-card booklet, papers) × looks `rose` and `stone` × seeds 11 and 23 = 36. Exact prompts are in git history of `tools/kaggle/app-assets/run.py`.
- **Kept 14:** rose bank 11, dbt 23, family 23, gas 11, pension 11, papers 11, rationcard 23; stone bank 11, dbt 23, family 11, pension 11, papers 11, rationcard 11, umbrella 23.
- **Rejected:**
  - every hero: random bottles and vases, no gas cylinder. The hero is now composed in the layout from three approved images instead.
  - rose umbrella: houses with umbrella-shaped roofs;
  - stone gas: a horizontal tank and an extinguisher;
  - rose rationcard 11: printed lines that read as text.
- **Kernel v5 (round 4b):** stone gas and rose umbrella, seeds 5, 17, 29 and 41. Kept rose umbrella 41 and stone gas 29; rejected gas 41 (fake text "SQUAT INGREAL"), gas 5 (three objects), gas 17 (barrel-like), umbrella 29 (roof again).
