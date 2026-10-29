package io.github.ikersanje10.subegia.assessment.application;

import java.util.List;

import org.locationtech.jts.geom.Geometry;
import org.springframework.stereotype.Service;

import io.github.ikersanje10.subegia.assessment.domain.AreaGeometryValidator;
import io.github.ikersanje10.subegia.assessment.infraestructure.AreaGeometryService;
import tools.jackson.databind.ObjectMapper;

@Service
public class AssessmentService {

    private final Geometry gipuzkoaGeometry;

    private AreaGeometryService areaGeometryService;
    private AreaGeometryValidator areaGeometryValidator;

    public AssessmentService(AreaGeometryService areaGeometryService, AreaGeometryValidator areaGeometryValidator,
            ObjectMapper mapper) {
        this.areaGeometryService = areaGeometryService;
        this.areaGeometryValidator = areaGeometryValidator;
        this.gipuzkoaGeometry = areaGeometryService.loadGipuzkoaPolygon(mapper);
    }

    public void validateSelectedArea(List<List<List<Double>>> coordinates) {
        Geometry selectedGeometry = areaGeometryService.loadSelectedAreaAsGeometry(coordinates);

        areaGeometryValidator.validateGeometry(selectedGeometry);
        areaGeometryValidator.validate(gipuzkoaGeometry, selectedGeometry);
    }
}
