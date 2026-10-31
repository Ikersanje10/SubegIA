package io.github.ikersanje10.subegia.assessment.infraestructure;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonProperty;

public record OpenMeteoResponse(double latitude,
        double longitude,
        Hourly hourly) {
    public record Hourly(
            List<String> time,
            @JsonProperty("temperature_2m") List<Double> temperature,
            @JsonProperty("relative_humidity_2m") List<Double> humidity,
            @JsonProperty("wind_speed_10m") List<Double> windSpeed,
            List<Double> precipitation) {
    }
}
