package in.schemematch.api.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class EligibilityEngineTest {

    private static Condition cond(String field, String op, Object value, String quote) {
        return new Condition(field, op, value, quote);
    }

    /** Age 60+ AND (BPL card OR income up to 21,000), only in the given state. */
    private static Scheme pension(String level, String state, int version) {
        RuleNode rules = new RuleNode.All(List.of(
                cond("age", "gte", 60, "aged 60 and above"),
                new RuleNode.Any(List.of(
                        cond("has_bpl_card", "eq", true, "on the BPL list"),
                        cond("annual_family_income", "lte", 21000, "up to 21,000")))));
        return new Scheme("test-pension", level, state, "pension", "https://example.org", "T", "B",
                version, rules, List.of(
                        new Scheme.Unmodelled("No other pension", false),
                        new Scheme.Unmodelled("Is an orphan", true)));
    }

    private static SchemeResult run(Map<String, Object> profile) {
        return EligibilityEngine.evaluate(pension("state", "MH", 1), profile);
    }

    private static SchemeResult unknown(String slug, String... missing) {
        return new SchemeResult(slug, Tri.UNKNOWN, List.of(), null, List.of(missing),
                List.of(), List.of(), false);
    }

    @ParameterizedTest
    @CsvSource({
        "PASS,PASS,PASS,PASS", "PASS,UNKNOWN,UNKNOWN,PASS", "PASS,FAIL,FAIL,PASS",
        "UNKNOWN,UNKNOWN,UNKNOWN,UNKNOWN", "UNKNOWN,FAIL,FAIL,UNKNOWN", "FAIL,FAIL,FAIL,FAIL"
    })
    void truthTable(Tri a, Tri b, Tri and, Tri or) {
        assertThat(Tri.allOf(List.of(a, b))).isEqualTo(and);
        assertThat(Tri.allOf(List.of(b, a))).isEqualTo(and);
        assertThat(Tri.anyOf(List.of(a, b))).isEqualTo(or);
        assertThat(Tri.anyOf(List.of(b, a))).isEqualTo(or);
    }

    @Test
    void emptyAllPassesAndEmptyAnyFails() {
        assertThat(Tri.allOf(List.of())).isEqualTo(Tri.PASS);
        assertThat(Tri.anyOf(List.of())).isEqualTo(Tri.FAIL);
    }

    @Test
    void passGivesOnlyTheQuotesThatPassed() {
        SchemeResult r = run(Map.of(
                "state", "MH", "age", 65, "has_bpl_card", true, "annual_family_income", 90000));
        assertThat(r.result()).isEqualTo(Tri.PASS);
        assertThat(r.reasons()).containsExactly("aged 60 and above", "on the BPL list");
        assertThat(r.failed()).isNull();
        assertThat(r.alsoConfirm()).containsExactly("No other pension");
        assertThat(r.otherWays()).containsExactly("Is an orphan");
        assertThat(r.storedReason()).isEqualTo("aged 60 and above");
    }

    @Test
    void failNamesTheClosestMiss() {
        assertThat(run(Map.of("state", "MH", "age", 50, "has_bpl_card", true)).storedReason())
                .isEqualTo("aged 60 and above");
        assertThat(run(Map.of("state", "MH", "age", 65, "has_bpl_card", false,
                "annual_family_income", 50000)).storedReason()).isEqualTo("on the BPL list");
    }

    @Test
    void unknownListsOnlyFieldsThatCouldChangeTheAnswer() {
        SchemeResult r = run(Map.of("state", "MH", "age", 65));
        assertThat(r.result()).isEqualTo(Tri.UNKNOWN);
        assertThat(r.missing()).containsExactly("has_bpl_card", "annual_family_income");
        assertThat(r.storedReason()).isNull();
    }

    @Test
    void stateGate() {
        Map<String, Object> elsewhere = Map.of("state", "WB", "age", 65, "has_bpl_card", true);
        assertThat(run(elsewhere).result()).isEqualTo(Tri.FAIL);
        assertThat(run(elsewhere).failed().field()).isEqualTo("state");
        assertThat(run(elsewhere).otherState()).isTrue();
        assertThat(run(Map.of("age", 65, "has_bpl_card", true)).missing())
                .containsExactly("state");
        assertThat(EligibilityEngine.evaluate(pension("central", null, 1), elsewhere).result())
                .isEqualTo(Tri.PASS);
    }

    @Test
    void refusesAnUnknownRuleFormat() {
        assertThatThrownBy(
                () -> EligibilityEngine.evaluate(pension("state", "MH", 2), Map.of()))
                .hasMessageContaining("v2");
    }

    @Test
    void nextQuestionPicksTheFieldThatUnblocksMostThenPriority() {
        assertThat(EligibilityEngine.nextQuestion(List.of(
                unknown("a", "age"), unknown("b", "age", "gender"), unknown("c", "gender", "age"))))
                .isEqualTo("age");
        assertThat(EligibilityEngine.nextQuestion(List.of(
                unknown("a", "has_bpl_card"), unknown("b", "gender")))).isEqualTo("gender");
        assertThat(EligibilityEngine.nextQuestion(List.of())).isNull();
    }
}
