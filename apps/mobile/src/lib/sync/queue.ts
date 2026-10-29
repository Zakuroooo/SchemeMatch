import { FIELDS, type Profile } from "@schemematch/engine";

/**
 * The on-device queue of saved screenings, as pure functions (no storage, no network, no clock).
 * A row leaves the queue only when the server confirms it, or when retrying can never help.
 */

/** "queued": never tried yet. "retrying": a try failed in a way that may pass later. */
export type Status = "queued" | "retrying";

export interface QueuedScreening {
  /** The Idempotency-Key: made once per screening and sent on every try, so a retry can't duplicate. */
  key: string;
  /** Random UUID made once on this phone. Never a name, phone or ID number. */
  installId: string;
  /** Engine fields only (see `onlyEngineFields`). */
  profile: Profile;
  /** Milliseconds since 1970. */
  createdAt: number;
  status: Status;
  /** Failed tries so far. */
  attempts: number;
  /** Not tried again before this time (ms). */
  nextTryAt: number;
}

/**
 * Keep only the engine's own fields, and drop unanswered ones. The API rejects any other key,
 * and this way nothing else the app may hold in future can ride along by mistake.
 */
export function onlyEngineFields(profile: Profile): Profile {
  const clean: Record<string, unknown> = {};
  for (const f of FIELDS) if (profile[f] !== undefined) clean[f] = profile[f];
  return clean as Profile;
}

export function newScreening(
  installId: string,
  profile: Profile,
  now: number,
  key: string,
): QueuedScreening {
  return {
    key,
    installId,
    profile: onlyEngineFields(profile),
    createdAt: now,
    status: "queued",
    attempts: 0,
    nextTryAt: now,
  };
}

export const RETRY_FIRST_MS = 30_000;
export const RETRY_MAX_MS = 60 * 60_000;

/** Wait before the next try after `attempts` failures: 30 s, 1 min, 2 min, 4 min… at most 1 hour. */
export function backoff(attempts: number): number {
  return Math.min(RETRY_FIRST_MS * 2 ** Math.max(0, attempts - 1), RETRY_MAX_MS);
}

/** What the server's answer means for a queued row. */
export type Outcome = "sent" | "drop" | "retry";

/**
 * - 201 saved now, 200 saved before (a retry): done, remove it.
 * - 409 the key came back with different answers: retrying can't fix that, so drop it.
 * - network error, 408, 429 and any 5xx (503 = the server has no database yet): try later.
 * - any other 4xx (e.g. 400): the request itself is wrong and always will be, so drop it.
 */
export function outcomeOf(status: number | "network"): Outcome {
  if (status === "network") return "retry";
  if (status === 200 || status === 201) return "sent";
  if (status === 408 || status === 429 || status >= 500) return "retry";
  return "drop";
}

export function afterFailure(row: QueuedScreening, now: number): QueuedScreening {
  const attempts = row.attempts + 1;
  return { ...row, status: "retrying", attempts, nextTryAt: now + backoff(attempts) };
}

/** Rows whose wait is over, oldest first. */
export function due(rows: readonly QueuedScreening[], now: number): QueuedScreening[] {
  return rows.filter((r) => r.nextTryAt <= now).sort((a, b) => a.createdAt - b.createdAt);
}

/** When the next row becomes due, or null for an empty queue. */
export function nextWake(rows: readonly QueuedScreening[]): number | null {
  return rows.length === 0 ? null : Math.min(...rows.map((r) => r.nextTryAt));
}
