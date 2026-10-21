import { Writable } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import { DISCLAIMER, buildApp } from "../src/build-app.js";
import { FileSchemeRepository, GOLDEN_DIR } from "../src/repository.js";
import { requestHash } from "../src/screening-store.js";
import { MemoryScreeningStore } from "./memory-screening-store.js";

const repo = new FileSchemeRepository(GOLDEN_DIR);
type App = Awaited<ReturnType<typeof buildApp>>;
let app: App | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

const RETRY_ID = "3f6c2b1e-8d4a-4c7e-9b2f-1a5d6e7f8a9b";
const INSTALL = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
const profile = { state: "WB", gender: "female", age: 62, marital_status: "widow" };

// Pass null for a server with no store (staging today).
async function setup(given?: MemoryScreeningStore | null) {
  const store = given === null ? undefined : (given ?? new MemoryScreeningStore());
  app = await buildApp({ repo, ...(store ? { screenings: store } : {}) });
  const post = (body: object, key: string | null = RETRY_ID) =>
    app!.inject({
      method: "POST",
      url: "/screenings",
      headers: key === null ? {} : { "idempotency-key": key },
      payload: body,
    });
  return { app, store, post };
}

describe("POST /screenings", () => {
  it("saves once, then answers a retry with the same stored result", async () => {
    const { post, store } = await setup();
    const first = await post({ install_id: INSTALL, profile });
    expect(first.statusCode).toBe(201);
    const body = first.json();
    expect(body.created).toBe(true);
    expect(body.disclaimer).toBe(DISCLAIMER);
    expect(body.results).toHaveLength(30);
    const taposili = body.results.find((r: { slug: string }) => r.slug === "wb-taposili-bandhu");
    expect(taposili.result).toBe("UNKNOWN"); // caste not answered yet

    const retry = await post({ install_id: INSTALL, profile });
    expect(retry.statusCode).toBe(200);
    expect(retry.json()).toEqual({ ...body, created: false });
    expect(store!.rows.size).toBe(1);
  });

  it("treats the same answers in a different key order as the same request", async () => {
    const { post } = await setup();
    await post({ install_id: INSTALL, profile });
    const reordered = Object.fromEntries(Object.entries(profile).reverse());
    expect((await post({ profile: reordered, install_id: INSTALL })).statusCode).toBe(200);
  });

  it("refuses the same key with different answers (409)", async () => {
    const { post, store } = await setup();
    await post({ install_id: INSTALL, profile });
    const res = await post({ install_id: INSTALL, profile: { ...profile, age: 63 } });
    expect(res.statusCode).toBe(409);
    expect(res.json().error.code).toBe("IDEMPOTENCY_KEY_REUSED");
    expect(store!.rows.size).toBe(1);
  });

  it("stores the reason quote for passes and the closest miss for fails", async () => {
    const { post } = await setup();
    const full = {
      ...profile,
      caste_category: "SC",
      annual_family_income: 30000,
      has_bpl_card: true,
    };
    const results = (await post({ install_id: INSTALL, profile: full })).json().results;
    const pass = results.find((r: { slug: string }) => r.slug === "wb-taposili-bandhu");
    expect(pass).toEqual({
      slug: "wb-taposili-bandhu",
      result: "PASS",
      reason: "Must belongto the Scheduled Caste (SC) community",
    });
    const fail = results.find((r: { slug: string }) => r.slug === "pm-sym"); // age 62 > 40
    expect(fail.result).toBe("FAIL");
    expect(fail.reason).toBe("Age should be between18 and 40 years at the time of enrollment.");
  });

  it.each([
    ["no Idempotency-Key", { install_id: INSTALL, profile }, null],
    ["a key that is not a UUID", { install_id: INSTALL, profile }, "retry-1"],
    ["no install_id", { profile }, RETRY_ID],
    [
      "an identifying field",
      { install_id: INSTALL, profile: { ...profile, aadhaar: "1234" } },
      RETRY_ID,
    ],
    ["an extra top-level field", { install_id: INSTALL, profile, name: "Sunita" }, RETRY_ID],
  ])("rejects %s with 400 and saves nothing", async (_why, body, key) => {
    const { post, store } = await setup();
    const res = await post(body, key);
    expect(res.statusCode).toBe(400);
    expect(store!.rows.size).toBe(0);
  });

  it("answers 503 when no store is set up (staging today)", async () => {
    const { post } = await setup(null);
    const res = await post({ install_id: INSTALL, profile });
    expect(res.statusCode).toBe(503);
    expect(res.json().error.code).toBe("STORAGE_UNAVAILABLE");
  });

  it("never writes the profile or the install id to the logs", async () => {
    let logs = "";
    const stream = new Writable({
      write(chunk, _enc, done) {
        logs += chunk.toString();
        done();
      },
    });
    app = await buildApp({
      repo,
      screenings: new MemoryScreeningStore(),
      logger: { level: "trace", stream },
    });
    await app.inject({
      method: "POST",
      url: "/screenings",
      headers: { "idempotency-key": RETRY_ID },
      payload: { install_id: INSTALL, profile: { district: "Zzyzxdistrict" } },
    });
    expect(logs).toContain("incoming request");
    expect(logs).not.toContain("Zzyzxdistrict");
    expect(logs).not.toContain(INSTALL);
  });
});

describe("DELETE /screenings (delete my data)", () => {
  it("removes every screening of that install and nothing else", async () => {
    const { app: a, post, store } = await setup();
    await post({ install_id: INSTALL, profile });
    await post(
      { install_id: INSTALL, profile: { ...profile, age: 63 } },
      "4f6c2b1e-8d4a-4c7e-9b2f-1a5d6e7f8a9b",
    );
    const other = "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d";
    await post({ install_id: other, profile }, "5f6c2b1e-8d4a-4c7e-9b2f-1a5d6e7f8a9b");
    const res = await a.inject({
      method: "DELETE",
      url: "/screenings",
      headers: { "x-install-id": INSTALL },
    });
    expect(res.json()).toEqual({ deleted: 2 });
    expect(store!.rows.size).toBe(1);
  });

  it("rejects a missing or malformed install id, and answers 503 without a store", async () => {
    const { app: a } = await setup();
    const del = (x: App, headers: Record<string, string>) =>
      x.inject({ method: "DELETE", url: "/screenings", headers });
    expect((await del(a, {})).statusCode).toBe(400);
    expect((await del(a, { "x-install-id": "abc" })).statusCode).toBe(400);
    await a.close();
    const { app: b } = await setup(null);
    expect((await del(b, { "x-install-id": INSTALL })).statusCode).toBe(503);
  });

  it("never writes the install id to the logs", async () => {
    let logs = "";
    const stream = new Writable({
      write(chunk, _enc, done) {
        logs += chunk.toString();
        done();
      },
    });
    app = await buildApp({
      repo,
      screenings: new MemoryScreeningStore(),
      logger: { level: "trace", stream },
    });
    await app.inject({
      method: "DELETE",
      url: "/screenings",
      headers: { "x-install-id": INSTALL },
    });
    expect(logs).toContain("incoming request");
    expect(logs).not.toContain(INSTALL);
  });
});

describe("requestHash", () => {
  it("ignores key order and undefined values, but not values", () => {
    const a = requestHash({ install_id: INSTALL, profile: { age: 1, gender: "female" } });
    const b = requestHash({
      profile: { gender: "female", age: 1, district: undefined },
      install_id: INSTALL,
    } as never);
    const c = requestHash({ install_id: INSTALL, profile: { age: 2, gender: "female" } });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});
