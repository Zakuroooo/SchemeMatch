package in.schemematch.api.engine;

import java.util.Collection;

/** Three-valued result: UNKNOWN means a needed field was not answered yet. */
public enum Tri {
    PASS, FAIL, UNKNOWN;

    static Tri of(boolean ok) {
        return ok ? PASS : FAIL;
    }

    /** AND with three values: one FAIL decides; otherwise any UNKNOWN keeps it open. */
    static Tri allOf(Collection<Tri> results) {
        if (results.contains(FAIL)) return FAIL;
        if (results.contains(UNKNOWN)) return UNKNOWN;
        return PASS;
    }

    /** OR with three values: one PASS decides; otherwise any UNKNOWN keeps it open. */
    static Tri anyOf(Collection<Tri> results) {
        if (results.contains(PASS)) return PASS;
        if (results.contains(UNKNOWN)) return UNKNOWN;
        return FAIL;
    }
}
