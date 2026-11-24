package in.schemematch.api.config;

import java.time.Clock;
import org.springframework.boot.jackson.autoconfigure.JsonMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.MapperFeature;
import tools.jackson.databind.cfg.CoercionAction;
import tools.jackson.databind.cfg.CoercionInputShape;
import tools.jackson.databind.type.LogicalType;

/**
 * Jackson is friendly by default: it ignores extra keys and turns "38" into 38. For this API
 * both are bugs. An extra key could be a name or a phone number, and guessing a wrongly typed
 * answer could give a wrong result. So unknown keys and wrong types are refused.
 */
@Configuration
public class StrictJsonConfig {

    @Bean
    JsonMapperBuilderCustomizer strictJson() {
        return builder -> builder
                .enable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
                .disable(DeserializationFeature.ACCEPT_FLOAT_AS_INT) // 38.5 is not an age
                .disable(MapperFeature.ALLOW_COERCION_OF_SCALARS) // "38" is not 38
                .withCoercionConfig(LogicalType.Textual, text -> text // 12 is not "12"
                        .setCoercion(CoercionInputShape.Integer, CoercionAction.Fail)
                        .setCoercion(CoercionInputShape.Float, CoercionAction.Fail)
                        .setCoercion(CoercionInputShape.Boolean, CoercionAction.Fail));
    }

    /** The clock is a bean so that a test can replace it. */
    @Bean
    Clock clock() {
        return Clock.systemUTC();
    }
}
