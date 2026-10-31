package io.github.ikersanje10.subegia.assessment.application;

import java.time.*;
import java.util.*;

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

    public FireRiskService(OpenMeteoClient openMeteoClient, FWICalculator calculator,
            DailyWeatherMapper dailyWeatherMapper) {
        this.openMeteoClient = openMeteoClient;
        this.calculator = calculator;
        this.dailyWeatherMapper = dailyWeatherMapper;
    }

    public List<SubAreaAssessment> calculateFWI(List<SubArea> subAreas) {
        Instant now = Instant.now();
        LocalDate today = now.atOffset(ZoneOffset.UTC).toLocalDate();
        LocalDate endDate = today.atTime(11, 0).toInstant(ZoneOffset.UTC).isAfter(now)
                ? today.minusDays(1) : today;
        if (subAreas == null || subAreas.isEmpty()) {
            throw new InvalidFWIInitializationException("An assessment requires at least one intersected cell.");
        }
        LocalDate start = endDate.minusDays(RECONSTRUCTION_DAYS);
        // Approved experimental spin-up, not measured local moisture states or a seasonal restart policy.
        FWIMoistureState initial = new FWIMoistureState(start, 85, 6, 15);
        List<OpenMeteoResponse> weather = openMeteoClient.getHourlyWeather(subAreas, start, endDate);
        if (weather == null || weather.size() != subAreas.size()) {
            throw new WeatherServiceException(WeatherErrorType.INVALID_RESPONSE,
                    "The weather response does not contain one entry per requested cell.");
        }

        List<SubAreaAssessment> results = new ArrayList<>();
        for (int i = 0; i < subAreas.size(); i++) {
            SubArea cell = subAreas.get(i);
            OpenMeteoResponse response = weather.get(i);
            if (response == null || !Double.isFinite(response.latitude()) || !Double.isFinite(response.longitude())
                    || Math.abs(response.latitude() - cell.centerLatitude()) > 0.0001
                    || Math.abs(response.longitude() - cell.centerLongitude()) > 0.0001) {
                throw new WeatherServiceException(WeatherErrorType.INVALID_RESPONSE,
                        "Returned weather coordinates do not match requested cell " + key(cell.column(), cell.row()) + ".");
            }
            try {
                var days = dailyWeatherMapper.toDailyWeather(response, initial.date().plusDays(1), endDate, now);
                var series = calculator.calculateSeries(days, initial);
                results.add(new SubAreaAssessment(cell, series.getLast(), null, initial, series.size()));
            } catch (WeatherServiceException e) {
                if (e.getType() != WeatherErrorType.INVALID_RESPONSE) {
                    throw e;
                }
                results.add(new SubAreaAssessment(cell, null, e.getMessage(), initial, 0));
            }
        }
        return List.copyOf(results);
    }

    private String key(int column, int row) {
        return column + ":" + row;
    }
}
