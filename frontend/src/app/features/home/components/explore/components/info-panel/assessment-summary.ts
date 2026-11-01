import { area } from '@turf/area';
import type { FWIRiskLevel, SubAreaAssessment } from '../../../../../../api/Assessment';

export const RISK_LEVELS = [
  'LOW', 'MODERATE', 'HIGH', 'VERY_HIGH', 'EXTREME', 'VERY_EXTREME',
] as const satisfies readonly FWIRiskLevel[];

export const RISK_LABELS: Record<FWIRiskLevel, string> = {
  LOW: 'low', MODERATE: 'moderate', HIGH: 'high',
  VERY_HIGH: 'veryHigh', EXTREME: 'extreme', VERY_EXTREME: 'veryExtreme',
};

export function summarizeAssessments(results: readonly SubAreaAssessment[]) {
  let totalArea = 0;
  let availableArea = 0;
  let maximum: SubAreaAssessment | null = null;
  let maximumFWI = -1;
  const categoryAreas = new Map<FWIRiskLevel, number>();
  const dates = new Set<string>();
  const models = new Set<string>();
  for (const result of results) {
    const surface = area(result.geometry);
    if (!Number.isFinite(surface) || surface <= 0) {
      throw new Error('Invalid assessment surface area');
    }
    totalArea += surface;
    models.add(result.model);
    if (result.status !== 'AVAILABLE' || result.fwi === null || result.riskLevel === null) continue;
    if (!Number.isFinite(result.fwi) || result.fwi < 0) throw new Error('Invalid assessment FWI');
    availableArea += surface;
    categoryAreas.set(result.riskLevel, (categoryAreas.get(result.riskLevel) ?? 0) + surface);
    if (result.date) dates.add(result.date);
    if (result.fwi > maximumFWI) {
      maximum = result;
      maximumFWI = result.fwi;
    }
  }
  return {
    maximum,
    availablePercent: totalArea > 0 ? availableArea / totalArea * 100 : null,
    unavailablePercent: totalArea > 0 ? (totalArea - availableArea) / totalArea * 100 : null,
    distribution: RISK_LEVELS.map(level => ({
      level,
      percent: totalArea > 0 ? (categoryAreas.get(level) ?? 0) / totalArea * 100 : null,
    })),
    dates: [...dates].sort(),
    models: [...models].sort(),
  };
}
