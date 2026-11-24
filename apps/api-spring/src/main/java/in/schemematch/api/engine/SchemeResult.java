package in.schemematch.api.engine;

import java.util.List;

/**
 * What the engine says about one scheme.
 *
 * @param reasons     quotes that made it PASS, once each; empty unless PASS
 * @param failed      the first condition that made it FAIL ("closest miss"), or null
 * @param missing     unanswered fields that could still change an UNKNOWN result
 * @param alsoConfirm requirements the person must check themselves
 * @param otherWays   other ways to qualify that no field can check
 * @param otherState  true when this is another state's scheme and the person's state is known
 */
public record SchemeResult(
        String slug,
        Tri result,
        List<String> reasons,
        Condition failed,
        List<String> missing,
        List<String> alsoConfirm,
        List<String> otherWays,
        boolean otherState) {

    /** The reason stored with a saved screening: first quote, closest miss, or nothing. */
    public String storedReason() {
        return switch (result) {
            case PASS -> reasons.isEmpty() ? null : reasons.get(0);
            case FAIL -> failed == null ? null : failed.sourceQuote();
            case UNKNOWN -> null;
        };
    }
}
