import {
  CASTE_CATEGORIES,
  EDUCATION_LEVELS,
  FIELDS,
  GENDERS,
  MARITAL_STATUSES,
  type Field,
  type Profile,
} from "@schemematch/engine";

/**
 * "XX" means "another state". No scheme has state XX, so state schemes simply don't apply,
 * while the state question still counts as answered.
 */
export const STATES = ["MH", "WB", "XX"] as const;

export type FieldInput =
  | { kind: "int"; min: number }
  | { kind: "number"; min: number }
  | { kind: "choice"; options: readonly string[] }
  | { kind: "yesno" }
  | { kind: "text" };

/** How each engine field is asked. Every engine field is here (a test checks it). */
export const INPUTS: Record<Field, FieldInput> = {
  state: { kind: "choice", options: STATES },
  district: { kind: "text" },
  age: { kind: "int", min: 0 },
  gender: { kind: "choice", options: GENDERS },
  marital_status: { kind: "choice", options: MARITAL_STATUSES },
  annual_family_income: { kind: "number", min: 0 },
  caste_category: { kind: "choice", options: CASTE_CATEGORIES },
  occupation: { kind: "text" },
  land_acres: { kind: "number", min: 0 },
  disability_percent: { kind: "number", min: 0 },
  is_student: { kind: "yesno" },
  education_level: { kind: "choice", options: EDUCATION_LEVELS },
  household_size: { kind: "int", min: 1 },
  has_bpl_card: { kind: "yesno" },
  children_count: { kind: "int", min: 0 },
  is_pregnant_or_lactating: { kind: "yesno" },
};

/** The order the form shows fields in. Every field appears exactly once (a test checks it). */
export const GROUPS: { id: "person" | "household" | "work" | "health"; fields: Field[] }[] = [
  {
    id: "person",
    fields: ["age", "gender", "marital_status", "caste_category", "disability_percent"],
  },
  {
    id: "household",
    fields: [
      "state",
      "district",
      "annual_family_income",
      "has_bpl_card",
      "household_size",
      "children_count",
      "land_acres",
    ],
  },
  { id: "work", fields: ["is_student", "education_level", "occupation"] },
  { id: "health", fields: ["is_pregnant_or_lactating"] },
];

export type FormValues = Partial<Record<Field, string>>;

/**
 * Turn form values into an engine profile. A blank answer is left out, because to the
 * engine "not answered" (UNKNOWN) is different from "no" (FAIL).
 * Returns the fields whose text can't be read as an answer, so the form can point at them.
 */
export function toProfile(values: FormValues): { profile: Profile; invalid: Field[] } {
  const profile: Record<string, unknown> = {};
  const invalid: Field[] = [];
  for (const field of FIELDS) {
    const raw = values[field]?.trim() ?? "";
    if (raw === "") continue;
    const input = INPUTS[field];
    switch (input.kind) {
      case "int":
        if (/^\d+$/.test(raw) && Number(raw) >= input.min) profile[field] = Number(raw);
        else invalid.push(field);
        break;
      case "number":
        if (/^\d+(\.\d+)?$/.test(raw) && Number(raw) >= input.min) profile[field] = Number(raw);
        else invalid.push(field);
        break;
      case "choice":
        if (input.options.includes(raw)) profile[field] = raw;
        else invalid.push(field);
        break;
      case "yesno":
        if (raw === "yes" || raw === "no") profile[field] = raw === "yes";
        else invalid.push(field);
        break;
      case "text":
        profile[field] = raw;
        break;
    }
  }
  return { profile: profile as Profile, invalid };
}
