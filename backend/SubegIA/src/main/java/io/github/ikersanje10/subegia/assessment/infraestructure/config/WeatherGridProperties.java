package io.github.ikersanje10.subegia.assessment.infraestructure.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "assessment.grid")
public record WeatherGridProperties(String model,
        double longitudeOrigin,
        double latitudeOrigin,
        double longitudeStep,
        double latitudeStep,
        int columns,
        int rows) {
}
