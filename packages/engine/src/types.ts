// Rule format v1 — the contract described in docs/DATA.md §3.
// Python (pipeline) and TypeScript (engine) must agree on this shape.

export const RULE_FORMAT_VERSION = 1;

/** Profile fields a rule may test. Coarse and non-identifying by design (DATA.md §6). */
export const FIELDS = [
  "state",
  "district",
  "age",
  "gender",
  "marital_status",
  "annual_family_income",
  "caste_category",
  "occupation",
  "land_acres",
  "disability_percent",
  "is_student",
  "education_level",
  "household_size",
  "has_bpl_card",
  "children_count",
  "is_pregnant_or_lactating",
] as const;

export type Field = (typeof FIELDS)[number];

// Allowed answers, as runtime lists so the API's validation and the web form use exactly
// these values (one source of truth). The types are derived from them.
export const GENDERS = ["female", "male", "other"] as const;
export const MARITAL_STATUSES = ["single", "married", "widow", "divorced", "abandoned"] as const;
export const CASTE_CATEGORIES = ["SC", "ST", "OBC", "General", "EWS"] as const;
/** The class or course the person is in now (pipeline/golden/GUIDE.md rule 8). */
export const EDUCATION_LEVELS = [
  "class_1",
  "class_2",
  "class_3",
  "class_4",
  "class_5",
  "class_6",
  "class_7",
  "class_8",
  "class_9",
  "class_10",
  "class_11",
  "class_12",
  "diploma",
  "undergraduate",
  "postgraduate",
] as const;

export type Gender = (typeof GENDERS)[number];
export type MaritalStatus = (typeof MARITAL_STATUSES)[number];
export type CasteCategory = (typeof CASTE_CATEGORIES)[number];
export type EducationLevel = (typeof EDUCATION_LEVELS)[number];

/** What we know about a person. Every field is optional: unanswered means UNKNOWN. */
export interface Profile {
  state?: string;
  district?: string;
  age?: number;
  gender?: Gender;
  marital_status?: MaritalStatus;
  annual_family_income?: number;
  caste_category?: CasteCategory;
  occupation?: string;
  land_acres?: number;
  disability_percent?: number;
  is_student?: boolean;
  education_level?: string;
  household_size?: number;
  has_bpl_card?: boolean;
  children_count?: number;
  is_pregnant_or_lactating?: boolean;
}

type Scalar = string | number | boolean;

interface ConditionBase {
  field: Field;
  /** Exact sentence from the official source that justifies this condition. */
  source_quote: string;
}

/** One leaf test. The operator decides the shape of `value`. */
export type Condition = ConditionBase &
  (
    | { op: "eq" | "neq"; value: Scalar }
    | { op: "in" | "not_in"; value: readonly (string | number)[] }
    | { op: "lt" | "lte" | "gt" | "gte"; value: number }
    | { op: "between"; value: readonly [min: number, max: number] }
  );

export type Op = Condition["op"];

/** `all` = every child must pass (AND); `any` = at least one must pass (OR). */
export type Group = { all: readonly RuleNode[] } | { any: readonly RuleNode[] };

export type RuleNode = Condition | Group;

/** Three-valued result: UNKNOWN means a needed field was not answered yet. */
export type Tri = "PASS" | "FAIL" | "UNKNOWN";

/** A criterion the source states but no profile field can express (DATA.md §3). */
export interface UnmodelledCriterion {
  text: string;
  source_quote: string;
}

/** The parts of a scheme the engine needs. Extra fields (texts, documents) are ignored. */
export interface Scheme {
  slug: string;
  level: "central" | "state";
  /** Two-letter state code for state schemes, e.g. "MH". */
  state: string | null;
  /** Defaults to 1 when absent; any other version is refused (fail closed). */
  rule_format_version?: number;
  eligibility: RuleNode;
  unmodelled?: readonly UnmodelledCriterion[];
}

export interface SchemeResult {
  slug: string;
  result: Tri;
  /** Source quotes of every condition that passed — the "why you qualify". */
  reasons: string[];
  /** The first condition that made the scheme fail — the "closest miss". */
  failed: Condition | null;
  /** Unanswered fields that could still change an UNKNOWN result. */
  missing: Field[];
  /** Criteria the user must confirm themselves (from `unmodelled`). */
  also_confirm: string[];
}
