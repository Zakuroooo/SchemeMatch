import { evaluateNode } from "./logic.ts";
import {
  RULE_FORMAT_VERSION,
  type Condition,
  type Field,
  type Group,
  type Profile,
  type RuleNode,
  type Scheme,
  type SchemeResult,
} from "./types.ts";

const children = (group: Group): readonly RuleNode[] => ("all" in group ? group.all : group.any);

/** The reason text the state gate adds; callers can tell it apart from the scheme's own rules. */
export const stateGateQuote = (state: string): string =>
  `Scheme of the state ${state}: for its residents`;

/** A state scheme behaves as if its rules were AND-ed with "lives in that state". */
function withStateGate(scheme: Scheme): RuleNode {
  if (scheme.level !== "state" || !scheme.state) return scheme.eligibility;
  const gate: Condition = {
    field: "state",
    op: "eq",
    value: scheme.state,
    source_quote: stateGateQuote(scheme.state),
  };
  return { all: [gate, scheme.eligibility] };
}

/**
 * Quotes of the conditions that make this node PASS. A part that doesn't pass gives none, so
 * an OR only contributes the branches that passed (a widow is not told "divorced women…").
 */
function passingQuotes(node: RuleNode, profile: Profile, out: string[] = []): string[] {
  if (evaluateNode(node, profile) !== "PASS") return out;
  if ("field" in node) out.push(node.source_quote);
  else for (const child of children(node)) passingQuotes(child, profile, out);
  return out;
}

/** The condition to show as "you don't qualify because…". */
function firstFailure(node: RuleNode, profile: Profile): Condition | null {
  if (evaluateNode(node, profile) !== "FAIL") return null;
  if ("field" in node) return node;
  // A failing group always has a failing child: in `all` that child caused it,
  // and in `any` every child failed. So the first failing child exists.
  const [failing] = children(node).filter((child) => evaluateNode(child, profile) === "FAIL");
  return firstFailure(failing as RuleNode, profile);
}

/** Unanswered fields inside the parts of the tree that are still undecided. */
function missingFields(node: RuleNode, profile: Profile, out = new Set<Field>()): Set<Field> {
  if (evaluateNode(node, profile) !== "UNKNOWN") return out;
  if ("field" in node) out.add(node.field);
  else for (const child of children(node)) missingFields(child, profile, out);
  return out;
}

export function evaluateScheme(scheme: Scheme, profile: Profile): SchemeResult {
  const version = scheme.rule_format_version ?? RULE_FORMAT_VERSION;
  if (version !== RULE_FORMAT_VERSION) {
    throw new Error(`${scheme.slug}: rule format v${version} is not supported (expected v1)`);
  }
  const tree = withStateGate(scheme);
  const result = evaluateNode(tree, profile);
  const unmodelled = scheme.unmodelled ?? [];
  return {
    slug: scheme.slug,
    result,
    // Reasons come from the scheme's own rules (not the gate), only when it passes, once each.
    reasons: result === "PASS" ? [...new Set(passingQuotes(scheme.eligibility, profile))] : [],
    failed: firstFailure(tree, profile),
    missing: [...missingFields(tree, profile)],
    also_confirm: unmodelled.filter((u) => u.kind !== "alternative").map((u) => u.text),
    other_ways: unmodelled.filter((u) => u.kind === "alternative").map((u) => u.text),
    other_state:
      scheme.level === "state" && profile.state !== undefined && profile.state !== scheme.state,
  };
}
