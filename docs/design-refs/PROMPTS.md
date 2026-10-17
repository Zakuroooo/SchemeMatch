# PROMPTS — every generated asset, reproducible
*Status: **proposed — nothing generated yet.** Pranay approves this list first.*

Each entry: id · tool · aspect · prompt · negative · seed · output file · status.

## Shared style blocks
- `STYLE_EDITORIAL` = ", warm editorial illustration, textured paper grain, soft gouache and risograph print feel, limited palette of deep ink blue, marigold and off-white paper, gentle natural light, dignified and hopeful, Indian setting, no text, no watermark"
- `NEG` = "anime, manga, cartoon, chibi, 3d render, plastic, glossy, neon, cyberpunk, stock photo, distorted hands, extra fingers, text, letters, logo, watermark, pity, poverty clichés"
- Rule: show people with dignity and agency — never as objects of pity.

## Round 1 — style test (pick one direction before anything else)
| id | tool | aspect | prompt | status |
|---|---|---|---|---|
| style-a | gen.py (Qwen-Image) | 16:9 | a woman in a cotton sari at the doorway of her home in a Maharashtra town, holding a folder of papers and smiling slightly, morning light + paper-cut layered collage style, ink blue and marigold | proposed |
| style-b | gen.py | 16:9 | same scene + risograph print style, two-colour ink blue and marigold, visible grain | proposed |
| style-c | gen.py | 16:9 | same scene + painterly gouache editorial illustration | proposed |

## Round 2 — landing page concepts (after style is chosen)
| id | section | aspect | prompt (append chosen style) | status |
|---|---|---|---|---|
| hero-01 | Hero (dark) | 16:9 | a floating stack of official government forms with stamps and seals, pages lifting and folding into a single glowing marigold card, deep ink-blue darkness, cinematic depth of field | proposed |
| problem-01 | Problem (light) | 16:9 | a long queue outside a small government office in a town, papers in hands, one woman looking at a phone, late afternoon | proposed |
| how-01 | How it works | 1:1 ×3 | (1) a hand holding a basic Android phone with a large microphone icon glowing, (2) four simple question cards, (3) a checklist with ticks and one missing paper | proposed |
| ngo-01 | For NGOs (inverted) | 16:9 | a field worker with a tablet sitting with a family on a charpai outside a village home, warm evening | proposed |
| tex-01 | Light sections | 1:1 tile | seamless off-white handmade paper texture, subtle fibres, no objects | proposed |

## Round 3 — icon set (citizen app)
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
