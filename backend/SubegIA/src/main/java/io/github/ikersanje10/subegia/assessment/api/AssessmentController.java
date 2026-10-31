package io.github.ikersanje10.subegia.assessment.api;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import io.github.ikersanje10.subegia.assessment.application.AssessmentService;
import io.github.ikersanje10.subegia.assessment.infraestructure.config.WeatherGridProperties;
import java.util.List;
import org.locationtech.jts.io.geojson.GeoJsonWriter;
import tools.jackson.databind.ObjectMapper;

@RestController
@RequestMapping("/api/v1/assessment")
@CrossOrigin(origins = "http://localhost:4200")
public class AssessmentController {

    private AssessmentService assessmentService;
    private final ObjectMapper objectMapper;
    private final WeatherGridProperties grid;

    public AssessmentController(AssessmentService assessmentService, ObjectMapper objectMapper,
            WeatherGridProperties grid) {
        this.assessmentService = assessmentService;
        this.objectMapper = objectMapper;
        this.grid = grid;
    }

    @PostMapping
    public List<SubAreaAssessmentResponse> assessment(@Valid @RequestBody AssessmentRequest payload) {
        var assessments = assessmentService.assessArea(payload.area().coordinates());
        GeoJsonWriter writer = new GeoJsonWriter();
        writer.setEncodeCRS(false);
        return assessments.stream().map(assessment -> {
            var cell = assessment.subArea();
            var result = assessment.result();
            return new SubAreaAssessmentResponse(cell.column(), cell.row(),
                    objectMapper.readTree(writer.write(cell.geometry())),
                    result == null ? null : result.fwi(),
                    result == null ? null : result.riskLevel(),
                    result == null ? null : result.weather().date(),
                    result == null ? SubAreaAssessmentResponse.Status.UNAVAILABLE
                            : SubAreaAssessmentResponse.Status.AVAILABLE,
                    assessment.unavailableReason(),
                    result == null ? null : result.moistureState(),
                    grid.model(), cell.centerLongitude(), cell.centerLatitude(),
                    true, assessment.initialState(), assessment.calculationDays());
        }).toList();
    }

}
