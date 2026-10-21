## How this run was kept honest
- The 10 schemes were labelled on 2026-10-21 **before** any model saw them (commit `2c7f87a`), with the same guide and tests as the 30.
- The prompt is the frozen v1 (`p1-e2013c178f`), the same one used on the dev set; nothing was changed after looking at these results.
- This is a single run. Running again with prompt changes would make this a tuning set, and a fresh held-out set would then be needed.

## Read these numbers with care
- **Small sample.** There are only 22 golden conditions in total, so one condition moves recall by about 4.5 points. Treat the F1 as rough.
- **Not a random sample.** I chose these 10 to test harder shapes: OR rules, a district list, two income limits by class level. That is part of why the scores are below the dev set's.
- **The labels are AI-checked, not human-reviewed**, like the dev set.
- **Target not met.** The PRD's target was F1 ≥ 0.90. The big model reached 0.53 over all 10 (0.56 on the 9 it answered).

## Every error of model A, read against the pages
- **mh-amrut-ahar: failed because of our schema, not the model.** The rule is naturally an OR (pregnant/lactating mothers **or** young children). Both models put `any` at the top, but our strict output schema only allows `all` there, so Groq rejected the answer. The same flaw caused model A's only failed answer on the dev set (mh-shravanbal, also an OR rule).
- **mh-adolescent-girls:** left out the 4-district limit and "not in school". The district list is stated plainly, so that's a real miss. "Not in school" comes from the description rather than the Beneficiaries line, which the label flags as ambiguous.
- **sbm-g-ihhl:** kept only BPL and dropped the SC/ST and disability alternatives, which makes the rule narrower than the page.
- **wb-minority-scholarships:**
  - missed the two income limits that depend on class level;
  - its education list included "doctorate", which isn't an allowed value, so the validator rejected it. The model did the same on the dev set.
- **pm-mudra: debatable label.** "Above 18 years of age" is labelled `gt 18` (flagged as ambiguous before the run); the model wrote `gte 18`, which many readers would also choose.
- **Fully correct:** ddu-gky, naps, pmegp, utkarsh-bangla and atrocity-assistance (5 of 10).

Model B made 14 misses, 3 `ambiguous_source`, and one each of wrong value, wrong operator and invented condition; 2 of its conditions were rejected by the validator.

## What this run says
- The big model is still clearly better than the small one (F1 0.53 vs 0.33). The small one isn't usable for this task as is.
- Both models do well on plain rules (an age band, a caste, BPL) and badly on **structure**: OR groups, rules that apply only to some classes, district lists.
- Two problems are ours to fix, not the models':
  1. allow `any` at the top of the output schema, and wrap it in `all` afterwards;
  2. tell the model plainly that only the listed `education_level` values exist.

## Next
Fix both, label a **new** held-out set (these 10 are now used up for prompt decisions), and run again. Until then, quote these numbers with their caveats: "F1 0.53 on 10 held-out schemes (22 conditions), AI-checked labels".
