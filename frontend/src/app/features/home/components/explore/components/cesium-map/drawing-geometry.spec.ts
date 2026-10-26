import { isSimplePolygon } from './drawing-geometry';
import type { Coordinate } from './example-area';

describe('drawing geometry', () => {
  const cases: { name: string; points: Coordinate[]; valid: boolean }[] = [
    { name: 'too few vertices', points: [[0, 0], [1, 1]], valid: false },
    { name: 'triangle', points: [[0, 0], [2, 0], [1, 2]], valid: true },
    { name: 'square in click order', points: [[0, 0], [2, 0], [2, 2], [0, 2]], valid: true },
    { name: 'clockwise square', points: [[0, 2], [2, 2], [2, 0], [0, 0]], valid: true },
    { name: 'crossed square', points: [[0, 0], [2, 2], [0, 2], [2, 0]], valid: false },
    { name: 'closing-edge crossing', points: [[0, 0], [2, 0], [0, 2], [2, 2]], valid: false },
    { name: 'concave outline', points: [[0, 0], [3, 0], [1, 1], [3, 3], [0, 3]], valid: true },
    { name: 'collinear triangle', points: [[0, 0], [1, 0], [2, 0]], valid: false },
    { name: 'adjacent overlap', points: [[0, 0], [3, 0], [1, 0], [2, 2]], valid: false },
    { name: 'corner on another edge', points: [[0, 0], [2, 0], [2, 2], [1, 0], [0, 2]], valid: false },
    { name: 'repeated corner', points: [[0, 0], [2, 0], [2, 2], [0, 0], [0, 2]], valid: false },
    { name: 'zero-length side', points: [[0, 0], [2, 0], [2, 0], [0, 2]], valid: false },
    { name: 'straight continuation', points: [[0, 0], [1, 0], [2, 0], [2, 2], [0, 2]], valid: true },
  ];

  for (const { name, points, valid } of cases) {
    it(`handles ${name}`, () => {
      const original = points.map(point => [...point]);
      expect(isSimplePolygon(points)).toBe(valid);
      expect(points).toEqual(original);
    });
  }
});
