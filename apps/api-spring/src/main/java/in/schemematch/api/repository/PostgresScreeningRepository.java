package in.schemematch.api.repository;

import in.schemematch.api.engine.Tri;
import in.schemematch.api.service.IdempotencyKeyReusedException;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Repository
@Profile("postgres")
public class PostgresScreeningRepository implements ScreeningRepository {

    private final JdbcClient db;
    private final JsonMapper json;

    public PostgresScreeningRepository(JdbcClient db, JsonMapper json) {
        this.db = db;
        this.json = json;
    }

    /**
     * All or nothing: if one match cannot be saved, the screening is rolled back too.
     *
     * <p>Two retries at the same moment both run the insert. The unique constraint lets one in;
     * the other waits for it to commit, gets no row back, and reads what the first one saved.
     */
    @Override
    @Transactional
    public SavedScreening save(NewScreening s) {
        Optional<UUID> newId = db.sql("""
                insert into screenings (idempotency_key, request_hash, install_id, profile)
                values (:key, :hash, :install, :profile::jsonb)
                on conflict (idempotency_key) do nothing
                returning id""")
                .param("key", s.idempotencyKey())
                .param("hash", s.requestHash())
                .param("install", s.installId())
                .param("profile", json.writeValueAsString(s.answers()))
                .query(UUID.class)
                .optional();

        if (newId.isPresent()) {
            s.matches().forEach(match -> insertMatch(newId.get(), match));
            return new SavedScreening(newId.get(), true, results(newId.get()));
        }
        Existing old = findByKey(s.idempotencyKey());
        if (!old.requestHash().equals(s.requestHash())) throw new IdempotencyKeyReusedException();
        return new SavedScreening(old.id(), false, results(old.id()));
    }

    @Override
    public int deleteInstall(UUID installId) {
        // The matches go too: their foreign key says "on delete cascade".
        return db.sql("delete from screenings where install_id = :install")
                .param("install", installId)
                .update();
    }

    private record Existing(UUID id, String requestHash) {}

    private Existing findByKey(UUID key) {
        return db.sql("select id, request_hash from screenings where idempotency_key = :key")
                .param("key", key)
                .query(Existing.class)
                .single();
    }

    private void insertMatch(UUID screeningId, MatchResult match) {
        db.sql("""
                insert into matches (screening_id, scheme_slug, result, reason)
                values (:id, :slug, :result, :reason)""")
                .param("id", screeningId)
                .param("slug", match.slug())
                .param("result", match.result().name())
                .param("reason", match.reason())
                .update();
    }

    private List<MatchResult> results(UUID screeningId) {
        return db.sql("""
                select scheme_slug, result, reason from matches
                where screening_id = :id order by scheme_slug collate "C\"""")
                .param("id", screeningId)
                .query((row, n) -> new MatchResult(row.getString("scheme_slug"),
                        Tri.valueOf(row.getString("result")), row.getString("reason")))
                .list();
    }
}
