package in.schemematch.api.engine;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import tools.jackson.databind.JsonNode;

/**
 * One test on one profile field, e.g. age gte 60.
 * Numbers are always held as Double, so 60 and 60.0 are the same value (as in JavaScript).
 */
public record Condition(String field, String op, Object value, String sourceQuote)
        implements RuleNode {

    /** Fields a person answers in their own words: compared without case or extra spaces. */
    private static final Set<String> FREE_TEXT = Set.of("district", "occupation");

    static Condition fromJson(JsonNode json) {
        JsonNode value = json.get("value");
        Object parsed;
        if (value.isArray()) {
            List<Object> items = new ArrayList<>();
            for (JsonNode item : value) items.add(scalar(item));
            parsed = List.copyOf(items);
        } else {
            parsed = scalar(value);
        }
        return new Condition(json.get("field").asString(), json.get("op").asString(), parsed,
                json.get("source_quote").asString());
    }

    private static Object scalar(JsonNode v) {
        if (v.isNumber()) return v.asDouble();
        if (v.isBoolean()) return v.asBoolean();
        return v.asString();
    }

    /**
     * An unanswered field is UNKNOWN, never FAIL: "we don't know yet" is not "no".
     * A wrongly typed answer throws, because silently guessing would give a wrong result.
     */
    Tri evaluate(Map<String, Object> profile) {
        Object raw = profile.get(field);
        if (raw == null) return Tri.UNKNOWN;
        Object answer = normalise(raw);
        return switch (op) {
            case "eq" -> Tri.of(answer.equals(normalise(value)));
            case "neq" -> Tri.of(!answer.equals(normalise(value)));
            case "in" -> Tri.of(listHas(answer));
            case "not_in" -> Tri.of(!listHas(answer));
            case "lt" -> Tri.of(number(raw) < number(value));
            case "lte" -> Tri.of(number(raw) <= number(value));
            case "gt" -> Tri.of(number(raw) > number(value));
            case "gte" -> Tri.of(number(raw) >= number(value));
            case "between" -> {
                List<?> range = (List<?>) value;
                double n = number(raw);
                yield Tri.of(n >= number(range.get(0)) && n <= number(range.get(1)));
            }
            default -> throw new IllegalArgumentException("unknown operator: " + op);
        };
    }

    private boolean listHas(Object answer) {
        return ((List<?>) value).stream().anyMatch(item -> normalise(item).equals(answer));
    }

    private Object normalise(Object v) {
        if (v instanceof Number n) return n.doubleValue();
        if (FREE_TEXT.contains(field)) {
            return v.toString().strip().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
        }
        return v;
    }

    /** The message names the field only: an answer must never end up in a log. */
    private double number(Object v) {
        if (v instanceof Number n && !Double.isNaN(n.doubleValue())) return n.doubleValue();
        throw new IllegalArgumentException(field + " must be a number for \"" + op + "\"");
    }
}
