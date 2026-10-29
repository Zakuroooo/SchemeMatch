import type { Profile } from "@schemematch/engine";
import { randomUUID } from "node:crypto";
import { memoryStore, type QueueStore } from "@/lib/sync/store";
import { createSync, type Sync } from "@/lib/sync/sync";

const API = "https://api.example.test";
const SUNITA: Profile = { state: "MH", age: 38, marital_status: "widow", has_bpl_card: true };

/**
 * What the fake server does with the next request:
 * "ok" behaves like the real API (201 new, 200 same key again, 409 same key with other answers);
 * "lost" saves it but the answer never reaches the phone (weak network);
 * "network" never reaches the server; a number is answered as that status.
 */
type Reply = "ok" | "lost" | "network" | number;

interface Call {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

function fakeApi(...script: Reply[]) {
  const saved = new Map<string, { installId: string; body: string }>();
  const calls: Call[] = [];
  const answer = (status: number) => ({ status }) as Response;
  const offline = () => Promise.reject(new TypeError("Network request failed"));
  const fakeFetch = (async (url: string, init: RequestInit) => {
    const headers = init.headers as Record<string, string>;
    calls.push({ method: init.method!, url, headers, body: init.body as string | undefined });
    const next = script.shift() ?? "ok";
    if (next === "network") return offline();
    if (typeof next === "number") return answer(next);
    if (init.method === "DELETE") {
      for (const [k, v] of saved) if (v.installId === headers["x-install-id"]) saved.delete(k);
      return answer(200);
    }
    const key = headers["idempotency-key"]!;
    const body = init.body as string;
    const before = saved.get(key);
    if (before && before.body !== body) return answer(409);
    saved.set(key, { installId: (JSON.parse(body) as { install_id: string }).install_id, body });
    return next === "lost" ? offline() : answer(before ? 200 : 201);
  }) as unknown as typeof fetch;
  return { fetch: fakeFetch, calls, saved };
}

let clock = 0;
let store: QueueStore;
let sync: Sync;
let logs: string[];

function start(api: ReturnType<typeof fakeApi>, options: { timeoutMs?: number } = {}) {
  store = memoryStore();
  logs = [];
  sync = createSync({
    store,
    fetch: api.fetch,
    apiUrl: API,
    uuid: randomUUID,
    now: () => clock,
    log: (m) => logs.push(m),
    ...options,
  });
  return api;
}

beforeEach(() => {
  clock = 1_000_000;
});
afterEach(() => sync.stop());

describe("sending a saved screening", () => {
  it("201: sent once with its key in a header, answers only in the body, then removed", async () => {
    const api = start(fakeApi());
    const key = await sync.save(SUNITA); // saving starts a send in the background
    await sync.sync(); // waits for it
    expect(await store.all()).toEqual([]);

    const post = api.calls.find((c) => c.method === "POST")!;
    expect(post.url).toBe(`${API}/screenings`); // nothing about the person in the URL
    expect(post.headers["idempotency-key"]).toBe(key);
    const body = JSON.parse(post.body!) as { install_id: string; profile: Profile };
    expect(Object.keys(body).sort()).toEqual(["install_id", "profile"]);
    expect(body.profile).toEqual(SUNITA);
    expect(api.saved.size).toBe(1);
  });

  it("200 on a retry: the first answer was lost, the retry sends the same key, still one copy", async () => {
    const api = start(fakeApi("lost"));
    const key = await sync.save(SUNITA); // saves, then tries in the background: lost
    await sync.sync(); // waits for that try; this row isn't due again yet
    expect(api.saved.size).toBe(1); // the server did save it
    expect(await store.all()).toHaveLength(1); // but the phone doesn't know, so it keeps it

    clock += 30_000;
    expect(await sync.sync()).toEqual({ sent: 1, dropped: 0, waiting: 0 });
    const posts = api.calls.filter((c) => c.method === "POST");
    expect(posts).toHaveLength(2);
    expect(posts.map((p) => p.headers["idempotency-key"])).toEqual([key, key]);
    expect(api.saved.size).toBe(1); // a retry never duplicates
  });

  it("409: logged and dropped, without the answers in the log", async () => {
    start(fakeApi(409));
    await sync.save(SUNITA);
    await sync.sync();
    expect(await store.all()).toEqual([]);
    expect(logs).toEqual(["sync: dropped a screening, the server answered 409"]);
    expect(logs.join(" ")).not.toMatch(/MH|widow|38/);
  });

  it("503 (no database yet): kept and retried after the wait, never before", async () => {
    const api = start(fakeApi(503, 503));
    await sync.save(SUNITA);
    await sync.sync();
    expect(await store.all()).toEqual([
      expect.objectContaining({ status: "retrying", attempts: 1, nextTryAt: clock + 30_000 }),
    ]);

    clock += 29_000;
    await sync.sync(); // not due yet: nothing is sent
    expect(api.calls).toHaveLength(1);

    clock += 1_000;
    await sync.sync(); // 503 again: waits twice as long
    expect(api.calls).toHaveLength(2);
    expect((await store.all())[0]).toMatchObject({ attempts: 2, nextTryAt: clock + 60_000 });

    clock += 60_000;
    expect(await sync.sync()).toEqual({ sent: 1, dropped: 0, waiting: 0 });
  });

  it("network error: kept, and each failure waits longer (30 s, 1 min, 2 min)", async () => {
    start(fakeApi("network", "network", "network"));
    await sync.save(SUNITA);
    await sync.sync();
    const waits: number[] = [];
    for (let i = 0; i < 3; i++) {
      const [row] = await store.all();
      waits.push(row!.nextTryAt - clock);
      clock = row!.nextTryAt;
      await sync.sync();
    }
    expect(waits).toEqual([30_000, 60_000, 120_000]);
    expect(await store.all()).toEqual([]); // the 4th try went through
  });

  it("a request that hangs counts as a network error after the timeout", async () => {
    const hanging = ((_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) =>
        init.signal!.addEventListener("abort", () => reject(new Error("aborted"))),
      )) as unknown as typeof fetch;
    start({ fetch: hanging, calls: [], saved: new Map() }, { timeoutMs: 20 });
    await sync.save(SUNITA);
    expect(await sync.sync()).toEqual({ sent: 0, dropped: 0, waiting: 1 });
    expect((await store.all())[0]).toMatchObject({ status: "retrying", attempts: 1 });
  });

  it("retries on its own when the wait is over", async () => {
    jest.useFakeTimers();
    try {
      const api = start(fakeApi(503));
      await sync.save(SUNITA);
      await sync.sync();
      expect(await store.all()).toHaveLength(1);
      clock += 30_000;
      await jest.advanceTimersByTimeAsync(30_000);
      await sync.sync(); // waits for the timer's run to finish
      expect(api.calls.filter((c) => c.method === "POST")).toHaveLength(2);
      expect(await store.all()).toEqual([]);
    } finally {
      jest.useRealTimers();
    }
  });

  it("several screenings: each keeps its own key, and all share one install ID", async () => {
    const api = start(fakeApi());
    const keys = [await sync.save(SUNITA), await sync.save({ ...SUNITA, age: 39 })];
    await sync.sync();
    const posts = api.calls.filter((c) => c.method === "POST");
    expect(new Set(posts.map((p) => p.headers["idempotency-key"]))).toEqual(new Set(keys));
    const ids = posts.map((p) => (JSON.parse(p.body!) as { install_id: string }).install_id);
    expect(new Set(ids).size).toBe(1);
    expect(ids[0]).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("never blocks the screen", () => {
  it("save returns as soon as the row is on the phone, even if the network never answers", async () => {
    const never = (() => new Promise(() => undefined)) as unknown as typeof fetch;
    start({ fetch: never, calls: [], saved: new Map() }, { timeoutMs: 20 });
    await sync.save(SUNITA);
    expect(await store.all()).toEqual([expect.objectContaining({ profile: SUNITA })]);
  });
});

describe("delete my data", () => {
  it("clears the phone, deletes on the server by header, and starts a fresh install ID", async () => {
    const api = start(fakeApi("ok", "network"));
    await sync.save(SUNITA); // sent
    await sync.save(SUNITA); // network error: still queued
    await sync.sync();
    expect(await store.all()).toHaveLength(1);
    const oldId = await store.getSetting("install_id");

    expect(await sync.deleteMyData()).toEqual({ local: 1, server: "deleted" });
    expect(await store.all()).toEqual([]);
    expect(api.saved.size).toBe(0);
    const del = api.calls.find((c) => c.method === "DELETE")!;
    expect(del.url).toBe(`${API}/screenings`);
    expect(del.headers["x-install-id"]).toBe(oldId);

    await sync.save(SUNITA);
    expect(await store.getSetting("install_id")).not.toBe(oldId);
  });

  it("offline: the phone is cleared now, and the server delete is retried on the next sync", async () => {
    const api = start(fakeApi("ok", "network"));
    await sync.save(SUNITA);
    await sync.sync();
    expect(await sync.deleteMyData()).toEqual({ local: 0, server: "pending" });
    expect(api.saved.size).toBe(1); // still on the server

    await sync.save({ ...SUNITA, age: 40 }); // a new screening, under a new install ID
    await sync.sync();
    expect(await store.getSetting("pending_deletes")).toBeNull();
    // Only the new screening is left on the server: the old one is gone, the new one survived.
    expect([...api.saved.values()].map((v) => JSON.parse(v.body) as { profile: Profile })).toEqual([
      expect.objectContaining({ profile: { ...SUNITA, age: 40 } }),
    ]);
  });

  it("503 on delete stays pending rather than claiming the server copy is gone", async () => {
    start(fakeApi("ok", 503));
    await sync.save(SUNITA);
    await sync.sync();
    expect(await sync.deleteMyData()).toEqual({ local: 0, server: "pending" });
  });

  it("a phone that never saved anything makes no request", async () => {
    const api = start(fakeApi());
    expect(await sync.deleteMyData()).toEqual({ local: 0, server: "none" });
    expect(api.calls).toEqual([]);
  });

  // 503 would normally put the row back for a retry; "ok" checks the server delete runs after
  // the send has landed, so the server keeps nothing either way.
  it.each([503, "ok"] as const)(
    "a send already in flight (%s) can't bring a deleted screening back",
    async (reply) => {
      let finish!: () => void;
      const api = fakeApi(reply);
      const slow = (async (url: string, init: RequestInit) => {
        if (init.method === "POST") await new Promise<void>((r) => (finish = r));
        return api.fetch(url, init);
      }) as unknown as typeof fetch;
      start({ ...api, fetch: slow });
      await sync.save(SUNITA);
      await new Promise((r) => setTimeout(r, 0)); // the background send now waits on the network
      const deleting = sync.deleteMyData();
      await new Promise((r) => setTimeout(r, 0));
      expect(await store.all()).toEqual([]); // the phone is cleared at once
      finish();
      expect(await deleting).toEqual({ local: 1, server: "deleted" });
      expect(await store.all()).toEqual([]);
      expect(api.saved.size).toBe(0);
    },
  );
});
