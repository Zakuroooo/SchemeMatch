"""Prompt v1 for rule extraction.

Built only from the labelling guide's rules, the field list and three few-shot schemes that are
NOT in the golden set (leakage rule, docs/EVALS.md §2). Frozen before the first run: its content
hash is the prompt version recorded in every run and report.
"""

import hashlib
import json

from .fetch import split_header
from .strict_schema import FIELDS, OPS, output_schema
from .validate import ROOT, ENUMS

FEWSHOT = ROOT / "pipeline/fewshot"

SYSTEM = f"""You turn the eligibility rules of an Indian government scheme into structured JSON.
You get the text of one official scheme page. Return only what the page says.

OUTPUT
- "eligibility": an "all" group (AND). Children are conditions or nested groups:
  {{"all": [...]}} means every child must hold; {{"any": [...]}} means at least one must hold.
- A condition is {{"field", "op", "value", "source_quote"}}.
- "unmodelled": criteria the page states that no field below can express, each with its quote.
- "ambiguous": short notes on anything unclear, conflicting or vague on the page.

RULES
1. One condition per criterion the text states. Never infer or add common knowledge.
   "Women aged 21 to 65" is two conditions: gender = female and age between [21, 65].
2. source_quote must be copied word for word from the page: a short exact phrase or sentence.
3. Numbers exactly as written. Rupees as whole numbers: "Rs 2.5 lakh" -> 250000.
   "below 21" -> lt 21; "up to 21" or "not exceeding 21" -> lte 21; "21 or above" -> gte 21;
   "21 to 65" -> between [21, 65] (inclusive). If inclusive/exclusive is unclear, add an ambiguous note.
4. "and", or a list of requirements -> all. "or", "either", "any of" -> any.
5. Exclusions count too. If no field can express one (e.g. "not an income-tax payer",
   "not a government employee", "has a bank account"), put it in unmodelled with its quote.
6. Residency in a state scheme is handled outside the rules: never add a state condition.
   Put a residency line in unmodelled.
7. Vague limits ("generally", "commonly", "as prescribed", no number given) are not conditions:
   put them in unmodelled and add an ambiguous note.
8. If nothing on the page can be expressed with the fields, return {{"all": []}} and list
   everything in unmodelled.

FIELDS (use only these, with these values)
{", ".join(FIELDS)}
- gender: {", ".join(sorted(ENUMS["gender"]))}
- marital_status: {", ".join(sorted(ENUMS["marital_status"]))}
- caste_category: {", ".join(sorted(ENUMS["caste_category"]))} (social category; "economically weaker" in
  the plain-language sense is not EWS unless the page names the EWS category)
- education_level: the class or course the person is in: class_1 ... class_12, diploma,
  undergraduate, postgraduate
- age, annual_family_income (rupees per year), land_acres, disability_percent, household_size,
  children_count: numbers
- is_student, has_bpl_card, is_pregnant_or_lactating: true/false (use eq)
- state: two-letter code; district, occupation: free text

OPERATORS: {", ".join(OPS)}. in/not_in take a list; between takes [min, max].
"""


def _user(page: str) -> str:
    return f"Scheme page text:\n<<<\n{page.strip()}\n>>>"


def fewshot_messages() -> list[dict]:
    msgs = []
    for path in sorted((FEWSHOT / "examples").glob("*.json")):
        _, page = split_header((FEWSHOT / "sources" / f"{path.stem}.txt").read_text(encoding="utf-8"))
        answer = json.loads(path.read_text(encoding="utf-8"))
        msgs += [
            {"role": "user", "content": _user(page)},
            {"role": "assistant", "content": json.dumps(answer, ensure_ascii=False)},
        ]
    return msgs


def messages(page: str) -> list[dict]:
    return [{"role": "system", "content": SYSTEM}, *fewshot_messages(), {"role": "user", "content": _user(page)}]


def prompt_version() -> str:
    """Content hash of everything the model sees except the scheme page itself."""
    blob = json.dumps([SYSTEM, fewshot_messages(), output_schema()], ensure_ascii=False, sort_keys=True)
    return "p1-" + hashlib.sha256(blob.encode()).hexdigest()[:10]
