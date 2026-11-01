package io.github.ikersanje10.subegia.assessment.domain;

public record WeatherCacheableData(FWIResult result, FWIMoistureState initialState, int calculationDays) {
}
