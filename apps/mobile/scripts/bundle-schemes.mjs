/* global console */
// Generate src/generated/schemes.json from pipeline/golden/schemes (never edit the output by hand).
// The app checks eligibility with no internet, so it ships this snapshot inside the app.
// `version` is a short hash of the content: it changes whenever any rule or text changes.
import { createHash } from "node:crypto";
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

const version = createHash("sha256").update(JSON.stringify(schemes)).digest("hex").slice(0, 12);
writeFileSync(out, JSON.stringify({ version, schemes }, null, 2) + "\n");
console.log(`wrote src/generated/schemes.json: ${schemes.length} schemes, version ${version}`);
