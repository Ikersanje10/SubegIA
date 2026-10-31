package io.github.ikersanje10.subegia.assessment.domain;

import java.time.LocalDate;

// Noon local-standard-time weather, with precipitation accumulated over the preceding 24 hours.
public record DailyWeather(
        LocalDate date,
        double latitude,
        double temperatureCelsius,
        double relativeHumidityPercent,
        double windSpeedKmh,
        double precipitation24hMm) {

    public DailyWeather {
        if (date == null) {
            throw new IllegalArgumentException("Daily weather must have an assessment date.");
        }
        if (!Double.isFinite(latitude) || latitude < 30 || latitude > 90) {
            throw new IllegalArgumentException("This FWI implementation supports latitudes from 30 to 90 degrees north.");
        }
        if (!Double.isFinite(temperatureCelsius)) {
            throw new IllegalArgumentException("Temperature must be finite.");
        }
        if (!Double.isFinite(relativeHumidityPercent)
                || relativeHumidityPercent < 0 || relativeHumidityPercent > 100) {
            throw new IllegalArgumentException("Relative humidity must be between 0 and 100 percent.");
        }
        if (!Double.isFinite(windSpeedKmh) || windSpeedKmh < 0) {
            throw new IllegalArgumentException("Wind speed must be finite and nonnegative, in km/h.");
        }
        if (!Double.isFinite(precipitation24hMm) || precipitation24hMm < 0) {
            throw new IllegalArgumentException("24-hour precipitation must be finite and nonnegative, in mm.");
        }
    }
}
