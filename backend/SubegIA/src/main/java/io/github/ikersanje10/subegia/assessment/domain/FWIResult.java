package io.github.ikersanje10.subegia.assessment.domain;

public record FWIResult(
        DailyWeather weather,
        FWIMoistureState moistureState,
        double isi,
        double bui,
        double fwi) {

    public FWIResult {
        if (weather == null || moistureState == null || !weather.date().equals(moistureState.date())) {
            throw new IllegalArgumentException("FWI weather and moisture states must refer to the same day.");
        }
        if (!Double.isFinite(isi) || isi < 0 || !Double.isFinite(bui) || bui < 0
                || !Double.isFinite(fwi) || fwi < 0) {
            throw new IllegalArgumentException("ISI, BUI and FWI must be finite and nonnegative.");
        }
    }

    public FWIRiskLevel riskLevel() {
        return FWIRiskLevel.fromFWI(fwi);
    }
}
