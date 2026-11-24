package in.schemematch.api.controller;

import in.schemematch.api.config.AppProperties;
import in.schemematch.api.service.SchemeService;
import in.schemematch.api.web.ErrorBody;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class HealthController {

    private final SchemeService schemes;
    private final AppProperties properties;

    public HealthController(SchemeService schemes, AppProperties properties) {
        this.schemes = schemes;
        this.properties = properties;
    }

    @GetMapping("/health")
    public Map<String, Boolean> health() {
        return Map.of("ok", true);
    }

    /** Daily keep-alive: one real read, so a free database does not go to sleep. */
    @GetMapping("/cron/keepalive")
    public ResponseEntity<?> keepAlive(
            @RequestHeader(name = "authorization", defaultValue = "") String authorization) {
        String secret = properties.cronSecret();
        if (secret.isEmpty() || !sameSecret(authorization, "Bearer " + secret)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(ErrorBody.of("UNAUTHORIZED", "Not allowed."));
        }
        return ResponseEntity.ok(new KeepAlive(true, schemes.list(null).size()));
    }

    public record KeepAlive(boolean ok, int schemes) {}

    /** MessageDigest.isEqual takes the same time however much matched, unlike equals. */
    private static boolean sameSecret(String given, String expected) {
        return MessageDigest.isEqual(given.getBytes(StandardCharsets.UTF_8),
                expected.getBytes(StandardCharsets.UTF_8));
    }
}
