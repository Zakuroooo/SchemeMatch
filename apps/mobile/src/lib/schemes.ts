import type { Scheme } from "@schemematch/engine";
import snapshot from "../generated/schemes.json";

/** A scheme as the app shows it: the engine's rules plus display text (English for now). */
export interface CatalogScheme extends Scheme {
  official_url: string;
  category: string;
  text: { en: { title: string; benefit: string; how_to_apply: string } };
}

/** The schemes bundled inside the app, so screening works with no internet. */
export const SCHEMES = snapshot.schemes as unknown as CatalogScheme[];

/** Short content hash of the bundled snapshot; shown in the app and used later for refresh. */
export const SNAPSHOT_VERSION: string = snapshot.version;
