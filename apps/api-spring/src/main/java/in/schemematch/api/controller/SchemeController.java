package in.schemematch.api.controller;

import in.schemematch.api.engine.Scheme;
import in.schemematch.api.service.SchemeService;
import in.schemematch.api.web.InvalidQueryException;
import jakarta.validation.constraints.Pattern;
import java.util.List;
import java.util.Set;
import org.springframework.util.MultiValueMap;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SchemeController {

    private final SchemeService schemes;

    public SchemeController(SchemeService schemes) {
        this.schemes = schemes;
    }

    @GetMapping("/schemes")
    public SchemeList list(
            @RequestParam(required = false) @Pattern(regexp = "[A-Z]{2}") String state,
            @RequestParam MultiValueMap<String, String> query) {
        if (!Set.of("state").containsAll(query.keySet())) {
            throw new InvalidQueryException("unknown query parameter");
        }
        return new SchemeList(schemes.list(state).stream().map(SchemeSummary::of).toList());
    }

    public record SchemeList(List<SchemeSummary> schemes) {}

    /** What the list shows: the display text, never the rules. */
    public record SchemeSummary(String slug, String title, String benefit, String category,
            String level, String state, String officialUrl) {
        static SchemeSummary of(Scheme s) {
            return new SchemeSummary(s.slug(), s.title(), s.benefit(), s.category(), s.level(),
                    s.state(), s.officialUrl());
        }
    }
}
