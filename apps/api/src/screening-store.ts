import { createHash } from "node:crypto";
import type { Profile, SchemeResult, Tri } from "@schemematch/engine";

/** One scheme's result as it is stored with a screening. */
export interface MatchResult {
  slug: string;
  result: Tri;
  /** PASS: first quote from the scheme's own rules. FAIL: the closest-miss quote. UNKNOWN: null. */
  reason: string | null;
}

export interface SaveRequest {
  idempotencyKey: string;
  requestHash: string;
  installId: string;
  channel: "app";
  profile: Profile;
  matches: MatchResult[];
}

export interface SavedScreening {
  screening_id: string;
  /** false when this was a retry of a screening already saved */
  created: boolean;
  results: MatchResult[];
}

/** The same Idempotency-Key was sent with a different request. */
export class IdempotencyKeyReusedError extends Error {
  constructor() {
    super("This Idempotency-Key was already used for a different request.");
  }
}

/** Where screenings are saved. Saving must be exactly once per idempotency key. */
export interface ScreeningStore {
  save(req: SaveRequest): Promise<SavedScreening>;
  /** "Delete my data": removes every screening of one install; returns how many. */
  deleteInstall(installId: string): Promise<number>;
}

/** The stored reason: for a pass, the first reason quote; for a fail, the closest miss. */
export function toMatch(r: SchemeResult): MatchResult {
  const reason =
    r.result === "PASS"
      ? (r.reasons[0] ?? null)
      : r.result === "FAIL"
        ? (r.failed?.source_quote ?? null)
        : null;
  return { slug: r.slug, result: r.result, reason };
}

/** JSON with object keys sorted at every level, so equal requests hash equally. */
function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableJson(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function requestHash(body: { install_id: string; profile: Profile }): string {
  return createHash("sha256").update(stableJson(body)).digest("hex");
}
