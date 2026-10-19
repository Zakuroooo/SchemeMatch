import { evaluateCondition } from "./condition.ts";
import type { Profile, RuleNode, Tri } from "./types.ts";

/** AND with three values: one FAIL decides; otherwise any UNKNOWN keeps it open. */
export function allOf(results: readonly Tri[]): Tri {
  if (results.includes("FAIL")) return "FAIL";
  if (results.includes("UNKNOWN")) return "UNKNOWN";
  return "PASS";
}

/** OR with three values: one PASS decides; otherwise any UNKNOWN keeps it open. */
export function anyOf(results: readonly Tri[]): Tri {
  if (results.includes("PASS")) return "PASS";
  if (results.includes("UNKNOWN")) return "UNKNOWN";
  return "FAIL";
}

export function evaluateNode(node: RuleNode, profile: Profile): Tri {
  if ("field" in node) return evaluateCondition(node, profile);
  if ("all" in node) return allOf(node.all.map((n) => evaluateNode(n, profile)));
  return anyOf(node.any.map((n) => evaluateNode(n, profile)));
}
