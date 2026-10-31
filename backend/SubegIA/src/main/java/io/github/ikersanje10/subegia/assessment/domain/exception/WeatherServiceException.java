package io.github.ikersanje10.subegia.assessment.domain.exception;

public class WeatherServiceException extends RuntimeException {
    private final WeatherErrorType type;

    public WeatherServiceException(WeatherErrorType type, String message) {
        super(message);
        this.type = type;
    }

    public WeatherServiceException(WeatherErrorType type, String message, Throwable cause) {
        super(message, cause);
        this.type = type;
    }

    public WeatherErrorType getType() {
        return type;
    }
}
