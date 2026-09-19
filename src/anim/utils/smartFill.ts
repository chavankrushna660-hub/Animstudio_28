// @ts-nocheck
import { Point, VectorObject } from '../types';
import { localToWorld, worldToLocal, isPointInPolygon } from './math';

export interface ScannedShapeRegion {
  id: string;
  name: string;
  center: Point;
  contour: Point[];
  isClosed: boolean;
  gapDistance: number;
  area: number;
  strokeIds: string[];
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
}

/**
 * Standard perpendicular distance from point P to line segment AB, returning closest point Q on segment
 */
function closestPointOnSegment(p: Point, a: Point, b: Point): { q: Point; dist: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    return { q: { x: a.x, y: a.y }, dist: Math.hypot(p.x - a.x, p.y - a.y) };
  }
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
  const qx = a.x + t * dx;
  const qy = a.y + t * dy;
  return {
    q: { x: qx, y: qy },
    dist: Math.hypot(p.x - qx, p.y - qy)
  };
}

/**
 * Standard perpendicular distance from point P to line segment AB
 */
function perpendicularDistance(p: Point, a: Point, b: Point): number {
  return closestPointOnSegment(p, a, b).dist;
}

/**
 * Douglas-Peucker simplification algorithm for vector contours
 */
export function simplifyDouglasPeucker(points: Point[], tolerance: number): Point[] {
  if (points.length <= 3) return points;

  let maxDist = 0;
  let index = 0;
  const end = points.length - 1;

  for (let i = 1; i < end; i++) {
    const dist = perpendicularDistance(points[i], points[0], points[end]);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > tolerance) {
    const left = simplifyDouglasPeucker(points.slice(0, index + 1), tolerance);
    const right = simplifyDouglasPeucker(points.slice(index), tolerance);
    return left.slice(0, -1).concat(right);
  } else {
    return [points[0], points[end]];
  }
}

/**
 * Chaikin's smoothing algorithm with corner preservation for organic curves (clouds, loops, smooth fills)
 */
export function smoothContourChaikin(
  points: Point[],
  iterations: number = 2,
  cornerAngleDeg: number = 100
): Point[] {
  if (points.length < 3) return points;

  let current = [...points];

  for (let it = 0; it < iterations; it++) {
    const next: Point[] = [];
    const n = current.length;

    for (let i = 0; i < n; i++) {
      const p0 = current[(i - 1 + n) % n];
      const p1 = current[i];
      const p2 = current[(i + 1) % n];

      // Calculate angle between (p0->p1) and (p1->p2) to detect sharp corners
      const v1x = p0.x - p1.x;
      const v1y = p0.y - p1.y;
      const v2x = p2.x - p1.x;
      const v2y = p2.y - p1.y;
      const len1 = Math.hypot(v1x, v1y);
      const len2 = Math.hypot(v2x, v2y);

      let isSharpCorner = false;
      if (len1 > 0.001 && len2 > 0.001) {
        const dot = (v1x * v2x + v1y * v2y) / (len1 * len2);
        const clampedDot = Math.max(-1, Math.min(1, dot));
        const angle = (Math.acos(clampedDot) * 180) / Math.PI;
        if (angle < cornerAngleDeg) {
          isSharpCorner = true;
        }
      }

      if (isSharpCorner) {
        next.push({ x: p1.x, y: p1.y });
      } else {
        // Chaikin cut corners at 25% and 75%
        const qx = 0.75 * p1.x + 0.25 * p2.x;
        const qy = 0.75 * p1.y + 0.25 * p2.y;
        const rx = 0.25 * p1.x + 0.75 * p2.x;
        const ry = 0.25 * p1.y + 0.75 * p2.y;
        next.push({ x: Number(qx.toFixed(2)), y: Number(qy.toFixed(2)) });
        next.push({ x: Number(rx.toFixed(2)), y: Number(ry.toFixed(2)) });
      }
    }
    current = next;
  }

  return current;
}

/**
 * Expands / dilates polygon contour vertices outwards along normal direction
 * so the fill sits neatly under the bounding strokes without white gaps or outer bleeding.
 */
