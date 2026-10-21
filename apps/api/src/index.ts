// Vercel's Fastify preset finds the entry file by scanning for a direct import of "fastify".
// The app itself is built in build-app.ts; this import only makes detection work.
import "fastify";
import { buildApp } from "./build-app.js";
import { BundledSchemeRepository, type SchemeRepository } from "./repository.js";
import { SupabaseSchemeRepository } from "./supabase-repository.js";
import { SupabaseScreeningStore } from "./supabase-screening-store.js";

const port = Number(process.env.PORT ?? 3001);
const {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  SUPABASE_SECRET_KEY,
  CLIENT_IP_HEADER,
  CRON_SECRET,
  WEB_ORIGINS,
} = process.env;

// WEB_ORIGINS: comma-separated. An entry starting with ^ is a full-match pattern for preview
// deploys, e.g. ^https://schemematch-web-[a-z0-9-]+-zakuroooos-projects\.vercel\.app$
const webOrigins = (WEB_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((s) => (s.startsWith("^") ? new RegExp(s) : s));

// Database when configured; otherwise the golden schemes bundled at build time.
const repo: SchemeRepository =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? new SupabaseSchemeRepository({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY })
    : new BundledSchemeRepository();

// Saving needs the server-only secret key; without it the save routes answer 503.
const screenings =
  SUPABASE_URL && SUPABASE_SECRET_KEY
    ? new SupabaseScreeningStore({ url: SUPABASE_URL, secretKey: SUPABASE_SECRET_KEY })
    : undefined;

// CLIENT_IP_HEADER=x-forwarded-for when deployed behind Vercel; unset for local runs.
const app = await buildApp({
  repo,
  ...(screenings ? { screenings } : {}),
  ...(CRON_SECRET ? { cronSecret: CRON_SECRET } : {}),
  webOrigins,
  logger: { level: "info" },
  ...(CLIENT_IP_HEADER ? { clientIpHeader: CLIENT_IP_HEADER } : {}),
});
app.log.info(
  {
    source: repo instanceof SupabaseSchemeRepository ? "supabase" : "files",
    screenings: screenings ? "supabase" : "not set up",
  },
  "scheme source",
);
// Match Vercel's documented pattern exactly: call listen() WITHOUT awaiting it.
// Vercel replaces listen() with its own hook; a top-level `await` on it can block the
// module from finishing loading, so the function would never answer a request.
app.listen({ port }).catch((err: unknown) => {
  app.log.error({ err }, "server failed to start");
  process.exitCode = 1;
});
