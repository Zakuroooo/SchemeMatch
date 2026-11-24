package in.schemematch.api.repository;

import in.schemematch.api.engine.Tri;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Where screenings are saved. Saving must happen exactly once per idempotency key. */
public interface ScreeningRepository {

    /** One scheme's result as it is stored with a screening. */
    record MatchResult(String slug, Tri result, String reason) {}

    record NewScreening(UUID idempotencyKey, String requestHash, UUID installId,
            Map<String, Object> answers, List<MatchResult> matches) {
        /** Holds a person's answers: never print it. */
        @Override
        public String toString() {
            return "NewScreening[redacted]";
        }
    }

    /** `created` is false when this was a retry of a screening already saved. */
    record SavedScreening(UUID screeningId, boolean created, List<MatchResult> results) {}

    SavedScreening save(NewScreening screening);

    /** Removes every screening of one install; returns how many. */
    int deleteInstall(UUID installId);
}
