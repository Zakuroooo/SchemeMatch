package in.schemematch.api.service;

/** The same Idempotency-Key was sent with a different request. */
public class IdempotencyKeyReusedException extends RuntimeException {
    public IdempotencyKeyReusedException() {
        super("This Idempotency-Key was already used for a different request.");
    }
}
