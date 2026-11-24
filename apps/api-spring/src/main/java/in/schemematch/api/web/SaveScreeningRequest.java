package in.schemematch.api.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record SaveScreeningRequest(
        @NotNull @UuidText String installId,
        @NotNull @Valid ProfileRequest profile) {

    /** The install id works like a password, so it is never printed. */
    @Override
    public String toString() {
        return "SaveScreeningRequest[redacted]";
    }
}
