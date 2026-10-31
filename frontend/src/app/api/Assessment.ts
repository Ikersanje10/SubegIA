export type Position = [longitude: number, latitude: number];

export interface AssessmentRequest {
    area: {
        type: 'Polygon',
        coordinates: Position[][];
    };
}