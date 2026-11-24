package in.schemematch.api.service;

import in.schemematch.api.repository.ScreeningRepository;
import in.schemematch.api.repository.ScreeningRepository.MatchResult;
import in.schemematch.api.repository.ScreeningRepository.NewScreening;
import in.schemematch.api.repository.ScreeningRepository.SavedScreening;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Saves and deletes screenings. */
@Service
public class ScreeningService {

    private final EligibilityService eligibility;
    private final Optional<ScreeningRepository> repository;

    /** The repository exists only in the `postgres` profile, so it is Optional here. */
    public ScreeningService(
            EligibilityService eligibility, Optional<ScreeningRepository> repository) {
        this.eligibility = eligibility;
        this.repository = repository;
    }

    public SavedScreening save(String idempotencyKey, String installId,
            Map<String, Object> answers) {
        ScreeningRepository store = repository.orElseThrow(StorageUnavailableException::new);
        List<MatchResult> matches = eligibility.screen(answers).matches().stream()
                .map(m -> new MatchResult(m.scheme().slug(), m.result().result(),
                        m.result().storedReason()))
                .toList();
        return store.save(new NewScreening(UUID.fromString(idempotencyKey),
                RequestHash.of(installId, answers), UUID.fromString(installId), answers, matches));
    }

    public int deleteInstall(String installId) {
        return repository.orElseThrow(StorageUnavailableException::new)
                .deleteInstall(UUID.fromString(installId));
    }
}
