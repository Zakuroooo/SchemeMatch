package in.schemematch.api.web;

import in.schemematch.api.repository.ScreeningRepository;
import in.schemematch.api.service.IdempotencyKeyReusedException;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;

/** Test double with the same rules as the database, for fast route tests. */
class InMemoryScreenings implements ScreeningRepository {
    private record Row(NewScreening request, SavedScreening saved) {}

    private final Map<UUID, Row> rows = new LinkedHashMap<>();

    @Override
    public SavedScreening save(NewScreening s) {
        Row old = rows.get(s.idempotencyKey());
        if (old == null) {
            SavedScreening saved = new SavedScreening(UUID.randomUUID(), true, s.matches());
            rows.put(s.idempotencyKey(), new Row(s, saved));
            return saved;
        }
        if (!old.request().requestHash().equals(s.requestHash())) {
            throw new IdempotencyKeyReusedException();
        }
        return new SavedScreening(old.saved().screeningId(), false, old.saved().results());
    }

    @Override
    public int deleteInstall(UUID installId) {
        int before = rows.size();
        rows.values().removeIf(row -> row.request().installId().equals(installId));
        return before - rows.size();
    }

    int count() {
        return rows.size();
    }

    void clear() {
        rows.clear();
    }

    @TestConfiguration
    static class Config {
        @Bean
        InMemoryScreenings screenings() {
            return new InMemoryScreenings();
        }
    }
}
