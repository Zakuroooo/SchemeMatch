package in.schemematch.api.web;

import in.schemematch.api.config.AppProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.util.HashMap;
import java.util.Map;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.json.JsonMapper;

/**
 * Fixed-window rate limit: each client gets N requests per minute, then 429.
 * The counts live in this process, so two servers would each allow N.
 */
@Component
@Order(2)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final long WINDOW_MS = 60_000;
    private static final int SWEEP_ABOVE = 10_000;

    private record Window(long startedAt, int count) {}

    private final Map<String, Window> windows = new HashMap<>();
    private final AppProperties properties;
    private final Clock clock;
    private final JsonMapper json;

    public RateLimitFilter(AppProperties properties, Clock clock, JsonMapper json) {
        this.properties = properties;
        this.clock = clock;
        this.json = json;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        long now = clock.millis();
        Window window = hit(clientOf(request), now);
        int limit = properties.rateLimitPerMinute();
        long resetSeconds = (window.startedAt() + WINDOW_MS - now + 999) / 1000;
        response.setHeader("x-ratelimit-limit", String.valueOf(limit));
        response.setHeader("x-ratelimit-remaining",
                String.valueOf(Math.max(0, limit - window.count())));
        response.setHeader("x-ratelimit-reset", String.valueOf(resetSeconds));

        if (window.count() > limit) {
            response.setHeader("retry-after", String.valueOf(resetSeconds));
            JsonErrors.write(response, json, 429, ErrorBody.of("RATE_LIMITED",
                    "Too many requests. Try again in " + resetSeconds + " seconds."));
            return;
        }
        chain.doFilter(request, response);
    }

    /** Counts one request. `synchronized`: two threads must not read the same old count. */
    private synchronized Window hit(String client, long now) {
        if (windows.size() > SWEEP_ABOVE) {
            windows.values().removeIf(w -> now - w.startedAt() >= WINDOW_MS);
        }
        Window old = windows.get(client);
        Window next = old == null || now - old.startedAt() >= WINDOW_MS
                ? new Window(now, 1)
                : new Window(old.startedAt(), old.count() + 1);
        windows.put(client, next);
        return next;
    }

    private String clientOf(HttpServletRequest request) {
        String header = properties.clientIpHeader();
        String fromProxy = header.isEmpty() ? null : request.getHeader(header);
        return fromProxy == null || fromProxy.isEmpty() ? request.getRemoteAddr() : fromProxy;
    }
}
