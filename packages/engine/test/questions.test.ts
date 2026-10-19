import { describe, expect, it } from "vitest";
import {
  FIELDS,
  QUESTION_PRIORITY,
  evaluateAll,
  nextQuestion,
  type Scheme,
  type SchemeResult,
} from "../src/index.ts";

const unknown = (slug: string, missing: SchemeResult["missing"]): SchemeResult => ({
  slug,
  result: "UNKNOWN",
  reasons: [],
  failed: null,
  missing,
  also_confirm: [],
});

describe("nextQuestion", () => {
  it("asks the field that unblocks the most schemes", () => {
    const q = nextQuestion([
      unknown("a", ["age"]),
      unknown("b", ["age", "gender"]),
      unknown("c", ["gender", "age"]),
    ]);
    expect(q).toBe("age");
  });

  it("breaks ties with the priority list", () => {
    expect(nextQuestion([unknown("a", ["has_bpl_card"]), unknown("b", ["gender"])])).toBe("gender");
  });

  it("ignores decided schemes and returns null when nothing is undecided", () => {
    const done: SchemeResult = { ...unknown("a", ["age"]), result: "PASS" };
    expect(nextQuestion([done])).toBeNull();
  });

  it("priority list names every profile field exactly once", () => {
    expect([...QUESTION_PRIORITY].sort()).toEqual([...FIELDS].sort());
  });
});

describe("evaluateAll", () => {
  const schemes: Scheme[] = [
    {
      slug: "young",
      level: "central",
      state: null,
      eligibility: { all: [{ field: "age", op: "lt", value: 40, source_quote: "q" }] },
    },
    {
      slug: "women",
      level: "central",
      state: null,
      eligibility: { all: [{ field: "gender", op: "eq", value: "female", source_quote: "q" }] },
    },
  ];

  it("sorts schemes into eligible, not eligible and need info", () => {
    const s = evaluateAll(schemes, { age: 30 });
    expect(s.eligible).toEqual(["young"]);
    expect(s.need_info).toEqual(["women"]);
    expect(s.not_eligible).toEqual([]);
    expect(s.next_question).toBe("gender");
  });
});
