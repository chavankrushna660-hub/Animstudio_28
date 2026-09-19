import { Point, VectorObject } from '../types';
import { distance, isPointInPolygon, rotatePoint } from './math';

export interface MWPExtrudePoint {
  id: string;
  x: number;
  y: number;
  localX: number;
  localY: number;
  captureRadius: number; // capture area in px (10 to 300)
  dragOffsetX: number;
  dragOffsetY: number;
  falloffMode?: 'smooth' | 'sharp' | 'linear';
}

export interface MWPTransformPoint {
  id: string;
  x: number;
  y: number;
  localX: number;
  localY: number;
  originalX?: number;
  originalY?: number;
}

export interface MeshWarpPuppetState {
  activeMode: 'extrude' | 'transform';
  isDeleteMode: boolean; // Click any point to delete it
  captureRadius: number; // default 50
  defaultCaptureRadius?: number;
  extrudePoints: MWPExtrudePoint[];
  selectedExtrudePointId: string | null;
  extrudeCustomColor: string;
  extrudeStrokeColor: string;
  extrudeStrokeWidth: number;
  
  transformPoints: MWPTransformPoint[];
  selectedTransformPointId: string | null;
  
  // Draggable HUD Box
  hudBoxPosition: { x: number; y: number };
  hudTransformProperty: 'rotate' | 'scale' | 'height' | 'width' | 'skew' | 'move';
  hudIncrementValue: number; // 0 to 200
  hudDecrementValue: number; // 0 to 200
  hudAxis: 'x' | 'y' | 'z' | 'all';
}

export const initialMWPState: MeshWarpPuppetState = {
  activeMode: 'extrude',
  isDeleteMode: false,
  captureRadius: 50,
  defaultCaptureRadius: 80,
  extrudePoints: [],
  selectedExtrudePointId: null,
  extrudeCustomColor: '#f59e0b',
  extrudeStrokeColor: '#d97706',
  extrudeStrokeWidth: 3,
  transformPoints: [],
  selectedTransformPointId: null,
  hudBoxPosition: { x: 320, y: 140 },
  hudTransformProperty: 'rotate',
  hudIncrementValue: 0,
  hudDecrementValue: 0,
  hudAxis: 'all'
};

export const getPtCoordX = (p: { x?: number; localX?: number }): number => {
  if (p.localX !== undefined && !isNaN(p.localX)) return p.localX;
  if (p.x !== undefined && !isNaN(p.x)) return p.x;
  return 0;
};

export const getPtCoordY = (p: { y?: number; localY?: number }): number => {
  if (p.localY !== undefined && !isNaN(p.localY)) return p.localY;
  if (p.y !== undefined && !isNaN(p.y)) return p.y;
  return 0;
};

export function projectPointOnSegment(p: Point, a: Point, b: Point): Point {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return { x: a.x, y: a.y };
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) };
}

/**
 * Finds the closest point or segment on the target object's stroke or fill geometry.
 * Ensures newly placed points snap and bind directly to the drawing geometry rather than floating in empty space.
 */
export function findClosestPointOnObject(
  localClick: { x: number; y: number },
  points: Point[],
  subPaths?: Point[][]
): { x: number; y: number; distance: number; pointIndex?: number; subPathIndex?: number } | null {
  let closest = { x: localClick.x, y: localClick.y, distance: Infinity, pointIndex: -1, subPathIndex: -1 };

  if (points && points.length > 0) {
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const d = distance(localClick, p1);
      if (d < closest.distance) {
        closest = { x: p1.x, y: p1.y, distance: d, pointIndex: i, subPathIndex: -1 };
      }

      if (points.length > 1) {
        const p2 = points[(i + 1) % points.length];
        const segPt = projectPointOnSegment(localClick, p1, p2);
        const segDist = distance(localClick, segPt);
        if (segDist < closest.distance) {
          closest = { x: segPt.x, y: segPt.y, distance: segDist, pointIndex: i, subPathIndex: -1 };
        }
      }
    }
  }

  if (subPaths && subPaths.length > 0) {
    for (let spIdx = 0; spIdx < subPaths.length; spIdx++) {
      const sub = subPaths[spIdx];
      if (!sub || sub.length === 0) continue;
      for (let i = 0; i < sub.length; i++) {
        const p1 = sub[i];
        const d = distance(localClick, p1);
        if (d < closest.distance) {
          closest = { x: p1.x, y: p1.y, distance: d, pointIndex: i, subPathIndex: spIdx };
        }
        if (sub.length > 1) {
          const p2 = sub[(i + 1) % sub.length];
          const segPt = projectPointOnSegment(localClick, p1, p2);
          const segDist = distance(localClick, segPt);
          if (segDist < closest.distance) {
            closest = { x: segPt.x, y: segPt.y, distance: segDist, pointIndex: i, subPathIndex: spIdx };
          }
        }
      }
    }
  }

  return closest.distance < Infinity ? closest : null;
}

