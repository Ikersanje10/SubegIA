package io.github.ikersanje10.subegia.assessment.infraestructure.config;

import java.time.Duration;

import org.junit.jupiter.api.Test;
import org.springframework.cache.caffeine.CaffeineCache;

import static org.junit.jupiter.api.Assertions.*;

class CaffeineCacheConfigTests {
    @Test
    void limitsWeatherEntriesAndExpiresAfter48HoursFromWriteNotAccess() {
        var cache = assertInstanceOf(CaffeineCache.class,
                new CaffeineCacheConfig().cacheManager().getCache("weather"));
        var policy = cache.getNativeCache().policy();
        assertEquals(2_000, policy.eviction().orElseThrow().getMaximum());
        assertEquals(Duration.ofHours(48), policy.expireAfterWrite().orElseThrow().getExpiresAfter());
        assertTrue(policy.expireAfterAccess().isEmpty());
    }

    @Test
    void boundsDeferredResultsAndRetriesAfterOneMinuteWithoutExtendingOnReads() {
        var cache = assertInstanceOf(CaffeineCache.class,
                new CaffeineCacheConfig().cacheManager().getCache("weatherRetry"));
        assertEquals(2_000, cache.getNativeCache().policy().eviction().orElseThrow().getMaximum());
        assertEquals(Duration.ofMinutes(1),
                cache.getNativeCache().policy().expireAfterWrite().orElseThrow().getExpiresAfter());
        assertTrue(cache.getNativeCache().policy().expireAfterAccess().isEmpty());
    }
}
