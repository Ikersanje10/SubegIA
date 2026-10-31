package io.github.ikersanje10.subegia.assessment.api;

import java.time.LocalDate;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.*;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.MediaType;

import io.github.ikersanje10.subegia.assessment.application.*;
import io.github.ikersanje10.subegia.assessment.domain.*;
import io.github.ikersanje10.subegia.assessment.infraestructure.config.*;
import io.github.ikersanje10.subegia.shared.api.GlobalExceptionHandler;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AssessmentControllerTests {

    private final AssessmentService service = mock(AssessmentService.class);
    private final ObjectMapper mapper = new ObjectMapper();
    private final AssessmentController controller = new AssessmentController(service, mapper,
            new WeatherGridProperties("meteofrance_arome_france_hd", -12, 37.5, 0.01, 0.01, 2801, 1791));
    private final GeometryFactory factory = new GeometryFactory();

    @Test
    void geometryOnlyHTTPBodyReturnsGeoJSONFWIAndExplicitExperimentalMetadata() throws Exception {
        Polygon polygon = (Polygon) factory.toGeometry(new Envelope(-1.98, -1.975, 43.3, 43.305));
        MultiPolygon multiPolygon = factory.createMultiPolygon(new Polygon[] {polygon});
        DailyWeather weather = new DailyWeather(LocalDate.of(2026, 10, 30), 43.3, 20, 50, 10, 0);
        var initial = new FWIMoistureState(weather.date().minusDays(365), 85, 6, 15);
        List<DailyWeather> days = java.util.stream.IntStream.rangeClosed(1, 365)
                .mapToObj(d -> new DailyWeather(initial.date().plusDays(d), 43.3, 20, 50, 10, 0)).toList();
        FWIResult result = new FWICalculator().calculateSeries(days, initial).getLast();
        when(service.assessArea(anyList())).thenReturn(List.of(
                new SubAreaAssessment(new SubArea(polygon, 1002, 580, -1.98, 43.3), result, null, initial, 365),
                new SubAreaAssessment(new SubArea(multiPolygon, 1003, 580, -1.97, 43.3),
                        null, "Missing rain", initial, 0)));
        var mvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler(), new AssessmentExceptionHandler()).build();

        var response = mvc.perform(post("/api/v1/assessment").contentType(MediaType.APPLICATION_JSON).content("""
                {"area":{"type":"Polygon","coordinates":[[
                  [-1.98,43.3],[-1.975,43.3],[-1.975,43.305],[-1.98,43.3]]]}}
                """)).andExpect(status().isOk()).andReturn();

        var json = mapper.readTree(response.getResponse().getContentAsString());
        assertTrue(json.isArray());
        assertEquals("Polygon", json.get(0).get("geometry").get("type").asString());
        assertTrue(json.get(0).get("geometry").get("coordinates").isArray());
        assertFalse(json.get(0).get("geometry").has("crs"));
        assertEquals(-1.98, json.get(0).get("geometry").get("coordinates").get(0).get(0).get(0).asDouble());
        assertEquals(result.fwi(), json.get(0).get("fwi").asDouble());
        assertEquals("2026-10-30", json.get(0).get("date").asString());
        assertEquals("AVAILABLE", json.get(0).get("status").asString());
        assertTrue(json.get(0).get("experimental").asBoolean());
        assertEquals(365, json.get(0).get("calculationDays").asInt());
        assertEquals(85, json.get(0).get("initialState").get("ffmc").asDouble());
        assertEquals(initial.date().toString(), json.get(0).get("initialState").get("date").asString());
        assertEquals("MultiPolygon", json.get(1).get("geometry").get("type").asString());
        assertEquals("UNAVAILABLE", json.get(1).get("status").asString());
        assertTrue(json.get(1).get("fwi").isNull());
        assertEquals("Missing rain", json.get(1).get("unavailableReason").asString());
        assertEquals(0, json.get(1).get("calculationDays").asInt());
        verify(service).assessArea(anyList());
    }

    @Test
    void stillRejectsRequestsWithoutArea() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler(), new AssessmentExceptionHandler()).build();
        mvc.perform(post("/api/v1/assessment").contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
