import {
  CASTE_CATEGORIES,
  EDUCATION_LEVELS,
  GENDERS,
  MARITAL_STATUSES,
  type Field,
} from "@schemematch/engine";

/**
 * "XX" means "another state". No scheme has state XX, so state schemes simply don't apply,
 * while the state question still counts as answered (same as the web app).
 */
export const STATES = ["MH", "WB", "XX"] as const;

export type Question =
  | { kind: "int" | "number"; min: number; max: number }
  | { kind: "choice"; options: readonly string[] }
  | { kind: "yesno" }
  | { kind: "text"; min: number; max: number };

/** How each engine field is asked. Limits match the API's profile schema exactly (a test checks it). */
export const QUESTIONS: Record<Field, Question> = {
  state: { kind: "choice", options: STATES },
  district: { kind: "text", min: 2, max: 60 },
  age: { kind: "int", min: 0, max: 120 },
  gender: { kind: "choice", options: GENDERS },
  marital_status: { kind: "choice", options: MARITAL_STATUSES },
  annual_family_income: { kind: "number", min: 0, max: 1_000_000_000 },
  caste_category: { kind: "choice", options: CASTE_CATEGORIES },
  occupation: { kind: "text", min: 2, max: 60 },
  land_acres: { kind: "number", min: 0, max: 100_000 },
  disability_percent: { kind: "number", min: 0, max: 100 },
  is_student: { kind: "yesno" },
  education_level: { kind: "choice", options: EDUCATION_LEVELS },
  household_size: { kind: "int", min: 1, max: 50 },
  has_bpl_card: { kind: "yesno" },
  children_count: { kind: "int", min: 0, max: 30 },
  is_pregnant_or_lactating: { kind: "yesno" },
};

/**
 * Read a typed answer. Returns null when it can't be an answer (not a number, out of range,
 * too short), so the screen can say so instead of guessing.
 * Accepts Bengali digits (০-৯) and thousands commas, as people type them.
 */
export function parseTyped(field: Field, raw: string): number | string | null {
  const q = QUESTIONS[field];
  const text = raw
    .trim()
    .replace(/[০-৯]/g, (d) => String(d.charCodeAt(0) - 0x09e6))
    .replace(/,/g, "");
  if (q.kind === "text") return text.length >= q.min && text.length <= q.max ? text : null;
  if (q.kind !== "int" && q.kind !== "number") return null;
  const pattern = q.kind === "int" ? /^\d+$/ : /^\d+(\.\d+)?$/;
  if (!pattern.test(text)) return null;
  const n = Number(text);
  return n >= q.min && n <= q.max ? n : null;
}
