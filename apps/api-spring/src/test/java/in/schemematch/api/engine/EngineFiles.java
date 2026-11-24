package in.schemematch.api.engine;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Stream;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/** Reads the files shared with the TypeScript engine, in place: nothing is copied. */
final class EngineFiles {
    static final Path REPO = Path.of("../..");
    static final Path PROFILES = REPO.resolve("packages/engine/test/profiles");
    static final Path GOLDEN = REPO.resolve("pipeline/golden/schemes");
    private static final JsonMapper JSON = JsonMapper.builder().build();

    private EngineFiles() {}

    static JsonNode read(Path file) {
        return JSON.readTree(file.toFile());
    }

    static List<Path> jsonFiles(Path dir) {
        try (Stream<Path> files = Files.list(dir)) {
            return files.filter(f -> f.toString().endsWith(".json")).sorted().toList();
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }

    static List<Scheme> goldenSchemes() {
        return jsonFiles(GOLDEN).stream().map(f -> Scheme.fromJson(read(f))).toList();
    }

    @SuppressWarnings("unchecked")
    static Map<String, Object> profile(JsonNode json) {
        return new LinkedHashMap<>(JSON.convertValue(json, Map.class));
    }

    static List<String> strings(JsonNode array) {
        return array.valueStream().map(JsonNode::asString).toList();
    }
}
