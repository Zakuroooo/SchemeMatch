import { describe, expect, it } from "vitest";
import { evaluateCondition, type Condition } from "../src/index.ts";

const q = "quote";
const cond = (c: Omit<Condition, "source_quote">) => ({ ...c, source_quote: q }) as Condition;

describe("evaluateCondition", () => {
  it("is UNKNOWN when the field is unanswered", () => {
    expect(evaluateCondition(cond({ field: "age", op: "gte", value: 18 }), {})).toBe("UNKNOWN");
  });

  it.each([
    ["eq", "widow", "widow", "PASS"],
    ["eq", "widow", "married", "FAIL"],
    ["neq", "widow", "married", "PASS"],
    ["neq", "widow", "widow", "FAIL"],
  ] as const)("%s %s vs %s → %s", (op, value, answer, expected) => {
    const c = cond({ field: "marital_status", op, value });
    expect(evaluateCondition(c, { marital_status: answer })).toBe(expected);
  });

  it("eq works for booleans", () => {
    const c = cond({ field: "has_bpl_card", op: "eq", value: true });
    expect(evaluateCondition(c, { has_bpl_card: true })).toBe("PASS");
    expect(evaluateCondition(c, { has_bpl_card: false })).toBe("FAIL");
  });

  it("in / not_in check list membership", () => {
    const inList = cond({ field: "caste_category", op: "in", value: ["SC", "ST"] });
    const notIn = cond({ field: "caste_category", op: "not_in", value: ["SC", "ST"] });
    expect(evaluateCondition(inList, { caste_category: "ST" })).toBe("PASS");
    expect(evaluateCondition(inList, { caste_category: "OBC" })).toBe("FAIL");
    expect(evaluateCondition(notIn, { caste_category: "OBC" })).toBe("PASS");
    expect(evaluateCondition(notIn, { caste_category: "SC" })).toBe("FAIL");
  });

  // Both sides of every boundary: this is where real eligibility bugs live.
  it.each([
    ["lt", 40, 39, "PASS"],
    ["lt", 40, 40, "FAIL"],
    ["lte", 21000, 21000, "PASS"],
    ["lte", 21000, 21001, "FAIL"],
    ["gt", 35, 36, "PASS"],
    ["gt", 35, 35, "FAIL"],
    ["gte", 60, 60, "PASS"],
    ["gte", 60, 59, "FAIL"],
  ] as const)("%s %d with answer %d → %s", (op, value, answer, expected) => {
    const c = cond({ field: "age", op, value });
    expect(evaluateCondition(c, { age: answer })).toBe(expected);
  });

  it.each([
    [17, "FAIL"],
    [18, "PASS"],
    [79, "PASS"],
    [80, "FAIL"],
  ] as const)("between [18, 79] includes both ends: %d → %s", (age, expected) => {
    const c = cond({ field: "age", op: "between", value: [18, 79] });
    expect(evaluateCondition(c, { age })).toBe(expected);
  });

  it("throws on a wrongly typed answer instead of guessing", () => {
    const c = cond({ field: "age", op: "gte", value: 18 });
    expect(() => evaluateCondition(c, { age: "18" as unknown as number })).toThrow(TypeError);
    expect(() => evaluateCondition(c, { age: Number.NaN })).toThrow(TypeError);
  });

  it("free-text fields (district, occupation) ignore case and extra spaces", () => {
    const inList = cond({ field: "district", op: "in", value: ["Gadchiroli", "Washim"] });
    expect(evaluateCondition(inList, { district: "  gadchiroli " })).toBe("PASS");
    expect(evaluateCondition(inList, { district: "WASHIM" })).toBe("PASS");
    expect(evaluateCondition(inList, { district: "Nashik" })).toBe("FAIL");
    const notIn = cond({ field: "district", op: "not_in", value: ["Gadchiroli"] });
    expect(evaluateCondition(notIn, { district: "GADCHIROLI" })).toBe("FAIL");
    const eq = cond({ field: "occupation", op: "eq", value: "Street  Vendor" });
    expect(evaluateCondition(eq, { occupation: "street vendor" })).toBe("PASS");
    const neq = cond({ field: "occupation", op: "neq", value: "farmer" });
    expect(evaluateCondition(neq, { occupation: "Farmer" })).toBe("FAIL");
  });

  it("enum fields stay exact", () => {
    const c = cond({ field: "caste_category", op: "eq", value: "SC" });
    expect(evaluateCondition(c, { caste_category: "sc" as never })).toBe("FAIL");
  });

  it("throws on an unknown operator", () => {
    const c = { field: "age", op: "approx", value: 18, source_quote: q } as unknown as Condition;
    expect(() => evaluateCondition(c, { age: 18 })).toThrow(/unknown operator/);
  });
});