/**
 * Returns the deformed position of any local coordinate (such as a placed point handle)
 * according to all currently active extrude points.
 * Ensures the handle travels perfectly in real-time with the stroke when other parts are pulled/pushed.
 */
export function getDeformedLocalPoint(
  localCoord: { x: number; y: number },
  extrudePoints: MWPExtrudePoint[]
): { x: number; y: number } {
  if (!extrudePoints || extrudePoints.length === 0) {
    return { x: localCoord.x, y: localCoord.y };
  }

  let totalWeight = 0;
  let weightedDx = 0;
  let weightedDy = 0;
  let maxFactor = 0;

  for (const ep of extrudePoints) {
    const cx = getPtCoordX(ep);
    const cy = getPtCoordY(ep);
    const captureRadius = ep.captureRadius || 80;
    const dragOffsetX = ep.dragOffsetX || 0;
    const dragOffsetY = ep.dragOffsetY || 0;

    const dx = localCoord.x - cx;
    const dy = localCoord.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < captureRadius) {
      const normDist = dist / captureRadius;
      let factor = Math.pow(1 - normDist * normDist, 2);
      if (ep.falloffMode === 'sharp') {
        factor = Math.pow(1 - normDist, 3);
      } else if (ep.falloffMode === 'linear') {
        factor = 1 - normDist;
      }

      if (factor > maxFactor) {
        maxFactor = factor;
      }

      const w = factor / (dist + 0.5);
      totalWeight += w;
      weightedDx += dragOffsetX * w;
      weightedDy += dragOffsetY * w;
    }
  }

  if (totalWeight <= 0 || maxFactor <= 0) {
    return { x: localCoord.x, y: localCoord.y };
  }

  const blendDx = (weightedDx / totalWeight) * maxFactor;
  const blendDy = (weightedDy / totalWeight) * maxFactor;

  return {
    x: Number((localCoord.x + blendDx).toFixed(2)),
    y: Number((localCoord.y + blendDy).toFixed(2))
  };
}

/**
 * FULL MULTI-POINT STRICT EXTRUSION / PUPPET ENGINE:
 * - Simultaneous multi-point support: All placed points contribute simultaneously.
 * - Exact binding: Vertices near a point move 1:1 with that point's drag offset.
 * - Anchor points: Points with 0 drag offset anchor and lock their local regions in place.
 * - Outside boundary: Vertices outside all point influence radii remain 100% frozen in original coordinates.
 */
export function applyStrictExtrude(
  originalPoints: Point[],
  extrudePoints: MWPExtrudePoint[],
  activePointId?: string | null
): Point[] {
  if (!originalPoints || originalPoints.length === 0) return [];
  if (!extrudePoints || extrudePoints.length === 0) return originalPoints.map(p => ({ ...p }));

  const hasAnyMoved = extrudePoints.some(ep => (ep.dragOffsetX !== 0 || ep.dragOffsetY !== 0));
  if (!hasAnyMoved) {
    return originalPoints.map(p => ({ ...p }));
  }

  return originalPoints.map(p => {
    if (isNaN(p.x) || isNaN(p.y)) return { ...p, x: 0, y: 0 };

    let totalWeight = 0;
    let weightedDx = 0;
    let weightedDy = 0;
    let maxFactor = 0;

    for (const ep of extrudePoints) {
      const cx = getPtCoordX(ep);
      const cy = getPtCoordY(ep);
      const captureRadius = ep.captureRadius || 80;
      const dragOffsetX = ep.dragOffsetX || 0;
      const dragOffsetY = ep.dragOffsetY || 0;

      const dx = p.x - cx;
      const dy = p.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < captureRadius) {
        const normDist = dist / captureRadius;
        let factor = Math.pow(1 - normDist * normDist, 2);
        if (ep.falloffMode === 'sharp') {
          factor = Math.pow(1 - normDist, 3);
        } else if (ep.falloffMode === 'linear') {
          factor = 1 - normDist;
        }

        if (factor > maxFactor) {
          maxFactor = factor;
        }

        // Inverse-distance weighting with smooth epsilon so near-zero distance yields exact 1:1 displacement
        const w = factor / (dist + 0.5);
        totalWeight += w;
        weightedDx += dragOffsetX * w;
        weightedDy += dragOffsetY * w;
      }
    }

    if (totalWeight <= 0 || maxFactor <= 0) {
      return { ...p };
    }

    const blendDx = (weightedDx / totalWeight) * maxFactor;
    const blendDy = (weightedDy / totalWeight) * maxFactor;

    const nx = p.x + blendDx;
    const ny = p.y + blendDy;

    return {
      ...p,
      x: isNaN(nx) ? p.x : Number(nx.toFixed(2)),
      y: isNaN(ny) ? p.y : Number(ny.toFixed(2))
    };
  });
}

