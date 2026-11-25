package in.schemematch.api.engine;

import java.util.ArrayList;
import java.util.List;
import tools.jackson.databind.JsonNode;

/** One government scheme: display text plus the rules the engine runs. */
public record Scheme(
        String slug,
        String level,
        String state,
        String category,
        String officialUrl,
        String title,
        String benefit,
        int ruleFormatVersion,
        RuleNode eligibility,
        List<Unmodelled> unmodelled) {

    /** A criterion the source states but no profile field can express. */
    public record Unmodelled(String text, boolean alternative) {}

    public boolean isStateScheme() {
        return level.equals("state") && state != null;
    }

    /** Reads a scheme from the shared file format (pipeline/golden and schemes.json). */
    public static Scheme fromJson(JsonNode json) {
        JsonNode en = json.path("text").path("en");
        return new Scheme(
                json.get("slug").asString(),
                json.get("level").asString(),
                json.path("state").isString() ? json.get("state").asString() : null,
                json.get("category").asString(),
                json.get("official_url").asString(),
                en.get("title").asString(),
                en.get("benefit").asString(),
                json.path("rule_format_version").asInt(1),
                RuleNode.fromJson(json.get("eligibility")),
                unmodelledFromJson(json.path("unmodelled")));
    }

    public static List<Unmodelled> unmodelledFromJson(JsonNode array) {
        List<Unmodelled> items = new ArrayList<>();
        for (JsonNode u : array) {
            items.add(new Unmodelled(u.get("text").asString(),
                    "alternative".equals(u.path("kind").asString(""))));
        }
        return List.copyOf(items);
    }
}
