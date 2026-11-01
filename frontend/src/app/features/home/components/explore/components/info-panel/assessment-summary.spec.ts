import { area } from '@turf/area';
import type { SubAreaAssessment } from '../../../../../../api/Assessment';
import { summarizeAssessments } from './assessment-summary';

export function assessmentFixture(width = 1): SubAreaAssessment {
  return {
    column: 0, row: 0,
    geometry: { type: 'Polygon', coordinates: [[[0, 43], [width, 43], [width, 44], [0, 44], [0, 43]]] },
    fwi: 5, riskLevel: 'LOW', date: '2026-11-01', status: 'AVAILABLE',
    unavailableReason: null, moistureState: null, model: 'meteofrance_arome_france_hd',
    sourceLongitude: 0, sourceLatitude: 43, experimental: true,
    initialState: { date: '2025-11-01', ffmc: 85, dmc: 6, dc: 15 }, calculationDays: 365,
  };
}

describe('assessment summary', () => {
  it('uses surface proportions, not cell counts, and excludes unavailable values from the maximum', () => {
    const low = assessmentFixture(1);
    const high = { ...assessmentFixture(3), fwi: 30, riskLevel: 'HIGH' as const };
    const missing = { ...assessmentFixture(1), status: 'UNAVAILABLE' as const, fwi: null, riskLevel: null };
    const summary = summarizeAssessments([low, high, missing]);
    expect(summary.maximum).toBe(high);
    expect(summary.availablePercent).toBeCloseTo(80);
    expect(summary.unavailablePercent).toBeCloseTo(20);
    expect(summary.distribution.find(entry => entry.level === 'LOW')?.percent).toBeCloseTo(20);
    expect(summary.distribution.find(entry => entry.level === 'HIGH')?.percent).toBeCloseTo(60);
  });

  it('accounts for polygon holes and every multipolygon part', () => {
    const polygon = assessmentFixture(2);
    if (polygon.geometry.type !== 'Polygon') throw new Error('Expected polygon fixture');
    polygon.geometry.coordinates.push([[0.5, 43.2], [0.5, 43.8], [1.5, 43.8], [1.5, 43.2], [0.5, 43.2]]);
    const other = assessmentFixture();
    if (other.geometry.type !== 'Polygon') throw new Error('Expected polygon fixture');
    const multi: SubAreaAssessment = {
      ...other, geometry: { type: 'MultiPolygon', coordinates: [other.geometry.coordinates, other.geometry.coordinates] },
      status: 'UNAVAILABLE', fwi: null, riskLevel: null,
    };
    const summary = summarizeAssessments([polygon, multi]);
    expect(summary.availablePercent).toBeCloseTo(area(polygon.geometry) / (area(polygon.geometry) + area(multi.geometry)) * 100);
  });

  it('shows no maximum for missing data or an empty response, and treats zero FWI as available', () => {
    const missing = { ...assessmentFixture(), status: 'UNAVAILABLE' as const, fwi: null, riskLevel: null };
    expect(summarizeAssessments([missing]).maximum).toBeNull();
    expect(summarizeAssessments([missing]).unavailablePercent).toBe(100);
    expect(summarizeAssessments([]).availablePercent).toBeNull();
    expect(summarizeAssessments([{ ...assessmentFixture(), fwi: 0 }]).maximum?.fwi).toBe(0);
  });

  it('retains distinct sorted dates and models', () => {
    const summary = summarizeAssessments([
      assessmentFixture(),
      { ...assessmentFixture(), date: '2026-10-31', model: 'another-model' },
    ]);
    expect(summary.dates).toEqual(['2026-10-31', '2026-11-01']);
    expect(summary.models).toHaveLength(2);
  });
});
