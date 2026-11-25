package in.schemematch.api.web;

import in.schemematch.api.service.IdempotencyKeyReusedException;
import in.schemematch.api.service.StorageUnavailableException;
import in.schemematch.api.web.ErrorBody.Issue;
import java.util.List;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.MessageSourceResolvable;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.transaction.CannotCreateTransactionException;
import org.springframework.validation.FieldError;
import org.springframework.validation.method.ParameterErrors;
import org.springframework.validation.method.ParameterValidationResult;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import tools.jackson.core.exc.StreamConstraintsException;
import tools.jackson.core.exc.StreamReadException;
import tools.jackson.databind.DatabindException;

/** Turns every exception into the same JSON error shape. Never echoes a sent value. */
@RestControllerAdvice
public class ApiExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    private static ResponseEntity<ErrorBody> error(HttpStatus status, String code, String message) {
        return ResponseEntity.status(status).body(ErrorBody.of(code, message));
    }

    private static ResponseEntity<ErrorBody> invalid(List<Issue> issues) {
        return ResponseEntity.badRequest().body(ErrorBody.validation(issues));
    }

    /** The body was read, but a Bean Validation rule on it failed. */
    @ExceptionHandler
    ResponseEntity<ErrorBody> bodyRules(MethodArgumentNotValidException e) {
        return invalid(e.getFieldErrors().stream().map(ApiExceptionHandler::issue).toList());
    }

    /** The same, for methods that also have rules on headers or query parameters. */
    @ExceptionHandler
    ResponseEntity<ErrorBody> parameterRules(HandlerMethodValidationException e) {
        return invalid(e.getParameterValidationResults().stream()
                .flatMap(result -> result instanceof ParameterErrors body
                        ? body.getFieldErrors().stream().map(ApiExceptionHandler::issue)
                        : result.getResolvableErrors().stream()
                                .map(error -> issue(result, error)))
                .toList());
    }

    private static Issue issue(FieldError error) {
        return new Issue("/" + snakeCase(error.getField()).replace('.', '/'),
                error.getDefaultMessage());
    }

    private static Issue issue(ParameterValidationResult result, MessageSourceResolvable error) {
        RequestHeader header = result.getMethodParameter().getParameterAnnotation(RequestHeader.class);
        String name = header != null ? header.name() : result.getMethodParameter().getParameterName();
        return new Issue("/" + name, error.getDefaultMessage());
    }

    private static String snakeCase(String name) {
        return name.replaceAll("([A-Z])", "_$1").toLowerCase(java.util.Locale.ROOT);
    }

    /** The query string has a parameter this route does not know. */
    @ExceptionHandler
    ResponseEntity<ErrorBody> query(InvalidQueryException e) {
        return invalid(List.of(new Issue("", e.getMessage())));
    }

    /** The body is missing, is not JSON, or has a wrong type or an unknown key. */
    @ExceptionHandler
    ResponseEntity<ErrorBody> unreadableBody(HttpMessageNotReadableException e) {
        Throwable cause = e.getCause();
        if (cause instanceof StreamConstraintsException) {
            return error(HttpStatus.CONTENT_TOO_LARGE, "BODY_TOO_LARGE",
                    "The request body is too large or too deeply nested.");
        }
        if (cause instanceof StreamReadException) {
            return error(HttpStatus.BAD_REQUEST, "INVALID_JSON", "The body is not valid JSON.");
        }
        // Jackson's own message contains the sent value, so only the path is used. The last
        // step of the path is dropped for unknown keys: the key itself could be personal.
        if (cause instanceof DatabindException json) {
            boolean unknownKey = json
                    instanceof tools.jackson.databind.exc.UnrecognizedPropertyException;
            List<tools.jackson.core.JacksonException.Reference> steps = json.getPath();
            String path = steps.subList(0, Math.max(0, steps.size() - (unknownKey ? 1 : 0)))
                    .stream().map(s -> "/" + s.getPropertyName()).collect(Collectors.joining());
            return invalid(List.of(
                    new Issue(path, unknownKey ? "unknown key" : "wrong type of value")));
        }
        return invalid(List.of(new Issue("", "a JSON body is required")));
    }

    @ExceptionHandler
    ResponseEntity<ErrorBody> mediaType(HttpMediaTypeNotSupportedException e) {
        return error(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "UNSUPPORTED_MEDIA_TYPE",
                "Send the body as application/json.");
    }

    /** A wrong method on a known path is also "no such route", as in the Fastify API. */
    @ExceptionHandler({NoResourceFoundException.class, HttpRequestMethodNotSupportedException.class})
    ResponseEntity<ErrorBody> notFound() {
        return error(HttpStatus.NOT_FOUND, "NOT_FOUND", "No such route.");
    }

    @ExceptionHandler
    ResponseEntity<ErrorBody> reusedKey(IdempotencyKeyReusedException e) {
        return error(HttpStatus.CONFLICT, "IDEMPOTENCY_KEY_REUSED", e.getMessage());
    }

    @ExceptionHandler
    ResponseEntity<ErrorBody> noStorage(StorageUnavailableException e) {
        return error(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_UNAVAILABLE", e.getMessage());
    }

    /** Not our bug and not the client's: the same request can work later. */
    @ExceptionHandler({CannotCreateTransactionException.class,
        DataAccessResourceFailureException.class})
    ResponseEntity<ErrorBody> databaseDown(Exception e) {
        log.error("database unreachable: {}", e.getClass().getName());
        return error(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_UNAVAILABLE",
                "The database cannot be reached. Try again later.");
    }

    /** Only class and place are logged: a message (e.g. from SQL) could contain a profile. */
    @ExceptionHandler
    ResponseEntity<ErrorBody> unexpected(Exception e) {
        StackTraceElement[] trace = e.getStackTrace();
        log.error("unhandled {} at {}", e.getClass().getName(), trace.length > 0 ? trace[0] : "?");
        return error(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL", "Something went wrong.");
    }
}
