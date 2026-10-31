import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { AssessmentRequest } from './Assessment';
import { Observable } from 'rxjs';

@Service()
export class AssessmentService {

    private readonly httpClient = inject(HttpClient);
    private readonly BASE_URL: string = "http://localhost:8080";

    calculateFWI(area: AssessmentRequest): Observable<any> {
        return this.httpClient.post(this.BASE_URL + "/api/v1/assessment", area);
    }
}
