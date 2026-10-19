// Shape and coverage checks for the hand-written profiles (TESTING.md §2).
// The runner that sends these through the engine arrives with the engine itself.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FIELDS, type Profile, type Tri } from "../src/index.ts";

const DIR = join(import.meta.dirname, "profiles");
const GOLDEN = join(import.meta.dirname, "../../../pipeline/golden/schemes");
const goldenSlugs = readdirSync(GOLDEN).map((f) => f.replace(/\.json$/, ""));
const fieldSet = new Set<string>(FIELDS);

interface SchemeCase {
  id: string;
  why: string;
  profile: Profile;
  expected: Tri;
  ask_next?: string;
}
interface PersonaCase {
  id: string;
  why: string;
  profile: Profile;
  eligible: string[];
}

const schemeFiles = readdirSync(DIR).filter((f) => f.endsWith(".json") && f !== "personas.json");
const suites = schemeFiles.map(
  (f) => JSON.parse(readFileSync(join(DIR, f), "utf8")) as { scheme: string; cases: SchemeCase[] },
);
const personas = (
  JSON.parse(readFileSync(join(DIR, "personas.json"), "utf8")) as { cases: PersonaCase[] }
).cases;

describe("profiles", () => {
  it("cover every golden scheme", () => {
    expect(suites.map((s) => s.scheme).sort()).toEqual([...goldenSlugs].sort());
  });

  describe.each(suites.map((s) => [s.scheme, s] as const))("%s", (_slug, suite) => {
    it("has an eligible, a not-eligible and a need-more-info case", () => {
      const results = new Set(suite.cases.map((c) => c.expected));
      expect([...results].sort()).toEqual(["FAIL", "PASS", "UNKNOWN"]);
    });

    it("uses unique ids and only real profile fields", () => {
      expect(new Set(suite.cases.map((c) => c.id)).size).toBe(suite.cases.length);
      for (const c of suite.cases) {
        for (const key of Object.keys(c.profile)) expect(fieldSet).toContain(key);
      }
    });

    it("asks only for a field that is still missing", () => {
      for (const c of suite.cases.filter((x) => x.ask_next)) {
        expect(c.expected).toBe("UNKNOWN");
        expect(fieldSet).toContain(c.ask_next);
        expect(Object.keys(c.profile)).not.toContain(c.ask_next);
      }
    });
  });

  it("personas name only golden schemes and use real fields", () => {
    for (const p of personas) {
      for (const slug of p.eligible) expect(goldenSlugs).toContain(slug);
      for (const key of Object.keys(p.profile)) expect(fieldSet).toContain(key);
    }
  });

  it("has at least 60 hand-written cases in total", () => {
    const total = suites.reduce((n, s) => n + s.cases.length, 0) + personas.length;
    expect(total).toBeGreaterThanOrEqual(60);
  });
});
