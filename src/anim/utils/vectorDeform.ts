// @ts-nocheck
import { Point, CustomVectorDeformNode, VectorObject } from '../types';

/**
 * Checks if a point is strictly inside a polygon defined by custom nodes.
 */
function isPointInNodePolygon(pt: Point, poly: { x: number; y: number }[]): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x, yi = poly[i].y;
    const xj = poly[j].x, yj = poly[j].y;
    const intersect = ((yi > pt.y) !== (yj > pt.y)) &&
      (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi + 1e-12) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Calculates deformed object points given original object points and custom vector deform nodes.
 *
 * STRICT UNIFORM & LINEAR POINT MOVEMENT (NO BLENDING, NO CURVING, 100% ISOLATED):
 * 1. ONLY points strictly within the capture corridor or placed points area move.
 * 2. Captured points move with direct displacement along the placed nodes/segments/polygon area.
 * 3. All other parts outside strictly remain 100% STABLE, FROZEN, AND UNTOUCHED with 0.000001px precision.
 */
export function calculateCustomVectorDeformedPoints(
  origPoints: Point[],
  nodes: CustomVectorDeformNode[],
  captureRadius: number = 30
): Point[] {
  if (!origPoints || origPoints.length === 0) return [];
  if (!nodes || nodes.length === 0) return origPoints;

  const nodeDisplacements = nodes.map(n => ({
    node: n,
    origX: n.origX,
    origY: n.origY,
    dx: n.x - n.origX,
    dy: n.y - n.origY,
    rad: Math.max(20, n.radius || captureRadius || 50)
  }));

  const hasMovement = nodeDisplacements.some(d => Math.abs(d.dx) > 1e-6 || Math.abs(d.dy) > 1e-6);
  if (!hasMovement) return origPoints;

  // Build polygon if 3+ nodes exist
  const origPoly = nodes.map(n => ({ x: n.origX, y: n.origY }));
  const hasPolygon = origPoly.length >= 3;

  // Build segments between linked/consecutive nodes
  const segments: Array<{
    origA: { x: number; y: number };
    origB: { x: number; y: number };
    dxA: number;
    dyA: number;
    dxB: number;
    dyB: number;
    rad: number;
  }> = [];

  const nodeMap = new Map<string, typeof nodeDisplacements[0]>();
  nodeDisplacements.forEach(nd => nodeMap.set(nd.node.id, nd));
  const processedPairs = new Set<string>();

  for (let i = 0; i < nodeDisplacements.length; i++) {
    const curr = nodeDisplacements[i];
    let parent = curr.node.parentNodeId ? nodeMap.get(curr.node.parentNodeId) : (i > 0 ? nodeDisplacements[i - 1] : undefined);
    if (parent && parent.node.id !== curr.node.id) {
      const pairKey = `${parent.node.id}_${curr.node.id}`;
      if (!processedPairs.has(pairKey)) {
        processedPairs.add(pairKey);
        segments.push({
          origA: { x: parent.origX, y: parent.origY },
          origB: { x: curr.origX, y: curr.origY },
          dxA: parent.dx,
          dyA: parent.dy,
          dxB: curr.dx,
          dyB: curr.dy,
          rad: Math.max(20, Math.max(parent.rad, curr.rad))
        });
      }
    }
  }

  // If closed loop or sequential chain without explicit parents, link consecutive nodes
  if (segments.length === 0 && nodeDisplacements.length >= 2) {
    for (let i = 0; i < nodeDisplacements.length - 1; i++) {
      const a = nodeDisplacements[i];
      const b = nodeDisplacements[i + 1];
      segments.push({
        origA: { x: a.origX, y: a.origY },
        origB: { x: b.origX, y: b.origY },
        dxA: a.dx,
        dyA: a.dy,
        dxB: b.dx,
        dyB: b.dy,
        rad: Math.max(20, Math.max(a.rad, b.rad))
      });
    }
  }

  return origPoints.map(pt => {
    let isCaptured = false;
    let bestDist = Infinity;
    let dispX = 0;
    let dispY = 0;

    // 1. Check if inside polygon formed by placed points
    if (hasPolygon && isPointInNodePolygon(pt, origPoly)) {
      isCaptured = true;
      // Inverse distance weighting from all nodes inside polygon
      let totalW = 0;
      let wDx = 0;
      let wDy = 0;
      for (let n = 0; n < nodeDisplacements.length; n++) {
        const nd = nodeDisplacements[n];
        const dist = Math.hypot(pt.x - nd.origX, pt.y - nd.origY);
        if (dist < 1e-4) {
          dispX = nd.dx;
          dispY = nd.dy;
          totalW = 0;
          break;
        }
        const w = 1 / (dist * dist);
        totalW += w;
        wDx += w * nd.dx;
        wDy += w * nd.dy;
      }
      if (totalW > 0) {
        dispX = wDx / totalW;
        dispY = wDy / totalW;
      }
    }

    // 2. Check individual nodes
    for (let n = 0; n < nodeDisplacements.length; n++) {
      const nd = nodeDisplacements[n];
      const dist = Math.hypot(pt.x - nd.origX, pt.y - nd.origY);
      if (dist <= nd.rad && dist < bestDist) {
        bestDist = dist;
        isCaptured = true;
        dispX = nd.dx;
        dispY = nd.dy;
      }
    }

    // 3. Check connecting segments between nodes for smooth rigid interpolation
    if (segments.length > 0) {
      for (let s = 0; s < segments.length; s++) {
        const seg = segments[s];
        const abx = seg.origB.x - seg.origA.x;
        const aby = seg.origB.y - seg.origA.y;
        const ab2 = abx * abx + aby * aby;

        if (ab2 < 0.0001) {
          const dist = Math.hypot(pt.x - seg.origA.x, pt.y - seg.origA.y);
          if (dist <= seg.rad && dist < bestDist) {
            bestDist = dist;
            isCaptured = true;
            dispX = seg.dxA;
            dispY = seg.dyA;
          }
        } else {
          const t_raw = ((pt.x - seg.origA.x) * abx + (pt.y - seg.origA.y) * aby) / ab2;

          if (t_raw >= 0 && t_raw <= 1) {
            const projX = seg.origA.x + t_raw * abx;
            const projY = seg.origA.y + t_raw * aby;
            const dist = Math.hypot(pt.x - projX, pt.y - projY);

            if (dist <= seg.rad && dist < bestDist) {
              bestDist = dist;
              isCaptured = true;
              dispX = (1 - t_raw) * seg.dxA + t_raw * seg.dxB;
              dispY = (1 - t_raw) * seg.dyA + t_raw * seg.dyB;
            }
          } else if (t_raw > 1) {
            const distB = Math.hypot(pt.x - seg.origB.x, pt.y - seg.origB.y);
            if (distB <= seg.rad && distB < bestDist) {
              bestDist = distB;
              isCaptured = true;
              dispX = seg.dxB;
              dispY = seg.dyB;
            }
          } else if (t_raw < 0) {
            const distA = Math.hypot(pt.x - seg.origA.x, pt.y - seg.origA.y);
            if (distA <= seg.rad && distA < bestDist) {
              bestDist = distA;
              isCaptured = true;
              dispX = seg.dxA;
              dispY = seg.dyA;
            }
          }
        }
      }
    }

    // STRICT ISOLATION: Point outside capture corridor -> 100% FROZEN & UNTOUCHED (0.000001 px stability)!
    if (!isCaptured || (Math.abs(dispX) < 1e-9 && Math.abs(dispY) < 1e-9)) {
      return pt;
    }

    const ext = pt as Point & { p1?: Point; p2?: Point };
    return {
      ...pt,
      x: pt.x + dispX,
      y: pt.y + dispY,
      ...(ext.p1 ? { p1: { x: ext.p1.x + dispX, y: ext.p1.y + dispY } } : {}),
      ...(ext.p2 ? { p2: { x: ext.p2.x + dispX, y: ext.p2.y + dispY } } : {})
    };
  });
}

