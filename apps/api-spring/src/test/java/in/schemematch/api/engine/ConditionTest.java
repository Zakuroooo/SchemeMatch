package in.schemematch.api.engine;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

class ConditionTest {

    private static Tri check(String field, String op, Object value, Object answer) {
        return new Condition(field, op, value, "quote").evaluate(Map.of(field, answer));
    }

    @Test
    void unansweredIsUnknown() {
        assertThat(new Condition("age", "gte", 18, "quote").evaluate(Map.of()))
                .isEqualTo(Tri.UNKNOWN);
    }

    @ParameterizedTest
    @CsvSource({"eq,widow,PASS", "eq,married,FAIL", "neq,married,PASS", "neq,widow,FAIL"})
    void equality(String op, String answer, Tri expected) {
        assertThat(check("marital_status", op, "widow", answer)).isEqualTo(expected);
    }

    // Both sides of every boundary: this is where real eligibility bugs live.
    @ParameterizedTest
    @CsvSource({
        "lt,40,39,PASS", "lt,40,40,FAIL", "lte,21000,21000,PASS", "lte,21000,21001,FAIL",
        "gt,35,36,PASS", "gt,35,35,FAIL", "gte,60,60,PASS", "gte,60,59,FAIL"
    })
    void comparisons(String op, int value, int answer, Tri expected) {
        assertThat(check("age", op, value, answer)).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({"17,FAIL", "18,PASS", "79,PASS", "80,FAIL"})
    void betweenIncludesBothEnds(int age, Tri expected) {
        assertThat(check("age", "between", List.of(18, 79), age)).isEqualTo(expected);
    }

    @Test
    void listMembership() {
        List<String> list = List.of("SC", "ST");
        assertThat(check("caste_category", "in", list, "ST")).isEqualTo(Tri.PASS);
        assertThat(check("caste_category", "in", list, "OBC")).isEqualTo(Tri.FAIL);
        assertThat(check("caste_category", "not_in", list, "OBC")).isEqualTo(Tri.PASS);
        assertThat(check("caste_category", "not_in", list, "SC")).isEqualTo(Tri.FAIL);
    }

    @Test
    void booleans() {
        assertThat(check("has_bpl_card", "eq", true, true)).isEqualTo(Tri.PASS);
        assertThat(check("has_bpl_card", "eq", true, false)).isEqualTo(Tri.FAIL);
    }

    @Test
    void numbersOfDifferentJavaTypesAreEqual() {
        assertThat(check("children_count", "eq", 2.0, 2)).isEqualTo(Tri.PASS);
        assertThat(check("children_count", "in", List.of(1.0, 2.0), 2)).isEqualTo(Tri.PASS);
    }

    @Test
    void freeTextIgnoresCaseAndSpacesButEnumsStayExact() {
        assertThat(check("district", "in", List.of("Gadchiroli"), "  gadchiroli "))
                .isEqualTo(Tri.PASS);
        assertThat(check("occupation", "eq", "Street  Vendor", "street vendor"))
                .isEqualTo(Tri.PASS);
        assertThat(check("caste_category", "eq", "SC", "sc")).isEqualTo(Tri.FAIL);
    }

    @Test
    void wrongTypeThrowsWithoutShowingTheAnswer() {
        assertThatThrownBy(() -> check("age", "gte", 18, "secret-answer"))
                .hasMessageContaining("age").hasMessageNotContaining("secret-answer");
        assertThatThrownBy(() -> check("age", "gte", 18, Double.NaN))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void unknownOperatorThrows() {
        assertThatThrownBy(() -> check("age", "approx", 18, 18))
                .hasMessageContaining("unknown operator");
    }
}
