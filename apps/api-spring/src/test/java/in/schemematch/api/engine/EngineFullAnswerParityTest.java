package in.schemematch.api.engine;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.file.Path;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import tools.jackson.databind.JsonNode;

/**
 * Whole answers (reasons, closest miss, missing fields, order) against answers saved from the
 * TypeScript engine by scripts/make-parity-fixture.mjs: 28 profiles x 30 schemes.
 */
class EngineFullAnswerParityTest {

    private static final List<Scheme> SCHEMES = EngineFiles.goldenSchemes();

    static Stream<JsonNode> cases() {
        return EngineFiles.read(Path.of("src/test/resources/ts-engine-results.json")).valueStream();
    }

    @ParameterizedTest(name = "profile {index}")
    @MethodSource("cases")
    void sameAnswerAsTypeScript(JsonNode expected) {
        Map<String, Object> profile = EngineFiles.profile(expected.get("profile"));
        List<SchemeResult> actual =
                SCHEMES.stream().map(s -> EligibilityEngine.evaluate(s, profile)).toList();

        assertThat(actual).hasSize(expected.get("results").size()).hasSize(30);
        for (int i = 0; i < actual.size(); i++) {
            JsonNode e = expected.get("results").get(i);
            JsonNode failed = e.get("failed");
            assertThat(actual.get(i)).isEqualTo(new SchemeResult(
                    e.get("slug").asString(),
                    Tri.valueOf(e.get("result").asString()),
                    EngineFiles.strings(e.get("reasons")),
                    failed.isNull() ? null : Condition.fromJson(failed),
                    EngineFiles.strings(e.get("missing")),
                    EngineFiles.strings(e.get("also_confirm")),
                    EngineFiles.strings(e.get("other_ways")),
                    e.get("other_state").asBoolean()));
        }
        JsonNode next = expected.get("next_question");
        assertThat(EligibilityEngine.nextQuestion(actual))
                .isEqualTo(next.isNull() ? null : next.asString());
    }
}
