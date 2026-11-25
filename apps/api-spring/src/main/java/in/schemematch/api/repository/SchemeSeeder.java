package in.schemematch.api.repository;

import java.io.IOException;
import java.io.InputStream;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Fills an empty local database with the 30 bundled schemes. Existing rows stay as they are. */
@Component
@Profile("postgres")
public class SchemeSeeder implements ApplicationRunner {

    private final JdbcClient db;
    private final JsonMapper json;

    public SchemeSeeder(JdbcClient db, JsonMapper json) {
        this.db = db;
        this.json = json;
    }

    @Override
    public void run(ApplicationArguments args) throws IOException {
        try (InputStream in = new ClassPathResource("schemes.json").getInputStream()) {
            for (JsonNode s : json.readTree(in)) insert(s);
        }
    }

    private void insert(JsonNode s) {
        db.sql("""
                insert into schemes (slug, level, state, category, official_url, title, benefit,
                                     rule_format_version, eligibility, unmodelled)
                values (:slug, :level, :state, :category, :url, :title, :benefit,
                        :version, :eligibility::jsonb, :unmodelled::jsonb)
                on conflict (slug) do nothing""")
                .param("slug", s.get("slug").asString())
                .param("level", s.get("level").asString())
                .param("state", s.path("state").isString() ? s.get("state").asString() : null)
                .param("category", s.get("category").asString())
                .param("url", s.get("official_url").asString())
                .param("title", s.at("/text/en/title").asString())
                .param("benefit", s.at("/text/en/benefit").asString())
                .param("version", s.path("rule_format_version").asInt(1))
                .param("eligibility", s.get("eligibility").toString())
                .param("unmodelled", s.has("unmodelled") ? s.get("unmodelled").toString() : "[]")
                .update();
    }
}
