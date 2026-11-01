package io.github.ikersanje10.subegia.assessment.application;

import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.Test;
import org.locationtech.jts.geom.Envelope;
import org.locationtech.jts.geom.GeometryFactory;
import org.springframework.cache.concurrent.ConcurrentMapCacheManager;
import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;

import io.github.ikersanje10.subegia.assessment.domain.*;
import io.github.ikersanje10.subegia.assessment.domain.exception.*;
import io.github.ikersanje10.subegia.assessment.infraestructure.*;
import io.github.ikersanje10.subegia.assessment.infraestructure.config.SubArea;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class FireRiskServiceTests {

    private final OpenMeteoClient client = mock(OpenMeteoClient.class);
    private final FWICalculator calculator = new FWICalculator();
    private final ConcurrentMapCacheManager cacheManager = new ConcurrentMapCacheManager("weather", "weatherRetry");
    private final MutableClock clock = new MutableClock();
    private final FireRiskService service = new FireRiskService(client, calculator, new DailyWeatherMapper(), cacheManager, clock);
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
                    assertFalse(end.atTime(11, 0).toInstant(ZoneOffset.UTC).isAfter(clock.instant()));
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
        LocalDate today = clock.instant().atOffset(ZoneOffset.UTC).toLocalDate();
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
    void reusesCurrentCalculationsWithTheNewSelectionGeometryWithoutQueryingWeather() {
        for (SubArea cell : cells) cacheManager.getCache("weather").put(cacheKey(cell), cached(cell, targetDate()));
        SubArea clipped = new SubArea(geometries.toGeometry(new Envelope(-1.981, -1.98, 43.3, 43.301)),
                cells.getFirst().column(), cells.getFirst().row(),
                cells.getFirst().centerLongitude(), cells.getFirst().centerLatitude());
        var results = service.calculateFWI(List.of(clipped, cells.getLast()));
        assertSame(clipped, results.getFirst().subArea());
        assertEquals(targetDate(), results.getFirst().result().weather().date());
        verifyNoInteractions(client);
    }

    @Test
    void fetchesOnlyMissingAndStaleCellsAndOverwritesTheStaleValueInOriginalOrder() {
        var current = cached(cells.getLast(), targetDate());
        var stale = cached(cells.getFirst(), targetDate().minusDays(1));
        cacheManager.getCache("weather").put(cacheKey(cells.getLast()), current);
        cacheManager.getCache("weather").put(cacheKey(cells.getFirst()), stale);
        when(client.getHourlyWeather(eq(List.of(cells.getFirst())), any(LocalDate.class), any(LocalDate.class)))
                .thenAnswer(invocation -> List.of(response(cells.getFirst(), 20, 50,
                        invocation.getArgument(1), invocation.getArgument(2))));
        var results = service.calculateFWI(cells);
        assertSame(cells.getFirst(), results.getFirst().subArea());
        assertSame(current.result(), results.getLast().result());
        var updated = cacheManager.getCache("weather").get(cacheKey(cells.getFirst()), WeatherCacheableData.class);
        assertNotSame(stale, updated);
        assertEquals(targetDate(), updated.result().weather().date());
        clearInvocations(client);
        service.calculateFWI(cells);
        verifyNoInteractions(client);
    }

    @Test
    void mapsMissingCellsToTheirPendingResponseIndexRatherThanTheirOriginalIndex() {
        cacheManager.getCache("weather").put(cacheKey(cells.getFirst()), cached(cells.getFirst(), targetDate()));
        when(client.getHourlyWeather(eq(List.of(cells.getLast())), any(LocalDate.class), any(LocalDate.class)))
                .thenAnswer(invocation -> List.of(response(cells.getLast(), 30, 25,
                        invocation.getArgument(1), invocation.getArgument(2))));
        var results = service.calculateFWI(cells);
        assertSame(cells.getLast(), results.getLast().subArea());
        assertEquals(30, results.getLast().result().weather().temperatureCelsius());
    }

    private LocalDate targetDate() {
        Instant now = clock.instant();
        LocalDate today = now.atOffset(ZoneOffset.UTC).toLocalDate();
        return today.atTime(11, 0).toInstant(ZoneOffset.UTC).isAfter(now) ? today.minusDays(1) : today;
    }

    private WeatherCacheableData cached(SubArea cell, LocalDate date) {
        var initial = new FWIMoistureState(date.minusDays(1), 85, 6, 15);
        var result = calculator.calculateDay(new DailyWeather(date, cell.centerLatitude(), 20, 50, 10, 0), initial);
        return new WeatherCacheableData(result, initial, 1);
    }

    private String cacheKey(SubArea cell) {
        return "arome-hd:fwi-365-85-6-15:v1:" + cell.centerLongitude() + ":" + cell.centerLatitude();
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

    @Test
    void simultaneousRequestsShareOneCalculationAndKeepTheirOwnGeometry() throws Exception {
        exerciseSharedCalculation(false, false);
    }

    @Test
    void failuresReleaseWaitingRequestsAndAllowANewAttempt() throws Exception {
        exerciseSharedCalculation(true, false);
    }

    @Test
    void unavailableResultsReachWaitersWithoutBeingStoredAsSuccessfulCacheEntries() throws Exception {
        exerciseSharedCalculation(false, true);
    }

    private void exerciseSharedCalculation(boolean fail, boolean missing) throws Exception {
        Cache cache = spy(cacheManager.getCache("weather"));
        CacheManager manager = mock(CacheManager.class);
        when(manager.getCache("weather")).thenReturn(cache);
        when(manager.getCache("weatherRetry")).thenReturn(cacheManager.getCache("weatherRetry"));
        FireRiskService shared = new FireRiskService(client, calculator, new DailyWeatherMapper(), manager, clock);
        CountDownLatch started = new CountDownLatch(1), release = new CountDownLatch(1), waiterRead = new CountDownLatch(1);
        AtomicReference<Thread> waiterThread = new AtomicReference<>();
        doAnswer(invocation -> {
            if (Thread.currentThread() == waiterThread.get()) waiterRead.countDown();
            return invocation.callRealMethod();
        }).when(cache).get(anyString(), eq(WeatherCacheableData.class));
        WeatherServiceException failure = new WeatherServiceException(WeatherErrorType.UNAVAILABLE, "Upstream failed");
        SubArea cell = cells.getFirst();
        when(client.getHourlyWeather(eq(List.of(cell)), any(LocalDate.class), any(LocalDate.class)))
                .thenAnswer(invocation -> {
                    started.countDown();
                    assertTrue(release.await(10, TimeUnit.SECONDS));
                    if (fail) throw failure;
                    var weather = response(cell, 20, 50, invocation.getArgument(1), invocation.getArgument(2));
                    if (missing) weather.hourly().humidity().set(35, null);
                    return List.of(weather);
                });
        SubArea clipped = new SubArea(geometries.toGeometry(new Envelope(-1.981, -1.98, 43.3, 43.301)),
                cell.column(), cell.row(), cell.centerLongitude(), cell.centerLatitude());
        ExecutorService threads = Executors.newFixedThreadPool(2);
        try {
            var first = threads.submit(() -> shared.calculateFWI(List.of(cell)));
            assertTrue(started.await(10, TimeUnit.SECONDS));
            var second = threads.submit(() -> {
                waiterThread.set(Thread.currentThread());
                return shared.calculateFWI(List.of(clipped));
            });
            assertTrue(waiterRead.await(10, TimeUnit.SECONDS));
            assertFalse(second.isDone());
            release.countDown();
            if (fail) {
                assertSame(failure, assertThrows(ExecutionException.class,
                        () -> first.get(10, TimeUnit.SECONDS)).getCause());
                assertSame(failure, assertThrows(ExecutionException.class,
                        () -> second.get(10, TimeUnit.SECONDS)).getCause());
            } else {
                var a = first.get(10, TimeUnit.SECONDS).getFirst();
                var b = second.get(10, TimeUnit.SECONDS).getFirst();
                assertSame(clipped, b.subArea());
                assertSame(a.result(), b.result());
                if (missing) {
                    assertNull(a.result());
                    assertEquals(a.unavailableReason(), b.unavailableReason());
                } else assertNotNull(a.result());
            }
            verify(client, times(1)).getHourlyWeather(eq(List.of(cell)), any(LocalDate.class), any(LocalDate.class));
            if (fail || missing) {
                assertNull(cache.get(cacheKey(cell)));
                when(client.getHourlyWeather(eq(List.of(cell)), any(LocalDate.class), any(LocalDate.class)))
                        .thenAnswer(invocation -> List.of(response(cell, 20, 50,
                                invocation.getArgument(1), invocation.getArgument(2))));
                if (missing) {
                    assertNull(shared.calculateFWI(List.of(clipped)).getFirst().result());
                    verify(client, times(1)).getHourlyWeather(eq(List.of(cell)), any(LocalDate.class), any(LocalDate.class));
                    clock.advance(Duration.ofMinutes(1));
                }
                assertNotNull(shared.calculateFWI(List.of(cell)).getFirst().result());
                verify(client, times(2)).getHourlyWeather(eq(List.of(cell)), any(LocalDate.class), any(LocalDate.class));
            }
        } finally {
            release.countDown();
            threads.shutdownNow();
            assertTrue(threads.awaitTermination(10, TimeUnit.SECONDS));
        }
    }

    @Test
    void temporarilyReusesYesterdayWithoutExtendingTheRetryDeadlineAndPreservesGeometry() {
        SubArea cell = cells.getFirst();
        when(client.getHourlyWeather(eq(List.of(cell)), any(LocalDate.class), any(LocalDate.class)))
                .thenAnswer(invocation -> {
                    var weather = response(cell, 20, 50, invocation.getArgument(1), invocation.getArgument(2));
                    weather.hourly().temperature().set(365 * 24 + 11, null);
                    return List.of(weather);
                });
        var first = service.calculateFWI(List.of(cell)).getFirst();
        assertEquals(targetDate().minusDays(1), first.result().weather().date());
        var clipped = new SubArea(geometries.toGeometry(new Envelope(-1.981, -1.98, 43.3, 43.301)),
                cell.column(), cell.row(), cell.centerLongitude(), cell.centerLatitude());
        clock.advance(Duration.ofSeconds(59));
        var second = service.calculateFWI(List.of(clipped)).getFirst();
        assertSame(first.result(), second.result());
        assertSame(clipped, second.subArea());
        verify(client, times(1)).getHourlyWeather(anyList(), any(LocalDate.class), any(LocalDate.class));
        clock.advance(Duration.ofSeconds(1));
        when(client.getHourlyWeather(anyList(), any(LocalDate.class), any(LocalDate.class)))
                .thenAnswer(invocation -> List.of(response(cell, 20, 50,
                        invocation.getArgument(1), invocation.getArgument(2))));
        assertEquals(targetDate(), service.calculateFWI(List.of(cell)).getFirst().result().weather().date());
        verify(client, times(2)).getHourlyWeather(anyList(), any(LocalDate.class), any(LocalDate.class));
    }

    private static final class MutableClock extends Clock {
        private volatile Instant now = Instant.parse("2026-11-01T12:00:00Z");
        void advance(Duration duration) { now = now.plus(duration); }
        @Override public Instant instant() { return now; }
        @Override public ZoneId getZone() { return ZoneOffset.UTC; }
        @Override public Clock withZone(ZoneId zone) { return Clock.fixed(now, zone); }
    }

    @Test
    void overlappingBatchesCalculateTheirOwnedCellsBeforeWaitingForSharedCells() throws Exception {
        CountDownLatch firstStarted = new CountDownLatch(1), releaseFirst = new CountDownLatch(1),
                secondStarted = new CountDownLatch(1);
        when(client.getHourlyWeather(eq(List.of(cells.getFirst())), any(LocalDate.class), any(LocalDate.class)))
                .thenAnswer(invocation -> {
                    firstStarted.countDown();
                    assertTrue(releaseFirst.await(10, TimeUnit.SECONDS));
                    return List.of(response(cells.getFirst(), 20, 50, invocation.getArgument(1), invocation.getArgument(2)));
                });
        when(client.getHourlyWeather(eq(List.of(cells.getLast())), any(LocalDate.class), any(LocalDate.class)))
                .thenAnswer(invocation -> {
                    secondStarted.countDown();
                    return List.of(response(cells.getLast(), 30, 25, invocation.getArgument(1), invocation.getArgument(2)));
                });
        ExecutorService threads = Executors.newFixedThreadPool(2);
        try {
            var first = threads.submit(() -> service.calculateFWI(List.of(cells.getFirst())));
            assertTrue(firstStarted.await(10, TimeUnit.SECONDS));
            var second = threads.submit(() -> service.calculateFWI(List.of(cells.getLast(), cells.getFirst())));
            assertTrue(secondStarted.await(10, TimeUnit.SECONDS));
            releaseFirst.countDown();
            var a = first.get(10, TimeUnit.SECONDS);
            var b = second.get(10, TimeUnit.SECONDS);
            assertSame(cells.getLast(), b.getFirst().subArea());
            assertSame(a.getFirst().result(), b.getLast().result());
            verify(client, times(2)).getHourlyWeather(anyList(), any(LocalDate.class), any(LocalDate.class));
        } finally {
            releaseFirst.countDown();
            threads.shutdownNow();
            assertTrue(threads.awaitTermination(10, TimeUnit.SECONDS));
        }
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
