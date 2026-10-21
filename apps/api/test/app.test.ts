import { Writable } from "node:stream";
import { afterEach, describe, expect, it } from "vitest";
import { DISCLAIMER, buildApp } from "../src/build-app.js";
import { FileSchemeRepository, GOLDEN_DIR } from "../src/repository.js";

const repo = new FileSchemeRepository(GOLDEN_DIR);
type App = Awaited<ReturnType<typeof buildApp>>;
let app: App | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});
const start = async (opts: Partial<Parameters<typeof buildApp>[0]> = {}) =>
  (app = await buildApp({ repo, ...opts }));

const sunita = {
  state: "MH",
  gender: "female",
  age: 38,
  marital_status: "widow",
  annual_family_income: 60000,
  has_bpl_card: true,
  children_count: 2,
  is_pregnant_or_lactating: false,
  disability_percent: 0,
  land_acres: 0,
  caste_category: "OBC",
};

describe("GET /health", () => {
  it("is ok", async () => {
    const res = await (await start()).inject("/health");
    expect(res.json()).toEqual({ ok: true });
  });
});

describe("GET /schemes", () => {
  it("lists all 30 schemes without their rules", async () => {
    const body = (await (await start()).inject("/schemes")).json();
    expect(body.schemes).toHaveLength(30);
    expect(body.schemes[0]).not.toHaveProperty("eligibility");
  });

  it("filters to central schemes plus one state's schemes", async () => {
    const body = (await (await start()).inject("/schemes?state=WB")).json();
    const states = new Set(body.schemes.map((s: { state: string | null }) => s.state));
    expect(states).toEqual(new Set([null, "WB"]));
  });

  it("rejects a bad state code", async () => {
    const res = await (await start()).inject("/schemes?state=westbengal");
    expect(res.statusCode).toBe(400);
  });
});

describe("POST /eligibility", () => {
  const post = async (payload: unknown) =>
    (await start()).inject({ method: "POST", url: "/eligibility", payload: payload as object });

  it("gives Sunita her eleven schemes with reasons and the disclaimer", async () => {
    const res = await post({ profile: sunita });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.eligible.map((e: { slug: string }) => e.slug).sort()).toEqual(
      [
        "apy",
        "e-shram",
        "mh-ladki-bahin",
        "mh-sanjay-gandhi-niradhar",
        "nfbs",
        "pm-sym",
        "pm-vishwakarma",
        "pmjdy",
        "pmjjby",
        "pmsby",
        "pmuy",
      ].sort(),
    );
    const ladki = body.eligible.find((e: { slug: string }) => e.slug === "mh-ladki-bahin");
    expect(ladki.reasons).toContain("with an annual family income of less than ₹2.5 lakh");
    expect(body.disclaimer).toBe(DISCLAIMER);
    expect(body.need_info).toEqual([]);
  });

  it("shows a qualifying widow only real reasons and real requirements", async () => {
    const body = (await post({ profile: sunita })).json();
    const sg = body.eligible.find((e: { slug: string }) => e.slug === "mh-sanjay-gandhi-niradhar");
    expect(sg.reasons).toContain("Destitute widows");
    expect(sg.reasons).not.toContain("divorced women not receiving alimony"); // she isn't divorced
    expect(sg.reasons).not.toContain("Scheme of the state MH: for its residents");
    expect(new Set(sg.reasons).size).toBe(sg.reasons.length);
    expect(sg.also_confirm).not.toContain("Orphaned children"); // another way to qualify, not a requirement
  });

  it("marks other states' schemes and lists other ways to qualify", async () => {
    const body = (await post({ profile: sunita })).json();
    const wb = body.not_eligible.find((e: { slug: string }) => e.slug === "wb-annapurna");
    expect(wb.other_state).toBe(true);
    const pmmvy = body.not_eligible.find((e: { slug: string }) => e.slug === "pmmvy");
    expect(pmmvy.other_state).toBe(false);
    expect(pmmvy.other_ways).toContain("Holds an e-Shram card");
  });

  it("explains the closest miss", async () => {
    const body = (await post({ profile: sunita })).json();
    const widow = body.not_eligible.find((e: { slug: string }) => e.slug === "ignwps");
    expect(widow.closest_miss).toBe("A widow in age group of 40 to 79 years");
    expect(widow.title).toBe("Indira Gandhi National Widow Pension Scheme");
  });

  it("asks a next question when the profile is empty", async () => {
    const body = (await post({ profile: {} })).json();
    expect(body.eligible).toEqual([]);
    expect(body.next_question).toBe("age");
  });

  it.each([
    ["an identifying field", { profile: { age: 30, name: "Sunita" } }],
    ["a wrongly typed age", { profile: { age: "38" } }],
    ["extra top-level data", { profile: {}, phone: "9999999999" }],
    ["no profile at all", {}],
  ])("rejects %s with 400 and does not echo values", async (_name, payload) => {
    const res = await post(payload);
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe("VALIDATION_ERROR");
    expect(res.body).not.toContain("Sunita");
    expect(res.body).not.toContain("9999999999");
  });
});

