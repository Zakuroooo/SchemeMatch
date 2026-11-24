package in.schemematch.api.web;

import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import tools.jackson.databind.json.JsonMapper;

/** Filters run before controllers, so ApiExceptionHandler can't help them. */
final class JsonErrors {
    private JsonErrors() {}

    static void write(HttpServletResponse response, JsonMapper json, int status, ErrorBody body)
            throws IOException {
        response.setStatus(status);
        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        response.getWriter().write(json.writeValueAsString(body));
    }
}