function expandContourOutward(points: Point[], expandDistance: number): Point[] {
  if (points.length < 3 || expandDistance <= 0) return points;

  const n = points.length;
  const result: Point[] = [];

  // Determine polygon winding (shoelace formula)
  let signedArea = 0;
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    signedArea += (p1.x * p2.y - p2.x * p1.y);
  }
  const isClockwise = signedArea > 0;

  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n];
    const curr = points[i];
    const next = points[(i + 1) % n];

    // Edge vectors
    const e1x = curr.x - prev.x;
    const e1y = curr.y - prev.y;
    const e2x = next.x - curr.x;
    const e2y = next.y - curr.y;

    const l1 = Math.hypot(e1x, e1y) || 1;
    const l2 = Math.hypot(e2x, e2y) || 1;

    // Normal vectors
    let n1x = isClockwise ? e1y / l1 : -e1y / l1;
    let n1y = isClockwise ? -e1x / l1 : e1x / l1;

    let n2x = isClockwise ? e2y / l2 : -e2y / l2;
    let n2y = isClockwise ? -e2x / l2 : e2x / l2;

    // Combined normal at vertex
    let nx = n1x + n2x;
    let ny = n1y + n2y;
    const nLen = Math.hypot(nx, ny);

    if (nLen > 0.001) {
      nx /= nLen;
      ny /= nLen;
      const miter = Math.min(2.0, 1 / (nLen / 2));
      result.push({
        x: Number((curr.x + nx * expandDistance * miter).toFixed(2)),
        y: Number((curr.y + ny * expandDistance * miter).toFixed(2))
      });
    } else {
      result.push({ ...curr });
    }
  }

  return result;
}

/**
 * Traces exact sub-pixel boundary contour of flood-filled 2D mask using Moore-Neighbor algorithm
 */
function traceMaskContour(
  mask: Uint8Array,
  width: number,
  height: number,
  minX: number,
  minY: number,
  scaleFactor: number
): Point[] {
  let startX = -1, startY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x] === 1) {
        startX = x;
        startY = y;
        break;
      }
    }
    if (startX !== -1) break;
  }

  if (startX === -1) return [];

  // Direction vectors (8-connectivity: R, RD, D, LD, L, LU, U, RU)
  const dx = [1, 1, 0, -1, -1, -1, 0, 1];
  const dy = [0, 1, 1, 1, 0, -1, -1, -1];

  const rawContour: Point[] = [];
  let currX = startX;
  let currY = startY;
  let dir = 0;

  const maxSteps = width * height * 2;
  let steps = 0;

  do {
    rawContour.push({
      x: Number((minX + currX * scaleFactor).toFixed(2)),
      y: Number((minY + currY * scaleFactor).toFixed(2)),
    });

    let foundNext = false;
    const startDir = (dir + 6) % 8;
    for (let i = 0; i < 8; i++) {
      const nextDir = (startDir + i) % 8;
      const nx = currX + dx[nextDir];
      const ny = currY + dy[nextDir];

      if (nx >= 0 && nx < width && ny >= 0 && ny < height && mask[ny * width + nx] === 1) {
        currX = nx;
        currY = ny;
        dir = nextDir;
        foundNext = true;
        break;
      }
    }

    if (!foundNext) break;
    steps++;
  } while ((currX !== startX || currY !== startY) && steps < maxSteps);

  if (rawContour.length < 3) return [];

  // 1. Simplify raw grid steps using Douglas-Peucker (tolerance ~ 0.8 - 1.2 world px)
  const simplified = simplifyDouglasPeucker(rawContour, Math.max(0.8, scaleFactor * 0.8));
  if (simplified.length < 3) return rawContour;

  // 2. Expand slightly outward so the fill tucks under the bounding stroke lines (~1.8px)
  const expanded = expandContourOutward(simplified, 1.8);

  // 3. Smooth curves for clouds, circles, and organic strokes using Chaikin subdivision
  const smoothed = smoothContourChaikin(expanded, 2, 110);

  return smoothed.length >= 3 ? smoothed : simplified;
}

/**
 * Scans all strokes on active layer, detects closed & unclosed shapes with gap detection (5px - 40px),
 * and generates high-accuracy fill candidate regions.
 */
