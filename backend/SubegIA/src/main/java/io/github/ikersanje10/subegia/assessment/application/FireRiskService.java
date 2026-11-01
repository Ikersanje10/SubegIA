package io.github.ikersanje10.subegia.assessment.application;

import java.time.*;
import java.util.*;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

import org.springframework.cache.Cache;
import org.springframework.cache.CacheManager;
import org.springframework.stereotype.Service;

import io.github.ikersanje10.subegia.assessment.infraestructure.OpenMeteoClient;
import io.github.ikersanje10.subegia.assessment.infraestructure.OpenMeteoResponse;
import io.github.ikersanje10.subegia.assessment.infraestructure.config.SubArea;
import io.github.ikersanje10.subegia.assessment.infraestructure.DailyWeatherMapper;
import io.github.ikersanje10.subegia.assessment.domain.*;
import io.github.ikersanje10.subegia.assessment.domain.exception.*;

@Service
public class FireRiskService {

    private static final int RECONSTRUCTION_DAYS = 365;
    private final OpenMeteoClient openMeteoClient;
    private final FWICalculator calculator;
    private final DailyWeatherMapper dailyWeatherMapper;
    private final Cache weatherCache;
    private final Cache retryCache;
    private final Clock clock;
    private final Map<WorkKey, CompletableFuture<CellCalculation>> inFlight = new HashMap<>();

    private record WorkKey(String cellKey, LocalDate targetDate) {}
    private record DeferredCalculation(CellCalculation calculation, Instant retryAt) {}

    private record CellCalculation(FWIResult result, String unavailableReason,
            FWIMoistureState initialState, int calculationDays) {
        private static CellCalculation fromCache(WeatherCacheableData cached) {
            return new CellCalculation(cached.result(), null, cached.initialState(), cached.calculationDays());
        }
    }

    public FireRiskService(OpenMeteoClient openMeteoClient, FWICalculator calculator,
            DailyWeatherMapper dailyWeatherMapper, CacheManager cacheManager, Clock clock) {
        this.openMeteoClient = openMeteoClient;
        this.calculator = calculator;
        this.dailyWeatherMapper = dailyWeatherMapper;
        this.weatherCache = Objects.requireNonNull(cacheManager.getCache("weather"),
                "The weather cache must be configured.");
        this.retryCache = Objects.requireNonNull(cacheManager.getCache("weatherRetry"),
                "The weather retry cache must be configured.");
        this.clock = clock;
    }

