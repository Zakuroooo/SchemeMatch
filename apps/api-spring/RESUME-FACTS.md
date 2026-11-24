# Measured facts (25 Nov 2026, `./mvnw clean verify` on Pranay's Mac: BUILD SUCCESS)

- Java 17, Spring Boot 4.1.2, PostgreSQL 17 (test container). JUnit Jupiter is **6.0.3**, not 5.
- **350 tests pass, 0 skipped**: 341 in Surefire, 9 in Failsafe against real PostgreSQL.
- Parity with the TypeScript engine: the shared hand-written cases, **167 scheme cases + 7
  personas = 174**, plus full answers for 28 profiles x 30 schemes saved from the TypeScript engine.
- Concurrency: 20 simultaneous HTTP retries with one idempotency key gave one 201, nineteen 200,
  one `screenings` row and 30 `matches` rows. A unique constraint enforces it.
- A test proves rollback: one bad match removes the whole screening.
- Log tests at TRACE found no answers and no install id in the output.

## Do not claim
- Not deployed. The live API is still Fastify. No users and no load or speed numbers.
- Docker image, Compose and the CI job do not exist yet.
- Parity is for the engine. HTTP routes were ported test by test, not compared side by side.
- Known differences from Fastify: explicit `null` means "not answered" (Fastify: 400); `38.0` is
  refused as an age; validation messages differ; invalid JSON, 413 and 415 use other codes; every
  request counts toward the rate limit; schemes are not cached.
- Built with AI help. Say so if asked.
