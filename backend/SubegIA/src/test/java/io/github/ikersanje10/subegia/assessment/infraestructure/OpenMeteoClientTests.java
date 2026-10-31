package io.github.ikersanje10.subegia.assessment.infraestructure;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import io.github.ikersanje10.subegia.assessment.domain.exception.WeatherServiceException;
import io.github.ikersanje10.subegia.assessment.infraestructure.config.RestClientConfig;
import io.github.ikersanje10.subegia.assessment.infraestructure.config.SubArea;
import tools.jackson.databind.ObjectMapper;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class OpenMeteoClientTests {

    private static final String RESPONSE = """
            {"latitude":43.3,"longitude":-1.98,"hourly":{
              "time":["2026-10-30T11:00"],
              "temperature_2m":[16.6],"relative_humidity_2m":[70],
              "wind_speed_10m":[6.5],"precipitation":[null]}}
            """;

    @Test
    void requestsExplicitHistoricalDatesAndParsesSingleLocation() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        OpenMeteoClient client = new OpenMeteoClient(
                new RestClientConfig().openMeteoRestClient(builder), new ObjectMapper());
        LocalDate before = LocalDate.now(ZoneOffset.UTC);

        server.expect(request -> {
            assertEquals("historical-forecast-api.open-meteo.com", request.getURI().getHost());
            assertEquals("/v1/forecast", request.getURI().getPath());
            var params = UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams();
            LocalDate end = LocalDate.parse(params.getFirst("end_date"));
            assertTrue(end.equals(before) || end.equals(LocalDate.now(ZoneOffset.UTC)));
            assertEquals(end.minusDays(365).toString(), params.getFirst("start_date"));
            assertFalse(params.containsKey("past_days"));
            assertFalse(params.containsKey("forecast_days"));
            assertEquals("UTC", params.getFirst("timezone"));
            assertEquals("kmh", params.getFirst("wind_speed_unit"));
            assertEquals("meteofrance_arome_france_hd", params.getFirst("models"));
            assertEquals("nearest", params.getFirst("cell_selection"));
            assertEquals("nan", params.getFirst("elevation"));
            assertEquals("43.3", params.getFirst("latitude"));
            assertEquals("-1.98", params.getFirst("longitude"));
            assertEquals("temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation",
                    params.getFirst("hourly"));
        }).andRespond(withSuccess(RESPONSE, MediaType.APPLICATION_JSON));

        var weather = client.getHourlyWeather(List.of(new SubArea(null, 0, 0, -1.98, 43.3)));

        assertEquals(1, weather.size());
        assertEquals(16.6, weather.getFirst().hourly().temperature().getFirst());
        assertEquals(70.0, weather.getFirst().hourly().humidity().getFirst());
        assertEquals(6.5, weather.getFirst().hourly().windSpeed().getFirst());
        assertNull(weather.getFirst().hourly().precipitation().getFirst());
        server.verify();
    }

    @Test
    void repeatsElevationForEachCoordinateAndParsesLocationArray() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        OpenMeteoClient client = new OpenMeteoClient(
                new RestClientConfig().openMeteoRestClient(builder), new ObjectMapper());

        server.expect(request -> {
            var params = UriComponentsBuilder.fromUri(request.getURI()).build().getQueryParams();
            assertEquals("43.3,43.34", params.getFirst("latitude"));
            assertEquals("-1.98,-1.79", params.getFirst("longitude"));
            assertEquals("nan,nan", params.getFirst("elevation"));
        }).andRespond(withSuccess("[" + RESPONSE + "," + RESPONSE + "]", MediaType.APPLICATION_JSON));

        var weather = client.getHourlyWeather(List.of(
                new SubArea(null, 0, 0, -1.98, 43.3),
                new SubArea(null, 1, 0, -1.79, 43.34)));

        assertEquals(2, weather.size());
        server.verify();
    }

    @Test
    void stillRejectsMalformedResponses() {
        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        OpenMeteoClient client = new OpenMeteoClient(
                new RestClientConfig().openMeteoRestClient(builder), new ObjectMapper());
        server.expect(request -> {}).andRespond(withSuccess("{", MediaType.APPLICATION_JSON));

        assertThrows(WeatherServiceException.class,
                () -> client.getHourlyWeather(List.of(new SubArea(null, 0, 0, -1.98, 43.3))));
        server.verify();
    }
}
