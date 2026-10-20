# Golden-set labelling guide

The golden set is the **answer key** the AI rule-extraction pipeline is scored against (docs/EVALS.md). If the key is wrong, every accuracy number is wrong. So: write only what the source says.

**How this set is made:** Claude drafts each rule with the exact quote from the official source; Pranay checks every condition against its quote using `VERIFY.md`. Label: *AI-drafted, human-verified*. A scheme counts only after `reviewed_by` is filled in.

## Rules
1. **One condition per criterion the text states.** Never infer. "Women aged 21 to 65" is two conditions: `gender = female` and `age between [21, 65]`, each quoted. Residency in a state scheme is already covered by the scheme's `state` field, so do not add a `state` condition.
2. **Quote exactly.** `source_quote` must be copied character-for-character from `pipeline/sources/<slug>.txt` (whitespace may differ). The test suite rejects quotes it can't find.
3. **Numbers exactly as written.** ₹2.5 lakh → `250000`. "Below 21 years" → `lt 21`, "up to 21" → `lte 21`, "21 to 65" → `between [21, 65]` (inclusive). If inclusive/exclusive is unclear, mark it ambiguous (rule 6).
4. **AND vs OR.** "and", commas listing requirements → `all`. "or", "either", "any of" → `any`.
5. **Exclusions are conditions too.** "Not an income-tax payer" can't be expressed with our fields → note it in `unmodelled` (rule 7), don't drop it silently.
6. **Ambiguity:** add `"ambiguous": ["<what is unclear>"]` at the scheme level. Ambiguous parts are excluded from accuracy and counted separately.
7. **Unmodelled criteria** (no matching profile field, e.g. "not a government employee", "has a bank account linked to Aadhaar") go in `"unmodelled": [{ "text": "...", "source_quote": "..." }]`. The app shows them as "you must also confirm…" instead of guessing.
8. **Field values** use the enums in `packages/engine/src/types.ts` (e.g. `marital_status: widow`, `caste_category: SC`, state codes like `MH`, `WB`). `education_level` uses `class_1` … `class_12`, `diploma`, `undergraduate`, `postgraduate`. It means the class or course the person is in **now**, so "must be studying in Classes V–VIII" is two conditions, both with that quote: `is_student = true` and `education_level in [class_5 … class_8]`. Use `is_student` alone when the page fixes no class. *(Written down on 2026-10-20 from how all 30 golden files already do it; the first eval showed the convention was implicit.)*
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
