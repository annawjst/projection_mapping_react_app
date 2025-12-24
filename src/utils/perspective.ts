import { Point } from '@/types/projection';

// Compute the adjugate of a 3x3 matrix
function adj(m: number[]): number[] {
  return [
    m[4] * m[8] - m[5] * m[7],
    m[2] * m[7] - m[1] * m[8],
    m[1] * m[5] - m[2] * m[4],
    m[5] * m[6] - m[3] * m[8],
    m[0] * m[8] - m[2] * m[6],
    m[2] * m[3] - m[0] * m[5],
    m[3] * m[7] - m[4] * m[6],
    m[1] * m[6] - m[0] * m[7],
    m[0] * m[4] - m[1] * m[3],
  ];
}

// Multiply two 3x3 matrices
function multmm(a: number[], b: number[]): number[] {
  const c: number[] = [];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      let sum = 0;
      for (let k = 0; k < 3; k++) {
        sum += a[3 * i + k] * b[3 * k + j];
      }
      c[3 * i + j] = sum;
    }
  }
  return c;
}

// Multiply a 3x3 matrix with a 3-vector
function multmv(m: number[], v: number[]): number[] {
  return [
    m[0] * v[0] + m[1] * v[1] + m[2] * v[2],
    m[3] * v[0] + m[4] * v[1] + m[5] * v[2],
    m[6] * v[0] + m[7] * v[1] + m[8] * v[2],
  ];
}

// Compute basis to unit square mapping
function basisToPoints(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  x3: number,
  y3: number,
  x4: number,
  y4: number
): number[] {
  const m = [x1, x2, x3, y1, y2, y3, 1, 1, 1];
  const v = multmv(adj(m), [x4, y4, 1]);
  return multmm(m, [v[0], 0, 0, 0, v[1], 0, 0, 0, v[2]]);
}

// Compute general 2D perspective transform
export function computePerspectiveTransform(
  srcCorners: [Point, Point, Point, Point],
  dstCorners: [Point, Point, Point, Point]
): number[] {
  const s = basisToPoints(
    srcCorners[0].x,
    srcCorners[0].y,
    srcCorners[1].x,
    srcCorners[1].y,
    srcCorners[2].x,
    srcCorners[2].y,
    srcCorners[3].x,
    srcCorners[3].y
  );
  const d = basisToPoints(
    dstCorners[0].x,
    dstCorners[0].y,
    dstCorners[1].x,
    dstCorners[1].y,
    dstCorners[2].x,
    dstCorners[2].y,
    dstCorners[3].x,
    dstCorners[3].y
  );
  const t = multmm(d, adj(s));

  // Normalize
  for (let i = 0; i < 9; i++) {
    t[i] = t[i] / t[8];
  }

  return t;
}

// Apply perspective transform to a point
export function transformPoint(transform: number[], point: Point): Point {
  const x = transform[0] * point.x + transform[1] * point.y + transform[2];
  const y = transform[3] * point.x + transform[4] * point.y + transform[5];
  const w = transform[6] * point.x + transform[7] * point.y + transform[8];
  return { x: x / w, y: y / w };
}

// Convert transform matrix to CSS matrix3d format
export function toCSSMatrix3d(corners: [Point, Point, Point, Point], width: number, height: number): string {
  const srcCorners: [Point, Point, Point, Point] = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height },
  ];

  const t = computePerspectiveTransform(srcCorners, corners);

  return `matrix3d(
    ${t[0]}, ${t[3]}, 0, ${t[6]},
    ${t[1]}, ${t[4]}, 0, ${t[7]},
    0, 0, 1, 0,
    ${t[2]}, ${t[5]}, 0, ${t[8]}
  )`;
}

// Generate unique ID
export function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

// Calculate center of quad
export function getQuadCenter(corners: [Point, Point, Point, Point]): Point {
  return {
    x: (corners[0].x + corners[1].x + corners[2].x + corners[3].x) / 4,
    y: (corners[0].y + corners[1].y + corners[2].y + corners[3].y) / 4,
  };
}

// Check if point is inside quad (using ray casting)
export function isPointInQuad(point: Point, corners: [Point, Point, Point, Point]): boolean {
  let inside = false;
  const n = corners.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = corners[i].x, yi = corners[i].y;
    const xj = corners[j].x, yj = corners[j].y;
    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

// Distance from point to point
export function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}
