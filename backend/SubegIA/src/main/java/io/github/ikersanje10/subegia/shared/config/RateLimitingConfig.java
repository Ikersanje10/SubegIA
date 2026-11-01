package io.github.ikersanje10.subegia.shared.config;

import java.time.Duration;
import java.util.function.Supplier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import io.github.bucket4j.Bucket;

@Configuration
public class RateLimitingConfig {

    @Bean
    public Supplier<Bucket> bucketFactory() {
        return () -> Bucket.builder()
                .addLimit(limit -> limit.capacity(5).refillIntervally(5, Duration.ofMinutes(1)))
                .build();
    }
}
