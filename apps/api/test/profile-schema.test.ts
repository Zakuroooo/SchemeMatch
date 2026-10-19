import { describe, expect, it } from "vitest";
import { FIELDS } from "@schemematch/engine";
import { PROFILE_FIELDS, ProfileSchema } from "../src/profile-schema.ts";

describe("ProfileSchema", () => {
  it("covers exactly the engine's fields", () => {
    expect([...PROFILE_FIELDS].sort()).toEqual([...FIELDS].sort());
  });

  it("accepts an empty profile (nothing answered yet) and a full one", () => {
    expect(ProfileSchema.safeParse({}).success).toBe(true);
    const sunita = {
      state: "MH",
      gender: "female",
      age: 38,
      marital_status: "widow",
      annual_family_income: 60000,
      has_bpl_card: true,
    };
    expect(ProfileSchema.safeParse(sunita).success).toBe(true);
  });

  it.each(["name", "phone", "aadhaar", "address", "email"])(
    "rejects identifying field %s",
    (key) => {
      expect(ProfileSchema.safeParse({ age: 30, [key]: "x" }).success).toBe(false);
    },
  );

  it.each([
    ["age as text", { age: "38" }],
    ["fractional age", { age: 38.5 }],
    ["age over 120", { age: 150 }],
    ["negative income", { annual_family_income: -1 }],
    ["unknown gender", { gender: "unknown" }],
    ["lowercase state", { state: "mh" }],
    ["disability over 100", { disability_percent: 140 }],
    ["made-up class", { education_level: "class_13" }],
  ])("rejects %s", (_name, profile) => {
    expect(ProfileSchema.safeParse(profile).success).toBe(false);
  });
});
