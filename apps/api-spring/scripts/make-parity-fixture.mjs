// Runs the ORIGINAL TypeScript engine and saves its full answers, so a Java test can prove
// that the port gives exactly the same ones. Needs Node 22.18+ and no npm install:
//   node scripts/make-parity-fixture.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { evaluateAll } from "../../../packages/engine/src/index.ts";

const repo = new URL("../../../", import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, repo), "utf8"));
const schemes = read("apps/api/src/generated/schemes.json");

// Small seeded random generator: the same profiles every run.
let seed = 2026;
const random = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const pick = (list) => list[Math.floor(random() * list.length)];
const classes = Array.from({ length: 12 }, (_, i) => `class_${i + 1}`);
const answers = {
  state: ["MH", "WB", "KA"],
  district: ["Gadchiroli", " gadchiroli ", "WASHIM", "Kolkata"],
  age: Array.from({ length: 90 }, (_, i) => i),
  gender: ["female", "male", "other"],
  marital_status: ["single", "married", "widow", "divorced", "abandoned"],
  annual_family_income: [0, 12000, 21000, 21000.5, 50000, 120000, 250000, 800000],
  caste_category: ["SC", "ST", "OBC", "General", "EWS"],
  occupation: ["farmer", "Street  Vendor", "student", "construction worker"],
  land_acres: [0, 0.5, 2, 5],
  disability_percent: [0, 40, 80, 100],
  is_student: [true, false],
  education_level: [...classes, "diploma", "undergraduate", "postgraduate"],
  household_size: [1, 4, 9],
  has_bpl_card: [true, false],
  children_count: [0, 1, 2, 4],
  is_pregnant_or_lactating: [true, false],
};
const randomProfile = () =>
  Object.fromEntries(
    Object.entries(answers)
      .filter(() => random() < 0.6)
      .map(([field, options]) => [field, pick(options)]),
  );

const profiles = [
  {},
  ...read("packages/engine/test/profiles/personas.json").cases.map((c) => c.profile),
  ...Array.from({ length: 20 }, randomProfile),
];
const cases = profiles.map((profile) => {
  const { results, next_question } = evaluateAll(schemes, profile);
  return { profile, next_question, results };
});
const out = new URL("../src/test/resources/ts-engine-results.json", import.meta.url);
writeFileSync(out, cases.map((c, i) => `${i ? "," : "["}${JSON.stringify(c)}\n`).join("") + "]\n");
console.log(`${cases.length} profiles x ${schemes.length} schemes`);
