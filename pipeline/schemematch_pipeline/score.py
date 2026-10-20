"""Score extracted rules against the golden set (docs/EVALS.md §3 and §5).

A predicted condition matches a golden one when field, op and value are equal (numbers exact,
lists as sets) and it sits under the same group type (all/any). Every miss gets one label:
wrong_grouping, wrong_value, wrong_operator, wrong_field, missed_condition, invented_condition,
ambiguous_source (the model modelled something the golden set left as unmodelled/ambiguous),
or rejected_by_validator.
"""

import json
import re
from dataclasses import dataclass, field

from .validate import Validated, normalise

LABELS = [
    "wrong_grouping",
    "wrong_value",
    "wrong_operator",
    "wrong_field",
    "missed_condition",
    "invented_condition",
    "ambiguous_source",
    "rejected_by_validator",
]


def _norm_value(op: str, value):
    def num(v):
        return int(v) if isinstance(v, float) and v.is_integer() else v

    if op in ("in", "not_in"):
        return tuple(sorted({num(v) for v in value}, key=repr))
    if op == "between":
        return tuple(num(v) for v in value)
    return num(value)


@dataclass(frozen=True)
class Cond:
    field: str
    op: str
    value: object
    parent: str
    quote: str = ""

    @property
    def key(self):
        return (self.field, self.op, self.value, self.parent)

    def show(self) -> str:
        return f"{self.field} {self.op} {self.value!r} (in {self.parent})"


def flatten(node: dict, parent: str = "all") -> list[Cond]:
    if "field" in node:
        return [Cond(node["field"], node["op"], _norm_value(node["op"], node["value"]), parent, node["source_quote"])]
    kind = "all" if "all" in node else "any"
    return [c for kid in node[kind] for c in flatten(kid, kind)]


def canonical(node: dict):
    """Tree with quotes removed and children sorted, for exact-match comparison."""
    if "field" in node:
        return ("c", node["field"], node["op"], _norm_value(node["op"], node["value"]))
    kind = "all" if "all" in node else "any"
    return (kind, tuple(sorted((canonical(k) for k in node[kind]), key=repr)))


def _overlaps(quote: str, others: list[str]) -> bool:
    q = normalise(quote)
    qw = set(re.findall(r"\w+", q))
    for o in others:
        o = normalise(o)
        ow = set(re.findall(r"\w+", o))
        if q in o or o in q or (qw and ow and len(qw & ow) / len(qw | ow) >= 0.6):
            return True
    return False


@dataclass
class SchemeScore:
    slug: str
    golden: int
    predicted: int  # kept + rejected
    tp: int
    exact: bool
    errors: list[tuple[str, str, str]] = field(default_factory=list)  # (label, golden, predicted)

    def count(self, label: str) -> int:
        return sum(1 for e in self.errors if e[0] == label)


def _take(left: list[Cond], pred) -> Cond | None:
    for i, c in enumerate(left):
        if pred(c):
            return left.pop(i)
    return None


def score_scheme(slug: str, golden: dict, got: Validated) -> SchemeScore:
    g_left = flatten(golden["eligibility"])
    p_left = flatten(got.eligibility)
    n_golden, n_kept = len(g_left), len(p_left)
    tp = 0
    for g in list(g_left):
        if _take(p_left, lambda p, g=g: p.key == g.key):
            g_left.remove(g)
            tp += 1
    errors: list[tuple[str, str, str]] = []
    pairings = [
        ("wrong_grouping", lambda g, p: (g.field, g.op, g.value) == (p.field, p.op, p.value)),
        ("wrong_value", lambda g, p: (g.field, g.op) == (p.field, p.op)),
        ("wrong_operator", lambda g, p: g.field == p.field),
        ("wrong_field", lambda g, p: (g.op, g.value) == (p.op, p.value)),
    ]
    for label, same in pairings:
        for g in list(g_left):
            if p := _take(p_left, lambda p, g=g: same(g, p)):
                g_left.remove(g)
                errors.append((label, g.show(), p.show()))
    errors += [("missed_condition", g.show(), "") for g in g_left]
    set_aside = [u["source_quote"] for u in golden.get("unmodelled", [])] + list(golden.get("ambiguous", []))
    for p in p_left:
        label = "ambiguous_source" if _overlaps(p.quote, set_aside) else "invented_condition"
        errors.append((label, "", f'{p.show()} quote: "{p.quote}"'))
    dropped = [r for r in got.rejected if r.path.startswith("eligibility")]
    n_dropped = 0
    for r in dropped:
        n = _conditions_in(r.item)  # an emptied group's children were already counted
        if n and not r.reason.startswith("nothing valid left"):
            n_dropped += n
            errors += [("rejected_by_validator", "", f"{json.dumps(r.item, ensure_ascii=False)} - {r.reason}")] * n
    exact = canonical(golden["eligibility"]) == canonical(got.eligibility) and not dropped
    return SchemeScore(slug, n_golden, n_kept + n_dropped, tp, exact, errors)


def _conditions_in(item) -> int:
    """How many predicted conditions a rejected item stood for (a bad leaf counts as one)."""
    if isinstance(item, dict) and ("all" in item or "any" in item) and "field" not in item:
        kids = [k for key in ("all", "any") if isinstance(item.get(key), list) for k in item[key]]
        return sum(_conditions_in(k) for k in kids)
    return 1


@dataclass
class Totals:
    schemes: int
    golden: int
    predicted: int
    tp: int
    exact: int
    by_label: dict[str, int]

    @property
    def precision(self) -> float:
        return self.tp / self.predicted if self.predicted else 1.0

    @property
    def recall(self) -> float:
        return self.tp / self.golden if self.golden else 1.0

    @property
    def f1(self) -> float:
        p, r = self.precision, self.recall
        return 2 * p * r / (p + r) if p + r else 0.0

    @property
    def exact_pct(self) -> float:
        return 100 * self.exact / self.schemes if self.schemes else 0.0


def totals(scores: list[SchemeScore], exclude_ambiguous: bool = False) -> Totals:
    by_label = {label: sum(s.count(label) for s in scores) for label in LABELS}
    predicted = sum(s.predicted for s in scores)
    if exclude_ambiguous:
        predicted -= by_label["ambiguous_source"]
    return Totals(
        schemes=len(scores),
        golden=sum(s.golden for s in scores),
        predicted=predicted,
        tp=sum(s.tp for s in scores),
        exact=sum(s.exact for s in scores),
        by_label=by_label,
    )
