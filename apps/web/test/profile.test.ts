import { FIELDS } from "@schemematch/engine";
import { describe, expect, it } from "vitest";
import { GROUPS, INPUTS, toProfile } from "@/lib/profile";
import bn from "../messages/bn.json";
import en from "../messages/en.json";

type Tree = { [key: string]: string | Tree };
const get = (t: Tree, path: string) =>
  path
    .split(".")
    .reduce<string | Tree | undefined>(
      (node, k) => (typeof node === "object" ? node[k] : undefined),
      t,
    );

describe("form spec", () => {
  it("asks every engine field exactly once", () => {
    const shown = GROUPS.flatMap((g) => g.fields);
    expect([...shown].sort()).toEqual([...FIELDS].sort());
    expect(new Set(shown).size).toBe(shown.length);
    expect(Object.keys(INPUTS).sort()).toEqual([...FIELDS].sort());
  });
});

describe("labels", () => {
  it("every field and every option has a label in both languages", () => {
    for (const m of [en, bn] as Tree[]) {
      for (const [field, input] of Object.entries(INPUTS)) {
        expect(get(m, `form.fields.${field}`), field).toBeTypeOf("string");
        if (input.kind === "choice") {
          for (const opt of input.options)
            expect(get(m, `form.options.${field}.${opt}`), `${field}.${opt}`).toBeTypeOf("string");
        }
      }
    }
  });
});

describe("toProfile", () => {
  it("leaves blanks out, because 'not answered' is not 'no'", () => {
    const { profile, invalid } = toProfile({ age: "", has_bpl_card: "", gender: "  " });
    expect(profile).toEqual({});
    expect(invalid).toEqual([]);
  });

  it("reads numbers, yes/no and choices", () => {
    const { profile, invalid } = toProfile({
      age: "38",
      annual_family_income: "60000",
      land_acres: "1.5",
      has_bpl_card: "yes",
      is_student: "no",
      gender: "female",
      state: "MH",
      district: "  Nashik ",
    });
    expect(invalid).toEqual([]);
    expect(profile).toEqual({
      age: 38,
      annual_family_income: 60000,
      land_acres: 1.5,
      has_bpl_card: true,
      is_student: false,
      gender: "female",
      state: "MH",
      district: "Nashik",
    });
  });

  it("flags answers it can't read instead of guessing", () => {
    const { profile, invalid } = toProfile({
      age: "thirty",
      household_size: "0",
      children_count: "2.5",
      gender: "woman",
      has_bpl_card: "maybe",
    });
    expect(profile).toEqual({});
    expect([...invalid].sort()).toEqual([
      "age",
      "children_count",
      "gender",
      "has_bpl_card",
      "household_size",
    ]);
  });
});
