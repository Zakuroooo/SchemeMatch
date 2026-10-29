"""SchemeMatch app assets, round 4b (two missing objects): palette-matched object renders for the two chosen palettes,
11 Lumiere (cream, burgundy, dusty pink) and 04 Better experiences (stone grey, charcoal, signal red).
Kaggle T4, SDXL base 1.0. Objects only, never people (DESIGN.md section 6). Logged in docs/design-refs/PROMPTS.md."""
import os, time, torch
from diffusers import StableDiffusionXLPipeline, AutoencoderKL, DPMSolverMultistepScheduler

OUT = "/kaggle/working/out"; os.makedirs(OUT, exist_ok=True)
vae = AutoencoderKL.from_pretrained("madebyollin/sdxl-vae-fp16-fix", torch_dtype=torch.float16)
pipe = StableDiffusionXLPipeline.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0", vae=vae, torch_dtype=torch.float16, variant="fp16", use_safetensors=True
).to("cuda")
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True)

LOOKS = {
    "rose": "on a seamless soft cream background, warm diffused light, dusty pink and deep burgundy accents, delicate soft shadow, elegant and calm",
    "stone": "on a seamless pale stone grey background, soft overcast light, charcoal accents, one thin glowing signal red light streak, minimal and architectural",
}
# Round 4b: only the two still missing after round 4 (verdicts in PROMPTS.md), 4 seeds each.
OBJECTS = {
    "gas": "a short squat Indian domestic LPG cooking gas cylinder, glossy red, round steel collar handle and regulator on top, standing upright on the floor",
    "umbrella": "a small open umbrella with a curved handle held above a tiny clay model house, the umbrella clearly separate from the house",
}
TODO = {"stone": ["gas"], "rose": ["umbrella"]}
STYLE = ("premium 3D product render, studio photography, centered single object, minimal composition, "
         "glass and ceramic materials, high detail, sharp focus, 85mm")
NEG = ("people, person, hand, face, text, letters, words, numbers, writing, typography, label, print, logo, "
       "symbol, emblem, crest, coat of arms, bitcoin, watermark, signature, cluttered, cartoon, anime, "
       "flat illustration, lowres, blurry, deformed")

for look, names in TODO.items():
    light = LOOKS[look]
    for name in names:
        obj = OBJECTS[name]
        for seed in (5, 17, 29, 41):
            t = time.time()
            img = pipe(prompt=f"{obj}, {light}, {STYLE}", negative_prompt=NEG, width=1024, height=1024,
                       num_inference_steps=32, guidance_scale=6.5,
                       generator=torch.Generator("cuda").manual_seed(seed)).images[0]
            img.save(f"{OUT}/{look}_{name}_{seed}.png")
            print(look, name, seed, round(time.time() - t, 1), flush=True)
