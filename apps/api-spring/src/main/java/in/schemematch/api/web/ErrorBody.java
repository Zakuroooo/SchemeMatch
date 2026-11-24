package in.schemematch.api.web;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.util.List;

/** The one error shape of the API: {"error": {"code", "message", "details"?}}. */
public record ErrorBody(Detail error) {

    public record Detail(
            String code,
            String message,
            @JsonInclude(JsonInclude.Include.NON_NULL) List<Issue> details) {}

    /** Which field is wrong and why. Never the value that was sent. */
    public record Issue(String path, String message) {}

    public static ErrorBody of(String code, String message) {
        return new ErrorBody(new Detail(code, message, null));
    }

    public static ErrorBody validation(List<Issue> issues) {
        return new ErrorBody(new Detail("VALIDATION_ERROR", "The request is not valid.", issues));
    }
}
