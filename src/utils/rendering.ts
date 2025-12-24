import { Point, MediaTransform, Surface } from '@/types/projection';
import { computePerspectiveTransform, transformPoint } from './perspective';

// Bilinear interpolation for quad mapping
export function bilinearInterpolate(corners: Point[], u: number, v: number): Point {
  if (corners.length === 4) {
    const top = lerp(corners[0], corners[1], u);
    const bottom = lerp(corners[3], corners[2], u);
    return lerp(top, bottom, v);
  }
  // For freeform, use barycentric-like interpolation from centroid
  return barycentricInterpolate(corners, u, v);
}

function barycentricInterpolate(corners: Point[], u: number, v: number): Point {
  const bounds = getPolygonBounds(corners);
  
  // Map u,v to position within bounds
  const x = bounds.minX + u * (bounds.maxX - bounds.minX);
  const y = bounds.minY + v * (bounds.maxY - bounds.minY);
  
  return { x, y };
}

export function lerp(p1: Point, p2: Point, t: number): Point {
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t,
  };
}

export function getPolygonCentroid(corners: Point[]): Point {
  const x = corners.reduce((sum, c) => sum + c.x, 0) / corners.length;
  const y = corners.reduce((sum, c) => sum + c.y, 0) / corners.length;
  return { x, y };
}

