package in.schemematch.api.repository;

import in.schemematch.api.engine.Scheme;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.json.JsonMapper;

/** Default: the 30 schemes packed into the jar, read once at startup. No database needed. */
@Repository
@Profile("!postgres")
public class BundledSchemeRepository implements SchemeRepository {

    private final List<Scheme> schemes;

    public BundledSchemeRepository(JsonMapper json) throws IOException {
        try (InputStream in = new ClassPathResource("schemes.json").getInputStream()) {
            schemes = json.readTree(in).valueStream().map(Scheme::fromJson).toList();
        }
    }

    @Override
    public List<Scheme> listLive() {
        return schemes;
    }
}
