package io.github.ikersanje10.subegia.assessment.domain;

public enum FWIRiskLevel {

    LOW,
    MODERATE,
    HIGH,
    VERY_HIGH,
    EXTREME,
    VERY_EXTREME;

    public static FWIRiskLevel fromFWI(double fwi) {
        if (!Double.isFinite(fwi) || fwi < 0) {
            throw new IllegalArgumentException("FWI must be finite and nonnegative.");
        }
        if (fwi < 11.2) {
            return LOW;
        }
        if (fwi < 21.3) {
            return MODERATE;
        }
        if (fwi < 38.0) {
            return HIGH;
        }
        if (fwi < 50.0) {
            return VERY_HIGH;
        }
        return fwi <= 70.0 ? EXTREME : VERY_EXTREME;
    }
}
