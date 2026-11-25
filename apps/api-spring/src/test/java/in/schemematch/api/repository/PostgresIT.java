package in.schemematch.api.repository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import in.schemematch.api.engine.Tri;
import in.schemematch.api.repository.ScreeningRepository.MatchResult;
import in.schemematch.api.repository.ScreeningRepository.NewScreening;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.SpringBootTest.WebEnvironment;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.context.ActiveProfiles;
import org.testcontainers.postgresql.PostgreSQLContainer;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * The whole application on a real port, with a real PostgreSQL in a container. Every logger is
 * at TRACE, so the log checks also cover Tomcat, JDBC and the connection pool.
 */
@SpringBootTest(webEnvironment = WebEnvironment.RANDOM_PORT, properties = {
    "schemematch.rate-limit-per-minute=100000", "logging.level.root=TRACE"
})
@ActiveProfiles("postgres")
@ExtendWith(OutputCaptureExtension.class)
class PostgresIT {

    @ServiceConnection
    static final PostgreSQLContainer DATABASE = new PostgreSQLContainer("postgres:17-alpine")
            .withTmpFs(Map.of("/var/lib/postgresql/data", "rw")); // data in memory: fast, no disk

    static {
        DATABASE.start(); // Testcontainers removes it when the tests end
    }

    private static final String PROFILE =
            "{\"state\":\"MH\",\"gender\":\"female\",\"age\":72,\"marital_status\":\"widow\","
                    + "\"has_bpl_card\":true,\"district\":\"Zzyzxdistrict\"}";

    @LocalServerPort
    int port;

    @Autowired
    JdbcClient db;

    @Autowired
    SchemeRepository schemes;

    @Autowired
    ScreeningRepository screenings;

    @Autowired
    JsonMapper json;

    private final HttpClient http = HttpClient.newHttpClient();
    private final UUID install = UUID.randomUUID();

    @BeforeEach
    void empty() {
        db.sql("delete from screenings").update();
        db.sql("update schemes set status = 'live'").update();
    }

    private HttpResponse<String> save(UUID retryId, UUID installId, String profile)
            throws Exception {
        return http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/screenings"))
                        .header("content-type", "application/json")
                        .header("idempotency-key", retryId.toString())
                        .POST(HttpRequest.BodyPublishers.ofString("{\"install_id\":\"" + installId
                                + "\",\"profile\":" + profile + "}"))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
    }

    private long count(String table) {
        return db.sql("select count(*) from " + table).query(Long.class).single();
    }

    private NewScreening newScreening(List<MatchResult> matches) {
        return new NewScreening(UUID.randomUUID(), "a".repeat(64), install, Map.of("age", 30),
                matches);
    }

    @Test
    void theDatabaseGivesExactlyTheSameSchemesAsTheBundle() throws Exception {
        assertThat(schemes).isInstanceOf(PostgresSchemeRepository.class);
        assertThat(schemes.listLive()).hasSize(30)
                .isEqualTo(new BundledSchemeRepository(json).listLive());
    }

    @Test
    void aSchemeThatIsNotLiveIsNotServed() {
        db.sql("update schemes set status = 'draft' where slug = 'apy'").update();
        assertThat(schemes.listLive()).hasSize(29).noneMatch(s -> s.slug().equals("apy"));
    }

    @Test
    void twentyRetriesAtTheSameMomentSaveExactlyOnce() throws Exception {
        int clients = 20;
        UUID retryId = UUID.randomUUID();
        CountDownLatch go = new CountDownLatch(1);
        ExecutorService pool = Executors.newFixedThreadPool(clients);
        try {
            List<Future<HttpResponse<String>>> answers = IntStream.range(0, clients)
                    .mapToObj(i -> pool.submit(() -> {
                        go.await(); // everyone waits here, then all start together
                        return save(retryId, install, PROFILE);
                    })).toList();
            go.countDown();

            int created = 0;
            int repeated = 0;
            java.util.Set<String> ids = new java.util.HashSet<>();
            for (Future<HttpResponse<String>> answer : answers) {
                HttpResponse<String> r = answer.get();
                if (r.statusCode() == 201) created++;
                if (r.statusCode() == 200) repeated++;
                JsonNode body = json.readTree(r.body());
                ids.add(body.get("screening_id").asString());
                assertThat(body.get("results")).hasSize(30);
            }
            assertThat(created).isEqualTo(1);
            assertThat(repeated).isEqualTo(clients - 1);
            assertThat(ids).hasSize(1);
            assertThat(count("screenings")).isEqualTo(1);
            assertThat(count("matches")).isEqualTo(30);
        } finally {
            pool.shutdownNow();
        }
    }

