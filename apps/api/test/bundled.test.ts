import { describe, expect, it } from "vitest";
import { BundledSchemeRepository, FileSchemeRepository, GOLDEN_DIR } from "../src/repository.ts";

describe("bundled schemes", () => {
  it("are an up-to-date copy of the golden files (run `pnpm --filter @schemematch/api build` if not)", async () => {
    const bundled = await new BundledSchemeRepository().listLive();
    const golden = await new FileSchemeRepository(GOLDEN_DIR).listLive();
    const pick = (s: (typeof golden)[number]) => ({
      slug: s.slug,
      level: s.level,
      state: s.state,
      category: s.category,
      official_url: s.official_url,
      eligibility: s.eligibility,
      unmodelled: s.unmodelled,
      text: s.text,
    });
    expect(bundled).toEqual(golden.map(pick));
  });
});
