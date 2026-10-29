package io.github.ikersanje10.subegia.assessment.api;

import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import io.github.ikersanje10.subegia.assessment.application.AssessmentService;

@RestController
@RequestMapping("/api/v1/assessment")
@CrossOrigin(origins = "http://localhost:4200")
public class AssessmentController {

    private AssessmentService assessmentService;

    public AssessmentController(AssessmentService assessmentService) {
        this.assessmentService = assessmentService;
    }

    @PostMapping
    public void assessment(@Valid @RequestBody AssessmentRequest payload) {
        assessmentService.validateSelectedArea(payload.area().coordinates());
    }

}
