import { z } from "zod";
import type { Field } from "@schemematch/engine";

// One validator per profile field. Ranges are generous but stop impossible values.
const shape = {
  state: z.string().regex(/^[A-Z]{2}$/, "two-letter state code, e.g. MH"),
  district: z.string().min(2).max(60),
  age: z.int().min(0).max(120),
  gender: z.enum(["female", "male", "other"]),
  marital_status: z.enum(["single", "married", "widow", "divorced", "abandoned"]),
  annual_family_income: z.number().min(0).max(1_000_000_000),
  caste_category: z.enum(["SC", "ST", "OBC", "General", "EWS"]),
  occupation: z.string().min(2).max(60),
  land_acres: z.number().min(0).max(100_000),
  disability_percent: z.number().min(0).max(100),
  is_student: z.boolean(),
  education_level: z.string().regex(/^(class_([1-9]|1[0-2])|diploma|undergraduate|postgraduate)$/),
  household_size: z.int().min(1).max(50),
  has_bpl_card: z.boolean(),
  children_count: z.int().min(0).max(30),
  is_pregnant_or_lactating: z.boolean(),
} satisfies Record<Field, z.ZodType>;

/**
 * The only shape a profile may have. `strictObject` rejects any extra key, so a client
 * can never send us a name, phone or Aadhaar number by mistake (PRIVACY-SECURITY §2).
 * Every field is optional: an unanswered question is simply absent.
 */
export const ProfileSchema = z.strictObject(shape).partial();
export type ProfileInput = z.infer<typeof ProfileSchema>;

/** `satisfies Record<Field, …>` above already fails compilation if a field is missing. */
export const PROFILE_FIELDS = Object.keys(shape) as Field[];
