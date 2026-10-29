package io.github.ikersanje10.subegia.assessment.domain;

import org.locationtech.jts.geom.Geometry;
import org.locationtech.jts.operation.valid.IsValidOp;
import org.springframework.stereotype.Component;

import io.github.ikersanje10.subegia.assessment.domain.exception.AreaOutsideCoverageException;
import io.github.ikersanje10.subegia.assessment.domain.exception.InvalidAreaGeometryException;

@Component
public class AreaGeometryValidator {

    public void validateGeometry(Geometry selectedArea) {
        IsValidOp validator = new IsValidOp(selectedArea);

        if (!validator.isValid()) {
            throw new InvalidAreaGeometryException("The selected area has invalid geometry");
        }

        if (selectedArea.isEmpty() || selectedArea.getArea() <= 0) {
            throw new InvalidAreaGeometryException(
                    "The selected area must have a positive surface area.");
        }
    }

    public void validate(Geometry permittedArea, Geometry selectedArea) {
        if (!permittedArea.covers(selectedArea)) {
            throw new AreaOutsideCoverageException();
        }
    }
}
