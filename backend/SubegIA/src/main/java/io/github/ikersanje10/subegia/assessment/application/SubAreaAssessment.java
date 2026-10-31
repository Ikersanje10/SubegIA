package io.github.ikersanje10.subegia.assessment.application;

import io.github.ikersanje10.subegia.assessment.domain.FWIResult;
import io.github.ikersanje10.subegia.assessment.domain.FWIMoistureState;
import io.github.ikersanje10.subegia.assessment.infraestructure.config.SubArea;

public record SubAreaAssessment(SubArea subArea, FWIResult result, String unavailableReason,
        FWIMoistureState initialState, int calculationDays) {
    public SubAreaAssessment {
        if (subArea == null || (result == null && (unavailableReason == null || unavailableReason.isBlank()))
                || (result != null && unavailableReason != null)) {
            throw new IllegalArgumentException("A subarea assessment requires either a result or an explicit unavailable reason.");
        }
        if (initialState == null || calculationDays < 0
                || (result == null && calculationDays != 0)
                || (result != null && (calculationDays == 0
                        || !initialState.date().plusDays(calculationDays).equals(result.weather().date())))) {
            throw new IllegalArgumentException("Assessment initialization and calculation period must match its result.");
        }
    }
}
