// The gate for the engine: every hand-written case (written from the sources,
// before the engine existed) must pass. Never edit an expectation to make this green
// unless the source proves it wrong — and cite the source line in the commit.
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  evaluateAll,
  evaluateScheme,
  nextQuestion,
  type Profile,
  type Scheme,
  type Tri,
} from "../src/index.ts";

const PROFILES = join(import.meta.dirname, "profiles");
const GOLDEN = join(import.meta.dirname, "../../../pipeline/golden/schemes");
const read = <T>(path: string) => JSON.parse(readFileSync(path, "utf8")) as T;

const schemes = readdirSync(GOLDEN).map((f) => read<Scheme>(join(GOLDEN, f)));
const bySlug = new Map(schemes.map((s) => [s.slug, s]));

interface Case {
  id: string;
  why: string;
  profile: Profile;
  expected: Tri;
  ask_next?: string;
}
const suites = readdirSync(PROFILES)
  .filter((f) => f !== "personas.json")
  .map((f) => read<{ scheme: string; cases: Case[] }>(join(PROFILES, f)));
const personas = read<{
  cases: { id: string; why: string; profile: Profile; eligible: string[] }[];
}>(join(PROFILES, "personas.json")).cases;

describe.each(suites.map((s) => [s.scheme, s] as const))("engine on %s", (slug, suite) => {
  const scheme = bySlug.get(slug)!;
  it.each(suite.cases.map((c) => [c.id, c] as const))("%s", (_id, c) => {
    // Per-scheme cases test the scheme's own rules; residency is tested by the personas.
    const profile = scheme.state ? { state: scheme.state, ...c.profile } : c.profile;
    const r = evaluateScheme(scheme, profile);
    expect(r.result, c.why).toBe(c.expected);
    if (c.ask_next) expect(nextQuestion([r])).toBe(c.ask_next);
  });
});

describe("engine on personas (all schemes at once)", () => {
  it.each(personas.map((p) => [p.id, p] as const))("%s", (_id, p) => {
    const s = evaluateAll(schemes, p.profile);
    expect(s.eligible.sort(), p.why).toEqual([...p.eligible].sort());
    expect(s.need_info, "a fully answered persona should leave nothing undecided").toEqual([]);
  });
});
