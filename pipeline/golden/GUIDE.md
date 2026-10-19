# Golden-set labelling guide

The golden set is the **answer key** the AI rule-extraction pipeline is scored against (docs/EVALS.md). If the key is wrong, every accuracy number is wrong. So: write only what the source says.

**How this set is made:** Claude drafts each rule with the exact quote from the official source; Pranay checks every condition against its quote using `VERIFY.md`. Label: *AI-drafted, human-verified*. A scheme counts only after `reviewed_by` is filled in.

## Rules
1. **One condition per criterion the text states.** Never infer. "Women of Maharashtra" means `gender = female` **and** `state = MH` (two conditions, both quoted).
2. **Quote exactly.** `source_quote` must be copied character-for-character from `pipeline/sources/<slug>.txt` (whitespace may differ). The test suite rejects quotes it can't find.
3. **Numbers exactly as written.** ₹2.5 lakh → `250000`. "Below 21 years" → `lt 21`, "up to 21" → `lte 21`, "21 to 65" → `between [21, 65]` (inclusive). If inclusive/exclusive is unclear, mark it ambiguous (rule 6).
4. **AND vs OR.** "and", commas listing requirements → `all`. "or", "either", "any of" → `any`.
5. **Exclusions are conditions too.** "Not an income-tax payer" can't be expressed with our fields → note it in `unmodelled` (rule 7), don't drop it silently.
6. **Ambiguity:** add `"ambiguous": ["<what is unclear>"]` at the scheme level. Ambiguous parts are excluded from accuracy and counted separately.
7. **Unmodelled criteria** (no matching profile field, e.g. "not a government employee", "has a bank account linked to Aadhaar") go in `"unmodelled": [{ "text": "...", "source_quote": "..." }]`. The app shows them as "you must also confirm…" instead of guessing.
8. **Field values** use the enums in `packages/engine/src/types.ts` (e.g. `marital_status: widow`, `caste_category: SC`, state codes like `MH`, `WB`).
9. **Never put golden files in a prompt** or few-shot example (leakage rule, EVALS §2).

## Scheme file shape (`golden/schemes/<slug>.json`)
```json
{
  "slug": "…", "level": "central|state", "state": "MH|WB|null", "category": "…",
  "official_url": "https://…", "source_file": "sources/<slug>.txt",
  "eligibility": { "all": [ … ] },
  "unmodelled": [ { "text": "…", "source_quote": "…" } ],
  "ambiguous": [],
  "documents": [ { "key": "aadhaar", "mandatory": true } ],
  "text": { "en": { "title": "…", "benefit": "…", "how_to_apply": "…" } },
  "drafted_by": "claude", "reviewed_by": null, "reviewed_at": null
}
```
