import json

from schemematch_pipeline.validate import ROOT, validate

FEWSHOT = ROOT / "pipeline/fewshot"
EXAMPLES = sorted((FEWSHOT / "examples").glob("*.json"))


def test_there_are_three_examples_each_with_a_saved_source():
    assert [p.stem for p in EXAMPLES] == ["pm-internship", "pm-svanidhi", "wb-post-matric"]
    for p in EXAMPLES:
        assert (FEWSHOT / "sources" / f"{p.stem}.txt").exists()


def test_leakage_rule_no_golden_scheme_is_a_few_shot_example():
    golden = {p.stem for p in (ROOT / "pipeline/golden/schemes").glob("*.json")}
    assert golden.isdisjoint(p.stem for p in EXAMPLES)


def test_examples_pass_the_same_validators_as_model_output():
    for p in EXAMPLES:
        ex = json.loads(p.read_text())
        source = (FEWSHOT / "sources" / f"{p.stem}.txt").read_text()
        out = validate(ex, source)
        assert out.rejected == [], (p.stem, out.rejected)
        assert out.eligibility == ex["eligibility"]
