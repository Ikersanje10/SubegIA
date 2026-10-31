package io.github.ikersanje10.subegia.assessment.api;

import java.time.LocalDate;

import io.github.ikersanje10.subegia.assessment.domain.FWIMoistureState;
import io.github.ikersanje10.subegia.assessment.domain.FWIRiskLevel;
import tools.jackson.databind.JsonNode;

public record SubAreaAssessmentResponse(
        int column,
        int row,
        JsonNode geometry,
        Double fwi,
        FWIRiskLevel riskLevel,
        LocalDate date,
        Status status,
        String unavailableReason,
        FWIMoistureState moistureState,
        String model,
        double sourceLongitude,
        double sourceLatitude,
        boolean experimental,
        FWIMoistureState initialState,
        int calculationDays) {

    public enum Status {
        AVAILABLE,
        UNAVAILABLE
    }
}
