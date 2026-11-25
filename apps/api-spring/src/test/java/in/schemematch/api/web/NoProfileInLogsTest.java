package in.schemematch.api.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** Even with every logger at TRACE, no answer and no install id may be printed. */
@SpringBootTest(properties = {
    "logging.level.root=TRACE", "schemematch.rate-limit-per-minute=100000"
})
@AutoConfigureMockMvc
@Import(InMemoryScreenings.Config.class)
@ExtendWith(OutputCaptureExtension.class)
class NoProfileInLogsTest {

    private static final Logger log = LoggerFactory.getLogger(NoProfileInLogsTest.class);

    @Autowired
    MockMvc mvc;

    @ParameterizedTest
    @ValueSource(strings = {
        "{\"district\":\"Zzyzxdistrict\"}",
        "{\"district\":\"Zzyzxdistrict\",\"age\":500}",
        "{\"age\":\"Zzyzxdistrict\"}",
        "{\"name\":\"Zzyzxdistrict\"}",
        "{\"Zzyzxdistrict\":1}",
        "{\"district\":\"Zzyzxdistrict"
    })
    void savingNeverLogsAnswersOrInstallId(String profile, CapturedOutput out) throws Exception {
        log.trace("trace is on");
        mvc.perform(post("/screenings").header("idempotency-key", ScreeningRoutesTest.RETRY_ID)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"install_id\":\"" + ScreeningRoutesTest.INSTALL + "\",\"profile\":"
                        + profile + "}"));
        assertThat(out).contains("trace is on")
                .doesNotContain("Zzyzxdistrict").doesNotContain(ScreeningRoutesTest.INSTALL);
    }

    @Test
    void deletingNeverLogsTheInstallId(CapturedOutput out) throws Exception {
        mvc.perform(delete("/screenings").header("x-install-id", ScreeningRoutesTest.INSTALL))
                .andExpect(status().isOk());
        assertThat(out).doesNotContain(ScreeningRoutesTest.INSTALL);
    }

    @Test
    void clientAddressIsNotLogged(CapturedOutput out) throws Exception {
        mvc.perform(get("/health").with(request -> {
            request.setRemoteAddr("203.0.113.77");
            return request;
        })).andExpect(status().isOk());
        assertThat(out).doesNotContain("203.0.113.77");
    }

    @Test
    void requestObjectsPrintRedacted() {
        assertThat(new SaveScreeningRequest(ScreeningRoutesTest.INSTALL, null).toString())
                .isEqualTo("SaveScreeningRequest[redacted]");
    }
}
