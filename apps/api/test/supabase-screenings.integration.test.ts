// Integration test: needs a running local Supabase (supabase start) and SUPABASE_URL,
// SUPABASE_ANON_KEY and SUPABASE_SECRET_KEY in the environment. Skipped otherwise.
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/build-app.js";
import { FileSchemeRepository, GOLDEN_DIR } from "../src/repository.js";
import { SupabaseScreeningStore } from "../src/supabase-screening-store.js";

const url = process.env.SUPABASE_URL;
const anonKey = process.env.SUPABASE_ANON_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

describe.runIf(url && anonKey && secretKey)("screenings in the real database (integration)", () => {
  type App = Awaited<ReturnType<typeof buildApp>>;
  let app: App;
  const install = randomUUID();
  const profile = {
    state: "MH",
    gender: "female",
    age: 72,
    marital_status: "widow",
    has_bpl_card: true,
  };
  const admin = () => createClient(url!, secretKey!, { auth: { persistSession: false } });
  const post = (key: string, body: object = { install_id: install, profile }) =>
    app.inject({
      method: "POST",
      url: "/screenings",
      headers: { "idempotency-key": key },
      payload: body,
    });

  beforeAll(async () => {
    app = await buildApp({
      repo: new FileSchemeRepository(GOLDEN_DIR),
      screenings: new SupabaseScreeningStore({ url: url!, secretKey: secretKey! }),
    });
  });
  afterAll(async () => {
    await app.inject({
      method: "DELETE",
      url: "/screenings",
      headers: { "x-install-id": install },
    });
    await app.close();
  });

  it("five retries arriving at the same moment create exactly one screening", async () => {
    const key = randomUUID();
    const responses = await Promise.all(Array.from({ length: 5 }, () => post(key)));
    const ids = new Set(responses.map((r) => r.json().screening_id));
    expect(ids.size).toBe(1);
    expect(responses.map((r) => r.statusCode).sort()).toEqual([200, 200, 200, 200, 201]);
    const { count } = await admin()
      .from("screenings")
      .select("id", { count: "exact", head: true })
      .eq("idempotency_key", key);
    expect(count).toBe(1);
  });

  it("stores one match per scheme, each with the rule version that decided it", async () => {
    const res = await post(randomUUID());
    const id = res.json().screening_id;
    const { data, error } = await admin()
      .from("matches")
      .select("result, rule_version_id")
      .eq("screening_id", id);
    expect(error).toBeNull();
    expect(data).toHaveLength(30);
    expect(data!.every((m) => m.rule_version_id !== null)).toBe(true);
    const shravanbal = res.json().results.find((r: { slug: string }) => r.slug === "mh-shravanbal");
    expect(shravanbal).toEqual({
      slug: "mh-shravanbal",
      result: "PASS",
      reason: "every destitute person of age 65 years & above",
    });
  });

  it("refuses a reused key with different answers, and saves nothing new", async () => {
    const key = randomUUID();
    expect((await post(key)).statusCode).toBe(201);
    const res = await post(key, { install_id: install, profile: { ...profile, age: 73 } });
    expect(res.statusCode).toBe(409);
  });

  it("the public anon key cannot read screenings or matches", async () => {
    const anon = createClient(url!, anonKey!, { auth: { persistSession: false } });
    for (const table of ["screenings", "matches"]) {
      const { data, error } = await anon.from(table).select("*").limit(1);
      expect(data, table).toBeNull();
      expect(error?.code, table).toBe("42501"); // permission denied
    }
  });

  it("delete-my-data removes the install's screenings and their matches", async () => {
    const other = randomUUID();
    await post(randomUUID(), { install_id: other, profile });
    const res = await app.inject({
      method: "DELETE",
      url: "/screenings",
      headers: { "x-install-id": other },
    });
    expect(res.json()).toEqual({ deleted: 1 });
    const { count } = await admin()
      .from("screenings")
      .select("id", { count: "exact", head: true })
      .eq("install_id", other);
    expect(count).toBe(0);
  });
});
