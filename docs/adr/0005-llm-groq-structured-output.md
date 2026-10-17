# 0005 — Groq open models with structured output for rule extraction
Status: Accepted · Date: 2026-10-18

## Context
Turning scheme text into rule JSON by hand does not scale past ~30 schemes. An LLM can draft; a human must approve.

## Options
1. Groq free tier (open models, fast), JSON-schema-constrained output.
2. Paid frontier API.
3. Local model on Kaggle T4.

## Decision
Option 1 for the pipeline; compare **two models** (one large, one small) in EVALS.md. Kaggle remains a fallback for batch runs.

## Why
- Free and fast enough for 30–100 schemes; structured output removes most parsing failures.
- Two-model comparison (accuracy vs cost vs latency) is a real experiment for the README.

## Consequences
- Free-tier rate limits → pipeline runs are batch jobs with retry/back-off, never in the request path.
- Model names change; pin the exact model IDs in `pipeline/config.yaml` and record them in every eval report.
- Every rule needs a `source_quote` that literally exists in the source text, or it is auto-rejected (EVALS.md §4).
