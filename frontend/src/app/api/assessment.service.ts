import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AssessmentRequest, SubAreaAssessment } from './Assessment';
import { map, Observable } from 'rxjs';
import { validateAssessmentResponse } from './assessment-validation';
import { environment } from '../../environments/environment';

@Service()
export class AssessmentService {

    private readonly httpClient = inject(HttpClient);
    private readonly BASE_URL = environment.apiBaseUrl;

    calculateFWI(area: AssessmentRequest): Observable<SubAreaAssessment[]> {
        return this.httpClient.post<unknown>(this.BASE_URL + "/api/v1/assessment", area)
            .pipe(map(validateAssessmentResponse));
    }
}
