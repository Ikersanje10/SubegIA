import type { SubAreaAssessment } from './Assessment';
import { area } from '@turf/area';

const levels = ['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH', 'EXTREME', 'VERY_EXTREME'];
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const date = (value: unknown) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
const state = (value: unknown) => object(value) && date(value['date'])
  && finite(value['ffmc']) && value['ffmc'] >= 0 && value['ffmc'] <= 101
  && finite(value['dmc']) && value['dmc'] >= 0 && finite(value['dc']) && value['dc'] >= 0;
const ring = (value: unknown) => {
  if (!Array.isArray(value) || value.length < 4) return false;
  if (!value.every(p => Array.isArray(p) && p.length >= 2 && p.every(finite)
    && Math.abs(p[0]) <= 180 && Math.abs(p[1]) <= 90)) return false;
  return value[0][0] === value[value.length - 1][0] && value[0][1] === value[value.length - 1][1];
};
const polygon = (value: unknown) => Array.isArray(value) && value.length > 0 && value.every(ring);

export function validateAssessmentResponse(value: unknown): SubAreaAssessment[] {
  if (!Array.isArray(value)) throw new Error('Assessment response must be an array');
  const seen = new Set<string>();
  for (const item of value) {
    if (!object(item) || !Number.isInteger(item['column']) || !Number.isInteger(item['row'])
      || !object(item['geometry'])) throw new Error('Invalid assessment cell');
    const geometry = item['geometry'];
    if (!(geometry['type'] === 'Polygon' ? polygon(geometry['coordinates'])
      : geometry['type'] === 'MultiPolygon' && Array.isArray(geometry['coordinates'])
        && geometry['coordinates'].length > 0 && geometry['coordinates'].every(polygon))) {
      throw new Error('Invalid assessment geometry');
    }
    const available = item['status'] === 'AVAILABLE';
    if ((!available && item['status'] !== 'UNAVAILABLE')
      || (available && (!finite(item['fwi']) || item['fwi'] < 0
        || !levels.includes(String(item['riskLevel'])) || !date(item['date'])))
      || (!available && (item['fwi'] !== null || item['riskLevel'] !== null))
      || !(item['date'] === null || date(item['date']))
      || !(item['unavailableReason'] === null || typeof item['unavailableReason'] === 'string')
      || !(item['moistureState'] === null || state(item['moistureState']))
      || !state(item['initialState']) || typeof item['experimental'] !== 'boolean'
      || typeof item['model'] !== 'string' || !item['model']
      || !finite(item['sourceLongitude']) || Math.abs(item['sourceLongitude']) > 180
      || !finite(item['sourceLatitude']) || Math.abs(item['sourceLatitude']) > 90
      || !Number.isInteger(item['calculationDays']) || Number(item['calculationDays']) < 0) {
      throw new Error('Invalid assessment data');
    }
    const id = `${item['column']}:${item['row']}`;
    if (seen.has(id)) throw new Error('Duplicate assessment cell');
    seen.add(id);
  }
  // All fields consumed by the application have been checked above.
  const results = value as SubAreaAssessment[];
  for (const result of results) {
    const surface = area(result.geometry);
    if (!Number.isFinite(surface) || surface <= 0) throw new Error('Invalid assessment surface');
  }
  return results;
}
