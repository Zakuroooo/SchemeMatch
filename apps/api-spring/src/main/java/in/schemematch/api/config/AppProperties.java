package in.schemematch.api.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * Our own settings, all under `schemematch.` in application.yml or environment variables.
 *
 * @param rateLimitPerMinute requests per minute per client address
 * @param clientIpHeader     header holding the real client IP, set by a trusted proxy. Empty by
 *                           default: then client headers are ignored, so nobody can fake an IP
 * @param cronSecret         shared secret of the keep-alive route; empty refuses everyone
 * @param webOrigins         web pages allowed to call the API; an entry starting with ^ is a
 *                           full-match pattern. Empty means none
 */
@ConfigurationProperties("schemematch")
public record AppProperties(
        @DefaultValue("60") int rateLimitPerMinute,
        @DefaultValue("") String clientIpHeader,
        @DefaultValue("") String cronSecret,
        @DefaultValue List<String> webOrigins) {

    /** Never print the secret. */
    @Override
    public String toString() {
        return "AppProperties[rateLimitPerMinute=" + rateLimitPerMinute + "]";
    }
}
