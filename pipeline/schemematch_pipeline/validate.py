"""Validators for extracted rules (docs/EVALS.md §4). Run before scoring, and in production.

1. schema - every condition and the final tree must match packages/engine/rule.schema.json
2. quote  - every source_quote must appear in the source text (normalised; fuzzy >= 0.9 allowed
            for line-break artefacts)
3. values - values must be possible for their field (ranges and enums from the profile schema)

A condition that fails is dropped with a reason. The scorer counts every drop as a false positive.
"""

import json
import re
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[2]
RULE_SCHEMA = json.loads((ROOT / "packages/engine/rule.schema.json").read_text())
FUZZY_MIN = 0.9

_tree = Draft202012Validator(RULE_SCHEMA)
_condition = Draft202012Validator({**RULE_SCHEMA, "$ref": "#/$defs/condition"})

# Mirrors apps/api/src/profile-schema.ts (a test keeps the enums in step with engine types.ts).
ENUMS = {
    "gender": {"female", "male", "other"},
    "marital_status": {"single", "married", "widow", "divorced", "abandoned"},
    "caste_category": {"SC", "ST", "OBC", "General", "EWS"},
}
PATTERNS = {
    "state": re.compile(r"^[A-Z]{2}$"),
    "education_level": re.compile(r"^(class_([1-9]|1[0-2])|diploma|undergraduate|postgraduate)$"),
}
RANGES = {
    "age": (0, 120),
    "annual_family_income": (0, 1_000_000_000),
    "land_acres": (0, 100_000),
    "disability_percent": (0, 100),
    "household_size": (1, 50),
    "children_count": (0, 30),
}
BOOLEANS = {"is_student", "has_bpl_card", "is_pregnant_or_lactating"}


def normalise(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def quote_found(quote: str, source: str) -> bool:
    """Exact (normalised) substring, else best fuzzy window ratio >= FUZZY_MIN."""
    q, s = normalise(quote), normalise(source)
    if len(q) < 3:
        return False
    if q in s:
        return True
    n = len(q)
    starts = [0] + [m.end() for m in re.finditer(r" ", s)]
    for start in starts:
        window = s[start : start + n]
        m = SequenceMatcher(None, q, window, autojunk=False)
        if m.real_quick_ratio() >= FUZZY_MIN and m.quick_ratio() >= FUZZY_MIN and m.ratio() >= FUZZY_MIN:
            return True
    return False


def _value_ok(fld: str, v) -> bool:
    if fld in ENUMS:
        return v in ENUMS[fld]
    if fld in PATTERNS:
        return isinstance(v, str) and bool(PATTERNS[fld].match(v))
    if fld in RANGES:
        lo, hi = RANGES[fld]
        return isinstance(v, (int, float)) and not isinstance(v, bool) and lo <= v <= hi
    if fld in BOOLEANS:
        return isinstance(v, bool)
    return isinstance(v, str) and len(v) >= 2  # district, occupation: free text


def value_problem(cond: dict) -> str | None:
    fld, op, value = cond["field"], cond["op"], cond["value"]
    if fld in BOOLEANS and op not in ("eq", "neq"):
        return f"{fld} is yes/no, so only eq/neq make sense"
    values = value if isinstance(value, list) else [value]
    bad = [v for v in values if not _value_ok(fld, v)]
    if bad:
        return f"impossible value for {fld}: {bad}"
    if op == "between" and value[0] > value[1]:
        return f"between needs min <= max, got {value}"
    if fld in RANGES and not isinstance(value, list):
        lo, hi = RANGES[fld]
        if (op == "lt" and value <= lo) or (op == "gt" and value >= hi):
            return f"nobody can meet {fld} {op} {value} (possible values are {lo} to {hi})"
    return None


@dataclass
class Rejected:
    path: str
    item: dict
    reason: str


@dataclass
class Validated:
    eligibility: dict
    unmodelled: list = field(default_factory=list)
    ambiguous: list = field(default_factory=list)
    rejected: list[Rejected] = field(default_factory=list)


def _prune(node, source: str, path: str, rejected: list[Rejected], root: bool = False):
    """Return the node with bad conditions removed, or None if nothing valid is left.

    Dropping a condition from an all-group makes the rule wider than the model meant, so the
    output is only ever a draft for human review (docs/EVALS.md), never served as live rules.
    """
    if isinstance(node, dict) and ("all" in node or "any" in node) and "field" not in node:
        if set(node) not in ({"all"}, {"any"}):
            rejected.append(Rejected(path, node, f"group must have exactly one of all/any, got keys {sorted(node)}"))
            return None
        kind = "all" if "all" in node else "any"
        kids = node[kind]
        if not isinstance(kids, list):
            rejected.append(Rejected(path, node, f"'{kind}' must be a list"))
            return None
        pruned = (_prune(kid, source, f"{path}.{kind}[{i}]", rejected) for i, kid in enumerate(kids))
        kept = [k for k in pruned if k is not None]
        if not kept and (kind == "any" or (kids and not root)):
            # an empty nested all-group would PASS everyone, so it goes too
            rejected.append(Rejected(path, node, f"nothing valid left in this {kind}-group"))
            return None
        return {kind: kept}
    errors = sorted(_condition.iter_errors(node), key=str) if isinstance(node, dict) else ["not an object"]
    if errors:
        msg = errors[0] if isinstance(errors[0], str) else errors[0].message
        rejected.append(Rejected(path, node, f"schema: {msg}"))
        return None
    if not quote_found(node["source_quote"], source):
        rejected.append(Rejected(path, node, "quote not found in source"))
        return None
    if problem := value_problem(node):
        rejected.append(Rejected(path, node, problem))
        return None
    return node


def validate(output: dict, source: str) -> Validated:
    rejected: list[Rejected] = []
    tree = _prune(output.get("eligibility", {"all": []}), source, "eligibility", rejected, root=True)
    if tree is None or "field" in tree:
        tree = {"all": [tree] if tree else []}  # the top is always an all-group
    assert not list(_tree.iter_errors(tree)), "pruned tree must match rule.schema.json"
    unmodelled = []
    for i, u in enumerate(output.get("unmodelled", [])):
        if isinstance(u, dict) and isinstance(u.get("source_quote"), str) and quote_found(u["source_quote"], source):
            unmodelled.append(u)
        else:
            rejected.append(Rejected(f"unmodelled[{i}]", u, "quote not found in source"))
    ambiguous = [a for a in output.get("ambiguous", []) if isinstance(a, str)]
    return Validated(tree, unmodelled, ambiguous, rejected)
