import { evaluateCondition } from "./condition.ts";
import { evaluateNode } from "./logic.ts";
import {
  RULE_FORMAT_VERSION,
  type Condition,
  type Field,
  type Profile,
  type RuleNode,
  type Scheme,
  type SchemeResult,
} from "./types.ts";

const children = (node: RuleNode): readonly RuleNode[] =>
  "all" in node ? node.all : "any" in node ? node.any : [];

/** A state scheme behaves as if its rules were AND-ed with "lives in that state". */
function withStateGate(scheme: Scheme): RuleNode {
  if (scheme.level !== "state" || !scheme.state) return scheme.eligibility;
  const gate: Condition = {
    field: "state",
    op: "eq",
    value: scheme.state,
    source_quote: `Scheme of the state ${scheme.state}: for its residents`,
  };
  return { all: [gate, scheme.eligibility] };
}

function passingQuotes(node: RuleNode, profile: Profile, out: string[] = []): string[] {
  if ("field" in node) {
    if (evaluateCondition(node, profile) === "PASS") out.push(node.source_quote);
  } else {
    for (const child of children(node)) passingQuotes(child, profile, out);
  }
  return out;
}

/** The condition to show as "you don't qualify because…". */
function firstFailure(node: RuleNode, profile: Profile): Condition | null {
  if (evaluateNode(node, profile) !== "FAIL") return null;
  if ("field" in node) return node;
  const failing = children(node).find((child) => evaluateNode(child, profile) === "FAIL");
  return failing ? firstFailure(failing, profile) : null;
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
  return {
    slug: scheme.slug,
    result,
    reasons: passingQuotes(tree, profile),
    failed: firstFailure(tree, profile),
    missing: [...missingFields(tree, profile)],
    also_confirm: (scheme.unmodelled ?? []).map((u) => u.text),
  };
}
