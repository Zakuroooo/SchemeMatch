package in.schemematch.api.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import in.schemematch.api.repository.BundledSchemeRepository;
import in.schemematch.api.repository.SchemeRepository;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/** The default profile: bundled schemes, no database, so saving answers 503. */
@SpringBootTest(properties = "schemematch.rate-limit-per-minute=100000")
@AutoConfigureMockMvc
class NoDatabaseTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    SchemeRepository schemes;

    @Autowired
    ObjectProvider<DataSource> dataSource;

    @Test
    void usesTheBundleAndHasNoDataSource() {
        assertThat(schemes).isInstanceOf(BundledSchemeRepository.class);
        assertThat(dataSource.getIfAvailable()).isNull();
    }

    @Test
    void savingAndDeletingAnswer503() throws Exception {
        mvc.perform(post("/screenings").header("idempotency-key", ScreeningRoutesTest.RETRY_ID)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"install_id\":\"" + ScreeningRoutesTest.INSTALL
                                + "\",\"profile\":{}}"))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.error.code").value("STORAGE_UNAVAILABLE"));
        mvc.perform(delete("/screenings").header("x-install-id", ScreeningRoutesTest.INSTALL))
                .andExpect(status().isServiceUnavailable());
    }

    @Test
    void aBadRequestIsStill400() throws Exception {
        mvc.perform(delete("/screenings")).andExpect(status().isBadRequest());
    }
}
