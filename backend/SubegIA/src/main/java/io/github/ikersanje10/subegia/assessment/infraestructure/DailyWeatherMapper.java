package io.github.ikersanje10.subegia.assessment.infraestructure;

import java.time.*;
import java.time.format.DateTimeParseException;
import java.util.*;

import org.springframework.stereotype.Component;

import io.github.ikersanje10.subegia.assessment.domain.DailyWeather;
import io.github.ikersanje10.subegia.assessment.domain.exception.WeatherErrorType;
import io.github.ikersanje10.subegia.assessment.domain.exception.WeatherServiceException;

@Component
public class DailyWeatherMapper {

    public List<DailyWeather> toDailyWeather(OpenMeteoResponse response,
            LocalDate firstDay, LocalDate endDate, Instant now) {
        if (response == null || response.hourly() == null) {
            throw invalid("Missing hourly weather.");
        }
        var hourly = response.hourly();
        if (hourly.time() == null || hourly.temperature() == null || hourly.humidity() == null
                || hourly.windSpeed() == null || hourly.precipitation() == null) {
            throw invalid("Missing required hourly arrays.");
        }
        int size = hourly.time().size();
        if (size == 0 || hourly.temperature().size() != size || hourly.humidity().size() != size
                || hourly.windSpeed().size() != size || hourly.precipitation().size() != size) {
            throw invalid("Hourly weather arrays have inconsistent lengths.");
        }

        Map<LocalDateTime, Integer> indices = new HashMap<>();
        LocalDateTime previous = null;
        for (int i = 0; i < size; i++) {
            if (hourly.time().get(i) == null) {
                throw invalid("Missing hourly timestamp.");
            }
            LocalDateTime time;
            try {
                time = LocalDateTime.parse(hourly.time().get(i));
            } catch (DateTimeParseException e) {
                throw new WeatherServiceException(WeatherErrorType.INVALID_RESPONSE, "Invalid UTC hourly timestamp.", e);
            }
            if (time.getMinute() != 0 || time.getSecond() != 0 || time.getNano() != 0
                    || (previous != null && !time.equals(previous.plusHours(1)))) {
                throw invalid("Hourly timestamps must be consecutive, ordered UTC hours.");
            }
            indices.put(time, i);
            previous = time;
        }

        List<DailyWeather> days = new ArrayList<>();
        LocalDate today = now.atOffset(ZoneOffset.UTC).toLocalDate();
        for (LocalDate date = firstDay; !date.isAfter(endDate); date = date.plusDays(1)) {
            LocalDateTime noon = date.atTime(11, 0);
            if (noon.toInstant(ZoneOffset.UTC).isAfter(now)) {
                break;
            }
            Integer index = indices.get(noon);
            boolean complete = index != null && index >= 23
                    && hourly.temperature().get(index) != null
                    && hourly.humidity().get(index) != null
                    && hourly.windSpeed().get(index) != null;
            double rain = 0;
            if (complete) {
                for (int i = index - 23; i <= index; i++) {
                    Double value = hourly.precipitation().get(i);
                    if (value == null) {
                        complete = false;
                        break;
                    }
                    if (!Double.isFinite(value) || value < 0) {
                        throw invalid("Invalid hourly precipitation for " + date + ".");
                    }
                    rain += value;
                }
            }
            if (!complete) {
                if (date.equals(today)) {
                    break;
                }
                throw invalid("Incomplete noon weather or preceding 24-hour rainfall for " + date + ".");
            }
            try {
                days.add(new DailyWeather(date, response.latitude(), hourly.temperature().get(index),
                        hourly.humidity().get(index), hourly.windSpeed().get(index), rain));
            } catch (IllegalArgumentException e) {
                throw new WeatherServiceException(WeatherErrorType.INVALID_RESPONSE,
                        "Invalid daily weather for " + date + ": " + e.getMessage(), e);
            }
        }
        if (days.isEmpty()) {
            throw invalid("No complete assessment day is available after the initial state's date.");
        }
        return List.copyOf(days);
    }

    private WeatherServiceException invalid(String message) {
        return new WeatherServiceException(WeatherErrorType.INVALID_RESPONSE, message);
    }
}
