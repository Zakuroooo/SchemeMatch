import type { Field, Profile } from "@schemematch/engine";

/** The shape `POST /eligibility` answers with (apps/api/src/build-app.ts). */
export interface EligibilityResponse {
  eligible: {
    slug: string;
    title: string;
    benefit: string;
    official_url: string;
    reasons: string[];
    also_confirm: string[];
  }[];
  need_info: { slug: string; title: string; missing: Field[]; other_ways: string[] }[];
  not_eligible: {
    slug: string;
    title: string;
    closest_miss: string | null;
    /** another state's scheme, and the person lives elsewhere */
    other_state: boolean;
    other_ways: string[];
  }[];
  next_question: Field | null;
  disclaimer: string;
}

export type CheckError = "network" | "rate_limited" | "invalid" | "unknown";
export type CheckResult =
  { ok: true; data: EligibilityResponse } | { ok: false; error: CheckError };

/** Base URL of the API. Set NEXT_PUBLIC_API_URL for staging; local default is the dev API. */
export const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:3001").replace(
  /\/$/,
  "",
);

/**
 * Called from the browser, not from our server, so each person counts against the API's
 * rate limit on their own (a server-side call would put everyone behind one address).
 */
export async function checkEligibility(
  profile: Profile,
  fetcher: typeof fetch = fetch,
): Promise<CheckResult> {
  let res: Response;
  try {
    res = await fetcher(`${API_URL}/eligibility`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile }),
    });
  } catch {
    return { ok: false, error: "network" };
  }
  if (res.status === 429) return { ok: false, error: "rate_limited" };
  if (res.status === 400) return { ok: false, error: "invalid" };
  if (!res.ok) return { ok: false, error: "unknown" };
  return { ok: true, data: (await res.json()) as EligibilityResponse };
}
