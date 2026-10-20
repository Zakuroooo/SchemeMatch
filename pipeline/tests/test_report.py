import json

from schemematch_pipeline.report import build_report, golden_set


def write(run_dir, model, slug, record):
    path = run_dir / model / f"{slug}.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(record))


def test_report_from_a_tiny_run(tmp_path):
    golden = [g for g in golden_set() if g["slug"] in ("pmuy", "apy")]
    pmuy = next(g for g in golden if g["slug"] == "pmuy")
    answer = {k: pmuy[k] for k in ("eligibility", "unmodelled", "ambiguous")}
    usage = {"prompt_tokens": 4000, "completion_tokens": 500}
    write(tmp_path, "A", "pmuy", {"prompt_version": "p1-test", "answer": answer, "usage": usage, "latency_s": 2.0})
    write(tmp_path, "A", "apy", {"prompt_version": "p1-test", "error": "too_large: about 12408 tokens"})
    text = build_report(tmp_path, golden)

    assert "Prompt: `p1-test`" in text
    assert "AI-checked (human review pending)" in text
    # pmuy perfect (2 of 2), apy fully missed (0 of its conditions)
    apy_golden = sum(1 for _ in json.dumps(next(g for g in golden if g["slug"] == "apy")["eligibility"]).split('"field"')) - 1
    recall = 2 / (2 + apy_golden)
    assert f"| A | all schemes (2) | 1.00 | {recall:.2f} |" in text
    assert "| A | schemes sent to the model (1) | 1.00 | 1.00 | 1.00 | 100 |" in text
    assert "`apy`: too_large" in text
    # cost: (4000 * 0.15 + 500 * 0.60) / 1e6 USD * 84 INR
    assert f"{(4000 * 0.15 + 500 * 0.60) / 1e6 * 84:.3f}" in text
