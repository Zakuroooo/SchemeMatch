import { describe, expect, it } from "vitest";
import { checkEligibility } from "@/lib/api";

const respond = (status: number, body: unknown = {}) =>
  (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe("checkEligibility", () => {
  it("sends the profile as JSON and returns the data", async () => {
    let sent: RequestInit | undefined;
    const fetcher = (async (_url: string, init: RequestInit) => {
      sent = init;
      return new Response(JSON.stringify({ eligible: [] }), { status: 200 });
    }) as unknown as typeof fetch;
    const r = await checkEligibility({ age: 38 }, fetcher);
    expect(r).toEqual({ ok: true, data: { eligible: [] } });
    expect(JSON.parse(String(sent?.body))).toEqual({ profile: { age: 38 } });
  });

  it.each([
    [429, "rate_limited"],
    [400, "invalid"],
    [500, "unknown"],
  ] as const)("maps HTTP %i to %s", async (status, error) => {
    expect(await checkEligibility({}, respond(status))).toEqual({ ok: false, error });
  });

  it("reports a network failure", async () => {
    const down = (async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect(await checkEligibility({}, down)).toEqual({ ok: false, error: "network" });
  });
});
