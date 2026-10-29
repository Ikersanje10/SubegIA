package io.github.ikersanje10.subegia.assessment.api;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import io.github.ikersanje10.subegia.assessment.domain.exception.AreaOutsideCoverageException;
import io.github.ikersanje10.subegia.assessment.domain.exception.InvalidAreaGeometryException;
import io.github.ikersanje10.subegia.shared.api.ApiErrorResponse;

@RestControllerAdvice(basePackageClasses = AssessmentController.class)
public class AssessmentExceptionHandler {

    @ExceptionHandler(AreaOutsideCoverageException.class)
    public ResponseEntity<ApiErrorResponse> handleException(AreaOutsideCoverageException exception) {

        ApiErrorResponse response = new ApiErrorResponse(422,
                "AREA_OUTSIDE_COVERAGE",
                "The selected area must be completely within Gipuzkoa",
                Map.of());

        return ResponseEntity.status(422).body(response);
    }

    @ExceptionHandler(InvalidAreaGeometryException.class)
    public ResponseEntity<ApiErrorResponse> handleException(InvalidAreaGeometryException exception) {
        ApiErrorResponse response = new ApiErrorResponse(422,
                "INVALID_AREA_GEOMETRY",
                exception.getMessage(),
                Map.of());

        return ResponseEntity.status(422).body(response);
    }

}
