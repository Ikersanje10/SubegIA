import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { assessmentFailure } from './assessment-error';

describe('assessmentFailure', () => {
  it('reads a rate-limit delay and recognizes a busy backend', () => {
    expect(assessmentFailure(new HttpErrorResponse({
      status: 429, headers: new HttpHeaders({ 'Retry-After': '12' }),
    }))).toEqual({ key: 'infoPanel.errors.rateLimited', retrySeconds: 12 });
    expect(assessmentFailure(new HttpErrorResponse({
      status: 503, error: { code: 'WEATHER_BUSY' },
      headers: new HttpHeaders({ 'Retry-After': '5' }),
    }))).toEqual({ key: 'infoPanel.errors.busy', retrySeconds: 5 });
  });

  it('supports HTTP-date delays and ignores invalid or expired headers', () => {
    const now = Date.parse('2026-11-01T12:00:00Z');
    for (const [header, seconds] of [
      ['Sun, 01 Nov 2026 12:00:10 GMT', 10], ['invalid', 0],
      ['Sun, 01 Nov 2026 11:59:59 GMT', 0],
    ] as const) {
      expect(assessmentFailure(new HttpErrorResponse({
        status: 429, headers: new HttpHeaders({ 'Retry-After': header }),
      }), now).retrySeconds).toBe(seconds);
    }
  });

  it('distinguishes geometry, provider, connectivity and response validation failures', () => {
    expect(assessmentFailure(new HttpErrorResponse({ status: 422 })).key).toBe('infoPanel.errors.invalidArea');
    expect(assessmentFailure(new HttpErrorResponse({
      status: 504, error: { code: 'WEATHER_TIMEOUT' },
    })).key).toBe('infoPanel.errors.weather');
    expect(assessmentFailure(new HttpErrorResponse({ status: 0 })).key).toBe('infoPanel.errors.network');
    expect(assessmentFailure(new Error('Invalid assessment response')).key).toBe('infoPanel.assessmentError');
  });
});
