// Vercel's Fastify preset finds the entry file by scanning for a direct import of "fastify".
// The app itself is built in build-app.ts; this import only makes detection work.
import "fastify";
import { buildApp } from "./build-app.ts";
import { BundledSchemeRepository, type SchemeRepository } from "./repository.ts";
import { SupabaseSchemeRepository } from "./supabase-repository.ts";

const port = Number(process.env.PORT ?? 3001);
const { SUPABASE_URL, SUPABASE_ANON_KEY, CLIENT_IP_HEADER } = process.env;

// Database when configured; otherwise the golden schemes bundled at build time.
const repo: SchemeRepository =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? new SupabaseSchemeRepository({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY })
    : new BundledSchemeRepository();

// CLIENT_IP_HEADER=x-forwarded-for when deployed behind Vercel; unset for local runs.
const app = await buildApp({
  repo,
  logger: { level: "info" },
  ...(CLIENT_IP_HEADER ? { clientIpHeader: CLIENT_IP_HEADER } : {}),
});
app.log.info(
  { source: repo instanceof SupabaseSchemeRepository ? "supabase" : "files" },
  "scheme source",
);
// On Vercel (VERCEL=1) the platform routes requests to this listener; locally stay on loopback.
await app.listen({ port, host: process.env.VERCEL ? "0.0.0.0" : "127.0.0.1" });
