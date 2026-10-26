"""SchemeMatch app assets, round 3b: re-renders of the round 3 rejects, on a Kaggle T4 (SDXL base 1.0).
Objects only, never people (DESIGN.md section 6). Prompts and verdicts are logged in docs/design-refs/PROMPTS.md."""
import os, time, torch
from diffusers import StableDiffusionXLPipeline, AutoencoderKL, DPMSolverMultistepScheduler

OUT = "/kaggle/working/out"; os.makedirs(OUT, exist_ok=True)
vae = AutoencoderKL.from_pretrained("madebyollin/sdxl-vae-fp16-fix", torch_dtype=torch.float16)
pipe = StableDiffusionXLPipeline.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0", vae=vae, torch_dtype=torch.float16, variant="fp16", use_safetensors=True
).to("cuda")
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True)

# Round 3 verdicts: the dark set came out grey or lavender, not black; card and passbook had fake text;
# gas looked like a vase; shield looked like a bowl or an orb.
LOOKS = {
    "warm": "on a seamless warm cream background, soft window light, chocolate brown and burnt orange accents, gentle long shadow",
    "dark": "isolated on a pitch black background, low key lighting, pure black backdrop, thin violet and electric cyan rim light, glossy black reflective floor",
}
OBJECTS = {
    "coin": "a single thick polished gold coin floating at an angle above three stacked frosted glass discs",
    "card": "a completely blank smooth plastic card with no printing at all, plain solid surface, rounded corners, resting on folded cotton fabric",
    "women": "a pair of glossy glass bangles beside a single fresh marigold flower",
    "pension": "a small glossy ceramic piggy bank beside a neat stack of gold coins",
    "family": "a small handmade clay model of a house with warm light glowing in its window",
    "gas": "a small glossy red steel LPG cooking gas cylinder with a black regulator valve on top, standing upright",
    "bank": "a closed plain leather-bound notebook with a blank unprinted cover and a plain card resting on top",
    "shield": "a glossy ceramic heraldic shield emblem standing upright, pointed bottom, smooth blank surface",
    "papers": "a neat stack of plain paper documents held by a round red wax seal",
    "ribbon": "an abstract flowing ribbon of liquid glass and brushed chrome twisting through space",
}
TODO = {"warm": ["card", "gas", "bank", "shield"], "dark": list(OBJECTS)}
STYLE = ("premium 3D product render, studio photography, centered single object, minimal composition, "
         "glass and ceramic materials, high detail, sharp focus, 85mm")
NEG = ("people, person, hand, face, text, letters, words, numbers, writing, typography, label, print, logo, "
       "watermark, signature, grey background, gradient background, cluttered, cartoon, anime, flat illustration, "
       "lowres, blurry, deformed")

for look, names in TODO.items():
    for name in names:
        for seed in (11, 23):
            t = time.time()
            img = pipe(prompt=f"{OBJECTS[name]}, {LOOKS[look]}, {STYLE}", negative_prompt=NEG, width=1024, height=1024,
                       num_inference_steps=32, guidance_scale=6.5,
                       generator=torch.Generator("cuda").manual_seed(seed)).images[0]
            img.save(f"{OUT}/{look}_{name}_{seed}.png")
            print(look, name, seed, round(time.time() - t, 1), flush=True)