/**
 * Deforms both main points and all subpaths of an object using all active MWP points.
 */
export function applyStrictExtrudeToObject(
  originalPoints: Point[],
  originalSubPaths: Point[][] | undefined,
  extrudePoints: MWPExtrudePoint[]
): { points: Point[]; subPaths?: Point[][] } {
  const newPoints = applyStrictExtrude(originalPoints, extrudePoints);
  const newSubPaths = originalSubPaths
    ? originalSubPaths.map(sub => applyStrictExtrude(sub, extrudePoints))
    : undefined;
  return {
    points: newPoints,
    ...(newSubPaths ? { subPaths: newSubPaths } : {})
  };
}

/**
 * Subdivide and insert high-density smooth points inside the extrusion zone so dragged strokes
 * never break, fragment, or pinch awkwardly.
 */
export function resampleExtrusionArea(
  points: Point[],
  center: { x: number; y: number },
  radius: number
): Point[] {
  if (!points || points.length < 2) return points ? [...points] : [];
  const result: Point[] = [];
  const radSq = (radius * 1.3) * (radius * 1.3);

  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    result.push({ ...current });

    const distCurSq = (current.x - center.x) ** 2 + (current.y - center.y) ** 2;
    const distNextSq = (next.x - center.x) ** 2 + (next.y - center.y) ** 2;

    if (distCurSq < radSq || distNextSq < radSq) {
      const segDist = distance(current, next);
      if (segDist > 8) {
        const steps = Math.min(10, Math.floor(segDist / 6));
        for (let s = 1; s < steps; s++) {
          const t = s / steps;
          result.push({
            x: Number((current.x + (next.x - current.x) * t).toFixed(2)),
            y: Number((current.y + (next.y - current.y) * t).toFixed(2)),
            color: current.color,
            thickness: current.thickness
          });
        }
      }
    }
  }

  return result;
}

export function resampleExtrusionAreaSubPaths(
  subPaths: Point[][] | undefined,
  center: { x: number; y: number },
  radius: number
): Point[][] | undefined {
  if (!subPaths || subPaths.length === 0) return undefined;
  return subPaths.map(sub => resampleExtrusionArea(sub, center, radius));
}

/**
 * STRICT Transform Engine:
 * When transform points are placed, only the inner bounded region or the placed points
 * are transformed according to the HUD settings. Outside boundary remains 100% stable.
 */
