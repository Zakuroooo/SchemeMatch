import { evaluateScheme } from "./scheme.ts";
import { type Field, type Profile, type Scheme, type SchemeResult } from "./types.ts";

/**
 * Tie-break order when two questions would resolve the same number of schemes:
 * broad, easy questions first; narrow or sensitive ones later.
 */
export const QUESTION_PRIORITY: readonly Field[] = [
  "state",
  "age",
  "gender",
  "marital_status",
  "annual_family_income",
  "has_bpl_card",
  "caste_category",
  "is_student",
  "education_level",
  "occupation",
  "land_acres",
  "is_pregnant_or_lactating",
  "disability_percent",
  "children_count",
  "household_size",
  "district",
];

// Every field is in QUESTION_PRIORITY exactly once (enforced by a test).
const rank = (f: Field) => QUESTION_PRIORITY.indexOf(f);

/** The unanswered field that appears in the most still-undecided schemes. */
export function nextQuestion(results: readonly SchemeResult[]): Field | null {
  const counts = new Map<Field, number>();
  for (const r of results) {
    if (r.result !== "UNKNOWN") continue;
    for (const f of r.missing) counts.set(f, (counts.get(f) ?? 0) + 1);
  }
  let best: Field | null = null;
  for (const [field, n] of counts) {
    const bestN = best ? (counts.get(best) ?? 0) : -1;
    if (n > bestN || (n === bestN && best && rank(field) < rank(best))) best = field;
  }
  return best;
}

export interface Screening {
  results: SchemeResult[];
  eligible: string[];
  not_eligible: string[];
  need_info: string[];
  next_question: Field | null;
}

/** Evaluate every scheme for one profile and pick the next question to ask. */
export function evaluateAll(schemes: readonly Scheme[], profile: Profile): Screening {
  const results = schemes.map((s) => evaluateScheme(s, profile));
  const slugs = (t: SchemeResult["result"]) =>
    results.filter((r) => r.result === t).map((r) => r.slug);
  return {
    results,
    eligible: slugs("PASS"),
    not_eligible: slugs("FAIL"),
    need_info: slugs("UNKNOWN"),
    next_question: nextQuestion(results),
  };
}
