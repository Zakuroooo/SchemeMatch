import { describe, expect, it } from "vitest";
import { evaluateScheme, type Scheme } from "../src/index.ts";

const pension: Scheme = {
  slug: "test-pension",
  level: "state",
  state: "MH",
  eligibility: {
    all: [
      { field: "age", op: "gte", value: 60, source_quote: "aged 60 and above" },
      {
        any: [
          { field: "has_bpl_card", op: "eq", value: true, source_quote: "on the BPL list" },
          { field: "annual_family_income", op: "lte", value: 21000, source_quote: "up to 21,000" },
        ],
      },
    ],
  },
  unmodelled: [{ text: "Not receiving another pension", source_quote: "no other pension" }],
};

describe("evaluateScheme", () => {
  it("passes with the quotes of what passed as reasons", () => {
    const r = evaluateScheme(pension, { state: "MH", age: 65, has_bpl_card: true });
    expect(r.result).toBe("PASS");
    expect(r.reasons).toContain("aged 60 and above");
    expect(r.reasons).toContain("on the BPL list");
    expect(r.failed).toBeNull();
    expect(r.also_confirm).toEqual(["Not receiving another pension"]);
  });

  it("names the closest miss when it fails", () => {
    const r = evaluateScheme(pension, { state: "MH", age: 50, has_bpl_card: true });
    expect(r.result).toBe("FAIL");
    expect(r.failed?.source_quote).toBe("aged 60 and above");
  });

  it("points into an any-group when every option fails", () => {
    const r = evaluateScheme(pension, {
      state: "MH",
      age: 65,
      has_bpl_card: false,
      annual_family_income: 50000,
    });
    expect(r.failed?.source_quote).toBe("on the BPL list");
  });

  it("lists only the fields that could still change the answer", () => {
    const r = evaluateScheme(pension, { state: "MH", age: 65 });
    expect(r.result).toBe("UNKNOWN");
    expect(r.missing.sort()).toEqual(["annual_family_income", "has_bpl_card"]);
  });

  it("fails a state scheme for a resident of another state", () => {
    const r = evaluateScheme(pension, { state: "WB", age: 65, has_bpl_card: true });
    expect(r.result).toBe("FAIL");
    expect(r.failed?.field).toBe("state");
  });

  it("asks for the state when it is unknown", () => {
    const r = evaluateScheme(pension, { age: 65, has_bpl_card: true });
    expect(r.result).toBe("UNKNOWN");
    expect(r.missing).toEqual(["state"]);
  });

  it("does not gate central schemes by state", () => {
    const central: Scheme = { ...pension, level: "central", state: null };
    expect(evaluateScheme(central, { age: 65, has_bpl_card: true }).result).toBe("PASS");
  });

  it("refuses an unknown rule format version (fails closed)", () => {
    expect(() => evaluateScheme({ ...pension, rule_format_version: 2 }, {})).toThrow(/v2/);
  });

  it("works when a scheme has no unmodelled criteria", () => {
    const plain: Scheme = {
      slug: pension.slug,
      level: "state",
      state: "MH",
      eligibility: pension.eligibility,
    };
    expect(
      evaluateScheme(plain, { state: "MH", age: 65, has_bpl_card: true }).also_confirm,
    ).toEqual([]);
  });
});

describe("reasons, alternatives and other states", () => {
  // Shaped like Sanjay Gandhi Niradhar: one of several categories, plus an income rule.
  const categories: Scheme = {
    slug: "test-categories",
    level: "state",
    state: "MH",
    eligibility: {
      all: [
        {
          field: "annual_family_income",
          op: "lte",
          value: 21000,
          source_quote: "income up to 21,000",
        },
        {
          any: [
            { field: "marital_status", op: "eq", value: "widow", source_quote: "Destitute widows" },
            {
              all: [
                { field: "gender", op: "eq", value: "female", source_quote: "divorced women" },
                {
                  field: "marital_status",
                  op: "eq",
                  value: "divorced",
                  source_quote: "divorced women",
                },
              ],
            },
            {
              all: [
                {
                  field: "gender",
                  op: "eq",
                  value: "female",
                  source_quote: "Unmarried women over 35",
                },
                {
                  field: "marital_status",
                  op: "eq",
                  value: "single",
                  source_quote: "Unmarried women over 35",
                },
              ],
            },
          ],
        },
      ],
    },
    unmodelled: [
      { text: "Must be destitute", source_quote: "destitute" },
      { text: "Orphaned children", source_quote: "Orphaned children", kind: "alternative" },
    ],
  };
  const widow = {
    state: "MH",
    gender: "female",
    marital_status: "widow",
    annual_family_income: 12000,
  } as const;

  it("gives a widow only the reasons that apply to her, not the failed branches", () => {
    const r = evaluateScheme(categories, widow);
    expect(r.result).toBe("PASS");
    expect(r.reasons).toEqual(["income up to 21,000", "Destitute widows"]);
  });

  it("lists a quote once even when two conditions share it", () => {
    const r = evaluateScheme(categories, { ...widow, marital_status: "divorced" });
    expect(r.reasons).toEqual(["income up to 21,000", "divorced women"]);
  });

  it("gives no reasons unless the scheme passes", () => {
    expect(evaluateScheme(categories, { ...widow, annual_family_income: 50000 }).reasons).toEqual(
      [],
    );
    expect(evaluateScheme(categories, { state: "MH", marital_status: "widow" }).reasons).toEqual(
      [],
    );
  });

  it("never gives the state gate as a reason", () => {
    expect(
      evaluateScheme(categories, widow).reasons.some((q) => q.startsWith("Scheme of the state")),
    ).toBe(false);
  });

  it("splits unmodelled items into requirements and other ways to qualify", () => {
    const r = evaluateScheme(categories, widow);
    expect(r.also_confirm).toEqual(["Must be destitute"]);
    expect(r.other_ways).toEqual(["Orphaned children"]);
  });

  it("flags another state's scheme only when the person's state is known and different", () => {
    expect(evaluateScheme(categories, { ...widow, state: "WB" }).other_state).toBe(true);
    expect(evaluateScheme(categories, widow).other_state).toBe(false);
    const noState = {
      gender: "female",
      marital_status: "widow",
      annual_family_income: 12000,
    } as const;
    expect(evaluateScheme(categories, noState).other_state).toBe(false);
    expect(
      evaluateScheme({ ...categories, level: "central", state: null }, { ...widow, state: "WB" })
        .other_state,
    ).toBe(false);
  });
});
