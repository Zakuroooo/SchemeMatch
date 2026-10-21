import json

import pytest
from jsonschema import Draft202012Validator

from schemematch_pipeline import extract
from schemematch_pipeline.prompt import SYSTEM, fewshot_messages, messages, prompt_version
from schemematch_pipeline.score import flatten
from schemematch_pipeline.strict_schema import output_schema
from schemematch_pipeline.validate import ROOT, normalise

GOLDEN = [json.loads(p.read_text()) for p in sorted((ROOT / "pipeline/golden/schemes").glob("*.json"))]
HELDOUT = [json.loads(p.read_text()) for p in sorted((ROOT / "pipeline/golden/heldout").glob("*.json"))]


def _objects(node):
    if isinstance(node, dict):
        if node.get("type") == "object":
            yield node
        for v in node.values():
            yield from _objects(v)
    elif isinstance(node, list):
        for v in node:
            yield from _objects(v)


def test_strict_schema_follows_groq_strict_rules():
    schema = output_schema()
    assert "oneOf" not in json.dumps(schema)
    for obj in _objects(schema):
        assert obj["additionalProperties"] is False
        assert sorted(obj["required"]) == sorted(obj["properties"])


def test_correct_answers_are_allowed_by_the_strict_schema():
    v = Draft202012Validator(output_schema())
    # The golden files may mark unmodelled items with kind "alternative"; prompt v1's output
    # schema has no such field yet (adding it is a prompt v2 change), so compare without it.
    def without_kind(items):
        return [{k: v for k, v in u.items() if k != "kind"} for u in items]

    answers = [
        {"eligibility": g["eligibility"], "unmodelled": without_kind(g["unmodelled"]), "ambiguous": g["ambiguous"]}
        for g in GOLDEN + HELDOUT
    ]
    answers += [json.loads(p.read_text()) for p in (ROOT / "pipeline/fewshot/examples").glob("*.json")]
    for a in answers:
        assert not list(v.iter_errors(a))


def test_prompt_contains_no_golden_rule_quote():
    prompt = normalise(SYSTEM + json.dumps(fewshot_messages(), ensure_ascii=False))
    labelled = GOLDEN + HELDOUT
    leaked = [c.quote for g in labelled for c in flatten(g["eligibility"]) if len(c.quote) >= 25 and normalise(c.quote) in prompt]
    assert leaked == []


def test_prompt_version_is_stable_and_messages_end_with_the_page():
    assert prompt_version() == prompt_version()
    msgs = messages("THE PAGE")
    assert msgs[0]["role"] == "system" and msgs[-1]["content"].endswith("THE PAGE\n>>>")
    assert len(msgs) == 1 + 2 * 3 + 1


class FakeResponse:
    def __init__(self, status, body=None, headers=None):
        self.status_code, self._body, self.headers = status, body or {}, headers or {}
        self.text = json.dumps(self._body)

    def json(self):
        return self._body


class FakeClient:
    def __init__(self, responses):
        self.responses, self.calls = list(responses), []

    def post(self, url, json, headers, timeout):
        self.calls.append(json)
        return self.responses.pop(0)


def ok(answer):
    return FakeResponse(200, {"choices": [{"message": {"content": json.dumps(answer)}}], "usage": {"total_tokens": 900}})


ANSWER = {"eligibility": {"all": []}, "unmodelled": [], "ambiguous": []}


def test_retries_after_rate_limit_using_retry_after():
    slept = []
    client = FakeClient([FakeResponse(429, headers={"retry-after": "7"}), ok(ANSWER)])
    rec = extract.extract_one(client, "k", "A", "demo", "short page", sleep=slept.append)
    assert rec["answer"] == ANSWER and slept == [7.0]
    body = client.calls[0]
    assert body["temperature"] == 0 and body["response_format"]["json_schema"]["strict"] is True
    assert body["model"] == extract.CONFIG["models"]["A"]["id"]


def test_gives_up_on_client_errors_and_records_them():
    rec = extract.extract_one(FakeClient([FakeResponse(400, {"error": "bad"})]), "k", "B", "demo", "page", sleep=lambda s: None)
    assert rec["error"].startswith("HTTP 400")


def test_too_large_pages_are_not_sent():
    client = FakeClient([])
    rec = extract.extract_one(client, "k", "A", "demo", "x" * 40_000, sleep=lambda s: None)
    assert rec["error"].startswith("too_large") and client.calls == []


def test_non_json_answer_is_recorded():
    bad = FakeResponse(200, {"choices": [{"message": {"content": "not json"}}]})
    rec = extract.extract_one(FakeClient([bad]), "k", "A", "demo", "page", sleep=lambda s: None)
    assert rec["error"] == "answer was not JSON" and rec["raw_text"] == "not json"


def test_run_writes_files_and_resumes(tmp_path, monkeypatch):
    monkeypatch.setattr(extract, "RUNS", tmp_path)
    client = FakeClient([ok(ANSWER), ok(ANSWER)])
    out = extract.run(["A", "B"], ["pmuy"], "test-run", client=client, key="k", sleep=lambda s: None)
    assert sorted(p.name for p in out.glob("*/*.json")) == ["pmuy.json", "pmuy.json"]
    extract.run(["A", "B"], ["pmuy"], "test-run", client=FakeClient([]), key="k", sleep=lambda s: None)  # nothing re-sent


def test_missing_key_stops_with_a_clear_message(monkeypatch, tmp_path):
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.setattr(extract, "PIPELINE", tmp_path)
    with pytest.raises(SystemExit, match="GROQ_API_KEY is not set"):
        extract.api_key()


def test_request_too_large_is_not_retried():
    slept = []
    big = FakeResponse(429, {"error": {"message": "Request too large for model: tokens per minute limit 8000"}})
    rec = extract.extract_one(FakeClient([big]), "k", "A", "demo", "page", sleep=slept.append)
    assert rec["error"].startswith("too_large") and slept == []
