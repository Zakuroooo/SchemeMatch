// Integration test: needs a running local Supabase (supabase start) and
// SUPABASE_URL + SUPABASE_ANON_KEY in the environment. Skipped otherwise.
import { beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.ts";
import { FileSchemeRepository, GOLDEN_DIR } from "../src/repository.ts";
import { SupabaseSchemeRepository } from "../src/supabase-repository.ts";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;

describe.runIf(url && anonKey)("Supabase repository (integration)", () => {
  // Built in beforeAll: the describe body still runs when the suite is skipped,
  // and creating a client without a URL would crash the whole file.
  let db: SupabaseSchemeRepository;
  let files: FileSchemeRepository;
  beforeAll(() => {
    db = new SupabaseSchemeRepository({ url: url!, anonKey: anonKey! });
    files = new FileSchemeRepository(GOLDEN_DIR);
  });

  it("serves exactly the rules and texts in the golden files", async () => {
    const fromDb = await db.listLive();
    const fromFiles = await files.listLive();
    expect(fromDb.map((s) => s.slug)).toEqual(fromFiles.map((s) => s.slug));
    for (const f of fromFiles) {
      const d = fromDb.find((s) => s.slug === f.slug)!;
      expect(d.eligibility, f.slug).toEqual(f.eligibility);
      expect(d.unmodelled, f.slug).toEqual(f.unmodelled);
      expect(d.text.en, f.slug).toEqual(f.text.en);
      expect([d.level, d.state, d.official_url], f.slug).toEqual([
        f.level,
        f.state,
        f.official_url,
      ]);
    }
  });

  it("gives Sunita the same five schemes through the database", async () => {
    const app = await buildApp({ repo: db });
    const res = await app.inject({
      method: "POST",
      url: "/eligibility",
      payload: {
        profile: {
          state: "MH",
          gender: "female",
          age: 38,
          marital_status: "widow",
          annual_family_income: 60000,
          has_bpl_card: true,
          is_pregnant_or_lactating: false,
          disability_percent: 0,
          land_acres: 0,
          caste_category: "OBC",
        },
      },
    });
    await app.close();
    expect(
      res
        .json()
        .eligible.map((e: { slug: string }) => e.slug)
        .sort(),
    ).toEqual(["apy", "mh-ladki-bahin", "mh-sanjay-gandhi-niradhar", "pmjjby", "pmsby"]);
  });
});

describe("Supabase repository cache", () => {
  it("reuses results inside the cache window and refetches after it", async () => {
    let t = 0;
    let calls = 0;
    const repo = new SupabaseSchemeRepository({
      url: "http://127.0.0.1:9",
      anonKey: "x",
      cacheMs: 1000,
      now: () => t,
    });
    // Replace the network call with a counter: we are testing the cache, not Supabase.
    (repo as unknown as { db: unknown }).db = {
      from: () => ({
        select: () => ({
          order: async () => {
            calls++;
            return { data: [], error: null };
          },
        }),
      }),
    };
    await repo.listLive();
    t = 500;
    await repo.listLive();
    expect(calls).toBe(1);
    t = 1500;
    await repo.listLive();
    expect(calls).toBe(2);
  });

  it("raises a clear error when the query fails", async () => {
    const repo = new SupabaseSchemeRepository({ url: "http://127.0.0.1:9", anonKey: "x" });
    (repo as unknown as { db: unknown }).db = {
      from: () => ({
        select: () => ({ order: async () => ({ data: null, error: { message: "boom" } }) }),
      }),
    };
    await expect(repo.listLive()).rejects.toThrow(/could not load schemes: boom/);
  });
});
