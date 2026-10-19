import { buildApp } from "./app.ts";
import { FileSchemeRepository, GOLDEN_DIR } from "./repository.ts";

const port = Number(process.env.PORT ?? 3001);
const app = await buildApp({
  repo: new FileSchemeRepository(GOLDEN_DIR),
  logger: { level: "info" },
});
await app.listen({ port, host: "127.0.0.1" });
