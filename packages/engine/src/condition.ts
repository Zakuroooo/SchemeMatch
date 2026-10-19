import type { Condition, Profile, Tri } from "./types.ts";

const tri = (ok: boolean): Tri => (ok ? "PASS" : "FAIL");

function asNumber(value: unknown, c: Condition): number {
  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new TypeError(`${c.field} must be a number for "${c.op}", got ${JSON.stringify(value)}`);
  }
  return value;
}

/**
 * Test one condition against a profile.
 * An unanswered field is UNKNOWN, never FAIL: "we don't know yet" is not "no".
 * A wrongly typed answer throws, because silently guessing would give a wrong result.
 */
export function evaluateCondition(c: Condition, profile: Profile): Tri {
  const answer: unknown = profile[c.field];
  if (answer === undefined || answer === null) return "UNKNOWN";

  switch (c.op) {
    case "eq":
      return tri(answer === c.value);
    case "neq":
      return tri(answer !== c.value);
    case "in":
      return tri((c.value as readonly unknown[]).includes(answer));
    case "not_in":
      return tri(!(c.value as readonly unknown[]).includes(answer));
    case "lt":
      return tri(asNumber(answer, c) < c.value);
    case "lte":
      return tri(asNumber(answer, c) <= c.value);
    case "gt":
      return tri(asNumber(answer, c) > c.value);
    case "gte":
      return tri(asNumber(answer, c) >= c.value);
    case "between": {
      const n = asNumber(answer, c);
      return tri(n >= c.value[0] && n <= c.value[1]);
    }
    default: {
      const unreachable: never = c;
      throw new Error(`unknown operator in ${JSON.stringify(unreachable)}`);
    }
  }
}
