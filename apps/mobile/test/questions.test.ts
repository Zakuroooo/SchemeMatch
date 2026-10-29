import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { FIELDS } from "@schemematch/engine";
import { QUESTIONS, parseTyped } from "@/lib/questions";
import { SCHEMES, SNAPSHOT_VERSION } from "@/lib/schemes";

describe("questions", () => {
  it("every engine field can be asked", () => {
    expect(Object.keys(QUESTIONS).sort()).toEqual([...FIELDS].sort());
  });

  it("number and text limits match the API's profile schema", () => {
    // Read the API's schema source, so a change there fails here.
    const api = readFileSync(join(__dirname, "../../api/src/profile-schema.ts"), "utf8");
    for (const [field, q] of Object.entries(QUESTIONS)) {
      if (q.kind !== "int" && q.kind !== "number" && q.kind !== "text") continue;
      const line = api.split("\n").find((l) => l.trim().startsWith(`${field}:`)) ?? "";
      const num = (s: string) => Number(s.replaceAll("_", ""));
      const [, min] = /\.min\(([\d_]+)\)/.exec(line) ?? [];
      const [, max] = /\.max\(([\d_]+)\)/.exec(line) ?? [];
      expect([field, num(min ?? "NaN"), num(max ?? "NaN")]).toEqual([field, q.min, q.max]);
    }
  });

  it.each([
    ["age", "38", 38],
    ["age", " ৩৮ ", 38], // Bengali digits
    ["annual_family_income", "1,20,000", 120000], // Indian thousands commas
    ["land_acres", "1.5", 1.5],
    ["district", "Pune", "Pune"],
  ] as const)("reads %s %j as %j", (field, raw, expected) => {
    expect(parseTyped(field, raw)).toBe(expected);
  });

  it.each([
    ["age", "thirty"],
    ["age", "121"],
    ["age", "3.5"],
    ["age", ""],
    ["household_size", "0"],
    ["disability_percent", "101"],
    ["district", "P"],
    ["has_bpl_card", "yes"], // yes/no questions are tapped, never typed
  ] as const)("refuses %s %j", (field, raw) => {
    expect(parseTyped(field, raw)).toBeNull();
  });
});

describe("bundled schemes", () => {
  it("are exactly the golden files, so the app answers like the API", () => {
    const dir = join(__dirname, "../../../pipeline/golden/schemes");
    const golden = readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")));
    expect(SCHEMES.map((s) => s.slug)).toEqual(golden.map((g) => g.slug));
    for (const [i, s] of SCHEMES.entries()) {
      expect(s.eligibility).toEqual(golden[i].eligibility);
      expect(s.unmodelled).toEqual(golden[i].unmodelled);
      expect(s.text).toEqual(golden[i].text);
    }
    expect(SNAPSHOT_VERSION).toMatch(/^[0-9a-f]{12}$/);
  });
});
