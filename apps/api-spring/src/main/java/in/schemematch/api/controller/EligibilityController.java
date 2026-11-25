package in.schemematch.api.controller;

import in.schemematch.api.service.EligibilityService;
import in.schemematch.api.web.EligibilityRequest;
import in.schemematch.api.web.EligibilityResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class EligibilityController {

    private final EligibilityService eligibility;

    public EligibilityController(EligibilityService eligibility) {
        this.eligibility = eligibility;
    }

    @PostMapping("/eligibility")
    public EligibilityResponse check(@Valid @RequestBody EligibilityRequest request) {
        return EligibilityResponse.from(eligibility.screen(request.profile().answers()));
    }
}
