import type { Profile } from "@schemematch/engine";
import {
  RETRY_FIRST_MS,
  RETRY_MAX_MS,
  afterFailure,
  backoff,
  due,
  newScreening,
  nextWake,
  onlyEngineFields,
  outcomeOf,
} from "@/lib/sync/queue";

const ID = "6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b";
const KEY = "0b7e8c1d-2f3a-4b5c-9d6e-7f8091a2b3c4";

describe("queue rows", () => {
  it("a new row keeps only engine fields that were answered", () => {
    const profile = { state: "MH", age: 38, gender: undefined, name: "Sunita" } as Profile;
    const row = newScreening(ID, profile, 1_000, KEY);
    expect(row).toEqual({
      key: KEY,
      installId: ID,
      profile: { state: "MH", age: 38 },
      createdAt: 1_000,
      status: "queued",
      attempts: 0,
      nextTryAt: 1_000,
    });
    expect(onlyEngineFields({ has_bpl_card: false })).toEqual({ has_bpl_card: false }); // false is an answer
  });

  it("a failure keeps the same key and waits longer each time", () => {
    const first = afterFailure(newScreening(ID, {}, 0, KEY), 0);
    expect(first).toMatchObject({ key: KEY, status: "retrying", attempts: 1, nextTryAt: 30_000 });
    const second = afterFailure(first, 30_000);
    expect(second).toMatchObject({ key: KEY, attempts: 2, nextTryAt: 30_000 + 60_000 });
  });
});

describe("back-off", () => {
  it("doubles from 30 seconds and stops at 1 hour", () => {
    expect([1, 2, 3, 4].map(backoff)).toEqual([30_000, 60_000, 120_000, 240_000]);
    expect(backoff(1)).toBe(RETRY_FIRST_MS);
    expect(backoff(8)).toBe(RETRY_MAX_MS); // 30 s × 128 would be 64 min
    expect(backoff(50)).toBe(RETRY_MAX_MS);
  });
});

describe("what the server's answer means", () => {
  it.each([
    [201, "sent"],
    [200, "sent"],
    [409, "drop"],
    [400, "drop"],
    [503, "retry"],
    [500, "retry"],
    [429, "retry"],
    [408, "retry"],
    ["network", "retry"],
  ] as const)("%s → %s", (status, outcome) => expect(outcomeOf(status)).toBe(outcome));
});

describe("which rows to send", () => {
  const a = { ...newScreening(ID, {}, 2_000, "a"), nextTryAt: 2_000 };
  const b = { ...newScreening(ID, {}, 1_000, "b"), nextTryAt: 9_000 };
  const c = { ...newScreening(ID, {}, 500, "c"), nextTryAt: 500 };

  it("only rows whose wait is over, oldest first", () => {
    expect(due([a, b, c], 5_000).map((r) => r.key)).toEqual(["c", "a"]);
    expect(due([a, b, c], 100)).toEqual([]);
  });

  it("wakes for the soonest row, or never for an empty queue", () => {
    expect(nextWake([a, b])).toBe(2_000);
    expect(nextWake([])).toBeNull();
  });
});
