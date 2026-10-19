// Property tests: instead of a few hand-picked numbers, fast-check tries hundreds
// of random ones and shrinks any failure to the smallest example.
import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { evaluateCondition, type Condition } from "../src/index.ts";

const q = "quote";
const age = (op: "lt" | "lte" | "gt" | "gte", value: number) =>
  ({ field: "age", op, value, source_quote: q }) as Condition;
const int = fc.integer({ min: -1000, max: 1000 });

describe("operator properties", () => {
  it("lt and gte are exact opposites", () => {
    fc.assert(
      fc.property(int, int, (limit, answer) => {
        const lt = evaluateCondition(age("lt", limit), { age: answer });
        const gte = evaluateCondition(age("gte", limit), { age: answer });
        expect(lt).not.toBe(gte);
      }),
    );
  });

  it("lte and gt are exact opposites", () => {
    fc.assert(
      fc.property(int, int, (limit, answer) => {
        const lte = evaluateCondition(age("lte", limit), { age: answer });
        const gt = evaluateCondition(age("gt", limit), { age: answer });
        expect(lte).not.toBe(gt);
      }),
    );
  });

  it("between [a, b] is the same as gte a AND lte b", () => {
    fc.assert(
      fc.property(int, int, int, (x, y, answer) => {
        const [a, b] = x <= y ? [x, y] : [y, x];
        const between = evaluateCondition(
          { field: "age", op: "between", value: [a, b], source_quote: q },
          { age: answer },
        );
        const both =
          evaluateCondition(age("gte", a), { age: answer }) === "PASS" &&
          evaluateCondition(age("lte", b), { age: answer }) === "PASS";
        expect(between).toBe(both ? "PASS" : "FAIL");
      }),
    );
  });

  it("answering an unrelated field never changes the result", () => {
    fc.assert(
      fc.property(int, int, fc.integer({ min: 0, max: 10_000_000 }), (limit, answer, income) => {
        const c = age("gte", limit);
        expect(evaluateCondition(c, { age: answer, annual_family_income: income })).toBe(
          evaluateCondition(c, { age: answer }),
        );
      }),
    );
  });
});
