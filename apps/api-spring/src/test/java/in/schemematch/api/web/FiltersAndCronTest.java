package in.schemematch.api.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

/** cors.test.ts and cron.test.ts, ported, plus the rate limit seen through the whole app. */
@SpringBootTest(properties = {
    "schemematch.rate-limit-per-minute=2",
    "schemematch.client-ip-header=x-test-client",
    "schemematch.web-origins=https://web.example.org,"
            + "^https://web-[a-z0-9-]+-team\\.example\\.org$"
})
@AutoConfigureMockMvc
class FiltersAndCronTest {

    private static final String ALLOW = "Access-Control-Allow-Origin";
    private static final String CRON = UUID.randomUUID().toString(); // new for every run

    @DynamicPropertySource
    static void cron(DynamicPropertyRegistry registry) {
        registry.add("schemematch.cron-secret", () -> CRON);
    }

    @Autowired
    MockMvc mvc;

    private static String newClient() {
        return UUID.randomUUID().toString();
    }

    @ParameterizedTest
    @ValueSource(strings = {"https://web.example.org", "https://web-abc123-team.example.org"})
    void allowedOriginsMayRead(String origin) throws Exception {
        mvc.perform(post("/eligibility").header("x-test-client", newClient())
                        .header("Origin", origin)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"profile\":{}}"))
                .andExpect(status().isOk()).andExpect(header().string(ALLOW, origin));
        mvc.perform(options("/eligibility").header("Origin", origin)
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isNoContent()).andExpect(header().string(ALLOW, origin));
    }

    @ParameterizedTest
    @ValueSource(strings = {"https://evil.example.com", "https://web.example.org.evil.com",
        "https://web-abc-someone.example.org", "http://web.example.org"})
    void otherOriginsGetNoCorsHeader(String origin) throws Exception {
        mvc.perform(get("/health").header("x-test-client", newClient()).header("Origin", origin))
                .andExpect(status().isOk()).andExpect(header().doesNotExist(ALLOW));
        mvc.perform(options("/eligibility").header("Origin", origin)
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isNotFound()).andExpect(header().doesNotExist(ALLOW));
    }

    @Test
    void theThirdRequestIs429AndABrowserCanReadIt() throws Exception {
        String client = newClient();
        for (int i = 0; i < 2; i++) {
            mvc.perform(get("/health").header("x-test-client", client)).andExpect(status().isOk());
        }
        mvc.perform(get("/health").header("x-test-client", client)
                        .header("Origin", "https://web.example.org"))
                .andExpect(status().isTooManyRequests())
                .andExpect(header().string(ALLOW, "https://web.example.org"))
                .andExpect(jsonPath("$.error.code").value("RATE_LIMITED"));
    }

    @Test
    void cronWithTheSecretReadsTheSchemes() throws Exception {
        mvc.perform(get("/cron/keepalive").header("x-test-client", newClient())
                        .header("authorization", "Bearer " + CRON))
                .andExpect(status().isOk())
                .andExpect(content().json("{\"ok\":true,\"schemes\":30}"));
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "Bearer wrong", "%s", "Bearer %sx"})
    void cronRefusesEverythingElse(String given) throws Exception {
        mvc.perform(get("/cron/keepalive").header("x-test-client", newClient())
                        .header("authorization", given.formatted(CRON)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error.code").value("UNAUTHORIZED"));
    }
}
