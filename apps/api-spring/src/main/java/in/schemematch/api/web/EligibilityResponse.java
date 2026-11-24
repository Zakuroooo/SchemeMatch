package in.schemematch.api.web;

import in.schemematch.api.engine.Scheme;
import in.schemematch.api.engine.SchemeResult;
import in.schemematch.api.engine.Tri;
import in.schemematch.api.service.EligibilityService.Screening;
import java.util.List;

/** The answer of POST /eligibility. Java names become snake_case JSON (application.yml). */
public record EligibilityResponse(
        List<Eligible> eligible,
        List<NeedInfo> needInfo,
        List<NotEligible> notEligible,
        String nextQuestion,
        String disclaimer) {

    public static final String DISCLAIMER =
            "You are likely eligible — please confirm at the office. "
                    + "SchemeMatch is not an official government app.";

    public record Eligible(String slug, String title, String benefit, String officialUrl,
            List<String> reasons, List<String> alsoConfirm) {}

    public record NeedInfo(String slug, String title, List<String> missing,
            List<String> otherWays) {}

    public record NotEligible(String slug, String title, String closestMiss, boolean otherState,
            List<String> otherWays) {}

    public static EligibilityResponse from(Screening screening) {
        return new EligibilityResponse(
                screening.with(Tri.PASS).map(m -> {
                    Scheme s = m.scheme();
                    SchemeResult r = m.result();
                    return new Eligible(s.slug(), s.title(), s.benefit(), s.officialUrl(),
                            r.reasons(), r.alsoConfirm());
                }).toList(),
                screening.with(Tri.UNKNOWN).map(m -> new NeedInfo(m.scheme().slug(),
                        m.scheme().title(), m.result().missing(), m.result().otherWays())).toList(),
                screening.with(Tri.FAIL).map(m -> new NotEligible(m.scheme().slug(),
                        m.scheme().title(), m.result().storedReason(), m.result().otherState(),
                        m.result().otherWays())).toList(),
                screening.nextQuestion(),
                DISCLAIMER);
    }
}
