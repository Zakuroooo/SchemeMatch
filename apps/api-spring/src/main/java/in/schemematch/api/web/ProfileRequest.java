package in.schemematch.api.web;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.Map;
import java.util.TreeMap;

/**
 * The only shape a profile may have. Any other key is refused, so a client can never send a
 * name, phone or Aadhaar number by mistake. Every field is optional: null means "not answered".
 * Ranges are generous but stop impossible values. Same rules as apps/api profile-schema.ts.
 */
public record ProfileRequest(
        @Pattern(regexp = "[A-Z]{2}", message = "two-letter state code, e.g. MH") String state,
        @Size(min = 2, max = 60)
                @Pattern(regexp = STORABLE, message = "a character is not allowed") String district,
        @Min(0) @Max(120) Integer age,
        @Pattern(regexp = "female|male|other", message = "not an allowed value") String gender,
        @Pattern(regexp = "single|married|widow|divorced|abandoned",
                message = "not an allowed value") String maritalStatus,
        @DecimalMin("0") @DecimalMax("1000000000") Double annualFamilyIncome,
        @Pattern(regexp = "SC|ST|OBC|General|EWS", message = "not an allowed value")
                String casteCategory,
        @Size(min = 2, max = 60)
                @Pattern(regexp = STORABLE, message = "a character is not allowed") String occupation,
        @DecimalMin("0") @DecimalMax("100000") Double landAcres,
        @DecimalMin("0") @DecimalMax("100") Double disabilityPercent,
        Boolean isStudent,
        @Pattern(regexp = "class_([1-9]|1[0-2])|diploma|undergraduate|postgraduate",
                message = "not an allowed value") String educationLevel,
        @Min(1) @Max(50) Integer householdSize,
        Boolean hasBplCard,
        @Min(0) @Max(30) Integer childrenCount,
        Boolean isPregnantOrLactating) {

    /** No NUL character and no half surrogate pair: PostgreSQL refuses to store them. */
    private static final String STORABLE = "[^\\x00\\p{Cs}]*";

    /** The answers as the engine wants them: field name to answer, unanswered ones left out. */
    public Map<String, Object> answers() {
        Map<String, Object> answers = new TreeMap<>(); // sorted, so equal profiles look equal
        put(answers, "state", state);
        put(answers, "district", district);
        put(answers, "age", age);
        put(answers, "gender", gender);
        put(answers, "marital_status", maritalStatus);
        put(answers, "annual_family_income", annualFamilyIncome);
        put(answers, "caste_category", casteCategory);
        put(answers, "occupation", occupation);
        put(answers, "land_acres", landAcres);
        put(answers, "disability_percent", disabilityPercent);
        put(answers, "is_student", isStudent);
        put(answers, "education_level", educationLevel);
        put(answers, "household_size", householdSize);
        put(answers, "has_bpl_card", hasBplCard);
        put(answers, "children_count", childrenCount);
        put(answers, "is_pregnant_or_lactating", isPregnantOrLactating);
        return answers;
    }

    private static void put(Map<String, Object> answers, String field, Object answer) {
        if (answer instanceof Double d && d == Math.rint(d)) answer = d.longValue(); // 60000.0 = 60000
        if (answer != null) answers.put(field, answer);
    }

    /** A record prints all its values by default. Profiles must never reach a log. */
    @Override
    public String toString() {
        return "ProfileRequest[redacted]";
    }
}
