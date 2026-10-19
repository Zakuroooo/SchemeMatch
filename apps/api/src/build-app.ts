import Fastify, { type FastifyError, type FastifyServerOptions } from "fastify";
import rateLimit from "@fastify/rate-limit";
import {
  hasZodFastifySchemaValidationErrors,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { z } from "zod";
import { evaluateAll, type Profile } from "@schemematch/engine";
import { ProfileSchema } from "./profile-schema.ts";
import type { SchemeRepository } from "./repository.ts";

export const DISCLAIMER =
  "You are likely eligible — please confirm at the office. SchemeMatch is not an official government app.";

export interface AppOptions {
  repo: SchemeRepository;
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

export async function buildApp({
  repo,
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
            // Profiles describe vulnerable people: never write them to logs (PRIVACY-SECURITY §5).
            redact: { paths: ["req.body", "body", "profile", "*.profile"], censor: "[redacted]" },
          },
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

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
      // Drop explicit `undefined` values: to the engine, "absent" means "not answered".
      const profile = Object.fromEntries(
        Object.entries(req.body.profile).filter(([, v]) => v !== undefined),
      ) as Profile;
      const screening = evaluateAll(schemes, profile);
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
          .map((r) => ({ slug: r.slug, missing: r.missing })),
        not_eligible: screening.results
          .filter((r) => r.result === "FAIL")
          .map((r) => ({ slug: r.slug, closest_miss: r.failed?.source_quote ?? null })),
        next_question: screening.next_question,
        disclaimer: DISCLAIMER,
      };
    },
  );

  return app;
}
