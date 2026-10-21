import { randomBytes } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/build-app.js";
import { FileSchemeRepository, GOLDEN_DIR, type SchemeRepository } from "../src/repository.js";

const files = new FileSchemeRepository(GOLDEN_DIR);
// Made fresh for each run, so no secret-looking text sits in the code (secret scanners).
const SECRET = randomBytes(16).toString("hex");
type App = Awaited<ReturnType<typeof buildApp>>;
let app: App | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

/** Records every call, so the test can see the cron really asked for fresh data. */
function spyRepo() {
  const calls: { fresh?: boolean }[] = [];
  const repo: SchemeRepository = {
    listLive: async (opts = {}) => {
      calls.push(opts);
      return files.listLive();
    },
  };
  return { repo, calls };
}

const hit = (a: App, authorization?: string) =>
  a.inject({
    method: "GET",
    url: "/cron/keepalive",
    headers: authorization ? { authorization } : {},
  });

describe("GET /cron/keepalive", () => {
  it("does one fresh read when Vercel's cron sends the secret", async () => {
    const { repo, calls } = spyRepo();
    app = await buildApp({ repo, cronSecret: SECRET });
    const res = await hit(app, `Bearer ${SECRET}`);
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, schemes: 30 });
    expect(calls).toEqual([{ fresh: true }]);
  });

  it.each([
    ["no header", undefined],
    ["a wrong secret", "Bearer wrong-secret"],
    ["the secret without Bearer", SECRET],
    ["a longer secret", `Bearer ${SECRET}x`],
  ])("refuses %s with 401 and reads nothing", async (_why, authorization) => {
    const { repo, calls } = spyRepo();
    app = await buildApp({ repo, cronSecret: SECRET });
    expect((await hit(app, authorization)).statusCode).toBe(401);
    expect(calls).toEqual([]);
  });

  it("refuses everyone when no secret is configured", async () => {
    const { repo, calls } = spyRepo();
    app = await buildApp({ repo });
    expect((await hit(app, "Bearer ")).statusCode).toBe(401);
    expect((await hit(app, "Bearer undefined")).statusCode).toBe(401);
    expect(calls).toEqual([]);
  });
});
