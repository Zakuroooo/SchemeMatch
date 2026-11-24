package in.schemematch.api.controller;

import in.schemematch.api.repository.ScreeningRepository.MatchResult;
import in.schemematch.api.repository.ScreeningRepository.SavedScreening;
import in.schemematch.api.service.ScreeningService;
import in.schemematch.api.web.EligibilityResponse;
import in.schemematch.api.web.SaveScreeningRequest;
import in.schemematch.api.web.UuidText;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/screenings")
public class ScreeningController {

    private final ScreeningService screenings;

    public ScreeningController(ScreeningService screenings) {
        this.screenings = screenings;
    }

    /**
     * Saves a screening exactly once. The client makes one Idempotency-Key per screening and
     * sends it again on every retry, so a flaky network cannot create duplicates.
     */
    @PostMapping
    public ResponseEntity<ScreeningResponse> save(
            @RequestHeader(name = "idempotency-key", required = false) @NotNull @UuidText
                    String idempotencyKey,
            @Valid @RequestBody SaveScreeningRequest request) {
        SavedScreening saved = screenings.save(
                idempotencyKey, request.installId(), request.profile().answers());
        return ResponseEntity
                .status(saved.created() ? HttpStatus.CREATED : HttpStatus.OK)
                .body(new ScreeningResponse(saved.screeningId(), saved.created(),
                        saved.results(), EligibilityResponse.DISCLAIMER));
    }

    /**
     * "Delete my data". Holding the random install id proves the data is yours. It works like a
     * password, so it travels in a header and never in the URL (URLs end up in access logs).
     */
    @DeleteMapping
    public Map<String, Integer> delete(
            @RequestHeader(name = "x-install-id", required = false) @NotNull @UuidText
                    String installId) {
        return Map.of("deleted", screenings.deleteInstall(installId));
    }

    public record ScreeningResponse(UUID screeningId, boolean created, List<MatchResult> results,
            String disclaimer) {}
}
