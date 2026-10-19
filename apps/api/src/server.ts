import { buildApp } from "./app.ts";
import { FileSchemeRepository, GOLDEN_DIR, type SchemeRepository } from "./repository.ts";
import { SupabaseSchemeRepository } from "./supabase-repository.ts";

const port = Number(process.env.PORT ?? 3001);
const { SUPABASE_URL, SUPABASE_ANON_KEY, CLIENT_IP_HEADER } = process.env;

// Database when configured; otherwise the golden files (handy offline).
const repo: SchemeRepository =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? new SupabaseSchemeRepository({ url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY })
    : new FileSchemeRepository(GOLDEN_DIR);

// CLIENT_IP_HEADER=x-real-ip when deployed behind Vercel; unset for local runs.
const app = await buildApp({
  repo,
  logger: { level: "info" },
  ...(CLIENT_IP_HEADER ? { clientIpHeader: CLIENT_IP_HEADER } : {}),
});
app.log.info(
  { source: repo instanceof SupabaseSchemeRepository ? "supabase" : "files" },
  "scheme source",
);
await app.listen({ port, host: "127.0.0.1" });
