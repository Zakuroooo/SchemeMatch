# Eval report: 2026-10-21-p1-e2013c178f-heldout

Models: A=`openai/gpt-oss-120b` · B=`openai/gpt-oss-20b` · Prompt: `p1-e2013c178f` · Code: `9480b79`
Settings: temperature 0, reasoning_effort low, max_completion_tokens 2000, max_request_tokens 8000
Golden: the **held-out 10**, labelled before any model saw them and never used to change the prompt. Labels are AI-drafted and AI-checked (human review pending). These are the final numbers.

| Model | Rows | P | R | F1 | Exact % | Quote/validator rejects | Too large / failed | ₹/scheme (list price) | s/scheme |
|---|---|---|---|---|---|---|---|---|---|
| A | all schemes (10) | 0.75 | 0.41 | 0.53 | 50 | 1 | 1 | 0.072 | 1.6 |
| A | all, excl. ambiguous_source (10) | 0.75 | 0.41 | 0.53 | 50 | 1 | 1 | 0.072 | 1.6 |
| A | schemes with a usable answer (9) | 0.75 | 0.45 | 0.56 | 56 | 1 | 0 | 0.072 | 1.6 |
| B | all schemes (10) | 0.43 | 0.27 | 0.33 | 10 | 2 | 1 | 0.032 | 1.0 |
| B | all, excl. ambiguous_source (10) | 0.55 | 0.27 | 0.36 | 10 | 2 | 1 | 0.032 | 1.0 |
| B | schemes with a usable answer (9) | 0.43 | 0.30 | 0.35 | 11 | 2 | 0 | 0.032 | 1.0 |

P = correct / predicted (validator rejects count as wrong). R = correct / golden. Exact = every condition and the grouping right. `ambiguous_source` = the model turned a line the golden set left as unmodelled or ambiguous into a condition.
Cost is at Groq list prices (USD→INR 84.0, 2026-10-20 (fixed planning rate, not a live quote)); the free tier charged ₹0.

## Model A: errors by label

| Label | Count |
|---|---|
| wrong_grouping | 1 |
| wrong_value | 0 |
| wrong_operator | 1 |
| wrong_field | 0 |
| missed_condition | 11 |
| invented_condition | 0 |
| ambiguous_source | 0 |
| rejected_by_validator | 1 |

**missed_condition**, examples:
- `mh-adolescent-girls`: golden `district in ('Dharashiv', 'Gadchiroli', 'Nandurbar', 'Osmanabad', 'Washim') (in all)` · predicted `-`
- `mh-adolescent-girls`: golden `is_student eq False (in all)` · predicted `-`
- `mh-amrut-ahar`: golden `is_pregnant_or_lactating eq True (in any)` · predicted `-`

**wrong_grouping**, examples:
- `sbm-g-ihhl`: golden `has_bpl_card eq True (in any)` · predicted `has_bpl_card eq True (in all)`

Not scored as model output (counted as full misses):
- `mh-amrut-ahar`: HTTP 400: {"error":{"message":"Generated JSON does not match the expected schema. Please adjust your prompt. See 'failed_generation' for more details. Error: jsonschema: '/eligibility' does not validate with /properties/eligibility/$ref/required: missing properties: 'all'","type":"invalid_request_error","code

| Scheme | Golden | Correct | Predicted | Exact | Errors |
|---|---|---|---|---|---|
| ddu-gky | 2 | 2 | 2 | yes | - |
| mh-adolescent-girls | 4 | 2 | 2 | no | missed_condition 2 |
| mh-amrut-ahar | 2 | 0 | 0 | no | missed_condition 2 |
| mh-atrocity-assistance | 1 | 1 | 1 | yes | - |
| naps | 1 | 1 | 1 | yes | - |
| pm-mudra | 1 | 0 | 1 | no | wrong_operator 1 |
| pmegp | 1 | 1 | 1 | yes | - |
| sbm-g-ihhl | 3 | 0 | 1 | no | wrong_grouping 1, missed_condition 2 |
| wb-minority-scholarships | 6 | 1 | 2 | no | missed_condition 5, rejected_by_validator 1 |
| wb-utkarsh-bangla | 1 | 1 | 1 | yes | - |

## Model B: errors by label

| Label | Count |
|---|---|
| wrong_grouping | 0 |
| wrong_value | 1 |
| wrong_operator | 1 |
| wrong_field | 0 |
| missed_condition | 14 |
| invented_condition | 1 |
| ambiguous_source | 3 |
| rejected_by_validator | 2 |

**missed_condition**, examples:
- `ddu-gky`: golden `has_bpl_card eq True (in all)` · predicted `-`
- `mh-adolescent-girls`: golden `is_student eq False (in all)` · predicted `-`
- `mh-amrut-ahar`: golden `is_pregnant_or_lactating eq True (in any)` · predicted `-`

**ambiguous_source**, examples:
- `naps`: golden `-` · predicted `education_level in ('class_10', 'class_11', 'class_12', 'class_5', 'class_6', 'class_7', 'class_8', 'class_9') (in all) quote: "Must have minimum educational qualification (Class V)"`
- `naps`: golden `-` · predicted `is_student eq False (in all) quote: "Not previously undergone apprenticeship in the same trade"`
- `pmegp`: golden `-` · predicted `education_level in ('class_10', 'class_11', 'class_12', 'class_8', 'class_9', 'diploma', 'postgraduate', 'undergraduate') (in all) quote: "Minimum 8th pass required"`

Not scored as model output (counted as full misses):
- `mh-amrut-ahar`: HTTP 400: {"error":{"message":"Generated JSON does not match the expected schema. Please adjust your prompt. See 'failed_generation' for more details. Error: jsonschema: '/eligibility' does not validate with /properties/eligibility/$ref/required: missing properties: 'all'","type":"invalid_request_error","code

| Scheme | Golden | Correct | Predicted | Exact | Errors |
|---|---|---|---|---|---|
| ddu-gky | 2 | 1 | 2 | no | missed_condition 1, rejected_by_validator 1 |
| mh-adolescent-girls | 4 | 2 | 3 | no | wrong_value 1, missed_condition 1 |
| mh-amrut-ahar | 2 | 0 | 0 | no | missed_condition 2 |
| mh-atrocity-assistance | 1 | 0 | 0 | no | missed_condition 1 |
| naps | 1 | 1 | 3 | no | ambiguous_source 2 |
| pm-mudra | 1 | 0 | 2 | no | wrong_operator 1, invented_condition 1 |
| pmegp | 1 | 1 | 2 | no | ambiguous_source 1 |
| sbm-g-ihhl | 3 | 0 | 0 | no | missed_condition 3 |
| wb-minority-scholarships | 6 | 0 | 1 | no | missed_condition 6, rejected_by_validator 1 |
| wb-utkarsh-bangla | 1 | 1 | 1 | yes | - |

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
