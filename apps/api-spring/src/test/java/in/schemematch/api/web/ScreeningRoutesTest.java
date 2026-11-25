package in.schemematch.api.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

/** apps/api/test/screenings.test.ts, ported. Uses an in-memory store; see PostgresIT for SQL. */
@SpringBootTest(properties = "schemematch.rate-limit-per-minute=100000")
@AutoConfigureMockMvc
@Import(InMemoryScreenings.Config.class)
class ScreeningRoutesTest {

    static final String RETRY_ID = "3f6c2b1e-8d4a-4c7e-9b2f-1a5d6e7f8a9b";
    static final String INSTALL = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";
    static final String PROFILE =
            "{\"state\":\"WB\",\"gender\":\"female\",\"age\":62,\"marital_status\":\"widow\"}";

    @Autowired
    MockMvc mvc;

    @Autowired
    InMemoryScreenings store;

    @BeforeEach
    void empty() {
        store.clear();
    }

    private static String body(String profile) {
        return "{\"install_id\":\"" + INSTALL + "\",\"profile\":" + profile + "}";
    }

    private ResultActions save(String retryId, String body) throws Exception {
        MockHttpServletRequestBuilder request =
                post("/screenings").contentType(MediaType.APPLICATION_JSON).content(body);
        if (retryId != null) request.header("idempotency-key", retryId);
        return mvc.perform(request);
    }

    @Test
    void savesOnceThenAnswersARetryWithTheStoredResult() throws Exception {
        String first = save(RETRY_ID, body(PROFILE)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.created").value(true))
                .andExpect(jsonPath("$.results", hasSize(30)))
                .andExpect(jsonPath("$.results[?(@.slug=='wb-taposili-bandhu')].result",
                        hasItem("UNKNOWN")))
                .andExpect(jsonPath("$.disclaimer").value(EligibilityResponse.DISCLAIMER))
                .andReturn().getResponse().getContentAsString();

        save(RETRY_ID, body(PROFILE)).andExpect(status().isOk())
                .andExpect(content().string(first.replace("\"created\":true", "\"created\":false")));
        assertThat(store.count()).isEqualTo(1);
    }

    @Test
    void keyOrderDoesNotMatter() throws Exception {
        save(RETRY_ID, body(PROFILE)).andExpect(status().isCreated());
        save(RETRY_ID, "{\"profile\":{\"marital_status\":\"widow\",\"age\":62,"
                + "\"gender\":\"female\",\"state\":\"WB\"},\"install_id\":\"" + INSTALL + "\"}")
                .andExpect(status().isOk());
    }

    @Test
    void sameKeyWithDifferentAnswersIs409() throws Exception {
        save(RETRY_ID, body(PROFILE));
        save(RETRY_ID, body(PROFILE.replace("62", "63"))).andExpect(status().isConflict())
                .andExpect(content().json("""
                        {"error":{"code":"IDEMPOTENCY_KEY_REUSED","message":
                        "This Idempotency-Key was already used for a different request."}}"""));
        assertThat(store.count()).isEqualTo(1);
    }

    @Test
    void storesTheQuoteForPassesAndTheClosestMissForFails() throws Exception {
        String full = PROFILE.replace("}", ",\"caste_category\":\"SC\","
                + "\"annual_family_income\":30000,\"has_bpl_card\":true}");
        save(RETRY_ID, body(full))
                .andExpect(jsonPath("$.results[?(@.slug=='wb-taposili-bandhu')].reason",
                        hasItem("Must belongto the Scheduled Caste (SC) community")))
                .andExpect(jsonPath("$.results[?(@.slug=='pm-sym')].reason", hasItem(
                        "Age should be between18 and 40 years at the time of enrollment.")));
    }

    static Stream<Arguments> badRequests() {
        return Stream.of(
                Arguments.of("no key", null, body(PROFILE), "/idempotency-key"),
                Arguments.of("key not a UUID", "retry-1", body(PROFILE), "/idempotency-key"),
                Arguments.of("loose UUID", "1-1-1-1-1", body(PROFILE), "/idempotency-key"),
                Arguments.of("no install_id", RETRY_ID, "{\"profile\":{}}", "/install_id"),
                Arguments.of("identifying field", RETRY_ID, body("{\"aadhaar\":\"1\"}"), "/profile"),
                Arguments.of("out of range", RETRY_ID, body("{\"age\":150}"), "/profile/age"),
                Arguments.of("extra top-level field", RETRY_ID,
                        "{\"name\":\"Sunita\",\"profile\":{}}", ""));
    }

    @ParameterizedTest(name = "{0}")
    @MethodSource("badRequests")
    void refusesWith400AndSavesNothing(String why, String retryId, String body, String path)
            throws Exception {
        save(retryId, body).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.error.details[0].path").value(path));
        assertThat(store.count()).isZero();
    }

    @Test
    void deleteRemovesThatInstallOnly() throws Exception {
        save(UUID.randomUUID().toString(), body(PROFILE));
        save(UUID.randomUUID().toString(), body(PROFILE));
        save(UUID.randomUUID().toString(),
                body(PROFILE).replace(INSTALL, "1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d"));
        mvc.perform(delete("/screenings").header("x-install-id", INSTALL))
                .andExpect(status().isOk()).andExpect(content().string("{\"deleted\":2}"));
        assertThat(store.count()).isEqualTo(1);
    }

    @Test
    void deleteNeedsAValidInstallId() throws Exception {
        mvc.perform(delete("/screenings")).andExpect(status().isBadRequest());
        mvc.perform(delete("/screenings").header("x-install-id", "abc"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error.details[0].path").value("/x-install-id"));
    }
}
