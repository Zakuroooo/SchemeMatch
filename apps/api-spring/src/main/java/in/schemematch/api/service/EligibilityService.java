package in.schemematch.api.service;

import in.schemematch.api.engine.EligibilityEngine;
import in.schemematch.api.engine.Scheme;
import in.schemematch.api.engine.SchemeResult;
import in.schemematch.api.engine.Tri;
import in.schemematch.api.repository.SchemeRepository;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import org.springframework.stereotype.Service;

/** Runs the rule engine over every live scheme for one profile. Stores nothing. */
@Service
public class EligibilityService {

    /** One scheme together with the engine's answer for it. */
    public record Match(Scheme scheme, SchemeResult result) {}

    public record Screening(List<Match> matches, String nextQuestion) {
        public Stream<Match> with(Tri wanted) {
            return matches.stream().filter(m -> m.result().result() == wanted);
        }
    }

    private final SchemeRepository schemes;

    public EligibilityService(SchemeRepository schemes) {
        this.schemes = schemes;
    }

    public Screening screen(Map<String, Object> answers) {
        List<Match> matches = schemes.listLive().stream()
                .map(s -> new Match(s, EligibilityEngine.evaluate(s, answers)))
                .toList();
        return new Screening(matches, EligibilityEngine.nextQuestion(
                matches.stream().map(Match::result).toList()));
    }
}
