"""SchemeMatch Round 1b style test: SDXL base 1.0 on a Kaggle T4.
4 Indian art techniques x 3 compositions x 2 seeds. Prompts are logged in docs/design-refs/PROMPTS.md."""
import os, time, torch
from diffusers import StableDiffusionXLPipeline, AutoencoderKL, DPMSolverMultistepScheduler

OUT = "/kaggle/working/out"; os.makedirs(OUT, exist_ok=True)
vae = AutoencoderKL.from_pretrained("madebyollin/sdxl-vae-fp16-fix", torch_dtype=torch.float16)
pipe = StableDiffusionXLPipeline.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0", vae=vae, torch_dtype=torch.float16, variant="fp16", use_safetensors=True
).to("cuda")
pipe.scheduler = DPMSolverMultistepScheduler.from_config(pipe.scheduler.config, use_karras_sigmas=True)

STYLES = {
    "kalighat": "Kalighat painting inspired illustration, bold sweeping black outlines, flat watercolour washes, plain off-white paper background, Bengal folk art",
    "woodblock": "hand-carved linocut woodblock print, two colours deep ink blue and marigold on off-white handmade paper, bold carved lines, visible ink texture",
    "collage": "torn paper collage, layered handmade paper pieces with rough torn edges, photographed paper texture, soft shadows between layers, ink blue and marigold paper",
    "riso": "two-colour risograph print, deep ink blue and marigold, heavy grain, halftone dots, slight misregistration, off-white paper",
}
SCENES = {
    "doorway": "a confident Indian woman around 38 wearing a printed cotton nauvari sari, standing at the doorway of her small house in a Maharashtra town, holding a folder of papers, morning light, full body, wide shot",
    "hands": "close-up of an Indian woman's hands holding a basic smartphone and a bundle of official papers with round stamps, sitting on a stone doorstep, printed cotton sari fabric visible",
    "worker": "a young female field worker holding a tablet, sitting with an Indian family on a charpai outside a village home, warm evening light, medium shot",
}
TAIL = ", dignified, hopeful, high quality illustration"
NEG = ("anime, manga, cartoon, chibi, 3d render, photo, photorealistic, plastic, glossy, vector art, flat corporate illustration, "
       "text, letters, words, writing, logo, watermark, signature, deformed hands, extra fingers, distorted face, blurry, lowres")

for s_name, style in STYLES.items():
    for c_name, scene in SCENES.items():
        for seed in (7, 42):
            t = time.time()
            img = pipe(prompt=f"{style}, {scene}{TAIL}", negative_prompt=NEG, width=1344, height=768,
                       num_inference_steps=40, guidance_scale=6.5,
                       generator=torch.Generator("cuda").manual_seed(seed)).images[0]
            img.save(f"{OUT}/{s_name}_{c_name}_{seed}.png")
            print(s_name, c_name, seed, round(time.time() - t, 1), flush=True)
