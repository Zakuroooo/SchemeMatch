package in.schemematch.api.repository;

import in.schemematch.api.engine.Scheme;
import java.util.List;

/** Where schemes come from. The Spring profile picks the implementation. */
public interface SchemeRepository {
    List<Scheme> listLive();
}
