package in.schemematch.api.service;

import in.schemematch.api.engine.Scheme;
import in.schemematch.api.repository.SchemeRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class SchemeService {

    private final SchemeRepository schemes;

    public SchemeService(SchemeRepository schemes) {
        this.schemes = schemes;
    }

    /** All live schemes, or (with a state) the central ones plus that state's own. */
    public List<Scheme> list(String state) {
        return schemes.listLive().stream()
                .filter(s -> state == null || s.level().equals("central")
                        || state.equals(s.state()))
                .toList();
    }
}
