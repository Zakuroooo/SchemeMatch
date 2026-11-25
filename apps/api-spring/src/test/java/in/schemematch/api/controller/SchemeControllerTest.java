package in.schemematch.api.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import in.schemematch.api.config.AppProperties;
import in.schemematch.api.config.StrictJsonConfig;
import in.schemematch.api.service.SchemeService;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.system.CapturedOutput;
import org.springframework.boot.test.system.OutputCaptureExtension;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.jdbc.CannotGetJdbcConnectionException;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.CannotCreateTransactionException;

/** Only the web layer is started; the service below it is a mock that we make fail. */
@WebMvcTest(SchemeController.class)
@Import(StrictJsonConfig.class)
@EnableConfigurationProperties(AppProperties.class)
@ExtendWith(OutputCaptureExtension.class)
class SchemeControllerTest {

    @Autowired
    MockMvc mvc;

    @MockitoBean
    SchemeService schemes;

    @Test
    void anUnexpectedErrorIs500WithoutDetailsInTheAnswerOrTheLog(CapturedOutput out)
            throws Exception {
        when(schemes.list(null)).thenThrow(new IllegalStateException("db password is hunter2"));
        mvc.perform(get("/schemes")).andExpect(status().isInternalServerError())
                .andExpect(content().string("{\"error\":{\"code\":\"INTERNAL\","
                        + "\"message\":\"Something went wrong.\"}}"));
        assertThat(out).contains("IllegalStateException").doesNotContain("hunter2");
    }

    static Stream<RuntimeException> databaseIsDown() {
        return Stream.of(new CannotGetJdbcConnectionException("host secret-host"),
                new CannotCreateTransactionException("host secret-host"),
                new DataAccessResourceFailureException("host secret-host"));
    }

    @ParameterizedTest
    @MethodSource("databaseIsDown")
    void anUnreachableDatabaseIs503(RuntimeException down, CapturedOutput out) throws Exception {
        when(schemes.list(null)).thenThrow(down);
        mvc.perform(get("/schemes")).andExpect(status().isServiceUnavailable())
                .andExpect(content().string("{\"error\":{\"code\":\"STORAGE_UNAVAILABLE\","
                        + "\"message\":\"The database cannot be reached. Try again later.\"}}"));
        assertThat(out).contains("database unreachable").doesNotContain("secret-host");
    }
}
