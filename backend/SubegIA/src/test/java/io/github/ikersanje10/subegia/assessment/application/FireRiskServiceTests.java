package io.github.ikersanje10.subegia.assessment.application;

import java.time.*;
import java.util.*;

import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Envelope;
import org.locationtech.jts.geom.GeometryFactory;

import io.github.ikersanje10.subegia.assessment.domain.*;
import io.github.ikersanje10.subegia.assessment.domain.exception.*;
import io.github.ikersanje10.subegia.assessment.infraestructure.*;
import io.github.ikersanje10.subegia.assessment.infraestructure.config.SubArea;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FireRiskServiceTests {

    private final OpenMeteoClient client = mock(OpenMeteoClient.class);
    private final FWICalculator calculator = new FWICalculator();
    private final FireRiskService service = new FireRiskService(client, calculator, new DailyWeatherMapper());
    private final GeometryFactory geometries = new GeometryFactory();
    private final List<SubArea> cells = List.of(
            new SubArea(geometries.toGeometry(new Envelope(-1.985, -1.975, 43.295, 43.305)),
                    1002, 580, -1.98, 43.3),
            new SubArea(geometries.toGeometry(new Envelope(-1.795, -1.785, 43.335, 43.345)),
                    1021, 584, -1.79, 43.34));

    @Test
    void reconstructsExactly365DaysPerCellWithBackendOwnedStates() {
        when(client.getHourlyWeather(eq(cells), any(LocalDate.class), any(LocalDate.class)))
                .thenAnswer(invocation -> {
                    LocalDate start = invocation.getArgument(1);
                    LocalDate end = invocation.getArgument(2);
                    assertEquals(365, java.time.temporal.ChronoUnit.DAYS.between(start, end));
                    assertFalse(end.atTime(11, 0).toInstant(ZoneOffset.UTC).isAfter(Instant.now()));
                    return List.of(response(cells.getFirst(), 20, 50, start, end),
                            response(cells.getLast(), 30, 25, start, end));
                });

        var results = service.calculateFWI(cells);

        assertEquals(2, results.size());
        for (int i = 0; i < results.size(); i++) {
            var assessment = results.get(i);
            assertSame(cells.get(i), assessment.subArea());
            assertNull(assessment.unavailableReason());
            assertEquals(365, assessment.calculationDays());
            var initial = assessment.initialState();
            assertEquals(85, initial.ffmc());
            assertEquals(6, initial.dmc());
            assertEquals(15, initial.dc());
            List<DailyWeather> days = new ArrayList<>();
            for (int d = 1; d <= 365; d++) {
                days.add(new DailyWeather(initial.date().plusDays(d), cells.get(i).centerLatitude(),
                        i == 0 ? 20 : 30, i == 0 ? 50 : 25, 10, 0));
            }
            assertEquals(calculator.calculateSeries(days, initial).getLast(), assessment.result());
        }
        assertNotEquals(results.getFirst().result().fwi(), results.getLast().result().fwi());
    }

    @Test
    void keepsValidCellsAndExplicitlyMarksACompleteHistoricalGapUnavailable() {
        when(client.getHourlyWeather(eq(cells), any(LocalDate.class), any(LocalDate.class)))
                .thenAnswer(invocation -> {
                    LocalDate start = invocation.getArgument(1);
                    LocalDate end = invocation.getArgument(2);
                    var missing = response(cells.getLast(), 20, 50, start, end);
                    missing.hourly().humidity().set(35, null);
                    return List.of(response(cells.getFirst(), 20, 50, start, end), missing);
                });
        var results = service.calculateFWI(cells);
        assertNotNull(results.getFirst().result());
        assertNull(results.getLast().result());
        assertTrue(results.getLast().unavailableReason().contains("Incomplete"));
        assertEquals(0, results.getLast().calculationDays());
        assertNotNull(results.getLast().initialState());
    }

    @Test
    void recordsActualDaysAndDateWhenTodayIsIncomplete() {
        LocalDate today = LocalDate.now(ZoneOffset.UTC);
        when(client.getHourlyWeather(eq(cells), any(LocalDate.class), any(LocalDate.class)))
                .thenAnswer(invocation -> {
                    LocalDate start = invocation.getArgument(1);
                    LocalDate end = invocation.getArgument(2);
                    var weather = response(cells.getFirst(), 20, 50, start, end);
                    if (end.equals(today)) {
                        weather.hourly().temperature().set(365 * 24 + 11, null);
                    }
                    return List.of(weather, response(cells.getLast(), 20, 50, start, end));
                });
        var assessment = service.calculateFWI(cells).getFirst();
        assertEquals(today.minusDays(1), assessment.result().weather().date());
        int expectedDays = assessment.initialState().date().equals(today.minusDays(365)) ? 364 : 365;
        assertEquals(expectedDays, assessment.calculationDays());
    }

    @Test
    void rejectsEmptySelectionBeforeQueryingWeather() {
        assertThrows(InvalidFWIInitializationException.class, () -> service.calculateFWI(List.of()));
        verifyNoInteractions(client);
    }

    @Test
    void rejectsCoordinateAndCountMismatchesRatherThanPaintingTheWrongCell() {
        when(client.getHourlyWeather(eq(cells), any(LocalDate.class), any(LocalDate.class)))
                .thenAnswer(invocation -> List.of(
                        response(cells.getLast(), 20, 50, invocation.getArgument(1), invocation.getArgument(2)),
                        response(cells.getFirst(), 20, 50, invocation.getArgument(1), invocation.getArgument(2))));
        assertThrows(WeatherServiceException.class, () -> service.calculateFWI(cells));
        when(client.getHourlyWeather(eq(cells), any(LocalDate.class), any(LocalDate.class)))
                .thenReturn(List.of());
        assertThrows(WeatherServiceException.class, () -> service.calculateFWI(cells));
    }

    private OpenMeteoResponse response(SubArea cell, double temperature, double humidity,
            LocalDate start, LocalDate end) {
        List<String> time = new ArrayList<>();
        List<Double> t = new ArrayList<>(), rh = new ArrayList<>(), ws = new ArrayList<>(), rain = new ArrayList<>();
        int hours = Math.toIntExact(java.time.temporal.ChronoUnit.DAYS.between(start, end.plusDays(1)) * 24);
        for (int i = 0; i < hours; i++) {
            time.add(start.atStartOfDay().plusHours(i).toString());
            t.add(temperature);
            rh.add(humidity);
            ws.add(10.0);
            rain.add(0.0);
        }
        return new OpenMeteoResponse(cell.centerLatitude(), cell.centerLongitude(),
                new OpenMeteoResponse.Hourly(time, t, rh, ws, rain));
    }
}
