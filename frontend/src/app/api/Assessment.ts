import type { MultiPolygon, Polygon } from 'geojson';

export type Position = [longitude: number, latitude: number];

export type FWIRiskLevel =
    | 'LOW'
    | 'MODERATE'
    | 'HIGH'
    | 'VERY_HIGH'
    | 'EXTREME'
    | 'VERY_EXTREME';

export interface FWIMoistureState {
    date: string;
    ffmc: number;
    dmc: number;
    dc: number;
}

export interface SubAreaAssessment {
    column: number;
    row: number;
    geometry: Polygon | MultiPolygon;
    fwi: number | null;
    riskLevel: FWIRiskLevel | null;
    date: string | null;
    status: 'AVAILABLE' | 'UNAVAILABLE';
    unavailableReason: string | null;
    moistureState: FWIMoistureState | null;
    model: string;
    sourceLongitude: number;
    sourceLatitude: number;
    experimental: boolean;
    initialState: FWIMoistureState;
    calculationDays: number;
}

export interface AssessmentRequest {
    area: {
        type: 'Polygon',
        coordinates: Position[][];
    };
}