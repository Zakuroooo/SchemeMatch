package in.schemematch.api.service;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.LinkedHashMap;
import java.util.Map;
import org.junit.jupiter.api.Test;

class RequestHashTest {
    private static final String INSTALL = "9a8b7c6d-5e4f-4a3b-8c2d-1e0f9a8b7c6d";

    @Test
    void ignoresKeyOrderButNotValues() {
        Map<String, Object> a = new LinkedHashMap<>();
        a.put("gender", "female");
        a.put("age", 1);
        String hash = RequestHash.of(INSTALL, a);
        assertThat(RequestHash.of(INSTALL, Map.of("age", 1, "gender", "female"))).isEqualTo(hash);
        assertThat(RequestHash.of(INSTALL, Map.of("age", 2, "gender", "female")))
                .isNotEqualTo(hash);
    }

    /** Value computed by Node, the same way as apps/api/src/screening-store.ts. */
    @Test
    void matchesTheTypeScriptHash() {
        assertThat(RequestHash.of(INSTALL,
                Map.of("age", 62, "annual_family_income", 60000.5, "gender", "female")))
                .isEqualTo("4f5d3ad145a985fccb0a1af8556fda76b82ea277f64faf68a9bd6906858d289f");
    }
}
