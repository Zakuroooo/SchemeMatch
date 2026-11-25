package in.schemematch.api.engine;

import java.util.ArrayList;
import java.util.List;
import tools.jackson.databind.JsonNode;

/**
 * One node of a rule tree: a single condition, or a group of nodes.
 * `sealed` means only these three types can exist, so no case can be forgotten.
 */
public sealed interface RuleNode permits Condition, RuleNode.All, RuleNode.Any {

    /** AND: every child must pass. */
    record All(List<RuleNode> children) implements RuleNode {}

    /** OR: at least one child must pass. */
    record Any(List<RuleNode> children) implements RuleNode {}

    /** The children of a group; a condition has none. */
    default List<RuleNode> childNodes() {
        if (this instanceof All all) return all.children();
        if (this instanceof Any any) return any.children();
        return List.of();
    }

    /** Reads one node (and everything below it) from the rule JSON. */
    static RuleNode fromJson(JsonNode json) {
        if (json.has("field")) return Condition.fromJson(json);
        if (json.has("all")) return new All(list(json.get("all")));
        if (json.has("any")) return new Any(list(json.get("any")));
        throw new IllegalArgumentException("a rule node needs field, all or any");
    }

    private static List<RuleNode> list(JsonNode array) {
        if (!array.isArray()) throw new IllegalArgumentException("a rule group must be a list");
        List<RuleNode> nodes = new ArrayList<>();
        for (JsonNode child : array) nodes.add(fromJson(child));
        return List.copyOf(nodes);
    }
}
