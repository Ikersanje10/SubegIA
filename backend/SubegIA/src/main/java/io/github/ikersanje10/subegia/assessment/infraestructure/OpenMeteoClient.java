package io.github.ikersanje10.subegia.assessment.infraestructure;

import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.stream.Collectors;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.HttpServerErrorException;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import io.github.ikersanje10.subegia.assessment.domain.exception.WeatherErrorType;
import io.github.ikersanje10.subegia.assessment.domain.exception.WeatherServiceException;
import io.github.ikersanje10.subegia.assessment.infraestructure.config.SubArea;
import tools.jackson.core.JacksonException;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.ObjectMapper;

@Component
public class OpenMeteoClient {

    private final RestClient openMeteoRestClient;
    private final ObjectMapper objectMapper;

    public OpenMeteoClient(RestClient openMeteoRestClient, ObjectMapper objectMapper) {
        this.openMeteoRestClient = openMeteoRestClient;
        this.objectMapper = objectMapper;
    }

    public List<OpenMeteoResponse> getHourlyWeather(List<SubArea> subAreas) {
        LocalDate endDate = LocalDate.now(ZoneOffset.UTC);
        return getHourlyWeather(subAreas, endDate.minusDays(365), endDate);
    }

    public List<OpenMeteoResponse> getHourlyWeather(List<SubArea> subAreas,
            LocalDate startDate, LocalDate endDate) {
        if (subAreas == null || subAreas.isEmpty() || startDate == null || endDate == null
                || startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("Weather requests require cells and an ordered date range.");
        }

        String lats = subAreas.stream()
                .map(p -> String.valueOf(p.centerLatitude()))
                .collect(Collectors.joining(","));
        String lons = subAreas.stream()
                .map(p -> String.valueOf(p.centerLongitude()))
                .collect(Collectors.joining(","));
        String elevations = subAreas.stream()
                .map(p -> "nan")
                .collect(Collectors.joining(","));

        String json;
        try {
            json = openMeteoRestClient.get()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v1/forecast")
                            .queryParam("latitude", lats)
                            .queryParam("longitude", lons)
                            .queryParam("hourly", "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation")
                            .queryParam("wind_speed_unit", "kmh")
                            .queryParam("timezone", "UTC")
                            .queryParam("models", "meteofrance_arome_france_hd")
                            .queryParam("cell_selection", "nearest")
                            .queryParam("elevation", elevations)
                            .queryParam("start_date", startDate)
                            .queryParam("end_date", endDate)
                            .build())
                    .retrieve()
                    .body(String.class);
        } catch (HttpClientErrorException.TooManyRequests e) {
            throw new WeatherServiceException(WeatherErrorType.RATE_LIMITED,
                    "Too many requests were made to the weather service. Please try again later.", e);
        } catch (HttpClientErrorException e) {
            throw new WeatherServiceException(WeatherErrorType.REJECTED_REQUEST,
                    "The weather service rejected the request (" + e.getStatusCode().value() + ").", e);
        } catch (HttpServerErrorException e) {
            throw new WeatherServiceException(WeatherErrorType.UNAVAILABLE,
                    "The weather service is currently unavailable (" + e.getStatusCode().value() + ").", e);
        } catch (ResourceAccessException e) {
            throw new WeatherServiceException(WeatherErrorType.TIMEOUT,
                    "Could not connect to the weather service or it took too long to respond.", e);
        } catch (RestClientException e) {
            throw new WeatherServiceException(WeatherErrorType.UNEXPECTED,
                    "Unexpected error while querying the weather service.", e);
        }

        if (json == null || json.isBlank()) {
            throw new WeatherServiceException(WeatherErrorType.INVALID_RESPONSE,
                    "The weather service returned an empty response.");
        }

        try {
            return objectMapper
                    .readerFor(new TypeReference<List<OpenMeteoResponse>>() {
                    })
                    .with(DeserializationFeature.ACCEPT_SINGLE_VALUE_AS_ARRAY)
                    .readValue(json);
        } catch (JacksonException e) {
            throw new WeatherServiceException(WeatherErrorType.INVALID_RESPONSE,
                    "Could not parse the weather service response.", e);
        }
    }
}
