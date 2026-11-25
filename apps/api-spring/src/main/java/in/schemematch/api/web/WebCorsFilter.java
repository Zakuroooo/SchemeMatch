package in.schemematch.api.web;

import in.schemematch.api.config.AppProperties;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpHeaders;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tools.jackson.databind.json.JsonMapper;

/**
 * Browsers let a page read our answers only if we name its origin. Spring's own CORS support
 * answers 403 to other origins; the Fastify API answers normally without the header, so this
 * small filter keeps that behaviour. CORS is not access control: curl ignores it.
 */
@Component
@Order(1)
public class WebCorsFilter extends OncePerRequestFilter {

    private final AppProperties properties;
    private final JsonMapper json;

    public WebCorsFilter(AppProperties properties, JsonMapper json) {
        this.properties = properties;
        this.json = json;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
            FilterChain chain) throws ServletException, IOException {
        String origin = request.getHeader(HttpHeaders.ORIGIN);
        boolean allowed = origin != null && properties.webOrigins().stream()
                .anyMatch(o -> o.startsWith("^") ? origin.matches(o) : origin.equals(o));
        response.addHeader(HttpHeaders.VARY, HttpHeaders.ORIGIN);
        if (allowed) response.setHeader(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, origin);

        if (!request.getMethod().equals("OPTIONS")) {
            chain.doFilter(request, response);
        } else if (allowed && request.getHeader("Access-Control-Request-Method") != null) {
            response.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE");
            response.setHeader("Access-Control-Allow-Headers",
                    "content-type, idempotency-key, x-install-id");
            response.setHeader("Access-Control-Max-Age", "600");
            response.setStatus(HttpServletResponse.SC_NO_CONTENT);
        } else {
            JsonErrors.write(response, json, 404, ErrorBody.of("NOT_FOUND", "No such route."));
        }
    }
}
