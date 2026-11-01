import { validateAssessmentResponse } from './assessment-validation';

const cell = () => ({
  column: 1, row: 2,
  geometry: { type: 'Polygon', coordinates: [[[0, 43], [1, 43], [1, 44], [0, 43]]] },
  status: 'AVAILABLE', fwi: 0, riskLevel: 'LOW', date: '2026-11-01',
  moistureState: { date: '2026-11-01', ffmc: 80, dmc: 5, dc: 10 },
  unavailableReason: null, model: 'arome',
  sourceLongitude: 0, sourceLatitude: 43, experimental: true,
  initialState: { date: '2025-11-01', ffmc: 85, dmc: 6, dc: 15 }, calculationDays: 365,
});

describe('assessment response validation', () => {
  it('accepts valid available and unavailable cells and distinguishes empty arrays', () => {
    expect(validateAssessmentResponse([cell()])).toHaveLength(1);
    expect(validateAssessmentResponse([{ ...cell(), status: 'UNAVAILABLE', fwi: null, riskLevel: null, date: null, moistureState: null, unavailableReason: 'Missing history', calculationDays: 0 }])).toHaveLength(1);
    expect(validateAssessmentResponse([])).toEqual([]);
  });
  it('rejects invalid shapes, coordinates, dates, codes and duplicate cells', () => {
    for (const value of [
      {}, [null], [{ ...cell(), fwi: NaN }], [{ ...cell(), riskLevel: 'WRONG' }],
      [{ ...cell(), date: '2026-02-30' }], [cell(), cell()],
      [{ ...cell(), geometry: { type: 'Polygon', coordinates: [[[0, 43], [1, 43], [1, 44], [2, 43]]] } }],
      [{ ...cell(), initialState: null }],
    ]) expect(() => validateAssessmentResponse(value)).toThrow();
  });
});
