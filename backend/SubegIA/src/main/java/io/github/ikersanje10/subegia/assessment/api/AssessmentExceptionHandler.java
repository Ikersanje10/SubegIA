package io.github.ikersanje10.subegia.assessment.api;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import io.github.ikersanje10.subegia.assessment.domain.exception.AreaOutsideCoverageException;
import io.github.ikersanje10.subegia.assessment.domain.exception.InvalidAreaGeometryException;
import io.github.ikersanje10.subegia.assessment.domain.exception.WeatherServiceException;
import io.github.ikersanje10.subegia.assessment.domain.exception.InvalidFWIInitializationException;
import io.github.ikersanje10.subegia.shared.api.ApiErrorResponse;

@RestControllerAdvice(basePackageClasses = AssessmentController.class)
public class AssessmentExceptionHandler {

    @ExceptionHandler(InvalidFWIInitializationException.class)
    public ResponseEntity<ApiErrorResponse> handleException(InvalidFWIInitializationException exception) {
        return ResponseEntity.unprocessableEntity().body(new ApiErrorResponse(422,
                "INVALID_FWI_INITIALIZATION", exception.getMessage(), Map.of()));
    }

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

    @ExceptionHandler(WeatherServiceException.class)
    public ResponseEntity<ApiErrorResponse> handleException(WeatherServiceException exception) {
        HttpStatus status = switch (exception.getType()) {
            case TIMEOUT -> HttpStatus.GATEWAY_TIMEOUT; // 504
            case UNAVAILABLE, RATE_LIMITED -> HttpStatus.SERVICE_UNAVAILABLE; // 503
            case INVALID_RESPONSE -> HttpStatus.BAD_GATEWAY; // 502
            case REJECTED_REQUEST, UNEXPECTED -> HttpStatus.INTERNAL_SERVER_ERROR; // 500
        };

        ApiErrorResponse response = new ApiErrorResponse(
                status.value(),
                "WEATHER_" + exception.getType().name(),
                exception.getMessage(),
                Map.of());

        return ResponseEntity.status(status).body(response);
    }
}
