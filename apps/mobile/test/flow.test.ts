import type { Field, Profile } from "@schemematch/engine";
import { START, answer, back, currentQuestion, skip, summarize, type Flow } from "@/lib/flow";
import { SCHEMES } from "@/lib/schemes";

// The Sunita persona from the API tests (apps/api/test/app.test.ts): she gets 11 schemes.
const SUNITA: Profile = {
  state: "MH",
  gender: "female",
  age: 38,
  marital_status: "widow",
  annual_family_income: 60000,
  has_bpl_card: true,
  children_count: 2,
  is_pregnant_or_lactating: false,
  disability_percent: 0,
  land_acres: 0,
  caste_category: "OBC",
};
const SUNITA_SCHEMES = [
  "apy",
  "e-shram",
  "mh-ladki-bahin",
  "mh-sanjay-gandhi-niradhar",
  "nfbs",
  "pm-sym",
  "pm-vishwakarma",
  "pmjdy",
  "pmjjby",
  "pmsby",
  "pmuy",
];

/** Answers every question the app asks from `person`; "don't know" for anything else. */
function walk(person: Profile): { flow: Flow; asked: Field[] } {
  let flow = START;
  const asked: Field[] = [];
  for (let q = currentQuestion(SCHEMES, flow); q !== null; q = currentQuestion(SCHEMES, flow)) {
    expect(asked).not.toContain(q); // never the same question twice
    asked.push(q);
    flow = person[q] === undefined ? skip(flow, q) : answer(flow, q, person[q]);
  }
  return { flow, asked };
}

describe("question flow", () => {
  it("asks the state first", () => {
    expect(currentQuestion(SCHEMES, START)).toBe("state");
  });

  it("walks Sunita to her 11 schemes, asking only what matters", () => {
    const { flow, asked } = walk(SUNITA);
    const s = summarize(SCHEMES, flow.answers);
    expect(s.eligible.map((m) => m.scheme.slug).sort()).toEqual(SUNITA_SCHEMES);
    // Fewer questions than fields: the engine skips what can't change a result.
    expect(asked.length).toBeLessThan(16);
  });

  it("'don't know' stays unanswered: no scheme fails because of it", () => {
    let flow = answer(START, "state", "MH");
    flow = skip(flow, "age");
    expect(flow.answers).toEqual({ state: "MH" });
    expect(currentQuestion(SCHEMES, flow)).not.toBe("age");
    const s = summarize(SCHEMES, flow.answers);
    for (const m of s.notEligible) expect(m.result.failed?.field).not.toBe("age");
  });

  it("ends when every question is answered or skipped", () => {
    const { flow } = walk({});
    expect(currentQuestion(SCHEMES, flow)).toBeNull();
    expect(summarize(SCHEMES, flow.answers).eligible).toEqual([]);
  });

  it("Back undoes the last answer or skip, and nothing at the start", () => {
    const a = answer(START, "state", "WB");
    const b = skip(a, "age");
    expect(back(b)).toEqual(a);
    expect(back(a)).toEqual(START);
    expect(back(START)).toBe(START);
  });

  it("changing a skipped answer later removes it from the skipped list", () => {
    const f = answer(skip(START, "age"), "age", 40);
    expect(f.skipped).toEqual([]);
    expect(f.answers.age).toBe(40);
  });

  it("counts another state's schemes instead of listing them as 'not eligible'", () => {
    const s = summarize(SCHEMES, SUNITA);
    expect(s.otherStates).toBe(9);
    expect(s.notEligible.every((m) => m.scheme.state !== "WB")).toBe(true);
  });
});
