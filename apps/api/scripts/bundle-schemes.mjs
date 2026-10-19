/* global console */
// Generate src/generated/schemes.json from pipeline/golden/schemes (never edit the output by hand).
// Deployed functions can't read the repo's pipeline/ folder at runtime, so the API ships this copy.
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const golden = join(import.meta.dirname, "../../../pipeline/golden/schemes");
const out = join(import.meta.dirname, "../src/generated/schemes.json");
const keep = [
  "slug",
  "level",
  "state",
  "category",
  "official_url",
  "eligibility",
  "unmodelled",
  "text",
];

const schemes = readdirSync(golden)
  .filter((f) => f.endsWith(".json"))
  .sort()
  .map((f) => JSON.parse(readFileSync(join(golden, f), "utf8")))
  .map((s) => Object.fromEntries(keep.map((k) => [k, s[k]])));

writeFileSync(out, JSON.stringify(schemes, null, 2) + "\n");
console.log(`wrote src/generated/schemes.json with ${schemes.length} schemes`);
