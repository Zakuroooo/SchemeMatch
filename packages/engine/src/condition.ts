import type { Condition, Profile, Tri } from "./types.ts";

const tri = (ok: boolean): Tri => (ok ? "PASS" : "FAIL");

/**
 * Fields a person answers in their own words. "gadchiroli " and "Gadchiroli" are the same
 * district, so these compare without case or extra spaces. Enum fields stay exact.
 */
const FREE_TEXT = new Set(["district", "occupation"]);
const fold = (v: unknown): string => String(v).trim().replace(/\s+/g, " ").toLowerCase();

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
  const raw: unknown = profile[c.field];
  if (raw === undefined || raw === null) return "UNKNOWN";
  const norm = FREE_TEXT.has(c.field) ? fold : (v: unknown) => v;
  const answer = norm(raw);

  switch (c.op) {
    case "eq":
      return tri(answer === norm(c.value));
    case "neq":
      return tri(answer !== norm(c.value));
    case "in":
      return tri((c.value as readonly unknown[]).map(norm).includes(answer));
    case "not_in":
      return tri(!(c.value as readonly unknown[]).map(norm).includes(answer));
    case "lt":
      return tri(asNumber(raw, c) < c.value);
    case "lte":
      return tri(asNumber(raw, c) <= c.value);
    case "gt":
      return tri(asNumber(raw, c) > c.value);
    case "gte":
      return tri(asNumber(raw, c) >= c.value);
    case "between": {
      const n = asNumber(raw, c);
      return tri(n >= c.value[0] && n <= c.value[1]);
    }
    default: {
      const unreachable: never = c;
      throw new Error(`unknown operator in ${JSON.stringify(unreachable)}`);
    }
  }
}
