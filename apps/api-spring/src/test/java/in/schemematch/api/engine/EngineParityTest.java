package in.schemematch.api.engine;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import tools.jackson.databind.JsonNode;

/** The Java engine must agree with the TypeScript engine on the shared, hand-written cases. */
class EngineParityTest {

    private static final List<Scheme> SCHEMES = EngineFiles.goldenSchemes();
    private static final Map<String, Scheme> BY_SLUG =
            SCHEMES.stream().collect(Collectors.toMap(Scheme::slug, Function.identity()));

    static Stream<Arguments> schemeCases() {
        return EngineFiles.jsonFiles(EngineFiles.PROFILES).stream()
                .filter(f -> !f.endsWith("personas.json"))
                .map(EngineFiles::read)
                .flatMap(suite -> suite.get("cases").valueStream().map(c -> Arguments.of(
                        suite.get("scheme").asString(), c.get("id").asString(), c)));
    }

    static Stream<Arguments> personas() {
        return EngineFiles.read(EngineFiles.PROFILES.resolve("personas.json"))
                .get("cases").valueStream()
                .map(c -> Arguments.of(c.get("id").asString(), c));
    }

    @Test
    void sharedFilesAreReallyThere() {
        assertThat(SCHEMES).hasSize(30);
        assertThat(schemeCases()).hasSize(167);
        assertThat(personas()).hasSize(7);
    }

    @ParameterizedTest(name = "{0}: {1}")
    @MethodSource("schemeCases")
    void schemeCase(String slug, String id, JsonNode c) {
        Scheme scheme = BY_SLUG.get(slug);
        // Per-scheme cases test the scheme's own rules, so the state is filled in.
        Map<String, Object> profile = new HashMap<>();
        if (scheme.state() != null) profile.put("state", scheme.state());
        profile.putAll(EngineFiles.profile(c.get("profile")));

        SchemeResult result = EligibilityEngine.evaluate(scheme, profile);

        assertThat(result.result()).as(c.get("why").asString())
                .isEqualTo(Tri.valueOf(c.get("expected").asString()));
        if (c.has("ask_next")) {
            assertThat(EligibilityEngine.nextQuestion(List.of(result)))
                    .isEqualTo(c.get("ask_next").asString());
        }
    }

    @ParameterizedTest(name = "persona {0}")
    @MethodSource("personas")
    void persona(String id, JsonNode c) {
        Map<String, Object> profile = EngineFiles.profile(c.get("profile"));
        List<SchemeResult> results =
                SCHEMES.stream().map(s -> EligibilityEngine.evaluate(s, profile)).toList();

        assertThat(slugs(results, Tri.PASS)).as(c.get("why").asString())
                .containsExactlyInAnyOrderElementsOf(EngineFiles.strings(c.get("eligible")));
        assertThat(slugs(results, Tri.UNKNOWN)).isEmpty();
    }

    private static List<String> slugs(List<SchemeResult> results, Tri wanted) {
        return results.stream().filter(r -> r.result() == wanted).map(SchemeResult::slug).toList();
    }
}
