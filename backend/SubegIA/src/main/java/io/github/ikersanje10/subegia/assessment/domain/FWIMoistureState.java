package io.github.ikersanje10.subegia.assessment.domain;

import java.time.LocalDate;

public record FWIMoistureState(LocalDate date, double ffmc, double dmc, double dc) {

    public FWIMoistureState {
        if (date == null) {
            throw new IllegalArgumentException("FWI moisture states must have a date.");
        }
        if (!Double.isFinite(ffmc) || ffmc < 0 || ffmc > 101) {
            throw new IllegalArgumentException("FFMC must be between 0 and 101.");
        }
        if (!Double.isFinite(dmc) || dmc < 0 || !Double.isFinite(dc) || dc < 0) {
            throw new IllegalArgumentException("DMC and DC must be finite and nonnegative.");
        }
    }
}
