import { orient2d } from 'robust-predicates';
import type { Coordinate } from './example-area';

function orientation(a: Coordinate, b: Coordinate, c: Coordinate): number {
  return Math.sign(orient2d(a[0], a[1], b[0], b[1], c[0], c[1]));
}

function withinSegment(a: Coordinate, b: Coordinate, point: Coordinate): boolean {
  return point[0] >= Math.min(a[0], b[0]) && point[0] <= Math.max(a[0], b[0])
    && point[1] >= Math.min(a[1], b[1]) && point[1] <= Math.max(a[1], b[1]);
}

function segmentsIntersect(a: Coordinate, b: Coordinate, c: Coordinate, d: Coordinate): boolean {
  const abc = orientation(a, b, c);
  const abd = orientation(a, b, d);
  const cda = orientation(c, d, a);
  const cdb = orientation(c, d, b);

  return (abc === 0 && withinSegment(a, b, c))
    || (abd === 0 && withinSegment(a, b, d))
    || (cda === 0 && withinSegment(c, d, a))
    || (cdb === 0 && withinSegment(c, d, b))
    || (abc * abd < 0 && cda * cdb < 0);
}

export function isSimplePolygon(points: readonly Coordinate[]): boolean {
  if (points.length < 3) return false;

  for (let index = 0; index < points.length; index++) {
    const previous = points[(index + points.length - 1) % points.length];
    const current = points[index];
    const next = points[(index + 1) % points.length];
    if (current[0] === next[0] && current[1] === next[1]) return false;

    // Adjacent sides may share a corner, but must not double back over each other.
    if (orientation(previous, current, next) === 0
      && (withinSegment(previous, current, next) || withinSegment(current, next, previous))) {
      return false;
    }

    for (let other = index + 2; other < points.length; other++) {
      if (index === 0 && other === points.length - 1) continue;
      if (segmentsIntersect(current, next, points[other], points[(other + 1) % points.length])) {
        return false;
      }
    }
  }

  return true;
}