describe("errors and limits", () => {
  it("returns the standard error shape for unknown routes", async () => {
    const res = await (await start()).inject("/nope");
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: { code: "NOT_FOUND", message: "No such route." } });
  });

  it("rate-limits a client after the allowed number of requests", async () => {
    const a = await start({ rateLimitPerMinute: 3 });
    const codes = [];
    for (let i = 0; i < 4; i++) codes.push((await a.inject("/health")).statusCode);
    expect(codes).toEqual([200, 200, 200, 429]);
    expect((await a.inject("/health")).json().error.code).toBe("RATE_LIMITED");
  });

  it("ignores client-supplied IP headers when no proxy header is configured", async () => {
    const a = await start({ rateLimitPerMinute: 1 });
    const hit = (ip: string) =>
      a.inject({ url: "/health", headers: { "x-forwarded-for": ip, "x-real-ip": ip } });
    expect((await hit("1.1.1.1")).statusCode).toBe(200);
    expect((await hit("2.2.2.2")).statusCode).toBe(429); // faking a new IP does not reset the limit
  });

  it("gives each real client its own bucket behind a proxy that sets the IP header", async () => {
    const a = await start({ rateLimitPerMinute: 1, clientIpHeader: "x-real-ip" });
    const hit = (ip: string) => a.inject({ url: "/health", headers: { "x-real-ip": ip } });
    expect((await hit("1.1.1.1")).statusCode).toBe(200);
    expect((await hit("2.2.2.2")).statusCode).toBe(200); // a different user is not blocked
    expect((await hit("1.1.1.1")).statusCode).toBe(429);
  });

  it("returns 500 without details when something unexpected breaks", async () => {
    const broken = {
      listLive: async () => {
        throw new Error("db password is hunter2");
      },
    };
    const res = await (await start({ repo: broken })).inject("/schemes");
    expect(res.statusCode).toBe(500);
    expect(res.body).not.toContain("hunter2");
  });

  it("never writes a profile to the logs", async () => {
    let logs = "";
    const stream = new Writable({
      write(chunk, _enc, done) {
        logs += chunk.toString();
        done();
      },
    });
    const a = await start({ logger: { level: "trace", stream } });
    a.addHook("preHandler", async (req) => {
      req.log.info({ body: req.body }, "debug body");
    });
    await a.inject({
      method: "POST",
      url: "/eligibility",
      payload: { profile: { district: "Zzyzxdistrict" } },
    });
    expect(logs.length).toBeGreaterThan(0);
    expect(logs).not.toContain("Zzyzxdistrict");
  });

  it("never writes a client address to the logs", async () => {
    let logs = "";
    const stream = new Writable({
      write(chunk, _enc, done) {
        logs += chunk.toString();
        done();
      },
    });
    const a = await start({ logger: { level: "trace", stream } });
    await a.inject({ method: "GET", url: "/health", remoteAddress: "203.0.113.77" });
    expect(logs).toContain("incoming request");
    expect(logs).not.toContain("203.0.113.77");
  });
});
