package in.schemematch.api.web;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record EligibilityRequest(@NotNull @Valid ProfileRequest profile) {}
