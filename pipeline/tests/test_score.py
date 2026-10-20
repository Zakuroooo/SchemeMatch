import json

from schemematch_pipeline.score import canonical, score_scheme, totals
from schemematch_pipeline.validate import ROOT, Rejected, Validated


def c(field, op, value, quote="q"):
    return {"field": field, "op": op, "value": value, "source_quote": quote}


AGE = c("age", "gte", 60)
SC = c("caste_category", "eq", "SC")
INCOME = c("annual_family_income", "lte", 250000)
GOLDEN = {"eligibility": {"all": [AGE, SC, INCOME]}, "unmodelled": [], "ambiguous": []}


def run(pred_tree, golden=GOLDEN, rejected=()):
    return score_scheme("demo", golden, Validated(pred_tree, rejected=list(rejected)))


def labels(s):
    return [e[0] for e in s.errors]


def test_perfect_prediction():
    s = run({"all": [SC, INCOME, AGE]})  # order does not matter
    assert (s.tp, s.golden, s.predicted, s.exact, s.errors) == (3, 3, 3, True, [])


def test_quotes_and_number_types_do_not_matter():
    s = run({"all": [c("age", "gte", 60.0, "other words"), SC, INCOME]})
    assert s.exact and s.tp == 3


def test_lists_compare_as_sets():
    g = {"eligibility": {"all": [c("caste_category", "in", ["SC", "ST"])]}}
    assert run({"all": [c("caste_category", "in", ["ST", "SC"])]}, g).exact


def test_wrong_operator():
    s = run({"all": [c("age", "gt", 60), SC, INCOME]})
    assert labels(s) == ["wrong_operator"] and s.tp == 2 and not s.exact


def test_wrong_value():
    assert labels(run({"all": [c("age", "gte", 65), SC, INCOME]})) == ["wrong_value"]


def test_wrong_grouping():
    s = run({"all": [SC, {"any": [AGE, INCOME]}]})
    assert sorted(labels(s)) == ["wrong_grouping", "wrong_grouping"] and s.tp == 1


def test_wrong_field():
    s = run({"all": [c("land_acres", "gte", 60), SC, INCOME]})
    assert labels(s) == ["wrong_field"]


def test_missed_and_invented():
    s = run({"all": [AGE, SC, c("gender", "eq", "female", "a woman")]})
    assert sorted(labels(s)) == ["invented_condition", "missed_condition"]


def test_modelling_a_golden_unmodelled_item_is_ambiguous_source():
    g = {**GOLDEN, "unmodelled": [{"text": "no other pension", "source_quote": "not a beneficiary of any other pension"}]}
    extra = c("has_bpl_card", "eq", False, "Should not be a beneficiary of any other pension")
    s = run({"all": [AGE, SC, INCOME, extra]}, g)
    assert labels(s) == ["ambiguous_source"]


def test_validator_rejections_count_as_false_positives():
    bad = Rejected("eligibility.all[3]", c("age", "gte", 600), "impossible value")
    s = run({"all": [AGE, SC, INCOME]}, rejected=[bad])
    assert s.predicted == 4 and labels(s) == ["rejected_by_validator"] and not s.exact


def test_rejected_conditions_are_counted_once_even_inside_emptied_groups():
    from schemematch_pipeline.validate import validate

    source = "Must be 60 years of age or above. Scheduled Caste (SC). income 2.5 lakh"
    fake = c("age", "gte", 61, "nowhere in the page")
    got = validate({"eligibility": {"all": [c("caste_category", "eq", "SC", "Scheduled Caste (SC)"), {"all": [fake]}]}}, source)
    s = score_scheme("demo", GOLDEN, got)
    assert s.predicted == 2  # the SC condition + the one bad age condition, not the emptied group
    assert labels(s).count("rejected_by_validator") == 1


def test_totals_maths():
    perfect = run({"all": [AGE, SC, INCOME]})
    half = run({"all": [AGE, c("gender", "eq", "female")]})  # 1 right of 2 predicted, 1 of 3 found
    t = totals([perfect, half])
    assert (t.tp, t.predicted, t.golden) == (4, 5, 6)
    assert round(t.precision, 3) == 0.8 and round(t.recall, 3) == 0.667
    assert round(t.f1, 3) == round(2 * 0.8 * (4 / 6) / (0.8 + 4 / 6), 3)
    assert t.exact_pct == 50.0


def test_excluding_ambiguous_source_raises_precision_only():
    g = {**GOLDEN, "unmodelled": [{"text": "x", "source_quote": "not a beneficiary of any other pension"}]}
    s = run({"all": [AGE, SC, INCOME, c("has_bpl_card", "eq", False, "not a beneficiary of any other pension")]}, g)
    strict, lenient = totals([s]), totals([s], exclude_ambiguous=True)
    assert strict.precision == 0.75 and lenient.precision == 1.0 and strict.recall == lenient.recall == 1.0


def test_golden_set_scored_against_itself_is_perfect():
    scores = []
    for path in sorted((ROOT / "pipeline/golden/schemes").glob("*.json")):
        g = json.loads(path.read_text())
        scores.append(score_scheme(g["slug"], g, Validated(g["eligibility"])))
    t = totals(scores)
    assert (t.schemes, t.precision, t.recall, t.f1, t.exact_pct) == (30, 1.0, 1.0, 1.0, 100.0)


def test_canonical_ignores_child_order_but_not_group_type():
    a = {"all": [AGE, {"any": [SC, INCOME]}]}
    b = {"all": [{"any": [INCOME, SC]}, AGE]}
    assert canonical(a) == canonical(b)
    assert canonical({"all": [SC, AGE]}) != canonical({"any": [SC, AGE]})
    assert canonical({"all": [SC]}) == canonical({"any": [SC]})  # one item: same meaning


def test_one_item_groups_and_nested_same_groups_are_not_grouping_errors():
    g = {"eligibility": {"all": [AGE, {"any": [SC, INCOME]}]}, "unmodelled": [], "ambiguous": []}
    wrapped = {"all": [{"all": [AGE]}, {"any": [{"all": [SC]}, {"any": [INCOME]}]}]}
    s = run(wrapped, g)
    assert s.exact and s.errors == [] and s.tp == 3


def test_a_real_grouping_change_still_counts():
    g = {"eligibility": {"all": [AGE, {"any": [SC, INCOME]}]}, "unmodelled": [], "ambiguous": []}
    s = run({"all": [AGE, SC, INCOME]}, g)  # OR read as AND: a real mistake
    assert not s.exact and labels(s).count("wrong_grouping") == 2
