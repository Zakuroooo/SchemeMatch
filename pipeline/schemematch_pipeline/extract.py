"""Run rule extraction with Groq for one or more models (a batch job, never in the request path).

usage:
  uv run python -m schemematch_pipeline.extract --models A B           # all 30 golden schemes
  uv run python -m schemematch_pipeline.extract --models A --slugs apy pmuy

Reads GROQ_API_KEY from the environment or pipeline/.env (never printed or logged).
Writes runs/<date>-<prompt version>/<model>/<slug>.json with the raw answer, token usage and
latency. Already-written results are skipped, so a stopped run can be resumed. Validation and
scoring happen later from these files (report.py), so they can be re-run without new calls.
"""

import argparse
import datetime
import json
import os
import sys
import time
from pathlib import Path

import yaml

from .fetch import split_header
from .prompt import messages, prompt_version
from .strict_schema import output_schema
from .validate import ROOT

PIPELINE = ROOT / "pipeline"
CONFIG = yaml.safe_load((PIPELINE / "config.yaml").read_text())
RUNS = PIPELINE / "runs"
RETRY_STATUS = {429, 500, 502, 503, 504}


def api_key() -> str:
    if key := os.environ.get("GROQ_API_KEY"):
        return key
    env = PIPELINE / ".env"
    if env.exists():
        for line in env.read_text().splitlines():
            name, sep, value = line.partition("=")
            if sep and name.strip() == "GROQ_API_KEY" and value.strip():
                return value.strip().strip("'\"")
    sys.exit("GROQ_API_KEY is not set: add it to pipeline/.env (git-ignored) or the environment")


def estimate_tokens(msgs: list[dict]) -> int:
    """Rough size check (about 4 characters per token) used only to avoid sure-to-fail requests."""
    return sum(len(m["content"]) for m in msgs) // 4 + CONFIG["max_completion_tokens"]


def request_body(model_id: str, msgs: list[dict]) -> dict:
    return {
        "model": model_id,
        "messages": msgs,
        "temperature": CONFIG["temperature"],
        "reasoning_effort": CONFIG["reasoning_effort"],
        "include_reasoning": False,
        "max_completion_tokens": CONFIG["max_completion_tokens"],
        "response_format": {
            "type": "json_schema",
            "json_schema": {"name": "scheme_rules", "strict": True, "schema": output_schema()},
        },
    }


def call(client, key: str, body: dict, attempts: int = 6, sleep=time.sleep) -> tuple[dict, float]:
    """POST with retry and back-off on rate limits and server errors. Returns (json, seconds)."""
    delay = 5.0
    for attempt in range(attempts):
        started = time.monotonic()
        resp = client.post(CONFIG["endpoint"], json=body, headers={"Authorization": f"Bearer {key}"}, timeout=180)
        took = time.monotonic() - started
        if resp.status_code == 200:
            return resp.json(), took
        if resp.status_code == 413 or "too large" in resp.text.lower():
            raise RuntimeError(f"too_large: HTTP {resp.status_code}: {resp.text[:200]}")
        if resp.status_code not in RETRY_STATUS or attempt == attempts - 1:
            raise RuntimeError(f"HTTP {resp.status_code}: {resp.text[:300]}")
        wait = float(resp.headers.get("retry-after") or delay)
        sleep(min(wait, 120))
        delay = min(delay * 2, 120)
    raise AssertionError("unreachable")


def extract_one(client, key: str, model: str, slug: str, page: str, sleep=time.sleep) -> dict:
    model_id = CONFIG["models"][model]["id"]
    msgs = messages(page)
    record = {"model": model, "model_id": model_id, "slug": slug, "prompt_version": prompt_version()}
    if (est := estimate_tokens(msgs)) > CONFIG["max_request_tokens"]:
        return {**record, "error": f"too_large: about {est} tokens > max_request_tokens {CONFIG['max_request_tokens']}"}
    try:
        data, took = call(client, key, request_body(model_id, msgs), sleep=sleep)
    except RuntimeError as e:
        return {**record, "error": str(e)}
    content = data["choices"][0]["message"]["content"]
    try:
        answer = json.loads(content)
    except json.JSONDecodeError:
        return {**record, "error": "answer was not JSON", "raw_text": content, "latency_s": round(took, 2)}
    return {**record, "answer": answer, "usage": data.get("usage", {}), "latency_s": round(took, 2)}


SETS = {"dev": "golden/schemes", "heldout": "golden/heldout"}


def golden_pages(slugs: list[str] | None, which: str = "dev") -> dict[str, str]:
    pages = {}
    for path in sorted((PIPELINE / SETS[which]).glob("*.json")):
        g = json.loads(path.read_text())
        if slugs and g["slug"] not in slugs:
            continue
        _, pages[g["slug"]] = split_header((PIPELINE / g["source_file"]).read_text(encoding="utf-8"))
    return pages


def run(models: list[str], slugs: list[str] | None, run_id: str, client=None, key: str | None = None, sleep=time.sleep, which: str = "dev") -> Path:
    import httpx

    out_dir = RUNS / run_id
    client = client or httpx.Client()
    key = key or api_key()
    pages = golden_pages(slugs, which)
    for slug, page in pages.items():
        for model in models:  # alternate models so each one's per-minute limit recovers
            path = out_dir / model / f"{slug}.json"
            if path.exists():
                continue
            record = extract_one(client, key, model, slug, page, sleep=sleep)
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(json.dumps(record, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"{model} {slug}: {record.get('error') or 'ok'}", flush=True)
            sleep(CONFIG["seconds_between_calls"])
    return out_dir


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--models", nargs="+", choices=sorted(CONFIG["models"]), required=True)
    ap.add_argument("--slugs", nargs="*")
    ap.add_argument("--set", choices=sorted(SETS), default="dev", help="dev = the 30 golden schemes; heldout = the final 10")
    ap.add_argument("--run-id")
    args = ap.parse_args(argv)
    suffix = "" if args.set == "dev" else f"-{args.set}"
    run_id = args.run_id or f"{datetime.date.today().isoformat()}-{prompt_version()}{suffix}"
    print(run(args.models, args.slugs, run_id, which=args.set))
    return 0


if __name__ == "__main__":
    sys.exit(main())
