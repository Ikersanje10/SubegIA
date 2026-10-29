package io.github.ikersanje10.subegia.shared.api;

import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import io.github.ikersanje10.subegia.assessment.domain.exception.AreaOutsideCoverageException;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleException(MethodArgumentNotValidException exception) {
        Map<String, List<String>> errors = new HashMap<>();

        exception.getBindingResult().getFieldErrors().forEach(error -> {
            errors.computeIfAbsent(error.getField(), k -> new ArrayList<>())
                    .add(error.getDefaultMessage());
        });

        ApiErrorResponse response = new ApiErrorResponse(400,
                "INVALID_REQUEST",
                "The request contains invalid fields",
                errors);

        return ResponseEntity.badRequest().body(response);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiErrorResponse> handleException(HttpMessageNotReadableException exception) {

        ApiErrorResponse response = new ApiErrorResponse(400,
                "INVALID_REQUEST",
                "The request body is invalid",
                Map.of());

        return ResponseEntity.badRequest().body(response);
    }
}
