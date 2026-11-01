package io.github.ikersanje10.subegia.assessment.infraestructure.config;

import java.time.Duration;
import java.time.Clock;

import org.springframework.cache.CacheManager;
import org.springframework.cache.caffeine.CaffeineCacheManager;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import com.github.benmanes.caffeine.cache.Caffeine;

@Configuration
public class CaffeineCacheConfig {

    @Bean
    public CacheManager cacheManager() {
        CaffeineCacheManager manager = new CaffeineCacheManager("weather");
        manager.setCaffeine(Caffeine.newBuilder()
                .maximumSize(2_000)
                .expireAfterWrite(Duration.ofHours(48)));
        manager.registerCustomCache("weatherRetry", Caffeine.newBuilder()
                .maximumSize(2_000)
                .expireAfterWrite(Duration.ofMinutes(1))
                .build());
        return manager;
    }

    @Bean
    public Clock assessmentClock() {
        return Clock.systemUTC();
    }
}
