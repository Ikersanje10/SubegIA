export type Coordinate = readonly [longitude: number, latitude: number];

export const EXAMPLE_AREA_COORDINATES: readonly Coordinate[] = [
  [-2.483456, 43.085270],
  [-2.485437, 43.080325],
  [-2.487209, 43.071158],
  [-2.492587, 43.088082],
];

const DEMO_DANGER_LEVELS = [
  'low', 'moderate', 'high', 'veryHigh', 'extreme', 'veryExtreme',
] as const;

export type Danger = typeof DEMO_DANGER_LEVELS[number];

export interface ExampleCell {
  id: string;
  coordinates: Coordinate[];
  danger: Danger;
}

function clipAtBoundary(
  polygon: Coordinate[],
  axis: 0 | 1,
  boundary: number,
  keepGreater: boolean,
): Coordinate[] {
  const result: Coordinate[] = [];

  polygon.forEach((end, index) => {
    const start = polygon[(index + polygon.length - 1) % polygon.length];
    const startInside = keepGreater ? start[axis] >= boundary : start[axis] <= boundary;
    const endInside = keepGreater ? end[axis] >= boundary : end[axis] <= boundary;

    if (startInside !== endInside) {
      const fraction = (boundary - start[axis]) / (end[axis] - start[axis]);
      result.push([
        axis === 0 ? boundary : start[0] + fraction * (end[0] - start[0]),
        axis === 1 ? boundary : start[1] + fraction * (end[1] - start[1]),
      ]);
    }
    if (endInside) result.push(end);
  });

  return result;
}

export function createExampleCells(): ExampleCell[] {
  const west = Math.min(...EXAMPLE_AREA_COORDINATES.map(([longitude]) => longitude));
  const east = Math.max(...EXAMPLE_AREA_COORDINATES.map(([longitude]) => longitude));
  const south = Math.min(...EXAMPLE_AREA_COORDINATES.map(([, latitude]) => latitude));
  const north = Math.max(...EXAMPLE_AREA_COORDINATES.map(([, latitude]) => latitude));

  // Local approximation: 250 m squares, accounting for longitude scale at this latitude.
  const latitudeStep = 250 / 111_320;
  const longitudeStep = latitudeStep / Math.cos(((south + north) / 2) * Math.PI / 180);
  const rows = Math.ceil((north - south) / latitudeStep);
  const columns = Math.ceil((east - west) / longitudeStep);
  const cells: ExampleCell[] = [];

  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const left = west + column * longitudeStep;
      const bottom = south + row * latitudeStep;
      let coordinates = [...EXAMPLE_AREA_COORDINATES];
      coordinates = clipAtBoundary(coordinates, 0, left, true);
      coordinates = clipAtBoundary(coordinates, 0, left + longitudeStep, false);
      coordinates = clipAtBoundary(coordinates, 1, bottom, true);
      coordinates = clipAtBoundary(coordinates, 1, bottom + latitudeStep, false);

      // Discard empty intersections and cells that only touch the boundary.
      const twiceArea = coordinates.reduce((sum, point, index) => {
        const next = coordinates[(index + 1) % coordinates.length];
        return sum + (point[0] - west) * (next[1] - south)
          - (next[0] - west) * (point[1] - south);
      }, 0);
      if (coordinates.length < 3 || Math.abs(twiceArea) < 1e-14) continue;

      cells.push({
        id: `example-cell-${row}-${column}`,
        coordinates,
        // Deterministic demo values, not a weather or fire-risk calculation.
        danger: DEMO_DANGER_LEVELS[(row + column) % DEMO_DANGER_LEVELS.length],
      });
    }
  }

  return cells;
}
