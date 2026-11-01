package io.github.ikersanje10.subegia.shared.api;

import java.time.Duration;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import io.github.bucket4j.Bucket;
import io.github.ikersanje10.subegia.shared.config.CorsConfig;
import io.github.ikersanje10.subegia.shared.config.RateLimitingConfig;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;

class RateLimitingFilterTests {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void skipsOtherMethodsAndPathsWithoutCreatingBuckets() throws Exception {
        AtomicInteger creations = new AtomicInteger();
        AtomicInteger forwarded = new AtomicInteger();
        var filter = new RateLimitingFilter(() -> {
            creations.incrementAndGet();
            return new RateLimitingConfig().bucketFactory().get();
        }, mapper);
        for (String[] endpoint : new String[][] {
                {"OPTIONS", "/api/v1/assessment"}, {"GET", "/api/v1/assessment"},
                {"POST", "/api/v1/other"}, {"POST", "/api/v1/assessment/other"}}) {
            filter.doFilter(new MockHttpServletRequest(endpoint[0], endpoint[1]),
                    new MockHttpServletResponse(), (request, response) -> forwarded.incrementAndGet());
        }
        assertEquals(0, creations.get());
        assertEquals(4, forwarded.get());
    }

    @Test
    void sharesQuotaPerIpAndReturnsApiErrorIncludingCorsHeaders() throws Exception {
        var filter = new RateLimitingFilter(() -> Bucket.builder()
                .addLimit(limit -> limit.capacity(5).refillGreedy(5, Duration.ofHours(1)))
                .build(), mapper);
        var cors = new CorsConfig().corsFilterRegistration(List.of("http://localhost:4200")).getFilter();
        AtomicInteger forwarded = new AtomicInteger();
        MockHttpServletResponse response = null;
        for (int i = 0; i < 6; i++) {
            var request = new MockHttpServletRequest("POST", "/api/v1/assessment");
            request.setRemoteAddr("192.0.2.1");
            request.addHeader("Origin", "http://localhost:4200");
            response = new MockHttpServletResponse();
            cors.doFilter(request, response, (req, res) ->
                    filter.doFilter(req, res, (nextRequest, nextResponse) -> forwarded.incrementAndGet()));
            if (i < 5) {
                assertEquals(String.valueOf(4 - i), response.getHeader("X-Rate-Limit-Remaining"));
            }
        }
        assertEquals(5, forwarded.get());
        assertEquals(429, response.getStatus());
        assertTrue(Long.parseLong(response.getHeader("Retry-After")) > 0);
        assertEquals("http://localhost:4200", response.getHeader("Access-Control-Allow-Origin"));
        assertTrue(response.getHeader("Access-Control-Expose-Headers").contains("Retry-After"));
        assertEquals("application/json;charset=UTF-8", response.getContentType());
        var error = mapper.readTree(response.getContentAsString());
        assertEquals(429, error.get("status").asInt());
        assertEquals("RATE_LIMIT_EXCEEDED", error.get("code").asText());
        assertTrue(error.get("fieldErrors").isObject());

        var otherIp = new MockHttpServletRequest("POST", "/api/v1/assessment");
        otherIp.setRemoteAddr("192.0.2.2");
        filter.doFilter(otherIp, new MockHttpServletResponse(),
                (request, res) -> forwarded.incrementAndGet());
        assertEquals(6, forwarded.get());
    }

    @Test
    void preflightDoesNotConsumeTokensAndUntrustedOriginIsRejected() throws Exception {
        AtomicInteger creations = new AtomicInteger();
        var filter = new RateLimitingFilter(() -> {
            creations.incrementAndGet();
            return new RateLimitingConfig().bucketFactory().get();
        }, mapper);
        var cors = new CorsConfig().corsFilterRegistration(List.of("http://localhost:4200")).getFilter();
        var preflight = new MockHttpServletRequest("OPTIONS", "/api/v1/assessment");
        preflight.addHeader("Origin", "http://localhost:4200");
        preflight.addHeader("Access-Control-Request-Method", "POST");
        preflight.addHeader("Access-Control-Request-Headers", "content-type");
        var response = new MockHttpServletResponse();
        cors.doFilter(preflight, response, (req, res) ->
                filter.doFilter(req, res, (nextRequest, nextResponse) -> fail("Preflight should stop at CORS")));
        assertEquals(200, response.getStatus());
        assertEquals("http://localhost:4200", response.getHeader("Access-Control-Allow-Origin"));
        assertEquals(0, creations.get());

        var untrusted = new MockHttpServletRequest("POST", "/api/v1/assessment");
        untrusted.addHeader("Origin", "https://untrusted.example");
        response = new MockHttpServletResponse();
        cors.doFilter(untrusted, response, (req, res) -> fail("Untrusted origin should be rejected"));
        assertEquals(403, response.getStatus());
    }

    @Test
    void matchesAssessmentUnderAContextPath() throws Exception {
        var filter = new RateLimitingFilter(new RateLimitingConfig().bucketFactory(), mapper);
        var request = new MockHttpServletRequest("POST", "/subegia/api/v1/assessment");
        request.setContextPath("/subegia");
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, (req, res) -> {});
        assertEquals("4", response.getHeader("X-Rate-Limit-Remaining"));
    }
}
