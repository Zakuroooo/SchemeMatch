# Measured facts (25 Nov 2026, `./mvnw clean verify` on Pranay's Mac: BUILD SUCCESS)

- Java 17, Spring Boot 4.1.2, PostgreSQL 17 (test container). JUnit Jupiter is **6.0.3**, not 5.
- **350 tests pass, 0 skipped**: 341 in Surefire, 9 in Failsafe against real PostgreSQL.
- Parity with the TypeScript engine: the shared hand-written cases, **167 scheme cases + 7
  personas = 174**, plus full answers for 28 profiles x 30 schemes saved from the TypeScript engine.
- Concurrency: 20 simultaneous HTTP retries with one idempotency key gave one 201, nineteen 200,
  one `screenings` row and 30 `matches` rows. A unique constraint enforces it.
- A test proves rollback: one bad match removes the whole screening.
- Log tests at TRACE found no answers and no install id in the output.
- Docker Compose started the API with PostgreSQL; live requests gave 200, 201, 400, 404, 409 and 429,
  and the same image without a database gave 503. The container runs as a non-root user.
- Mutation checks: 6 deliberate breaks (`>=` to `>`, no transaction, no unique constraint, no
  `synchronized`, number coercion on, log settings removed) were each caught by a test. The log one is
  caught by `PostgresIT` only.

## Do not claim
- Not deployed. The live API is still Fastify. No users and no load or speed numbers.
- The CI job is written but has never run (the branch is not pushed).
- Parity is for the engine. HTTP routes were ported test by test, not compared side by side.
- Known differences from Fastify: explicit `null` means "not answered" (Fastify: 400); `38.0` is
  refused as an age; validation messages differ; invalid JSON, 413 and 415 use other codes; every
  request counts toward the rate limit; schemes are not cached.
- Built with AI help. Say so if asked.
