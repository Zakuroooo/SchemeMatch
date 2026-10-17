# 0003 — Eligibility engine is a pure function over a JSON rule format
Status: Accepted · Date: 2026-10-18

## Context
The engine is the heart: a wrong answer tells a widow she gets nothing when she does. It must be testable, explainable, and run offline.

## Options
1. Pure TS function `evaluate(profile, schemes) → results`, rules stored as JSON (our own small format, spec in DATA.md).
2. A general rules engine library (json-rules-engine, OPA/Rego).
3. Ask an LLM at runtime "is she eligible?".

## Decision
Option 1.

## Why
- Pure function = no DB, no network → 120 hand-written profile tests run in milliseconds; same code offline.
- Our format is tiny (AND/OR groups, 8 operators, `unknown` handling) and carries `source_quote` per rule, so every answer can say **why** and cite the official text.
- Option 3 is non-deterministic and unexplainable for a benefits decision; LLMs are used only *offline* to draft rules a human approves (ADR 0005).

## Consequences
- We own the format → it needs a JSON Schema, versioning (`rule_format_version`), and property tests for operators.
- Three-valued logic (eligible / not eligible / need more info) must be designed carefully — see DATA.md §3.