    @Test
    void theDatabaseItselfRefusesASecondRowWithTheSameKey() throws Exception {
        save(UUID.randomUUID(), install, PROFILE);
        assertThatThrownBy(() -> db.sql("""
                insert into screenings (idempotency_key, request_hash, install_id, profile)
                select idempotency_key, request_hash, install_id, profile from screenings""")
                .update()).isInstanceOf(DuplicateKeyException.class);
    }

    @Test
    void theSameKeyWithOtherAnswersIs409AndChangesNothing() throws Exception {
        UUID retryId = UUID.randomUUID();
        assertThat(save(retryId, install, PROFILE).statusCode()).isEqualTo(201);
        HttpResponse<String> second = save(retryId, install, PROFILE.replace("72", "73"));
        assertThat(second.statusCode()).isEqualTo(409);
        assertThat(second.body()).contains("IDEMPOTENCY_KEY_REUSED");
        assertThat(count("screenings")).isEqualTo(1);
    }

    @Test
    void oneBadMatchRollsBackTheWholeScreening() {
        List<MatchResult> matches = List.of(
                new MatchResult("apy", Tri.PASS, "quote"),
                new MatchResult("no-such-scheme", Tri.PASS, "quote"));
        assertThatThrownBy(() -> screenings.save(newScreening(matches)))
                .isInstanceOf(DataIntegrityViolationException.class);
        assertThat(count("screenings")).isZero();
        assertThat(count("matches")).isZero();
    }

    @Test
    void storesTheReasonAndOnlyTheAnsweredFields() throws Exception {
        HttpResponse<String> r = save(UUID.randomUUID(), install, PROFILE);
        assertThat(r.body()).contains("{\"slug\":\"mh-shravanbal\",\"result\":\"PASS\","
                + "\"reason\":\"every destitute person of age 65 years & above\"}");
        String stored = db.sql("select profile::text from screenings").query(String.class).single();
        assertThat(json.readTree(stored)).isEqualTo(json.readTree(PROFILE));
    }

    @Test
    void aNulCharacterIs400AndIsNeverStored() throws Exception {
        for (String field : List.of("district", "occupation")) {
            HttpResponse<String> r = save(UUID.randomUUID(), install,
                    "{\"" + field + "\":\"ab\\u0000cd\"}");
            assertThat(r.statusCode()).isEqualTo(400);
        }
        assertThat(count("screenings")).isZero();
    }

    @Test
    void deleteMyDataRemovesThatInstallAndItsMatchesOnly() throws Exception {
        save(UUID.randomUUID(), install, PROFILE);
        save(UUID.randomUUID(), install, PROFILE);
        save(UUID.randomUUID(), UUID.randomUUID(), PROFILE);
        HttpResponse<String> r = http.send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/screenings"))
                        .header("x-install-id", install.toString()).DELETE().build(),
                HttpResponse.BodyHandlers.ofString());
        assertThat(r.statusCode()).isEqualTo(200);
        assertThat(r.body()).isEqualTo("{\"deleted\":2}");
        assertThat(count("screenings")).isEqualTo(1);
        assertThat(count("matches")).isEqualTo(30);
    }

    @Test
    void savingOverRealHttpAndSqlLogsNoAnswerAndNoInstallId(CapturedOutput out) throws Exception {
        UUID retryId = UUID.randomUUID();
        save(retryId, install, PROFILE);
        save(retryId, install, PROFILE.replace("72", "73")); // 409
        save(UUID.randomUUID(), install, "{\"age\":\"Zzyzxdistrict\"}"); // 400
        assertThat(out).doesNotContain("Zzyzxdistrict").doesNotContain(install.toString());
    }
}
