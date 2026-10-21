import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/build-app.js";
import { FileSchemeRepository, GOLDEN_DIR } from "../src/repository.js";

const repo = new FileSchemeRepository(GOLDEN_DIR);
const WEB = "https://schemematch-web.vercel.app";
const PREVIEW = /^https:\/\/schemematch-web-[a-z0-9-]+-zakuroooos-projects\.vercel\.app$/;
type App = Awaited<ReturnType<typeof buildApp>>;
let app: App | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

const start = async (webOrigins?: (string | RegExp)[]) =>
  (app = await buildApp({ repo, ...(webOrigins ? { webOrigins } : {}) }));
const post = (a: App, origin: string) =>
  a.inject({
    method: "POST",
    url: "/eligibility",
    headers: { origin },
    payload: { profile: { age: 30 } },
  });
const preflight = (a: App, origin: string) =>
  a.inject({
    method: "OPTIONS",
    url: "/eligibility",
    headers: {
      origin,
      "access-control-request-method": "POST",
      "access-control-request-headers": "content-type",
    },
  });

describe("CORS", () => {
  it("lets the web app's own origin read answers", async () => {
    const a = await start([WEB, PREVIEW]);
    const res = await post(a, WEB);
    expect(res.statusCode).toBe(200);
    expect(res.headers["access-control-allow-origin"]).toBe(WEB);
  });

  it("allows this project's preview deploys by pattern", async () => {
    const a = await start([WEB, PREVIEW]);
    const ok = "https://schemematch-web-abc123-zakuroooos-projects.vercel.app";
    expect((await post(a, ok)).headers["access-control-allow-origin"]).toBe(ok);
  });

  it.each([
    "https://evil.example.com",
    "https://schemematch-web.vercel.app.evil.com",
    "https://schemematch-web-abc-someoneelse.vercel.app",
    "http://schemematch-web.vercel.app",
  ])("gives no CORS header to %s", async (origin) => {
    const a = await start([WEB, PREVIEW]);
    expect((await post(a, origin)).headers["access-control-allow-origin"]).toBeUndefined();
  });

  it("answers the browser's preflight for allowed origins only", async () => {
    const a = await start([WEB]);
    const ok = await preflight(a, WEB);
    expect(ok.statusCode).toBe(204);
    expect(ok.headers["access-control-allow-origin"]).toBe(WEB);
    expect(String(ok.headers["access-control-allow-methods"])).toContain("POST");
    expect(
      (await preflight(a, "https://evil.example.com")).headers["access-control-allow-origin"],
    ).toBeUndefined();
  });

  it("allows no browser origin when none is configured (the default)", async () => {
    const a = await start();
    expect((await post(a, WEB)).headers["access-control-allow-origin"]).toBeUndefined();
  });
});