export function getPolygonBounds(corners: Point[]) {
  const xs = corners.map(c => c.x);
  const ys = corners.map(c => c.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

// Draw perspective quad with proper perspective transformation
export function drawPerspectiveQuad(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLVideoElement,
  corners: Point[],
  opacity: number,
  transform: MediaTransform,
  transformMode: 'perspective' | 'resize' = 'perspective',
  subdivisions: number = 10
) {
  const imgWidth = img instanceof HTMLVideoElement ? img.videoWidth : img.width;
  const imgHeight = img instanceof HTMLVideoElement ? img.videoHeight : img.height;
  
  if (imgWidth === 0 || imgHeight === 0) return;
  if (corners.length < 4) return;

  ctx.save();
  ctx.globalAlpha = opacity;

  // Clip to polygon shape
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) {
    ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();
  ctx.clip();

  const bounds = getPolygonBounds(corners);
  const boundsWidth = bounds.maxX - bounds.minX;
  const boundsHeight = bounds.maxY - bounds.minY;
  
  if (boundsWidth === 0 || boundsHeight === 0) {
    ctx.restore();
    return;
  }

  if (transformMode === 'perspective' && corners.length === 4) {
    // TRUE PERSPECTIVE: Use subdivision mesh to warp the image
    drawPerspectiveMesh(ctx, img, corners, transform, subdivisions);
  } else {
    // RESIZE MODE: Just scale/rotate/position without perspective warp
    drawSimpleTransform(ctx, img, corners, transform, boundsWidth, boundsHeight);
  }

  ctx.restore();
}

// Draw with perspective mesh subdivision
function drawPerspectiveMesh(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLVideoElement,
  corners: [Point, Point, Point, Point] | Point[],
  transform: MediaTransform,
  subdivisions: number
) {
  const imgWidth = img instanceof HTMLVideoElement ? img.videoWidth : img.width;
  const imgHeight = img instanceof HTMLVideoElement ? img.videoHeight : img.height;
  
  const quadCorners = corners as [Point, Point, Point, Point];
  const bounds = getPolygonBounds(corners);
  const boundsWidth = bounds.maxX - bounds.minX;
  const boundsHeight = bounds.maxY - bounds.minY;
  
  // Calculate image dimensions maintaining aspect ratio
  const imageAspect = imgWidth / imgHeight;
  let baseWidth = boundsWidth;
  let baseHeight = boundsHeight;
  
  if (boundsWidth / boundsHeight > imageAspect) {
    baseWidth = baseHeight * imageAspect;
  } else {
    baseHeight = baseWidth / imageAspect;
  }

  // Apply scale from transform
  const scaledWidth = baseWidth * transform.scale;
  const scaledHeight = baseHeight * transform.scale;
  
  // Center point of the bounds
  const centerX = bounds.minX + boundsWidth / 2;
  const centerY = bounds.minY + boundsHeight / 2;
  
  // Image drawing rectangle (before perspective) with offset
  const imgLeft = centerX - scaledWidth / 2 + transform.offsetX;
  const imgTop = centerY - scaledHeight / 2 + transform.offsetY;
  const imgRight = imgLeft + scaledWidth;
  const imgBottom = imgTop + scaledHeight;

  // Source rectangle (unit square mapped to quad)
  const srcCorners: [Point, Point, Point, Point] = [
    { x: bounds.minX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.minY },
    { x: bounds.maxX, y: bounds.maxY },
    { x: bounds.minX, y: bounds.maxY },
  ];

  // Compute perspective transform from bounding box to quad
  const perspTransform = computePerspectiveTransform(srcCorners, quadCorners);

  // Draw subdivided mesh
  for (let i = 0; i < subdivisions; i++) {
    for (let j = 0; j < subdivisions; j++) {
      const u0 = i / subdivisions;
      const u1 = (i + 1) / subdivisions;
      const v0 = j / subdivisions;
      const v1 = (j + 1) / subdivisions;

      // Source texture coordinates (in image space)
      const srcX0 = u0 * imgWidth;
      const srcX1 = u1 * imgWidth;
      const srcY0 = v0 * imgHeight;
      const srcY1 = v1 * imgHeight;

      // Calculate position in the "before transform" space
      // Map UV to image rectangle position, then apply rotation around center
      const calcPos = (u: number, v: number): Point => {
        // Position in scaled/offset image space
        let px = imgLeft + u * scaledWidth;
        let py = imgTop + v * scaledHeight;
        
        // Apply rotation around image center
        if (transform.rotation !== 0) {
          const imgCenterX = imgLeft + scaledWidth / 2;
          const imgCenterY = imgTop + scaledHeight / 2;
          const rad = (transform.rotation * Math.PI) / 180;
          const cos = Math.cos(rad);
          const sin = Math.sin(rad);
          const dx = px - imgCenterX;
          const dy = py - imgCenterY;
          px = imgCenterX + dx * cos - dy * sin;
          py = imgCenterY + dx * sin + dy * cos;
        }
        
        // Then apply perspective transform
        return transformPoint(perspTransform, { x: px, y: py });
      };

      const p00 = calcPos(u0, v0);
      const p10 = calcPos(u1, v0);
      const p11 = calcPos(u1, v1);
      const p01 = calcPos(u0, v1);

      // Draw two triangles for this quad cell
      drawTexturedTriangle(ctx, img,
        p00.x, p00.y, p10.x, p10.y, p11.x, p11.y,
        srcX0, srcY0, srcX1, srcY0, srcX1, srcY1
      );
      drawTexturedTriangle(ctx, img,
        p00.x, p00.y, p11.x, p11.y, p01.x, p01.y,
        srcX0, srcY0, srcX1, srcY1, srcX0, srcY1
      );
    }
  }
}

// Draw with simple affine transform (no perspective warp)
function drawSimpleTransform(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLVideoElement,
  corners: Point[],
  transform: MediaTransform,
  boundsWidth: number,
  boundsHeight: number
) {
  const imgWidth = img instanceof HTMLVideoElement ? img.videoWidth : img.width;
  const imgHeight = img instanceof HTMLVideoElement ? img.videoHeight : img.height;
  
  const bounds = getPolygonBounds(corners);
  const centerX = bounds.minX + boundsWidth / 2;
  const centerY = bounds.minY + boundsHeight / 2;

  // Calculate draw size maintaining aspect ratio
  const imageAspect = imgWidth / imgHeight;
  let drawWidth = boundsWidth;
  let drawHeight = boundsHeight;
  
  if (boundsWidth / boundsHeight > imageAspect) {
    drawWidth = drawHeight * imageAspect;
  } else {
    drawHeight = drawWidth / imageAspect;
  }

  // Apply transforms
  ctx.translate(centerX, centerY);
  ctx.rotate((transform.rotation * Math.PI) / 180);
  ctx.scale(transform.scale, transform.scale);
  ctx.translate(-centerX, -centerY);
  
  const drawX = centerX - drawWidth / 2 + transform.offsetX;
  const drawY = centerY - drawHeight / 2 + transform.offsetY;
  
  ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
}

// Draw a textured triangle using affine transform approximation
function drawTexturedTriangle(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement | HTMLVideoElement,
  x0: number, y0: number,
  x1: number, y1: number,
  x2: number, y2: number,
  u0: number, v0: number,
  u1: number, v1: number,
  u2: number, v2: number
) {
  ctx.save();
  
  // Clip to triangle
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.closePath();
  ctx.clip();

  // Compute affine transform from texture to screen
  // We need to solve: [x, y] = A * [u, v, 1]
  const denom = (u0 - u2) * (v1 - v2) - (u1 - u2) * (v0 - v2);
  if (Math.abs(denom) < 0.0001) {
    ctx.restore();
    return;
  }

  const a = ((x0 - x2) * (v1 - v2) - (x1 - x2) * (v0 - v2)) / denom;
  const b = ((x1 - x2) * (u0 - u2) - (x0 - x2) * (u1 - u2)) / denom;
  const c = x2 - a * u2 - b * v2;
  
  const d = ((y0 - y2) * (v1 - v2) - (y1 - y2) * (v0 - v2)) / denom;
  const e = ((y1 - y2) * (u0 - u2) - (y0 - y2) * (u1 - u2)) / denom;
  const f = y2 - d * u2 - e * v2;

  ctx.setTransform(a, d, b, e, c, f);
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

// Draw surface grid (simple rectangles, no diagonals)
export function drawSurfaceGrid(
  ctx: CanvasRenderingContext2D,
  corners: Point[],
  gridCount: number = 4,
  color: string = 'rgba(100, 200, 255, 0.3)',
  transformMode: 'perspective' | 'resize' = 'perspective'
) {
  if (corners.length !== 4) return;
  
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  
  if (transformMode === 'perspective') {
    // Grid follows perspective (bilinear interpolation)
    for (let i = 0; i <= gridCount; i++) {
      const v = i / gridCount;
      const start = bilinearInterpolate(corners, 0, v);
      const end = bilinearInterpolate(corners, 1, v);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
    
    for (let j = 0; j <= gridCount; j++) {
      const u = j / gridCount;
      const start = bilinearInterpolate(corners, u, 0);
      const end = bilinearInterpolate(corners, u, 1);
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      ctx.lineTo(end.x, end.y);
      ctx.stroke();
    }
  } else {
    // Simple rectangular grid (no perspective warp)
    const bounds = getPolygonBounds(corners);
    const stepX = (bounds.maxX - bounds.minX) / gridCount;
    const stepY = (bounds.maxY - bounds.minY) / gridCount;
    
    for (let i = 0; i <= gridCount; i++) {
      const y = bounds.minY + i * stepY;
      ctx.beginPath();
      ctx.moveTo(bounds.minX, y);
      ctx.lineTo(bounds.maxX, y);
      ctx.stroke();
    }
    
    for (let j = 0; j <= gridCount; j++) {
      const x = bounds.minX + j * stepX;
      ctx.beginPath();
      ctx.moveTo(x, bounds.minY);
      ctx.lineTo(x, bounds.maxY);
      ctx.stroke();
    }
  }
  
  ctx.restore();
}

// Check if point is inside polygon (ray casting)
export function isPointInPolygon(point: Point, corners: Point[]): boolean {
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

// Get midpoint of edge
export function getEdgeMidpoint(p1: Point, p2: Point): Point {
  return {
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  };
}