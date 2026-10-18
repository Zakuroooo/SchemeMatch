import { describe, expect, it } from "vitest";
import { FIELDS, RULE_FORMAT_VERSION, type RuleNode } from "../src/index.ts";

describe("rule format v1", () => {
  it("is version 1", () => {
    expect(RULE_FORMAT_VERSION).toBe(1);
  });

  it("lists exactly the 16 profile fields from DATA.md §3", () => {
    expect(FIELDS).toHaveLength(16);
    expect(new Set(FIELDS).size).toBe(16);
  });

  it("accepts the DATA.md example tree", () => {
    const example = {
      all: [
        { field: "state", op: "eq", value: "MH", source_quote: "resident of Maharashtra" },
        { field: "age", op: "gte", value: 18, source_quote: "aged 18 years and above" },
        {
          field: "annual_family_income",
          op: "lte",
          value: 21000,
          source_quote: "annual family income not exceeding Rs. 21,000",
        },
        {
          any: [
            {
              field: "marital_status",
              op: "in",
              value: ["widow", "divorced", "abandoned"],
              source_quote: "widows, divorced or deserted women",
            },
            {
              field: "disability_percent",
              op: "gte",
              value: 40,
              source_quote: "persons with 40% or more disability",
            },
          ],
        },
      ],
    } satisfies RuleNode;
    expect("all" in example).toBe(true);
  });

  it("rejects malformed conditions at compile time", () => {
    const bad: RuleNode[] = [
      // @ts-expect-error between needs a [min, max] pair, not one number
      { field: "age", op: "between", value: 18, source_quote: "x" },
      // @ts-expect-error gte compares numbers only
      { field: "age", op: "gte", value: "18", source_quote: "x" },
      // @ts-expect-error unknown field
      { field: "name", op: "eq", value: "Sunita", source_quote: "x" },
    ];
    expect(bad).toHaveLength(3);
  });
});
