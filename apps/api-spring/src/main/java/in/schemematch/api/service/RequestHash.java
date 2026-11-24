package in.schemematch.api.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;
import java.util.TreeMap;
import tools.jackson.databind.json.JsonMapper;

/**
 * SHA-256 of a request, with keys sorted so that key order does not matter. A retry must carry
 * the same hash; the same idempotency key with another hash is refused.
 */
final class RequestHash {
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private RequestHash() {}

    static String of(String installId, Map<String, Object> answers) {
        String text = JSON.writeValueAsString(new TreeMap<>(
                Map.of("install_id", installId, "profile", new TreeMap<>(answers))));
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(text.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("every Java has SHA-256", e);
        }
    }
}
