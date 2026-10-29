package io.github.ikersanje10.subegia.assessment.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record AssessmentRequest(@NotNull @Valid AreaGeometryRequest area) {
}