export function scanDrawingShapesAndGaps(
  objects: { [id: string]: VectorObject },
  activeLayerId: string,
  gapTolerance: number = 22
): {
  regions: ScannedShapeRegion[];
  strokeCount: number;
  closedCount: number;
  gapClosedCount: number;
} {
  const layerObjects = Object.values(objects).filter(
    obj => (!obj.layerId || obj.layerId === activeLayerId) && !obj.isHidden
  );

  if (layerObjects.length === 0) {
    return { regions: [], strokeCount: 0, closedCount: 0, gapClosedCount: 0 };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const strokeSegments: { p1: Point; p2: Point; strokeId: string }[] = [];
  const allStrokes: { id: string; points: Point[]; isClosed: boolean }[] = [];

  layerObjects.forEach(obj => {
    const pivot = obj.pivots?.[0] || { localX: 0, localY: 0 };
    const subPaths = (obj.subPaths && obj.subPaths.length > 0)
      ? obj.subPaths
      : (obj.points && obj.points.length > 0 ? [obj.points] : []);

    subPaths.forEach((pts, sIdx) => {
      if (pts.length < 2) return;
      const worldPts = pts.map(p => localToWorld(p, obj.transform, pivot));
      
      const isLoop = worldPts.length > 2 && Math.hypot(worldPts[0].x - worldPts[worldPts.length - 1].x, worldPts[0].y - worldPts[worldPts.length - 1].y) < gapTolerance;
      allStrokes.push({
        id: `${obj.id}_${sIdx}`,
        points: worldPts,
        isClosed: isLoop
      });

      for (let i = 0; i < worldPts.length; i++) {
        const wp = worldPts[i];
        if (wp.x < minX) minX = wp.x;
        if (wp.x > maxX) maxX = wp.x;
        if (wp.y < minY) minY = wp.y;
        if (wp.y > maxY) maxY = wp.y;

        if (i < worldPts.length - 1) {
          strokeSegments.push({
            p1: worldPts[i],
            p2: worldPts[i + 1],
            strokeId: obj.id
          });
        }
      }
    });
  });

  if (minX === Infinity) {
    return { regions: [], strokeCount: 0, closedCount: 0, gapClosedCount: 0 };
  }

  const margin = 40;
  minX -= margin;
  minY -= margin;
  maxX += margin;
  maxY += margin;

  const width = Math.max(100, maxX - minX);
  const height = Math.max(100, maxY - minY);

  const renderScale = Math.min(1.5, 800 / Math.max(width, height));
  const gridW = Math.round(width * renderScale);
  const gridH = Math.round(height * renderScale);

  const canvas = document.createElement('canvas');
  canvas.width = gridW;
  canvas.height = gridH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { regions: [], strokeCount: allStrokes.length, closedCount: 0, gapClosedCount: 0 };

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, gridW, gridH);

  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#000000';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const dilationWidth = Math.max(3.5, gapTolerance * renderScale * 0.75);
  ctx.lineWidth = dilationWidth;

  allStrokes.forEach(s => {
    if (s.points.length < 2) return;
    ctx.beginPath();
    s.points.forEach((p, idx) => {
      const gx = (p.x - minX) * renderScale;
      const gy = (p.y - minY) * renderScale;
      if (idx === 0) ctx.moveTo(gx, gy);
      else ctx.lineTo(gx, gy);
    });
    if (s.isClosed) ctx.closePath();
    ctx.stroke();
  });

  // Bridge small gaps between endpoints and segments (< gapTolerance)
  const endPoints: { p: Point; strokeId: string }[] = [];
  allStrokes.forEach(s => {
    if (s.points.length >= 2) {
      endPoints.push({ p: s.points[0], strokeId: s.id });
      endPoints.push({ p: s.points[s.points.length - 1], strokeId: s.id });
    }
  });

  for (let i = 0; i < endPoints.length; i++) {
    for (let j = i + 1; j < endPoints.length; j++) {
      const d = Math.hypot(endPoints[i].p.x - endPoints[j].p.x, endPoints[i].p.y - endPoints[j].p.y);
      if (d > 0 && d <= gapTolerance) {
        ctx.beginPath();
        ctx.moveTo((endPoints[i].p.x - minX) * renderScale, (endPoints[i].p.y - minY) * renderScale);
        ctx.lineTo((endPoints[j].p.x - minX) * renderScale, (endPoints[j].p.y - minY) * renderScale);
        ctx.stroke();
      }
    }
  }

  const imgData = ctx.getImageData(0, 0, gridW, gridH);
  const data = imgData.data;
  const visited = new Uint8Array(gridW * gridH);

  // Mark border-connected pixels as outer background
  const outerQueue: number[] = [];
  for (let x = 0; x < gridW; x++) {
    outerQueue.push(x, 0);
    outerQueue.push(x, gridH - 1);
  }
  for (let y = 0; y < gridH; y++) {
    outerQueue.push(0, y);
    outerQueue.push(gridW - 1, y);
  }

  let head = 0;
  while (head < outerQueue.length) {
    const cx = outerQueue[head++];
    const cy = outerQueue[head++];
    const idx = cy * gridW + cx;

    if (visited[idx] === 1) continue;
    if (data[idx * 4] < 128) continue;

    visited[idx] = 2;

    const neighbors = [
      [cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]
    ];
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
        const nIdx = ny * gridW + nx;
        if (visited[nIdx] === 0 && data[nIdx * 4] >= 128) {
          visited[nIdx] = 2;
          outerQueue.push(nx, ny);
        }
      }
    }
  }

  const regions: ScannedShapeRegion[] = [];
  let regionIdx = 1;
  let closedCount = 0;
  let gapClosedCount = 0;

  for (let y = 3; y < gridH - 3; y += 3) {
    for (let x = 3; x < gridW - 3; x += 3) {
      const idx = y * gridW + x;
      if (visited[idx] === 0 && data[idx * 4] > 160) {
        const regionMask = new Uint8Array(gridW * gridH);
        const rQueue = [x, y];
        visited[idx] = 1;
        regionMask[idx] = 1;
        let rHead = 0;
        let pixelCount = 0;
        let sumX = 0, sumY = 0;
        let minRX = gridW, minRY = gridH, maxRX = 0, maxRY = 0;

        while (rHead < rQueue.length) {
          const rx = rQueue[rHead++];
          const ry = rQueue[rHead++];
          pixelCount++;
          sumX += rx;
          sumY += ry;
          if (rx < minRX) minRX = rx;
          if (rx > maxRX) maxRX = rx;
          if (ry < minRY) minRY = ry;
          if (ry > maxRY) maxRY = ry;

          const neighbors = [
            [rx + 1, ry], [rx - 1, ry], [rx, ry + 1], [rx, ry - 1]
          ];
          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
              const nIdx = ny * gridW + nx;
              if (visited[nIdx] === 0 && data[nIdx * 4] > 160) {
                visited[nIdx] = 1;
                regionMask[nIdx] = 1;
                rQueue.push(nx, ny);
              }
            }
          }
        }

        if (pixelCount >= 35) {
          const contour = traceMaskContour(regionMask, gridW, gridH, minX, minY, 1 / renderScale);
          if (contour.length >= 3) {
            const centerX = (sumX / pixelCount) / renderScale + minX;
            const centerY = (sumY / pixelCount) / renderScale + minY;

            const isPerfect = allStrokes.some(s => s.isClosed && s.points.some(p => Math.hypot(p.x - centerX, p.y - centerY) < (width / 2)));
            if (isPerfect) closedCount++;
            else gapClosedCount++;

            regions.push({
              id: `scanned_region_${regionIdx}_${Date.now()}`,
              name: isPerfect ? `Closed Shape #${regionIdx}` : `Gap-Closed Shape #${regionIdx}`,
              center: { x: Number(centerX.toFixed(2)), y: Number(centerY.toFixed(2)) },
              contour,
              isClosed: isPerfect,
              gapDistance: isPerfect ? 0 : gapTolerance,
              area: Math.round(pixelCount / (renderScale * renderScale)),
              strokeIds: layerObjects.map(o => o.id),
              bounds: {
                minX: minRX / renderScale + minX,
                minY: minRY / renderScale + minY,
                maxX: maxRX / renderScale + minX,
                maxY: maxRY / renderScale + minY,
                width: (maxRX - minRX) / renderScale,
                height: (maxRY - minRY) / renderScale
              }
            });
            regionIdx++;
          }
        }
      }
    }
  }

  return {
    regions,
    strokeCount: allStrokes.length,
    closedCount,
    gapClosedCount
  };
}

