"""Score a run and write reports/eval-YYYY-MM-DD.md (template: docs/EVALS.md §7).

usage: uv run python -m schemematch_pipeline.report runs/<run-id> [--out reports/eval-2026-10-21.md]

Re-validates and re-scores the saved answers, so no model is called here.
"""

import argparse
import datetime
import json
import subprocess
import sys
from pathlib import Path

from .extract import CONFIG, PIPELINE, SETS
from .fetch import split_header
from .score import LABELS, SchemeScore, score_scheme, totals
from .validate import ROOT, Validated, validate

TOP_EXAMPLES = 3


def golden_set(which: str = "dev") -> list[dict]:
    return [json.loads(p.read_text()) for p in sorted((PIPELINE / SETS[which]).glob("*.json"))]


def score_model(model_dir: Path, golden: list[dict]) -> tuple[list[SchemeScore], list[dict], dict[str, str]]:
    scores, records, failures = [], [], {}
    for g in golden:
        path = model_dir / f"{g['slug']}.json"
        record = json.loads(path.read_text()) if path.exists() else {"error": "not run"}
        records.append(record)
        if "answer" in record:
            _, page = split_header((PIPELINE / g["source_file"]).read_text(encoding="utf-8"))
            got = validate(record["answer"], page)
        else:
            failures[g["slug"]] = record["error"]
            got = Validated({"all": []})  # nothing extracted: every golden condition is missed
        scores.append(score_scheme(g["slug"], g, got))
    return scores, records, failures


def _cost_inr(records: list[dict], model: str) -> float | None:
    m = CONFIG["models"][model]
    used = [r["usage"] for r in records if r.get("usage")]
    if not used:
        return None
    usd = sum(u.get("prompt_tokens", 0) * m["usd_per_m_input"] + u.get("completion_tokens", 0) * m["usd_per_m_output"] for u in used) / 1e6
    return usd * CONFIG["usd_to_inr"] / len(used)


def _latency(records: list[dict]) -> float | None:
    times = [r["latency_s"] for r in records if "latency_s" in r and "answer" in r]
    return sum(times) / len(times) if times else None


def _fmt(x, spec):
    return "n/a" if x is None else format(x, spec)


def _git_commit() -> str:
    try:
        return subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=ROOT, capture_output=True, text=True).stdout.strip()
    except OSError:
        return "unknown"


def build_report(run_dir: Path, golden: list[dict] | None = None, notes: str | None = None, which: str = "dev") -> str:
    golden = golden or golden_set(which)
    models = sorted(p.name for p in run_dir.iterdir() if p.is_dir())
    prompt = {json.loads(p.read_text()).get("prompt_version") for p in run_dir.glob("*/*.json")} - {None}
    lines = [
        f"# Eval report: {run_dir.name}",
        "",
        "Models: " + " · ".join(f"{m}=`{CONFIG['models'][m]['id']}`" for m in models)
        + f" · Prompt: `{', '.join(sorted(prompt)) or 'n/a'}` · Code: `{_git_commit()}`",
        f"Settings: temperature {CONFIG['temperature']}, reasoning_effort {CONFIG['reasoning_effort']}, "
        f"max_completion_tokens {CONFIG['max_completion_tokens']}, max_request_tokens {CONFIG['max_request_tokens']}",
        (
            f"Golden: {len(golden)} schemes, **AI-drafted and AI-checked (human review pending)**. This is the dev set; "
            "final numbers come from the held-out set."
            if which == "dev"
            else f"Golden: the **held-out {len(golden)}**, labelled before any model saw them and never used to change "
            "the prompt. Labels are AI-drafted and AI-checked (human review pending). These are the final numbers."
        ),
        "",
        "| Model | Rows | P | R | F1 | Exact % | Quote/validator rejects | Too large / failed | ₹/scheme (list price) | s/scheme |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    details = []
    for m in models:
        scores, records, failures = score_model(run_dir / m, golden)
        fit = [s for s in scores if s.slug not in failures]
        for label, subset, lenient in [
            ("all schemes", scores, False),
            ("all, excl. ambiguous_source", scores, True),
            ("schemes with a usable answer", fit, False),
        ]:
            t = totals(subset, exclude_ambiguous=lenient)
            lines.append(
                f"| {m} | {label} ({t.schemes}) | {t.precision:.2f} | {t.recall:.2f} | {t.f1:.2f} | {t.exact_pct:.0f} | "
                f"{t.by_label['rejected_by_validator']} | {len(failures) if subset is scores else 0} | "
                f"{_fmt(_cost_inr(records, m), '.3f')} | {_fmt(_latency(records), '.1f')} |"
            )
        t = totals(scores)
        details += ["", f"## Model {m}: errors by label", "", "| Label | Count |", "|---|---|"]
        details += [f"| {label} | {t.by_label[label]} |" for label in LABELS]
        top = sorted((lab for lab in LABELS if t.by_label[lab]), key=lambda lab: -t.by_label[lab])[:2]
        for lab in top:
            details += ["", f"**{lab}**, examples:"]
            examples = [(s.slug, e) for s in scores for e in s.errors if e[0] == lab][:TOP_EXAMPLES]
            for slug, (_, gold, pred) in examples:
                details.append(f"- `{slug}`: golden `{gold or '-'}` · predicted `{pred or '-'}`")
        if failures:
            details += ["", "Not scored as model output (counted as full misses):"]
            details += [f"- `{slug}`: {err}" for slug, err in failures.items()]
        details += ["", "| Scheme | Golden | Correct | Predicted | Exact | Errors |", "|---|---|---|---|---|---|"]
        for s in scores:
            errs = ", ".join(f"{lab} {s.count(lab)}" for lab in LABELS if s.count(lab)) or "-"
            details.append(f"| {s.slug} | {s.golden} | {s.tp} | {s.predicted} | {'yes' if s.exact else 'no'} | {errs} |")
    lines += [
        "",
        "P = correct / predicted (validator rejects count as wrong). R = correct / golden. "
        "Exact = every condition and the grouping right. `ambiguous_source` = the model turned a line the golden set "
        "left as unmodelled or ambiguous into a condition.",
        f"Cost is at Groq list prices (USD→INR {CONFIG['usd_to_inr']}, {CONFIG['usd_to_inr_as_of']}); the free tier charged ₹0.",
        *details,
        "",
        notes.strip() if notes else "## What changed since the last run / what to try next\n- (add a notes file with --notes)",
    ]
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("run_dir", type=Path)
    ap.add_argument("--out", type=Path, default=ROOT / f"reports/eval-{datetime.date.today().isoformat()}.md")
    ap.add_argument("--notes", type=Path, help="hand-written spot-check notes and next steps, appended at the end")
    ap.add_argument("--set", choices=sorted(SETS), default="dev")
    args = ap.parse_args(argv)
    args.out.parent.mkdir(parents=True, exist_ok=True)
    notes = args.notes.read_text(encoding="utf-8") if args.notes else None
    args.out.write_text(build_report(args.run_dir, notes=notes, which=args.set), encoding="utf-8")
    print(args.out)
    return 0


if __name__ == "__main__":
    sys.exit(main())
