package io.github.ikersanje10.subegia.shared.config;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.core.Ordered;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.junit.jupiter.api.Assertions.*;

class CorsConfigTests {
    @Test
    void appliesExplicitDeploymentOriginsBeforeTheRateLimiter() throws Exception {
        var registration = new CorsConfig().corsFilterRegistration(List.of("https://subegia.example.com"));
        assertEquals(Ordered.HIGHEST_PRECEDENCE, registration.getOrder());
        var request = new MockHttpServletRequest("OPTIONS", "/api/v1/assessment");
        request.addHeader("Origin", "https://subegia.example.com");
        request.addHeader("Access-Control-Request-Method", "POST");
        var response = new MockHttpServletResponse();
        registration.getFilter().doFilter(request, response, (req, res) -> fail("Preflight must stop at CORS"));
        assertEquals("https://subegia.example.com", response.getHeader("Access-Control-Allow-Origin"));

        request = new MockHttpServletRequest("POST", "/api/v1/assessment");
        request.addHeader("Origin", "http://localhost:4200");
        response = new MockHttpServletResponse();
        registration.getFilter().doFilter(request, response, (req, res) -> fail("Unconfigured origin"));
        assertEquals(403, response.getStatus());
    }
}