export function applyStrictTransformByPoints(
  originalPoints: Point[],
  transformPoints: MWPTransformPoint[],
  property: 'rotate' | 'scale' | 'height' | 'width' | 'skew' | 'move',
  netValue: number, // (increment - decrement)
  axis: 'x' | 'y' | 'z' | 'all'
): Point[] {
  if (!originalPoints || originalPoints.length === 0) return [];
  if (!transformPoints || transformPoints.length === 0 || netValue === 0) {
    return originalPoints.map(p => ({ ...p }));
  }

  // Calculate center of transform points
  const count = transformPoints.length;
  let sumX = 0, sumY = 0;
  for (const tp of transformPoints) {
    sumX += getPtCoordX(tp);
    sumY += getPtCoordY(tp);
  }
  const center = { x: sumX / count, y: sumY / count };
  if (isNaN(center.x) || isNaN(center.y)) {
    return originalPoints.map(p => ({ ...p }));
  }

  // Determine boundary / influence zone
  const isPolygonMode = count >= 3;
  const polyPoints = isPolygonMode ? transformPoints.map(tp => ({ x: getPtCoordX(tp), y: getPtCoordY(tp) })) : [];

  // For 2 points, determine span line and perpendicular threshold
  let twoPointRadius = 60;
  if (count === 2) {
    const pt0 = { x: getPtCoordX(transformPoints[0]), y: getPtCoordY(transformPoints[0]) };
    const pt1 = { x: getPtCoordX(transformPoints[1]), y: getPtCoordY(transformPoints[1]) };
    twoPointRadius = Math.max(40, distance(pt0, pt1) * 0.65);
  } else if (count === 1) {
    twoPointRadius = 70;
  }

  return originalPoints.map(p => {
    if (isNaN(p.x) || isNaN(p.y)) return { ...p, x: 0, y: 0 };
    let isInside = false;
    let influenceWeight = 1.0;

    if (isPolygonMode) {
      isInside = isPointInPolygon(p, polyPoints);
      if (!isInside) {
        // Check if very close to polygon edge
        let minDist = Infinity;
        for (let i = 0; i < polyPoints.length; i++) {
          const p1 = polyPoints[i];
          const p2 = polyPoints[(i + 1) % polyPoints.length];
          const d = distanceToSegment(p, p1, p2);
          if (d < minDist) minDist = d;
        }
        if (minDist < 15) {
          isInside = true;
          influenceWeight = Math.max(0, 1 - minDist / 15);
        }
      }
    } else if (count === 2) {
      const pt0 = { x: getPtCoordX(transformPoints[0]), y: getPtCoordY(transformPoints[0]) };
      const pt1 = { x: getPtCoordX(transformPoints[1]), y: getPtCoordY(transformPoints[1]) };
      const d = distanceToSegment(p, pt0, pt1);
      if (d <= twoPointRadius) {
        isInside = true;
        influenceWeight = Math.pow(1 - d / twoPointRadius, 2);
      }
    } else {
      // 1 point
      const pt0 = { x: getPtCoordX(transformPoints[0]), y: getPtCoordY(transformPoints[0]) };
      const d = distance(p, pt0);
      if (d <= twoPointRadius) {
        isInside = true;
        influenceWeight = Math.pow(1 - d / twoPointRadius, 2);
      }
    }

    // STRICT: Outside points remain 100% frozen as-is
    if (!isInside || influenceWeight <= 0) {
      return { ...p };
    }

    let tx = p.x;
    let ty = p.y;

    const relX = p.x - center.x;
    const relY = p.y - center.y;

    switch (property) {
      case 'rotate': {
        const angleDeg = (netValue * 0.9) * influenceWeight;
        const angleRad = (angleDeg * Math.PI) / 180;
        const cos = Math.cos(angleRad);
        const sin = Math.sin(angleRad);
        tx = center.x + (relX * cos - relY * sin);
        ty = center.y + (relX * sin + relY * cos);
        break;
      }
      case 'scale': {
        const factor = 1 + (netValue / 100) * influenceWeight;
        const safeFactor = Math.max(0.05, factor);
        if (axis === 'x') {
          tx = center.x + relX * safeFactor;
        } else if (axis === 'y') {
          ty = center.y + relY * safeFactor;
        } else {
          tx = center.x + relX * safeFactor;
          ty = center.y + relY * safeFactor;
        }
        break;
      }
      case 'height': {
        const factor = 1 + (netValue / 100) * influenceWeight;
        const safeFactor = Math.max(0.05, factor);
        ty = center.y + relY * safeFactor;
        break;
      }
      case 'width': {
        const factor = 1 + (netValue / 100) * influenceWeight;
        const safeFactor = Math.max(0.05, factor);
        tx = center.x + relX * safeFactor;
        break;
      }
      case 'skew': {
        const skewFactor = (netValue / 150) * influenceWeight;
        if (axis === 'y') {
          ty = p.y + relX * skewFactor;
        } else {
          tx = p.x + relY * skewFactor;
        }
        break;
      }
      case 'move': {
        const shift = netValue * influenceWeight;
        if (axis === 'x') {
          tx = p.x + shift;
        } else if (axis === 'y') {
          ty = p.y + shift;
        } else {
          tx = p.x + shift;
          ty = p.y + shift;
        }
        break;
      }
    }

    return {
      ...p,
      x: isNaN(tx) ? p.x : tx,
      y: isNaN(ty) ? p.y : ty
    };
  });
}

function distanceToSegment(p: Point, a: Point, b: Point): number {
  const l2 = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  if (l2 === 0) return distance(p, a);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return distance(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}
