import json
import re

from schemematch_pipeline.validate import ENUMS, ROOT, quote_found, validate

SOURCE = """Eligibility
Must be 60 years of age or above
Must belongto the Scheduled Caste (SC) community
Annual family income should not exceed Rs 2.5 lakh.
"""
AGE = {"field": "age", "op": "gte", "value": 60, "source_quote": "Must be 60 years of age or above"}
SC = {"field": "caste_category", "op": "eq", "value": "SC", "source_quote": "Scheduled Caste (SC)"}


def test_exact_and_whitespace_insensitive_quotes_pass():
    assert quote_found("must be 60   years of\nage or above", SOURCE)


def test_small_line_break_artefact_passes_fuzzy():
    assert quote_found("Must belong to the Scheduled Caste (SC) community", SOURCE)


def test_invented_quote_fails():
    assert not quote_found("Must be a resident for 15 years", SOURCE)


def test_good_output_passes_unchanged():
    out = validate({"eligibility": {"all": [AGE, SC]}, "unmodelled": [], "ambiguous": []}, SOURCE)
    assert out.eligibility == {"all": [AGE, SC]}
    assert out.rejected == []


def test_invented_quote_is_dropped_with_reason():
    fake = {**AGE, "value": 65, "source_quote": "Must be 65 or older"}
    out = validate({"eligibility": {"all": [fake, SC]}}, SOURCE)
    assert out.eligibility == {"all": [SC]}
    assert [r.reason for r in out.rejected] == ["quote not found in source"]


def test_schema_errors_are_dropped():
    bad = {"field": "age", "op": "gte", "value": "sixty", "source_quote": AGE["source_quote"]}
    unknown_field = {**SC, "field": "religion"}
    out = validate({"eligibility": {"all": [bad, unknown_field, SC]}}, SOURCE)
    assert out.eligibility == {"all": [SC]}
    assert all(r.reason.startswith("schema:") for r in out.rejected)


def test_impossible_values_are_dropped():
    old = {**AGE, "value": 600}
    caste = {**SC, "value": "Scheduled Caste"}
    out = validate({"eligibility": {"all": [old, caste]}}, SOURCE)
    assert out.eligibility == {"all": []}
    assert len(out.rejected) == 2


def test_empty_any_group_disappears_and_lone_condition_is_wrapped():
    fake = {**AGE, "source_quote": "not in the page at all"}
    out = validate({"eligibility": {"all": [SC, {"any": [fake]}]}}, SOURCE)
    assert out.eligibility == {"all": [SC]}
    lone = validate({"eligibility": AGE}, SOURCE)
    assert lone.eligibility == {"all": [AGE]}


def test_unmodelled_needs_a_real_quote():
    good = {"text": "income limit", "source_quote": "Annual family income should not exceed Rs 2.5 lakh."}
    bad = {"text": "made up", "source_quote": "must own a tractor"}
    out = validate({"eligibility": {"all": []}, "unmodelled": [good, bad]}, SOURCE)
    assert out.unmodelled == [good]
    assert len(out.rejected) == 1


def test_golden_files_pass_their_own_validator():
    for path in sorted((ROOT / "pipeline/golden/schemes").glob("*.json")):
        g = json.loads(path.read_text())
        source = (ROOT / "pipeline" / g["source_file"]).read_text()
        out = validate(g, source)
        assert out.rejected == [], (path.name, out.rejected)
        assert out.eligibility == g["eligibility"]


def test_enums_match_engine_types():
    types = (ROOT / "packages/engine/src/types.ts").read_text()
    for name, field in [("Gender", "gender"), ("MaritalStatus", "marital_status"), ("CasteCategory", "caste_category")]:
        line = re.search(rf"export type {name} = (.+);", types).group(1)
        assert set(re.findall(r'"([^"]+)"', line)) == ENUMS[field], name
