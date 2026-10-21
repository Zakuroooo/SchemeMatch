import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import schema from "../rule.schema.json" with { type: "json" };
import type { RuleNode } from "../src/index.ts";

// The golden set lives in pipeline/ (shared with the Python pipeline).
const PIPELINE = join(import.meta.dirname, "../../../pipeline");
// The 30 golden schemes, and the held-out 10 that are only ever used for the final eval.
const SETS = {
  drafting: join(PIPELINE, "golden/schemes"),
  heldout: join(PIPELINE, "golden/heldout"),
};
const validateRule = new Ajv2020({ allErrors: true }).compile(schema);

interface GoldenScheme {
  slug: string;
  level: "central" | "state";
  state: string | null;
  source_file: string;
  official_url: string;
  eligibility: RuleNode;
  unmodelled: { text: string; source_quote: string }[];
  ambiguous: string[];
  reviewed_by: string | null;
  /** For list-style sources: every bullet between start and end must be covered by a quote. */
  coverage?: { start: string; end: string; bullet: string };
}

const normalise = (t: string) => t.replace(/\s+/g, " ").trim();

function quotesIn(node: RuleNode): string[] {
  if ("field" in node) return [node.source_quote];
  const children = "all" in node ? node.all : node.any;
  return children.flatMap(quotesIn);
}

const entries = Object.entries(SETS).flatMap(([status, dir]) =>
  readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => ({
      status,
      file: f,
      s: JSON.parse(readFileSync(join(dir, f), "utf8")) as GoldenScheme,
    })),
);
const schemes = entries.map((e) => e.s);

describe("golden set", () => {
  it.each(Object.keys(SETS))("matches the catalog rows marked %s", (status) => {
    const catalog = readFileSync(join(PIPELINE, "catalog.csv"), "utf8")
      .trim()
      .split(/\r?\n/)
      .slice(1);
    const rows = catalog
      .filter((row) => row.endsWith(`,${status}`))
      .map((row) => row.split(",")[0]);
    const inSet = entries.filter((e) => e.status === status).map((e) => e.s.slug);
    expect(inSet.sort()).toEqual(rows.sort());
  });

  it("no scheme is in both sets", () => {
    expect(new Set(schemes.map((s) => s.slug)).size).toBe(schemes.length);
  });

  describe.each(entries.map((e) => [`${e.status}/${e.s.slug}`, e] as const))("%s", (_name, e) => {
    const s = e.s;
    it("file name matches slug", () => {
      expect(e.file).toBe(`${s.slug}.json`);
    });

    it("eligibility follows rule format v1", () => {
      expect(validateRule(s.eligibility), JSON.stringify(validateRule.errors)).toBe(true);
    });

    it("state schemes name their state; central ones do not", () => {
      expect(s.level === "state" ? s.state : null).toBe(s.state);
      if (s.level === "state") expect(s.state).toMatch(/^[A-Z]{2}$/);
    });

    it("cites an https official source", () => {
      expect(s.official_url).toMatch(/^https:\/\//);
    });

    it("every quote appears word for word in the saved source", () => {
      const source = normalise(readFileSync(join(PIPELINE, s.source_file), "utf8"));
      const quotes = [...quotesIn(s.eligibility), ...s.unmodelled.map((u) => u.source_quote)];
      const missing = quotes.filter((q) => !source.includes(normalise(q)));
      expect(missing).toEqual([]);
    });

    it.runIf(s.coverage)("covers every bullet of the eligibility list (nothing left out)", () => {
      const { start, end, bullet } = s.coverage!;
      const raw = readFileSync(join(PIPELINE, s.source_file), "utf8");
      const from = raw.indexOf(start);
      const to = raw.indexOf(end, from);
      expect(from, `start marker not found: ${start}`).toBeGreaterThanOrEqual(0);
      expect(to, `end marker not found after start: ${end}`).toBeGreaterThan(from);
      const section = raw.slice(from + start.length, to);
      const bullets = section
        .split("\n")
        .map((l) => normalise(l))
        // bullet "" = every line of the section counts; lines ending in ":" are headings
        .filter((l) => (bullet === "" ? l.length > 0 && !l.endsWith(":") : l.startsWith(bullet)))
        .map((l) => normalise(l.slice(bullet.length).replace(/^[ivx]+\)\s*/, "")));
      const quotes = [...quotesIn(s.eligibility), ...s.unmodelled.map((u) => u.source_quote)].map(
        normalise,
      );
      const uncovered = bullets.filter((b) => !quotes.some((q) => b.includes(q) || q.includes(b)));
      expect(uncovered).toEqual([]);
    });
  });
});
