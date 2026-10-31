package io.github.ikersanje10.subegia.assessment.infraestructure;

import java.time.*;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.Test;

import io.github.ikersanje10.subegia.assessment.domain.exception.WeatherServiceException;

import static org.junit.jupiter.api.Assertions.*;

class DailyWeatherMapperTests {

    private final DailyWeatherMapper mapper = new DailyWeatherMapper();
    private final LocalDate date = LocalDate.of(2026, 10, 25);
    private final Instant now = date.atTime(20, 0).toInstant(ZoneOffset.UTC);

    @Test
    void usesStandardNoonUTCAndExactlyThePreceding24HourlyRainIntervals() {
        var response = response(date.minusDays(1), 48);
        var days = mapper.toDailyWeather(response, date, date, now);

        assertEquals(1, days.size());
        assertEquals(date, days.getFirst().date());
        assertEquals(35.0, days.getFirst().temperatureCelsius());
        assertEquals(50.0, days.getFirst().relativeHumidityPercent());
        assertEquals(10.0, days.getFirst().windSpeedKmh());
        assertEquals(564.0, days.getFirst().precipitation24hMm());
        assertEquals(43.3, days.getFirst().latitude());
    }

    @Test
    void cannotCalculateTheFirstArchiveNoonWithoutPriorRainfall() {
        assertThrows(WeatherServiceException.class, () -> mapper.toDailyWeather(
                response(date, 24), date, date, now));
    }

    @Test
    void neverUsesAFutureNoonAndFallsBackToYesterday() {
        Instant beforeNoon = date.atTime(10, 0).toInstant(ZoneOffset.UTC);
        var days = mapper.toDailyWeather(response(date.minusDays(2), 96), date.minusDays(1),
                date.plusDays(1), beforeNoon);
        assertEquals(List.of(date.minusDays(1)), days.stream().map(day -> day.date()).toList());
    }

    @Test
    void incompleteTodayReturnsYesterdayButAMissingPastDayIsNotSkipped() {
        var response = response(date.minusDays(2), 72);
        response.hourly().temperature().set(59, null);
        var days = mapper.toDailyWeather(response, date.minusDays(1), date, now);
        assertEquals(1, days.size());
        assertEquals(date.minusDays(1), days.getFirst().date());

        response.hourly().precipitation().set(20, null);
        assertThrows(WeatherServiceException.class, () -> mapper.toDailyWeather(
                response, date.minusDays(1), date, now));
    }

    @Test
    void rejectsInvalidRainfallEvenWhenItsDailySumWouldLookValid() {
        for (Double invalid : new Double[] {-1.0, Double.NaN, Double.POSITIVE_INFINITY}) {
            var response = response(date.minusDays(1), 48);
            response.hourly().precipitation().set(14, invalid);
            assertThrows(WeatherServiceException.class, () -> mapper.toDailyWeather(response, date, date, now));
        }
    }

    @Test
    void rejectsInconsistentArraysInvalidValuesAndUnorderedTimestamps() {
        var shortArray = response(date.minusDays(1), 48);
        shortArray.hourly().humidity().removeLast();
        assertThrows(WeatherServiceException.class, () -> mapper.toDailyWeather(shortArray, date, date, now));

        for (String timestamp : new String[] {"bad", "2026-10-24T00:00", "2026-10-24T13:30"}) {
            var response = response(date.minusDays(1), 48);
            response.hourly().time().set(13, timestamp);
            assertThrows(WeatherServiceException.class, () -> mapper.toDailyWeather(response, date, date, now));
        }
        var response = response(date.minusDays(1), 48);
        response.hourly().humidity().set(35, 101.0);
        assertThrows(WeatherServiceException.class, () -> mapper.toDailyWeather(response, date, date, now));
        assertThrows(WeatherServiceException.class, () -> mapper.toDailyWeather(null, date, date, now));
    }

    private OpenMeteoResponse response(LocalDate start, int hours) {
        List<String> times = new ArrayList<>();
        List<Double> temperatures = new ArrayList<>();
        List<Double> humidity = new ArrayList<>();
        List<Double> wind = new ArrayList<>();
        List<Double> rain = new ArrayList<>();
        for (int i = 0; i < hours; i++) {
            times.add(start.atStartOfDay().plusHours(i).toString());
            temperatures.add((double) i);
            humidity.add(50.0);
            wind.add(10.0);
            rain.add((double) i);
        }
        return new OpenMeteoResponse(43.3, -1.98,
                new OpenMeteoResponse.Hourly(times, temperatures, humidity, wind, rain));
    }
}
