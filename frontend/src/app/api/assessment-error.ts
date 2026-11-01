import { HttpErrorResponse } from '@angular/common/http';

export type AssessmentErrorKey = 'infoPanel.assessmentError' | 'infoPanel.errors.rateLimited'
  | 'infoPanel.errors.busy' | 'infoPanel.errors.invalidArea'
  | 'infoPanel.errors.weather' | 'infoPanel.errors.network';

export function assessmentFailure(error: unknown, now = Date.now()): {
  key: AssessmentErrorKey; retrySeconds: number;
} {
  if (!(error instanceof HttpErrorResponse)) {
    return { key: 'infoPanel.assessmentError', retrySeconds: 0 };
  }
  const body: unknown = error.error;
  const code = body && typeof body === 'object' && 'code' in body && typeof body.code === 'string'
    ? body.code : '';
  const header = error.headers.get('Retry-After');
  const retrySeconds = header === null ? 0
    : /^\d+$/.test(header) ? Number(header)
    : Math.max(0, Math.ceil((Date.parse(header) - now) / 1000));
  const key: AssessmentErrorKey = error.status === 429 ? 'infoPanel.errors.rateLimited'
    : code === 'WEATHER_BUSY' || code === 'ASSESSMENT_BUSY' ? 'infoPanel.errors.busy'
    : error.status === 400 || error.status === 422 ? 'infoPanel.errors.invalidArea'
    : code.startsWith('WEATHER_') ? 'infoPanel.errors.weather'
    : error.status === 0 ? 'infoPanel.errors.network'
    : 'infoPanel.assessmentError';
  return { key, retrySeconds: (error.status === 429 || error.status === 503)
    && Number.isFinite(retrySeconds) ? retrySeconds : 0 };
}