/**
 * Internal single-pass flood-fill rasterizer that tests a given gap-closure distance
 */
function tryFloodFillWithGap(
  clickCoords: Point,
  strokeList: { points: Point[]; strokeWidth: number; strokeColor: string }[],
  sampleMinX: number,
  sampleMinY: number,
  sampleMaxX: number,
  sampleMaxY: number,
  gapClosurePx: number
): Point[] | null {
  const worldW = Math.max(120, sampleMaxX - sampleMinX);
  const worldH = Math.max(120, sampleMaxY - sampleMinY);

  const maxDimension = 900;
  const renderScale = Math.min(2.0, maxDimension / Math.max(worldW, worldH));
  const gridW = Math.round(worldW * renderScale);
  const gridH = Math.round(worldH * renderScale);

  const canvas = document.createElement('canvas');
  canvas.width = gridW;
  canvas.height = gridH;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, gridW, gridH);

  ctx.strokeStyle = '#000000';
  ctx.fillStyle = '#000000';
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const endPoints: { p: Point; strokeIdx: number; isStart: boolean }[] = [];
  const allSegments: { p1: Point; p2: Point; strokeIdx: number }[] = [];

  // Draw strokes onto raster canvas
  strokeList.forEach((s, sIdx) => {
    if (s.points.length < 2) return;
    const baseW = Math.max(2.5, s.strokeWidth * renderScale);
    ctx.lineWidth = baseW;
    ctx.beginPath();
    s.points.forEach((p, idx) => {
      const gx = (p.x - sampleMinX) * renderScale;
      const gy = (p.y - sampleMinY) * renderScale;
      if (idx === 0) ctx.moveTo(gx, gy);
      else ctx.lineTo(gx, gy);
    });
    ctx.stroke();

    endPoints.push({ p: s.points[0], strokeIdx: sIdx, isStart: true });
    endPoints.push({ p: s.points[s.points.length - 1], strokeIdx: sIdx, isStart: false });

    for (let i = 0; i < s.points.length - 1; i++) {
      allSegments.push({ p1: s.points[i], p2: s.points[i + 1], strokeIdx: sIdx });
    }
  });

  //  ACCURATE GAP CLOSING:
  // 1) Bridge gaps between stroke endpoints near each other (near 5px - gapClosurePx)
  // 2) Bridge gaps between an endpoint and a nearby segment of another stroke (T-junctions or near-touching curves)
  if (gapClosurePx > 0) {
    const bridgeW = Math.max(3.0, (gapClosurePx * renderScale * 0.75));
    ctx.lineWidth = bridgeW;

    // 1. Endpoint to Endpoint bridge
    for (let i = 0; i < endPoints.length; i++) {
      for (let j = i + 1; j < endPoints.length; j++) {
        const ep1 = endPoints[i];
        const ep2 = endPoints[j];
        if (ep1.strokeIdx === ep2.strokeIdx && ep1.isStart !== ep2.isStart && strokeList[ep1.strokeIdx].points.length < 4) {
          // Skip closing extremely short single stroke line unless intended
          continue;
        }
        const d = Math.hypot(ep1.p.x - ep2.p.x, ep1.p.y - ep2.p.y);
        if (d > 0.1 && d <= gapClosurePx) {
          ctx.beginPath();
          ctx.moveTo((ep1.p.x - sampleMinX) * renderScale, (ep1.p.y - sampleMinY) * renderScale);
          ctx.lineTo((ep2.p.x - sampleMinX) * renderScale, (ep2.p.y - sampleMinY) * renderScale);
          ctx.stroke();
        }
      }
    }

    // 2. Endpoint to Segment bridge (for strokes that terminate near another stroke's curve / body)
    for (let i = 0; i < endPoints.length; i++) {
      const ep = endPoints[i];
      for (let j = 0; j < allSegments.length; j++) {
        const seg = allSegments[j];
        if (seg.strokeIdx === ep.strokeIdx) continue; // Don't bridge to own adjacent segment
        const { q, dist } = closestPointOnSegment(ep.p, seg.p1, seg.p2);
        if (dist > 0.1 && dist <= gapClosurePx) {
          ctx.beginPath();
          ctx.moveTo((ep.p.x - sampleMinX) * renderScale, (ep.p.y - sampleMinY) * renderScale);
          ctx.lineTo((q.x - sampleMinX) * renderScale, (q.y - sampleMinY) * renderScale);
          ctx.stroke();
        }
      }
    }
  }

  const imgData = ctx.getImageData(0, 0, gridW, gridH);
  const data = imgData.data;

  let startX = Math.round((clickCoords.x - sampleMinX) * renderScale);
  let startY = Math.round((clickCoords.y - sampleMinY) * renderScale);

  if (startX < 3 || startX >= gridW - 3 || startY < 3 || startY >= gridH - 3) {
    return null;
  }

  // If clicked directly on top of a dark stroke pixel, search nearby for adjacent interior space
  const initialIdx = (startY * gridW + startX) * 4;
  if (data[initialIdx] < 120) {
    let foundWhite = false;
    const searchOffsets = [
      [0, 2], [0, -2], [2, 0], [-2, 0],
      [2, 2], [-2, -2], [2, -2], [-2, 2],
      [0, 4], [0, -4], [4, 0], [-4, 0],
      [4, 4], [-4, -4], [4, -4], [-4, 4],
      [0, 6], [0, -6], [6, 0], [-6, 0]
    ];
    for (const [ox, oy] of searchOffsets) {
      const sx = startX + ox;
      const sy = startY + oy;
      if (sx >= 3 && sx < gridW - 3 && sy >= 3 && sy < gridH - 3) {
        if (data[(sy * gridW + sx) * 4] > 180) {
          startX = sx;
          startY = sy;
          foundWhite = true;
          break;
        }
      }
    }
    if (!foundWhite) return null;
  }

  // Perform 8-directional Flood Fill to find enclosed partition mask
  const mask = new Uint8Array(gridW * gridH);
  const queue: number[] = [startX, startY];
  mask[startY * gridW + startX] = 1;

  let isBoundaryTouch = false;
  let filledCount = 0;
  const maxPixels = gridW * gridH * 0.92;

  const dx = [1, -1, 0, 0, 1, -1, 1, -1];
  const dy = [0, 0, 1, -1, 1, -1, -1, 1];

  let head = 0;
  while (head < queue.length) {
    const cx = queue[head++];
    const cy = queue[head++];
    filledCount++;

    if (filledCount > maxPixels) {
      isBoundaryTouch = true;
      break;
    }

    if (cx <= 1 || cx >= gridW - 2 || cy <= 1 || cy >= gridH - 2) {
      isBoundaryTouch = true;
      break;
    }

    for (let i = 0; i < 8; i++) {
      const nx = cx + dx[i];
      const ny = cy + dy[i];

      if (nx >= 0 && nx < gridW && ny >= 0 && ny < gridH) {
        const mIdx = ny * gridW + nx;
        if (mask[mIdx] === 0) {
          const pIdx = mIdx * 4;
          if (data[pIdx] > 160) {
            mask[mIdx] = 1;
            queue.push(nx, ny);
          }
        }
      }
    }
  }

  if (isBoundaryTouch || filledCount < 16) {
    return null;
  }

  return traceMaskContour(mask, gridW, gridH, sampleMinX, sampleMinY, 1 / renderScale);
}