    public List<SubAreaAssessment> calculateFWI(List<SubArea> subAreas) {
        Instant now = clock.instant();
        LocalDate today = now.atOffset(ZoneOffset.UTC).toLocalDate();
        LocalDate endDate = today.atTime(11, 0).toInstant(ZoneOffset.UTC).isAfter(now)
                ? today.minusDays(1)
                : today;
        if (subAreas == null || subAreas.isEmpty()) {
            throw new InvalidFWIInitializationException("An assessment requires at least one intersected cell.");
        }
        LocalDate start = endDate.minusDays(RECONSTRUCTION_DAYS);
        // Approved experimental spin-up, not measured local moisture states or a
        // seasonal restart policy.
        Map<WorkKey, CompletableFuture<CellCalculation>> requested = new HashMap<>();
        Map<WorkKey, CompletableFuture<CellCalculation>> owned = new HashMap<>();
        List<SubArea> pending = new ArrayList<>();
        try {
            synchronized (inFlight) {
                for (SubArea cell : subAreas) {
                    WorkKey work = new WorkKey(cacheKey(cell), endDate);
                    if (requested.containsKey(work)) continue;
                    WeatherCacheableData cached = weatherCache.get(work.cellKey(), WeatherCacheableData.class);
                    if (cached != null && cached.result().weather().date().equals(endDate)) {
                        requested.put(work, CompletableFuture.completedFuture(CellCalculation.fromCache(cached)));
                    } else {
                        DeferredCalculation deferred = retryCache.get(work, DeferredCalculation.class);
                        if (deferred != null && now.isBefore(deferred.retryAt())) {
                            requested.put(work, CompletableFuture.completedFuture(deferred.calculation()));
                            continue;
                        }
                        if (deferred != null) retryCache.evict(work);
                        CompletableFuture<CellCalculation> future = inFlight.get(work);
                        if (future == null) {
                            future = new CompletableFuture<>();
                            inFlight.put(work, future);
                            owned.put(work, future);
                            pending.add(cell);
                        }
                        requested.put(work, future);
                    }
                }
            }
            FWIMoistureState initial = new FWIMoistureState(start, 85, 6, 15);
            List<OpenMeteoResponse> weather = pending.isEmpty() ? List.of()
                    : openMeteoClient.getHourlyWeather(pending, start, endDate);
            if (weather == null || weather.size() != pending.size()) {
                throw new WeatherServiceException(WeatherErrorType.INVALID_RESPONSE,
                        "The weather response does not contain one entry per requested cell.");
            }
            for (int i = 0; i < pending.size(); i++) {
                SubArea cell = pending.get(i);
                OpenMeteoResponse response = weather.get(i);
                if (response == null || !Double.isFinite(response.latitude()) || !Double.isFinite(response.longitude())
                        || Math.abs(response.latitude() - cell.centerLatitude()) > 0.0001
                        || Math.abs(response.longitude() - cell.centerLongitude()) > 0.0001) {
                    throw new WeatherServiceException(WeatherErrorType.INVALID_RESPONSE,
                            "Returned weather coordinates do not match requested cell " + key(cell.column(), cell.row())
                                    + ".");
                }
                CellCalculation calculation;
                try {
                    var days = dailyWeatherMapper.toDailyWeather(response, initial.date().plusDays(1), endDate, now);
                    var series = calculator.calculateSeries(days, initial);
                    calculation = new CellCalculation(series.getLast(), null, initial, series.size());
                } catch (WeatherServiceException e) {
                    if (e.getType() != WeatherErrorType.INVALID_RESPONSE) {
                        throw e;
                    }
                    calculation = new CellCalculation(null, e.getMessage(), initial, 0);
                }
                WorkKey work = new WorkKey(cacheKey(cell), endDate);
                if (calculation.result() != null) {
                    synchronized (inFlight) {
                        WeatherCacheableData previous = weatherCache.get(work.cellKey(), WeatherCacheableData.class);
                        if (previous == null || !previous.result().weather().date()
                                .isAfter(calculation.result().weather().date())) {
                            weatherCache.put(work.cellKey(), new WeatherCacheableData(
                                    calculation.result(), initial, calculation.calculationDays()));
                        }
                    }
                }
                if (calculation.result() == null
                        || calculation.result().weather().date().isBefore(endDate)) {
                    retryCache.put(work, new DeferredCalculation(calculation, clock.instant().plusSeconds(60)));
                } else {
                    retryCache.evict(work);
                }
                owned.get(work).complete(calculation);
            }
            List<SubAreaAssessment> results = new ArrayList<>();
            for (SubArea cell : subAreas) {
                CellCalculation calculation = awaitCalculation(requested.get(new WorkKey(cacheKey(cell), endDate)));
                results.add(new SubAreaAssessment(cell, calculation.result(), calculation.unavailableReason(),
                        calculation.initialState(), calculation.calculationDays()));
            }
            return List.copyOf(results);
        } catch (RuntimeException | Error failure) {
            for (var future : owned.values()) future.completeExceptionally(failure);
            throw failure;
        } finally {
            synchronized (inFlight) {
                for (var entry : owned.entrySet()) {
                    inFlight.remove(entry.getKey(), entry.getValue());
                }
            }
        }
    }

    private CellCalculation awaitCalculation(CompletableFuture<CellCalculation> future) {
        try {
            return future.get();
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt();
            throw new WeatherServiceException(WeatherErrorType.UNAVAILABLE,
                    "Interrupted while waiting for a shared cell calculation.", interrupted);
        } catch (ExecutionException failed) {
            Throwable cause = failed.getCause();
            if (cause instanceof RuntimeException runtime) throw runtime;
            if (cause instanceof Error error) throw error;
            throw new WeatherServiceException(WeatherErrorType.UNEXPECTED,
                    "A shared cell calculation failed.", cause);
        }
    }

    private String cacheKey(SubArea cell) {
        return "arome-hd:fwi-365-85-6-15:v1:" + cell.centerLongitude() + ":" + cell.centerLatitude();
    }

    private String key(int column, int row) {
        return column + ":" + row;
    }
}
