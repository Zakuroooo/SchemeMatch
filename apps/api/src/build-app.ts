import { timingSafeEqual } from "node:crypto";
import Fastify, { type FastifyError, type FastifyServerOptions } from "fastify";
import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { z } from "zod";
import { evaluateAll, type Profile } from "@schemematch/engine";
import { ProfileSchema } from "./profile-schema.js";
import type { SchemeRepository } from "./repository.js";
import {
  IdempotencyKeyReusedError,
  requestHash,
  toMatch,
  type ScreeningStore,
} from "./screening-store.js";

export const DISCLAIMER =
  "You are likely eligible — please confirm at the office. SchemeMatch is not an official government app.";

export interface AppOptions {
  repo: SchemeRepository;
  /** Where screenings are saved. Without one, the save and delete routes answer 503. */
  screenings?: ScreeningStore;
  /**
   * Shared secret for the daily keep-alive cron (Vercel sends `Authorization: Bearer <it>`).
   * Without one, the cron route refuses everyone.
   */
  cronSecret?: string;
  /**
   * Web pages allowed to call the API from a browser (CORS). Exact origins, or patterns for
   * preview deploys. Empty = no browser page may call it, which is the safe default.
   */
  webOrigins?: (string | RegExp)[];
  logger?: FastifyServerOptions["logger"];
  /** Requests per minute per client IP. */
  rateLimitPerMinute?: number;
  /**
   * Header that holds the real client IP, set by the hosting proxy (e.g. "x-forwarded-for"
   * on Vercel, whose edge overwrites any value the client sent (per Vercel docs)).
   * Unset by default: then the socket address is used and client headers are ignored,
   * so nobody can fake an IP to dodge the limit. Behind a proxy it must be set, or every
   * user would share the proxy's IP and one busy client could block everyone.
   */
  clientIpHeader?: string;
}

const errorBody = (code: string, message: string, details?: unknown) => ({
  error: { code, message, ...(details === undefined ? {} : { details }) },
});

// Drop explicit `undefined` values: to the engine, "absent" means "not answered".
const cleanProfile = (profile: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(profile).filter(([, v]) => v !== undefined)) as Profile;

