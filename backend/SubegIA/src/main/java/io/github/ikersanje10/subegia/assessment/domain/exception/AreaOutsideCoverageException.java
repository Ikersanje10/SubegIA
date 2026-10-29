package io.github.ikersanje10.subegia.assessment.domain.exception;

/**
 * AreaOutsideCoverageException
 */
public class AreaOutsideCoverageException extends RuntimeException {
    public AreaOutsideCoverageException() {
        super("The selected area must be completely within Gipuzkoa");
    }

}