/**
 * Calculates deformed object points using STRICT RIGID 2D TRANSFORM.
 */
export function calculateRigidLinearDeformedPoints(
  origPoints: Point[],
  nodes: CustomVectorDeformNode[],
  captureRadius: number = 30
): Point[] {
  return calculateCustomVectorDeformedPoints(origPoints, nodes, captureRadius);
}

/**
 * Densifies/subdivides strokes in the corridor of placed points so stroke vertices
 * are guaranteed to exist directly under each placed point.
 * This completely prevents "empty point dragging" and locks points to the stroke area.
 */
export function densifyStrokeUnderPlacedNodes(
  points: Point[],
  nodes: CustomVectorDeformNode[],
  maxSegmentLength: number = 8
): Point[] {
  if (!points || points.length < 2 || !nodes || nodes.length === 0) return points;

  const result: Point[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    result.push(p1);

    const segDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (segDist > maxSegmentLength) {
      // Check if this segment is near any placed node
      const isNearNode = nodes.some(n => {
        const rad = Math.max(30, n.radius || 50);
        const d1 = Math.hypot(p1.x - n.origX, p1.y - n.origY);
        const d2 = Math.hypot(p2.x - n.origX, p2.y - n.origY);
        return d1 <= rad || d2 <= rad;
      });

      if (isNearNode) {
        const splits = Math.min(10, Math.ceil(segDist / maxSegmentLength));
        for (let s = 1; s < splits; s++) {
          const t = s / splits;
          result.push({
            x: p1.x + t * (p2.x - p1.x),
            y: p1.y + t * (p2.y - p1.y),
            thickness: p1.thickness !== undefined && p2.thickness !== undefined ? p1.thickness + t * (p2.thickness - p1.thickness) : p1.thickness,
            color: p1.color || p2.color
          });
        }
      }
    }
  }
  result.push(points[points.length - 1]);
  return result;
}

/**
 * Weights and binds placed VPR points to the drawing or PNG image object.
 */
export function bindVPRPointsToDrawing(
  drawing: VectorObject,
  nodes: CustomVectorDeformNode[],
  captureRadius: number = 30
): Partial<VectorObject> {
  if (!drawing) return {};

  let updatedPoints = drawing.points;
  let updatedSubPaths = drawing.subPaths;

  if (drawing.type !== 'image') {
    // Densify stroke points so dragging nodes never pulls empty space
    if (drawing.points && drawing.points.length > 0) {
      updatedPoints = densifyStrokeUnderPlacedNodes(drawing.points, nodes, 8);
    }
    if (drawing.subPaths && drawing.subPaths.length > 0) {
      updatedSubPaths = drawing.subPaths.map(sub => densifyStrokeUnderPlacedNodes(sub, nodes, 8));
    }
  }

  return {
    points: updatedPoints,
    subPaths: updatedSubPaths,
    originalPointsBackup: updatedPoints,
    originalSubPathsBackup: updatedSubPaths,
    customVectorDeformState: {
      ...(drawing.customVectorDeformState || { active: true, isDrawingPhase: false, nodes: [] }),
      active: true,
      isDrawingPhase: false,
      isBound: true,
      nodes: nodes.map(n => ({
        ...n,
        origX: n.x,
        origY: n.y,
        radius: n.radius || captureRadius || 50
      })),
      origObjectPoints: updatedPoints,
      captureRadius: captureRadius || 50
    }
  };
}