/** Constant-time comparison, so response timing can't reveal how much of a secret matched. */
function sameSecret(given: string | undefined, expected: string): boolean {
  const a = Buffer.from(given ?? "");
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function buildApp({
  repo,
  screenings,
  cronSecret,
  webOrigins = [],
  logger = false,
  rateLimitPerMinute = 60,
  clientIpHeader,
}: AppOptions) {
  const app = Fastify({
    logger:
      logger === false
        ? false
        : {
            ...(typeof logger === "object" ? logger : {}),
            // Profiles describe vulnerable people, and addresses identify them: never log either
            // (PRIVACY-SECURITY §5).
            redact: {
              paths: [
                "req.body",
                "body",
                "profile",
                "*.profile",
                "req.remoteAddress",
                "req.remotePort",
              ],
              censor: "[redacted]",
            },
          },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Browsers only let a page read our answers if we name its origin here. Other callers
  // (curl, the mobile app) don't use CORS and are unaffected: this is not access control.
  await app.register(cors, {
    origin: (origin, done) => {
      const allowed =
        origin !== undefined &&
        webOrigins.some((o) => (typeof o === "string" ? o === origin : o.test(origin)));
      done(null, allowed);
    },
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["content-type", "idempotency-key", "x-install-id"],
    maxAge: 600,
  });

  await app.register(rateLimit, {
    max: rateLimitPerMinute,
    timeWindow: "1 minute",
    keyGenerator: (req) => {
      const fromProxy = clientIpHeader ? req.headers[clientIpHeader.toLowerCase()] : undefined;
      return typeof fromProxy === "string" && fromProxy.length > 0 ? fromProxy : req.ip;
    },
    // The plugin throws whatever this returns, so it must look like an HTTP error.
    errorResponseBuilder: (_req, ctx) => ({
      statusCode: 429,
      code: "RATE_LIMITED",
      message: `Too many requests. Try again in ${ctx.after}.`,
    }),
  });

  app.setErrorHandler((error, req, reply) => {
    const err = error as FastifyError;
    if (hasZodFastifySchemaValidationErrors(err)) {
      // Report which fields are wrong, never echo the values back.
      const issues = err.validation.map((i) => ({ path: i.instancePath, message: i.message }));
      return reply
        .code(400)
        .send(errorBody("VALIDATION_ERROR", "The request is not valid.", issues));
    }
    const status = (err as { statusCode?: number }).statusCode;
    if (status && status < 500) {
      return reply
        .code(status)
        .send(errorBody((err as { code?: string }).code ?? "BAD_REQUEST", err.message));
    }
    req.log.error({ err }, "unhandled error");
    return reply.code(500).send(errorBody("INTERNAL", "Something went wrong."));
  });

  app.setNotFoundHandler((_req, reply) =>
    reply.code(404).send(errorBody("NOT_FOUND", "No such route.")),
  );

  app.get("/health", async () => ({ ok: true }));

  // Daily keep-alive (ADR 0002): a free Supabase project pauses after 7 quiet days, so the
  // cron makes one real read. Only Vercel's cron, which sends the secret, may call it.
  app.get("/cron/keepalive", async (req, reply) => {
    if (!cronSecret || !sameSecret(req.headers.authorization, `Bearer ${cronSecret}`)) {
      return reply.code(401).send(errorBody("UNAUTHORIZED", "Not allowed."));
    }
    const schemes = await repo.listLive({ fresh: true });
    return { ok: true, schemes: schemes.length };
  });

  app.get(
    "/schemes",
    {
      schema: {
        querystring: z.strictObject({
          state: z
            .string()
            .regex(/^[A-Z]{2}$/)
            .optional(),
        }),
      },
    },
    async (req) => {
      const { state } = req.query;
      const schemes = (await repo.listLive()).filter(
        (s) => !state || s.level === "central" || s.state === state,
      );
      return {
        schemes: schemes.map((s) => ({
          slug: s.slug,
          title: s.text.en.title,
          benefit: s.text.en.benefit,
          category: s.category,
          level: s.level,
          state: s.state,
          official_url: s.official_url,
        })),
      };
    },
  );

  app.post(
    "/eligibility",
    { schema: { body: z.strictObject({ profile: ProfileSchema }) } },
    async (req) => {
      const schemes = await repo.listLive();
      const bySlug = new Map(schemes.map((s) => [s.slug, s]));
      const screening = evaluateAll(schemes, cleanProfile(req.body.profile));
      const info = (slug: string) => {
        const s = bySlug.get(slug)!;
        return {
          slug,
          title: s.text.en.title,
          benefit: s.text.en.benefit,
          official_url: s.official_url,
        };
      };
      return {
        eligible: screening.results
          .filter((r) => r.result === "PASS")
          .map((r) => ({ ...info(r.slug), reasons: r.reasons, also_confirm: r.also_confirm })),
        need_info: screening.results
          .filter((r) => r.result === "UNKNOWN")
          .map((r) => ({
            slug: r.slug,
            title: bySlug.get(r.slug)!.text.en.title,
            missing: r.missing,
          })),
        not_eligible: screening.results
          .filter((r) => r.result === "FAIL")
          .map((r) => ({
            slug: r.slug,
            title: bySlug.get(r.slug)!.text.en.title,
            closest_miss: r.failed?.source_quote ?? null,
          })),
        next_question: screening.next_question,
        disclaimer: DISCLAIMER,
      };
    },
  );

  const storageMissing = errorBody(
    "STORAGE_UNAVAILABLE",
    "Saving screenings is not set up on this server yet.",
  );

  // Save a screening exactly once. The client makes one Idempotency-Key per screening and
  // sends the same key on every retry, so a flaky network can never create duplicates.
  app.post(
    "/screenings",
    {
      schema: {
        headers: z.object({ "idempotency-key": z.uuid() }),
        body: z.strictObject({ install_id: z.uuid(), profile: ProfileSchema }),
      },
    },
    async (req, reply) => {
      if (!screenings) return reply.code(503).send(storageMissing);
      const profile = cleanProfile(req.body.profile);
      const schemes = await repo.listLive();
      const stateOf = new Map(schemes.map((s) => [s.slug, s.state]));
      const result = evaluateAll(schemes, profile);
      try {
        const saved = await screenings.save({
          idempotencyKey: req.headers["idempotency-key"],
          requestHash: requestHash({ install_id: req.body.install_id, profile }),
          installId: req.body.install_id,
          channel: "app",
          profile,
          matches: result.results.map((r) => toMatch(r, stateOf.get(r.slug) ?? null)),
        });
        return reply.code(saved.created ? 201 : 200).send({ ...saved, disclaimer: DISCLAIMER });
      } catch (err) {
        if (err instanceof IdempotencyKeyReusedError) {
          return reply.code(409).send(errorBody("IDEMPOTENCY_KEY_REUSED", err.message));
        }
        throw err;
      }
    },
  );

  // "Delete my data" (PRIVACY-SECURITY §3). The install ID is a random UUID known only to
  // the device, so holding it is what proves the screenings are yours. It works like a
  // password, so it travels in a header, never in the URL (URLs end up in access logs).
  app.delete(
    "/screenings",
    { schema: { headers: z.object({ "x-install-id": z.uuid() }) } },
    async (req, reply) => {
      if (!screenings) return reply.code(503).send(storageMissing);
      return { deleted: await screenings.deleteInstall(req.headers["x-install-id"]) };
    },
  );

  return app;
}
