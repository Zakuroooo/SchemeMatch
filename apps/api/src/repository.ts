import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Scheme } from "@schemematch/engine";
import bundled from "./generated/schemes.json" with { type: "json" };

/** What the API needs to know about a scheme: the engine's rules plus display text. */
export interface CatalogScheme extends Scheme {
  official_url: string;
  category: string;
  text: { en: { title: string; benefit: string; how_to_apply: string } };
}

/** Where schemes come from: files, the bundle, or Supabase, with no route changes. */
export interface SchemeRepository {
  /** `fresh` skips any cache, so the call really reaches the data source (keep-alive). */
  listLive(opts?: { fresh?: boolean }): Promise<CatalogScheme[]>;
}

/** Reads the golden scheme files once and serves them from memory. */
export class FileSchemeRepository implements SchemeRepository {
  private readonly schemes: CatalogScheme[];

  constructor(dir: string) {
    this.schemes = readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .map((f) => JSON.parse(readFileSync(join(dir, f), "utf8")) as CatalogScheme);
  }

  async listLive(): Promise<CatalogScheme[]> {
    return this.schemes;
  }
}

export const GOLDEN_DIR = join(import.meta.dirname, "../../../pipeline/golden/schemes");

/** The golden schemes bundled into the API at build time (src/generated/schemes.json). */
export class BundledSchemeRepository implements SchemeRepository {
  async listLive(): Promise<CatalogScheme[]> {
    return bundled as CatalogScheme[];
  }
}
