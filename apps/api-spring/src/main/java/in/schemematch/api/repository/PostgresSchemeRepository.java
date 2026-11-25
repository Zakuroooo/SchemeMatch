package in.schemematch.api.repository;

import in.schemematch.api.engine.RuleNode;
import in.schemematch.api.engine.Scheme;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.json.JsonMapper;

/** Reads live schemes from the database on every call (no cache, to keep this simple). */
@Repository
@Profile("postgres")
public class PostgresSchemeRepository implements SchemeRepository {

    private final JdbcClient db;
    private final JsonMapper json;

    public PostgresSchemeRepository(JdbcClient db, JsonMapper json) {
        this.db = db;
        this.json = json;
    }

    @Override
    public List<Scheme> listLive() {
        // collate "C" sorts by plain character order, the same on every machine.
        return db.sql("select * from schemes where status = 'live' order by slug collate \"C\"")
                .query(this::toScheme)
                .list();
    }

    private Scheme toScheme(ResultSet row, int rowNumber) throws SQLException {
        return new Scheme(
                row.getString("slug"),
                row.getString("level"),
                row.getString("state"),
                row.getString("category"),
                row.getString("official_url"),
                row.getString("title"),
                row.getString("benefit"),
                row.getInt("rule_format_version"),
                RuleNode.fromJson(json.readTree(row.getString("eligibility"))),
                Scheme.unmodelledFromJson(json.readTree(row.getString("unmodelled"))));
    }
}