export interface SmartFillResult {
  targetObjectId: string;
  updatedObject: VectorObject;
}

/**
 * HIGH-ACCURACY ENCLOSED REGION COLORING ENGINE:
 * - Accurately finds and fills the exact area bounded by overlapping strokes and multiple different drawings.
 * - Bridges unclosed gaps near 5px - 20px (endpoints wanting to close, T-junctions, near-intersecting strokes).
 * - Generates high-quality, silky-smooth vector contours with curvature smoothing and zero jagged pixelation.
 * - Embeds the fill directly inside the target drawing object in its local coordinate space so it moves/rotates/scales together and never detaches!
 */
export function performSmartFloodFill(
  clickCoords: Point,
  objects: { [id: string]: VectorObject },
  activeLayerId: string,
  fillColor: string,
  initialGapClosurePx: number = 8
): SmartFillResult | null {
  try {
    // Gather all visible objects (supports multiple drawings across canvas / layers)
    const layerObjects = Object.values(objects).filter(
      obj => (!obj.layerId || obj.layerId === activeLayerId || true) && !obj.isHidden && obj.type !== '360_container'
    );

    if (layerObjects.length === 0) return null;

    let hasStrokesNearClick = false;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    const strokeList: { points: Point[]; strokeWidth: number; strokeColor: string; drawingId: string }[] = [];

    layerObjects.forEach(obj => {
      const pivot = obj.pivots?.[0] || { localX: 0, localY: 0 };
      const subPaths = (obj.subPaths && obj.subPaths.length > 0)
        ? obj.subPaths
        : (obj.points && obj.points.length > 0 ? [obj.points] : []);

      const sw = Math.max(1.5, obj.strokeWidth || 3.0);

      subPaths.forEach(pts => {
        if (pts.length < 2) return;
        const worldPts = pts.map(p => localToWorld(p, obj.transform, pivot));
        strokeList.push({
          points: worldPts,
          strokeWidth: sw,
          strokeColor: obj.strokeColor || '#000000',
          drawingId: obj.id
        });

        for (let i = 0; i < worldPts.length; i++) {
          const wp = worldPts[i];
          if (wp.x < minX) minX = wp.x;
          if (wp.x > maxX) maxX = wp.x;
          if (wp.y < minY) minY = wp.y;
          if (wp.y > maxY) maxY = wp.y;

          if (Math.hypot(wp.x - clickCoords.x, wp.y - clickCoords.y) < 700) {
            hasStrokesNearClick = true;
          }
        }
      });
    });

    if (!hasStrokesNearClick || minX === Infinity) return null;

    const boxRadius = 650;
    const sampleMinX = Math.max(minX - 40, clickCoords.x - boxRadius);
    const sampleMinY = Math.max(minY - 40, clickCoords.y - boxRadius);
    const sampleMaxX = Math.min(maxX + 40, clickCoords.x + boxRadius);
    const sampleMaxY = Math.min(maxY + 40, clickCoords.y + boxRadius);

    // Multi-pass gap closure: Try tight gap first (e.g. 6px), then 14px, then 22px
    // This allows exact filling of perfectly closed strokes, near 5px gaps wanting to close, and wider sketchy overlaps
    const gapPasses = [
      Math.max(4, initialGapClosurePx),
      Math.max(12, initialGapClosurePx + 6),
      Math.max(20, initialGapClosurePx + 14)
    ];

    let contour: Point[] | null = null;
    for (const gapPx of gapPasses) {
      contour = tryFloodFillWithGap(
        clickCoords,
        strokeList,
        sampleMinX,
        sampleMinY,
        sampleMaxX,
        sampleMaxY,
        gapPx
      );
      if (contour && contour.length >= 3) {
        break;
      }
    }

    if (!contour || contour.length < 3) return null;

    // Find the drawing whose strokes are closest to or enclose the click and contour
    let bestDrawingId: string | null = null;
    let minDistance = Infinity;

    for (const obj of layerObjects) {
      const pivot = obj.pivots?.[0] || { localX: 0, localY: 0 };
      const subPaths = (obj.subPaths && obj.subPaths.length > 0)
        ? obj.subPaths
        : (obj.points && obj.points.length > 0 ? [obj.points] : []);

      let isInside = false;
      let objMinDist = Infinity;

      for (const pts of subPaths) {
        if (pts.length < 2) continue;
        const worldPts = pts.map(p => localToWorld(p, obj.transform, pivot));
        if (worldPts.length >= 3 && isPointInPolygon(clickCoords, worldPts)) {
          isInside = true;
          objMinDist = 0;
          break;
        }
        for (let i = 0; i < worldPts.length; i++) {
          const d = Math.hypot(worldPts[i].x - clickCoords.x, worldPts[i].y - clickCoords.y);
          if (d < objMinDist) objMinDist = d;
        }
      }

      if (isInside) {
        bestDrawingId = obj.id;
        break;
      }

      if (objMinDist < minDistance) {
        minDistance = objMinDist;
        bestDrawingId = obj.id;
      }
    }

    if (!bestDrawingId || !objects[bestDrawingId]) {
      bestDrawingId = layerObjects[layerObjects.length - 1]?.id;
    }

    if (!bestDrawingId || !objects[bestDrawingId]) return null;

    const targetObj = objects[bestDrawingId];
    const pivot = targetObj.pivots?.[0] || { localX: 0, localY: 0 };
    const localContour = contour.map(wp => worldToLocal(wp, targetObj.transform, pivot));

    // Embedded fill inside the target object
    const existingLassoFills = targetObj.lassoFills || [];
    const localClick = worldToLocal(clickCoords, targetObj.transform, pivot);
    const filteredLassoFills = existingLassoFills.filter(f => !isPointInPolygon(localClick, f.localLassoPoints));

    const updatedObject: VectorObject = {
      ...targetObj,
      fillColor: fillColor,
      autoFillInnerRegion: true,
      gapFillExpansion: 4,
      lassoFills: [
        ...filteredLassoFills,
        { localLassoPoints: localContour, color: fillColor }
      ]
    };

    return {
      targetObjectId: targetObj.id,
      updatedObject
    };
  } catch (e) {
    console.error('performSmartFloodFill error:', e);
    return null;
  }
}
