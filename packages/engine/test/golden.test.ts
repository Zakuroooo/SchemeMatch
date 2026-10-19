import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import schema from "../rule.schema.json" with { type: "json" };
import type { RuleNode } from "../src/index.ts";

// The golden set lives in pipeline/ (shared with the Python pipeline).
const PIPELINE = join(import.meta.dirname, "../../../pipeline");
const SCHEMES = join(PIPELINE, "golden/schemes");
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
}

const normalise = (t: string) => t.replace(/\s+/g, " ").trim();

function quotesIn(node: RuleNode): string[] {
  if ("field" in node) return [node.source_quote];
  const children = "all" in node ? node.all : node.any;
  return children.flatMap(quotesIn);
}

const files = readdirSync(SCHEMES).filter((f) => f.endsWith(".json"));
const schemes = files.map(
  (f) => JSON.parse(readFileSync(join(SCHEMES, f), "utf8")) as GoldenScheme,
);

describe("golden set", () => {
  it("has the 10 schemes of step 2", () => {
    expect(schemes).toHaveLength(10);
  });

  describe.each(schemes.map((s) => [s.slug, s] as const))("%s", (slug, s) => {
    it("file name matches slug", () => {
      expect(files).toContain(`${slug}.json`);
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
  });
});
