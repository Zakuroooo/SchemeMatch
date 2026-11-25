package in.schemematch.api.engine;

import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Port of packages/engine (TypeScript). Pure functions: no Spring, no database, no clock.
 * A profile is a map of field name to answer; a missing key means "not answered".
 */
public final class EligibilityEngine {

    private static final int RULE_FORMAT_VERSION = 1;

    /** Tie-break order: broad, easy questions first; narrow or sensitive ones later. */
    static final List<String> QUESTION_PRIORITY = List.of(
            "state", "age", "gender", "marital_status", "annual_family_income", "has_bpl_card",
            "caste_category", "is_student", "education_level", "occupation", "land_acres",
            "is_pregnant_or_lactating", "disability_percent", "children_count",
            "household_size", "district");

    private EligibilityEngine() {}

    public static SchemeResult evaluate(Scheme scheme, Map<String, Object> profile) {
        if (scheme.ruleFormatVersion() != RULE_FORMAT_VERSION) {
            throw new IllegalArgumentException(scheme.slug() + ": rule format v"
                    + scheme.ruleFormatVersion() + " is not supported (expected v1)");
        }
        RuleNode tree = withStateGate(scheme);
        Tri result = evaluateNode(tree, profile);

        // Linked sets keep first-seen order, which the caller shows to the person.
        Set<String> reasons = new LinkedHashSet<>();
        if (result == Tri.PASS) passingQuotes(scheme.eligibility(), profile, reasons);
        Set<String> missing = new LinkedHashSet<>();
        missingFields(tree, profile, missing);

        Object state = profile.get("state");
        return new SchemeResult(
                scheme.slug(),
                result,
                List.copyOf(reasons),
                firstFailure(tree, profile),
                List.copyOf(missing),
                texts(scheme, false),
                texts(scheme, true),
                scheme.level().equals("state") && state != null && !state.equals(scheme.state()));
    }

    /** The unanswered field that appears in the most still-undecided schemes, or null. */
    public static String nextQuestion(List<SchemeResult> results) {
        String best = null;
        long bestCount = 0;
        // Walking in priority order means the first field to reach a count wins a tie.
        for (String field : QUESTION_PRIORITY) {
            long count = results.stream()
                    .filter(r -> r.result() == Tri.UNKNOWN && r.missing().contains(field))
                    .count();
            if (count > bestCount) {
                best = field;
                bestCount = count;
            }
        }
        return best;
    }

    static Tri evaluateNode(RuleNode node, Map<String, Object> profile) {
        if (node instanceof Condition condition) return condition.evaluate(profile);
        List<Tri> results =
                node.childNodes().stream().map(child -> evaluateNode(child, profile)).toList();
        return node instanceof RuleNode.All ? Tri.allOf(results) : Tri.anyOf(results);
    }

    /** A state scheme behaves as if its rules were AND-ed with "lives in that state". */
    private static RuleNode withStateGate(Scheme scheme) {
        if (!scheme.isStateScheme()) return scheme.eligibility();
        Condition gate = new Condition("state", "eq", scheme.state(),
                "Scheme of the state " + scheme.state() + ": for its residents");
        return new RuleNode.All(List.of(gate, scheme.eligibility()));
    }

    /** Only branches that passed give quotes: a widow is not told "divorced women…". */
    private static void passingQuotes(
            RuleNode node, Map<String, Object> profile, Set<String> out) {
        if (evaluateNode(node, profile) != Tri.PASS) return;
        if (node instanceof Condition c) out.add(c.sourceQuote());
        node.childNodes().forEach(child -> passingQuotes(child, profile, out));
    }

    /** The condition to show as "you don't qualify because…". */
    private static Condition firstFailure(RuleNode node, Map<String, Object> profile) {
        if (evaluateNode(node, profile) != Tri.FAIL) return null;
        if (node instanceof Condition c) return c;
        for (RuleNode child : node.childNodes()) {
            Condition failure = firstFailure(child, profile);
            if (failure != null) return failure;
        }
        return null;
    }

    /** Unanswered fields inside the parts of the tree that are still undecided. */
    private static void missingFields(
            RuleNode node, Map<String, Object> profile, Set<String> out) {
        if (evaluateNode(node, profile) != Tri.UNKNOWN) return;
        if (node instanceof Condition c) out.add(c.field());
        node.childNodes().forEach(child -> missingFields(child, profile, out));
    }

    private static List<String> texts(Scheme scheme, boolean alternative) {
        List<String> out = new ArrayList<>();
        for (Scheme.Unmodelled u : scheme.unmodelled()) {
            if (u.alternative() == alternative) out.add(u.text());
        }
        return List.copyOf(out);
    }
}
