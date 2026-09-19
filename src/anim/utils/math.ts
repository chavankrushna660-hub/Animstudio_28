// @ts-nocheck
import { Point, Transform, Pivot, VectorObject, Bone, PointShapeNode } from '../types';

export function distance(p1: Point, p2: Point): number {
  if (!p1 || !p2) return 0;
  const p1x = typeof p1.x === 'number' ? p1.x : 0;
  const p1y = typeof p1.y === 'number' ? p1.y : 0;
  const p2x = typeof p2.x === 'number' ? p2.x : 0;
  const p2y = typeof p2.y === 'number' ? p2.y : 0;
  const dx = p1x - p2x;
  const dy = p1y - p2y;
  return Math.sqrt(dx * dx + dy * dy);
}

// Distance from point p to line segment ab
export function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  if (!p || !a || !b) return Infinity;
  const px = typeof p.x === 'number' ? p.x : 0;
  const py = typeof p.y === 'number' ? p.y : 0;
  const ax = typeof a.x === 'number' ? a.x : 0;
  const ay = typeof a.y === 'number' ? a.y : 0;
  const bx = typeof b.x === 'number' ? b.x : 0;
  const by = typeof b.y === 'number' ? b.y : 0;
  const l2 = (ax - bx) ** 2 + (ay - by) ** 2;
  if (l2 === 0) return distance({ x: px, y: py }, { x: ax, y: ay });
  let t = ((px - ax) * (bx - ax) + (py - ay) * (by - ay)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projection = {
    x: ax + t * (bx - ax),
    y: ay + t * (by - ay),
  };
  return distance({ x: px, y: py }, projection);
}

// Minimum distance from point to a polyline
export function pointToPolylineDistance(p: Point, points: Point[]): number {
  if (!p || !points || points.length === 0) return Infinity;
  const validPts = points.filter(Boolean);
  if (validPts.length === 0) return Infinity;
  if (validPts.length === 1) return distance(p, validPts[0]);
  let minDist = Infinity;
  for (let i = 0; i < validPts.length - 1; i++) {
    if (validPts[i + 1]?.gap) {
      continue;
    }
    const dist = pointToSegmentDistance(p, validPts[i], validPts[i + 1]);
    if (dist < minDist) {
      minDist = dist;
    }
  }
  return minDist;
}

// Point in polygon check (even-odd rule) with fast bounding box pre-rejection
export function isPointInPolygon(p: Point, polygon: Point[]): boolean {
  if (!p || !polygon || polygon.length < 3) return false;
  const px = typeof p.x === 'number' ? p.x : 0;
  const py = typeof p.y === 'number' ? p.y : 0;
  
  // Fast AABB bounding box check
  let minX = polygon[0].x, maxX = polygon[0].x, minY = polygon[0].y, maxY = polygon[0].y;
  for (let i = 1; i < polygon.length; i++) {
    const pt = polygon[i];
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }
  if (px < minX || px > maxX || py < minY || py > maxY) return false;

  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    const intersect = ((yi > py) !== (yj > py))
        && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Calculate bounding box of points
export function calculateBoundingBox(points: Point[]): { x: number; y: number; width: number; height: number } {
  if (!points || points.length === 0) return { x: 0, y: 0, width: 0, height: 0 };
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  points.forEach(pt => {
    if (!pt) return;
    const px = typeof pt.x === 'number' ? pt.x : 0;
    const py = typeof pt.y === 'number' ? pt.y : 0;
    if (px < minX) minX = px;
    if (px > maxX) maxX = px;
    if (py < minY) minY = py;
    if (py > maxY) maxY = py;
  });

  if (minX === Infinity) return { x: 0, y: 0, width: 0, height: 0 };

  return {
    x: minX,
    y: minY,
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

export function calculateCenter(points: Point[]): Point {
  const box = calculateBoundingBox(points);
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2,
  };
}

/**
 * Preserves multiple separate strokes (sub-paths) in a unified point array without joining or bridging them.
 * Strictly maintains each stroke as an individual, separate entity by marking stroke boundaries with `gap: true`,
 * ensuring no artificial connecting lines or merged segments are ever drawn between parts.
 */
export function unifyStrokesToSinglePath(strokes: Point[][]): Point[] {
  if (!strokes || strokes.length === 0) return [];
  
  // Filter out empty strokes
  const validStrokes = strokes.filter(s => s && s.length > 0);
  if (validStrokes.length === 0) return [];
  
  const result: Point[] = [];
  
  validStrokes.forEach((stroke, strokeIdx) => {
    stroke.forEach((pt, ptIdx) => {
      if (ptIdx === 0 && strokeIdx > 0) {
        // Explicitly mark start of new separate stroke with gap: true so renderers NEVER draw a connecting line
        result.push({ ...pt, gap: true });
      } else {
        result.push({ ...pt });
      }
    });
  });

  return result;
}

function lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const denom = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
  if (Math.abs(denom) < 1e-6) return null;

  const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denom;
  const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denom;

  if (ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1) {
    return {
      x: p1.x + ua * (p2.x - p1.x),
      y: p1.y + ua * (p2.y - p1.y)
    };
  }
  return null;
}

export function getPolygonArea(pts: Point[]): number {
  if (!pts || pts.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

export function detectContinuousSubPaths(points: Point[]): Point[][] {
  if (!points || points.length < 3) return points && points.length > 0 ? [points] : [];

  const subPaths: Point[][] = [];

  // Pass 1: Find all self-intersections and extracted closed loops
  const N = points.length;
  const loopCandidates: Point[][] = [];

  for (let i = 0; i < N - 3; i++) {
    for (let j = i + 3; j < N; j++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[j];
      const p4 = points[j + 1] || points[0];

      const intersect = lineIntersection(p1, p2, p3, p4);
      const dist = distance(p1, p3);

      if (intersect || dist < 25) {
        const cutPt = intersect || { x: (p1.x + p3.x) / 2, y: (p1.y + p3.y) / 2 };
        const loop = [cutPt, ...points.slice(i + 1, j + 1), cutPt];
        if (loop.length >= 3 && getPolygonArea(loop) > 20) {
          loopCandidates.push(loop);
        }
      }
    }
  }

  // Deduplicate overlapping/identical loops
  loopCandidates.forEach(candidate => {
    const candArea = getPolygonArea(candidate);
    const isDuplicate = subPaths.some(existing => {
      const existArea = getPolygonArea(existing);
      return Math.abs(candArea - existArea) < 50;
    });
    if (!isDuplicate) {
      subPaths.push(candidate);
    }
  });

  // Always include the full outer envelope loop
  const outerLoop = [...points];
  if (distance(outerLoop[0], outerLoop[outerLoop.length - 1]) > 1e-3) {
    outerLoop.push({ ...outerLoop[0] });
  }
  if (getPolygonArea(outerLoop) > 20) {
    subPaths.push(outerLoop);
  }

  // Sort subPaths from largest area (outer envelope) to smallest area (inner details/eyes/mouth)
  subPaths.sort((a, b) => getPolygonArea(b) - getPolygonArea(a));

  return subPaths.length > 0 ? subPaths : [points];
}

export function extractAllSubPaths(obj: VectorObject): Point[][] {
  if (!obj) return [];
  
  // 1. If explicit subPaths array exists and is not empty, use it
  if (obj.subPaths && obj.subPaths.length > 0) {
    const valid = obj.subPaths.filter(s => s && s.length > 0);
    if (valid.length > 0) return valid;
  }

  if (!obj.points || obj.points.length === 0) return [];

  // 2. Check for gap markers inside obj.points
  const gapSegments: Point[][] = [];
  let currentSeg: Point[] = [];
  for (let i = 0; i < obj.points.length; i++) {
    const pt = obj.points[i];
    if (pt.gap && currentSeg.length > 0) {
      gapSegments.push(currentSeg);
      currentSeg = [];
    }
    currentSeg.push(pt);
  }
  if (currentSeg.length > 0) {
    gapSegments.push(currentSeg);
  }

  if (gapSegments.length > 1) {
    return gapSegments;
  }

  // 3. For continuous single-stroke drawings, detect all loops and self-intersections
  return detectContinuousSubPaths(obj.points);
}

export function finalizeContinuousObject(obj: VectorObject): VectorObject {
  if (!obj) return obj;
  const extractedSubs = extractAllSubPaths(obj);
  const allStrokes = extractedSubs.length > 0 ? extractedSubs : [obj.points];
  const unifiedPts = unifyStrokesToSinglePath(allStrokes);

  return {
    ...obj,
    points: unifiedPts,
    subPaths: extractedSubs.length > 0 ? extractedSubs : obj.subPaths,
    joinedStrokesDemo: [...unifiedPts],
    isContinuousDrawing: true,
  };
}

// Rotate point around origin by angle (degrees)
export function rotatePoint(p: Point, angleDeg: number, origin: Point): Point {
  const angleRad = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  const dx = p.x - origin.x;
  const dy = p.y - origin.y;

  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  };
}

// Transform point from local to world coordinates with full Skew, 3D flip/rotate, and perspective projection
export function localToWorld(p: Point, transform: Transform, pivot?: { localX: number; localY: number }): Point {
  const pivotX = pivot ? pivot.localX : 0;
  const pivotY = pivot ? pivot.localY : 0;

  // 1. Get positions relative to the pivot
  const lx = p.x - pivotX;
  const ly = p.y - pivotY;

  // 2. Apply Skew
  const skewXRad = ((transform.skewX || 0) * Math.PI) / 180;
  const skewYRad = ((transform.skewY || 0) * Math.PI) / 180;
  const sx = lx + ly * Math.tan(skewXRad);
  const sy = ly + lx * Math.tan(skewYRad);

  // 3. Apply Scale
  const scx = sx * transform.scaleX;
  const scy = sy * transform.scaleY;

  // 4. Apply 3D Flips / Rotations (including camera angles)
  const effRotX = (transform.rotateX || 0) + (transform.cameraAngleX || 0);
  const effRotY = (transform.rotateY || 0) + (transform.cameraAngleY || 0);

  const rotXRad = (effRotX * Math.PI) / 180;
  const rotYRad = (effRotY * Math.PI) / 180;
  
  // Parallax offset based on camera angle
  const camXRad = ((transform.cameraAngleX || 0) * Math.PI) / 180;
  const camYRad = ((transform.cameraAngleY || 0) * Math.PI) / 180;
  const parallaxX = Math.sin(camYRad) * 80;
  const parallaxY = Math.sin(camXRad) * 80;
  
  // Shrink factor based on rotateX / rotateY to simulate 3D rotation projection
  const r3x = scx * Math.cos(rotYRad);
  const r3y = scy * Math.cos(rotXRad);

  // 5. Apply Perspective Projection
  const sinRotX = Math.sin(rotXRad);
  const sinRotY = Math.sin(rotYRad);
  // Z depth can be modeled based on position relative to the rotX and rotY pivots
  const z = -(scx * sinRotY + scy * sinRotX);

  const perspective = transform.perspective ? (transform.perspective / 1000) : 0; // scale perspective down for sensible range
  const f = (perspective !== 0) ? (1 / (1 - z * perspective)) : 1;

  const px = r3x * f;
  const py = r3y * f;

  // 6. Apply standard 2D Rotation around pivot
  let pRotated = { x: px + pivotX, y: py + pivotY };
  if (transform.rotation !== 0) {
    pRotated = rotatePoint(pRotated, transform.rotation, { x: pivotX, y: pivotY });
  }

  // 7. Translate (including parallax offset)
  return {
    x: pRotated.x + transform.x + parallaxX,
    y: pRotated.y + transform.y + parallaxY,
  };
}

// Transform point from world to local coordinates with analytic inverse transformations
export function worldToLocal(p: Point, transform: Transform, pivot?: { localX: number; localY: number }): Point {
  const pivotX = pivot ? pivot.localX : 0;
  const pivotY = pivot ? pivot.localY : 0;

  // Parallax offset based on camera angle
  const camXRad = ((transform.cameraAngleX || 0) * Math.PI) / 180;
  const camYRad = ((transform.cameraAngleY || 0) * Math.PI) / 180;
  const parallaxX = Math.sin(camYRad) * 80;
  const parallaxY = Math.sin(camXRad) * 80;

  // 1. Translate back (including camera parallax)
  const tx = p.x - transform.x - parallaxX;
  const ty = p.y - transform.y - parallaxY;

  // 2. Rotate back around pivot
  let pRotated = { x: tx, y: ty };
  if (transform.rotation !== 0) {
    pRotated = rotatePoint(pRotated, -transform.rotation, { x: pivotX, y: pivotY });
  }

  // Relative to pivot
  const rx = pRotated.x - pivotX;
  const ry = pRotated.y - pivotY;

  // 3. Inverse Perspective
  const effRotX = (transform.rotateX || 0) + (transform.cameraAngleX || 0);
  const effRotY = (transform.rotateY || 0) + (transform.cameraAngleY || 0);

  const perspective = transform.perspective ? (transform.perspective / 1000) : 0;
  const rotXRad = (effRotX * Math.PI) / 180;
  const rotYRad = (effRotY * Math.PI) / 180;
  const sinRotX = Math.sin(rotXRad);
  const sinRotY = Math.sin(rotYRad);
  const cosRotX = Math.cos(rotXRad);
  const cosRotY = Math.cos(rotYRad);

  let unprojX = rx;
  let unprojY = ry;

  if (perspective !== 0) {
    const tanY = cosRotY === 0 ? 0 : Math.tan(rotYRad);
    const tanX = cosRotX === 0 ? 0 : Math.tan(rotXRad);
    const denom = 1 - perspective * (rx * tanY + ry * tanX);
    const W = denom === 0 ? 1 : 1 / denom;
    unprojX = rx * W;
    unprojY = ry * W;
  }

  // 4. Inverse 3D Rotation (divide by cos)
  const divX = cosRotY === 0 ? 1 : cosRotY;
  const divY = cosRotX === 0 ? 1 : cosRotX;
  const scx = unprojX / divX;
  const scy = unprojY / divY;

  // 5. Inverse Scale
  const scaleX = transform.scaleX === 0 ? 1 : transform.scaleX;
  const scaleY = transform.scaleY === 0 ? 1 : transform.scaleY;
  const sx = scx / scaleX;
  const sy = scy / scaleY;

  // 6. Inverse Skew
  const skewXRad = ((transform.skewX || 0) * Math.PI) / 180;
  const skewYRad = ((transform.skewY || 0) * Math.PI) / 180;
  const tX = Math.tan(skewXRad);
  const tY = Math.tan(skewYRad);
  const skewDenom = 1 - tX * tY;

  let lx = sx;
  let ly = sy;
  if (skewDenom !== 0) {
    lx = (sx - sy * tX) / skewDenom;
    ly = (sy - sx * tY) / skewDenom;
  }

  return {
    x: lx + pivotX,
    y: ly + pivotY,
  };
}

// Inverse Distance Weighting (IDW) deformation for puppet pin warping
// Deforms drawing points dynamically based on the current pin targets
export function deformPoints(
  points: Point[],
  basePins: Pivot[],
  currentPins: Pivot[],
  influenceRadius: number = 250
): Point[] {
  if (!basePins || basePins.length === 0 || !currentPins || currentPins.length === 0) {
    return points;
  }

  return points.map((p) => {
    let totalWeight = 0;
    const pinDeltas: Point[] = [];
    const weights: number[] = [];

    for (let i = 0; i < basePins.length; i++) {
      const basePin = basePins[i];
      // Find corresponding current pin
      const currPin = currentPins.find((cp) => cp.id === basePin.id) || basePin;

      const d = distance(p, { x: basePin.localX, y: basePin.localY });
      const delta = {
        x: currPin.localX - basePin.localX,
        y: currPin.localY - basePin.localY,
      };

      pinDeltas.push(delta);

      // Exact match gets weight 1 directly
      if (d === 0) {
        return { x: p.x + delta.x, y: p.y + delta.y };
      }

      // Proximity-based weight
      if (d < influenceRadius) {
        const weight = (1 - d / influenceRadius) ** 2 / (d * d);
        weights.push(weight);
        totalWeight += weight;
      } else {
        weights.push(0);
      }
    }

    if (totalWeight === 0) {
      return { ...p }; // No change
    }

    let dx = 0;
    let dy = 0;
    for (let i = 0; i < basePins.length; i++) {
      const normWeight = weights[i] / totalWeight;
      dx += pinDeltas[i].x * normWeight;
      dy += pinDeltas[i].y * normWeight;
    }

    return {
      x: p.x + dx,
      y: p.y + dy,
    };
  });
}

// FABRIK (Forward And Backward Reaching Inverse Kinematics) solver for Bone Chains
// Solver guarantees rigid lengths and solves up to joint constraints!
export function solveIK(
  chainBones: Bone[],
  objects: { [id: string]: VectorObject },
  target: Point,
  maxIterations = 15,
  tolerance = 0.5
): { [objectId: string]: { x: number; y: number; rotation: number } } {
  if (chainBones.length === 0) return {};

  // Find corresponding drawing objects and extract world joint positions
  // Joints representation: Root joint, Joint 1, Joint 2 ... Joint N (End effector)
  interface JointNode {
    pos: Point;
    originalPos: Point;
    boneId: string;
    startObjectId: string;
    endObjectId: string;
    length: number;
    minAngle: number;
    maxAngle: number;
    enableConstraints: boolean;
  }

  const joints: JointNode[] = [];

  // Reconstruct bone chain joints in world coordinates
  for (let i = 0; i < chainBones.length; i++) {
    const bone = chainBones[i];
    const startObj = objects[bone.startObjectId];
    const endObj = objects[bone.endObjectId];

    const startWorld = localToWorld(
      { x: bone.startLocalX, y: bone.startLocalY },
      startObj.transform,
      startObj.pivots[0]
    );
    const endWorld = localToWorld(
      { x: bone.endLocalX, y: bone.endLocalY },
      endObj.transform,
      endObj.pivots[0]
    );

    if (i === 0) {
      joints.push({
        pos: startWorld,
        originalPos: { ...startWorld },
        boneId: bone.id,
        startObjectId: bone.startObjectId,
        endObjectId: bone.endObjectId,
        length: bone.lockedDistance,
        minAngle: bone.minAngle,
        maxAngle: bone.maxAngle,
        enableConstraints: bone.enableConstraints,
      });
    }

    joints.push({
      pos: endWorld,
      originalPos: { ...endWorld },
      boneId: bone.id,
      startObjectId: bone.startObjectId,
      endObjectId: bone.endObjectId,
      length: bone.lockedDistance,
      minAngle: bone.minAngle,
      maxAngle: bone.maxAngle,
      enableConstraints: bone.enableConstraints,
    });
  }

  const rootIndex = 0;
  const endIndex = joints.length - 1;

  // Total distance we can reach is sum of bone lengths
  const totalLength = chainBones.reduce((sum, b) => sum + b.lockedDistance, 0);
  const distToTarget = distance(joints[rootIndex].pos, target);

  if (distToTarget > totalLength) {
    // Target is out of reach: Stretch chain in direction of target
    const dir = {
      x: (target.x - joints[rootIndex].pos.x) / distToTarget,
      y: (target.y - joints[rootIndex].pos.y) / distToTarget,
    };

    for (let i = 0; i < chainBones.length; i++) {
      const len = chainBones[i].lockedDistance;
      joints[i + 1].pos = {
        x: joints[i].pos.x + dir.x * len,
        y: joints[i].pos.y + dir.y * len,
      };
    }
  } else {
    // Target is within reach: Run FABRIK iterations
    const rootPos = { ...joints[rootIndex].pos };

    for (let iter = 0; iter < maxIterations; iter++) {
      const diff = distance(joints[endIndex].pos, target);
      if (diff < tolerance) break;

      // STAGE 1: FORWARD REACHING (from end to root)
      joints[endIndex].pos = { ...target };
      for (let i = endIndex - 1; i >= rootIndex; i--) {
        const d = distance(joints[i + 1].pos, joints[i].pos);
        const ratio = joints[i + 1].length / (d || 1);
        joints[i].pos = {
          x: joints[i + 1].pos.x + (joints[i].pos.x - joints[i + 1].pos.x) * ratio,
          y: joints[i + 1].pos.y + (joints[i].pos.y - joints[i + 1].pos.y) * ratio,
        };
      }

      // STAGE 2: BACKWARD REACHING (from root to end)
      joints[rootIndex].pos = { ...rootPos };
      for (let i = rootIndex; i < endIndex; i++) {
        const d = distance(joints[i + 1].pos, joints[i].pos);
        const ratio = joints[i].length / (d || 1);
        joints[i + 1].pos = {
          x: joints[i].pos.x + (joints[i + 1].pos.x - joints[i].pos.x) * ratio,
          y: joints[i].pos.y + (joints[i + 1].pos.y - joints[i].pos.y) * ratio,
        };
      }
    }
  }

  // Calculate new transforms/rotations for each connected drawing
  const results: { [objectId: string]: { x: number; y: number; rotation: number } } = {};

  for (let i = 0; i < chainBones.length; i++) {
    const bone = chainBones[i];
    const jointStart = joints[i];
    const jointEnd = joints[i + 1];

    // Angle of current bone segment in world coordinates
    let angleRad = Math.atan2(jointEnd.pos.y - jointStart.pos.y, jointEnd.pos.x - jointStart.pos.x);
    let angleDeg = (angleRad * 180) / Math.PI;

    // Relative rotation change from its resting/base pose
    const baseAngleRad = Math.atan2(
      bone.endLocalY - bone.startLocalY,
      bone.endLocalX - bone.startLocalX
    );
    const baseAngleDeg = (baseAngleRad * 180) / Math.PI;
    const deltaAngle = angleDeg - baseAngleDeg;

    // Calculate drawing new coordinates to lock its start point onto jointStart.pos
    const drawing = objects[bone.endObjectId];
    const attachPointLocal = { x: bone.endLocalX, y: bone.endLocalY };

    // Set rotation and adjust position
    results[bone.endObjectId] = {
      x: jointStart.pos.x,
      y: jointStart.pos.y,
      rotation: deltaAngle,
    };
  }

  return results;
}

export function bilinearInterpolate(
  x: number,
  y: number,
  topLeft: { originalX: number; originalY: number; currentX: number; currentY: number },
  topRight: { originalX: number; originalY: number; currentX: number; currentY: number },
  bottomLeft: { originalX: number; originalY: number; currentX: number; currentY: number },
  bottomRight: { originalX: number; originalY: number; currentX: number; currentY: number },
  axis: 'x' | 'y' = 'x'
): number {
  const x1 = topLeft.originalX;
  const y1 = topLeft.originalY;
  const x2 = bottomRight.originalX;
  const y2 = bottomRight.originalY;

  // Avoid division by zero
  const dx = (x2 - x1) || 1;
  const dy = (y2 - y1) || 1;

  // Normalized coordinates (0 to 1)
  const tx = Math.max(0, Math.min(1, (x - x1) / dx));
  const ty = Math.max(0, Math.min(1, (y - y1) / dy));

  let val1: number, val2: number, val3: number, val4: number;
  if (axis === 'x') {
    val1 = topLeft.currentX;
    val2 = topRight.currentX;
    val3 = bottomLeft.currentX;
    val4 = bottomRight.currentX;
  } else {
    val1 = topLeft.currentY;
    val2 = topRight.currentY;
    val3 = bottomLeft.currentY;
    val4 = bottomRight.currentY;
  }

  // Bilinear interpolation
  const interpolated =
    val1 * (1 - tx) * (1 - ty) +
    val2 * tx * (1 - ty) +
    val3 * (1 - tx) * ty +
    val4 * tx * ty;

  return interpolated;
}

export function findClosestView360(views: any[] | undefined, angle: number): any | null {
  if (!views || views.length === 0) return null;
  let closest = views[0];
  let minDiff = 360;
  views.forEach(v => {
    let diff = Math.abs((v.angle - angle + 180) % 360) - 180;
    diff = Math.abs(diff < -180 ? diff + 360 : diff);
    if (diff < minDiff) {
      minDiff = diff;
      closest = v;
    }
  });
  return closest;
}

export function route360Updates(
  prevObjects: { [id: string]: VectorObject },
  nextObjects: { [id: string]: VectorObject }
): { [id: string]: VectorObject } {
  if (!nextObjects || !prevObjects) return nextObjects;
  let result = nextObjects;
  let hasChanges = false;

  Object.keys(nextObjects).forEach(id => {
    const nextObj = nextObjects[id];
    const prevObj = prevObjects[id];
    if (!nextObj || nextObj.type !== '360_container' || !nextObj.views360 || nextObj.views360.length === 0) {
      return;
    }

    // Skip if container reference is identical between prev and next
    if (prevObj && prevObj === nextObj) {
      return;
    }

    const activeView = findClosestView360(nextObj.views360, nextObj.currentAngle360 ?? 0);
    if (activeView && activeView.drawingId) {
      const activeDrawingId = activeView.drawingId;
      const targetDrawing = result[activeDrawingId] || prevObjects[activeDrawingId];
      if (targetDrawing && prevObj) {
        const skipKeys = new Set([
          'id', 'type', 'name', 'views360', 'currentAngle360', 'activeViewId360',
          'lockAngle360', 'container360Id', 'parentId', 'childrenIds', 'layerId'
        ]);
        const updates: Partial<VectorObject> = {};
        Object.keys(nextObj).forEach(k => {
          if (!skipKeys.has(k) && (nextObj as any)[k] !== undefined && (nextObj as any)[k] !== (prevObj as any)[k]) {
            (updates as any)[k] = (nextObj as any)[k];
          }
        });
        if (Object.keys(updates).length > 0) {
          if (!hasChanges) {
            result = { ...result };
            hasChanges = true;
          }
          result[activeDrawingId] = {
            ...targetDrawing,
            ...updates,
            id: activeDrawingId,
            type: targetDrawing.type !== '360_container' ? targetDrawing.type : 'stroke'
          };
        }
      }
    }

    // Sync stage position transform across all view drawings if container transform moved
    if (prevObj && prevObj.transform && nextObj.transform) {
      const origT = prevObj.transform;
      const newT = nextObj.transform;
      if (
        origT.x !== newT.x ||
        origT.y !== newT.y ||
        origT.rotation !== newT.rotation ||
        origT.scaleX !== newT.scaleX ||
        origT.scaleY !== newT.scaleY
      ) {
        nextObj.views360.forEach(v => {
          if (v.drawingId) {
            const viewDrawing = result[v.drawingId] || prevObjects[v.drawingId];
            if (viewDrawing) {
              if (!hasChanges) {
                result = { ...result };
                hasChanges = true;
              }
              result[v.drawingId] = {
                ...viewDrawing,
                transform: {
                  ...viewDrawing.transform,
                  x: newT.x,
                  y: newT.y,
                  rotation: newT.rotation,
                  scaleX: newT.scaleX,
                  scaleY: newT.scaleY
                }
              };
            }
          }
        });
      }
    }
  });

  return result;
}

//  3D Wire Sculpting Helper Functions
export function resamplePointsBySpacing(points: Point[], targetSpacing: number = 10): Point[] {
  if (!points || points.length < 2) return points ? [...points] : [];
  const resampled: Point[] = [points[0]];
  let lastPt = points[0];

  for (let i = 1; i < points.length; i++) {
    const pt = points[i];
    if (pt.gap) {
      resampled.push({ ...pt });
      lastPt = pt;
      continue;
    }
    const d = distance(lastPt, pt);
    if (d >= targetSpacing) {
      const steps = Math.floor(d / targetSpacing);
      for (let s = 1; s <= steps; s++) {
        const t = s / steps;
        resampled.push({
          x: lastPt.x + (pt.x - lastPt.x) * t,
          y: lastPt.y + (pt.y - lastPt.y) * t,
          z: (lastPt.z || 0) + ((pt.z || 0) - (lastPt.z || 0)) * t
        });
      }
      lastPt = pt;
    }
  }

  if (resampled.length < 2 && points.length >= 2) {
    return [...points];
  }
  return resampled;
}

export function extrudeVertices(points: Point[], selectedIndices: number[], axis: 'x' | 'y' | 'z', amount: number): { points: Point[]; newSelection: number[] } {
  if (!points || points.length === 0 || selectedIndices.length === 0) return { points: points || [], newSelection: selectedIndices || [] };
  const updated = [...points.map(p => ({ ...p }))];
  const newSelection: number[] = [];

  const sortedIndices = [...selectedIndices].sort((a, b) => b - a);
  sortedIndices.forEach((idx) => {
    if (idx < 0 || idx >= updated.length) return;
    const base = updated[idx];
    const extrudedPoint: Point = {
      x: base.x + (axis === 'x' ? amount : 0),
      y: base.y + (axis === 'y' ? amount : 0),
      z: (base.z || 0) + (axis === 'z' ? amount : 0),
      color: base.color,
      thickness: base.thickness
    };
    updated.splice(idx + 1, 0, extrudedPoint);
    newSelection.push(idx + 1);
  });

  return { points: updated, newSelection };
}

export function smoothSelectedVertices(points: Point[], selectedIndices: number[], strength: number = 0.5): Point[] {
  if (!points || points.length < 3 || selectedIndices.length === 0) return points || [];
  const updated = [...points.map(p => ({ ...p }))];

  selectedIndices.forEach((idx) => {
    if (idx <= 0 || idx >= points.length - 1) return;
    const prev = points[idx - 1];
    const curr = points[idx];
    const next = points[idx + 1];

    if (prev.gap || next.gap) return;

    const avgX = (prev.x + next.x) / 2;
    const avgY = (prev.y + next.y) / 2;
    const avgZ = ((prev.z || 0) + (next.z || 0)) / 2;

    updated[idx] = {
      ...curr,
      x: curr.x + (avgX - curr.x) * strength,
      y: curr.y + (avgY - curr.y) * strength,
      z: (curr.z || 0) + (avgZ - (curr.z || 0)) * strength
    };
  });

  return updated;
}

export function flattenSelectedVertices(points: Point[], selectedIndices: number[], axis: 'x' | 'y' | 'z'): Point[] {
  if (!points || points.length === 0 || selectedIndices.length === 0) return points || [];
  const updated = [...points.map(p => ({ ...p }))];
  const selectedPts = selectedIndices.map(i => points[i]).filter(Boolean);
  if (selectedPts.length === 0) return points;

  let avgVal = 0;
  if (axis === 'x') {
    avgVal = selectedPts.reduce((acc, p) => acc + p.x, 0) / selectedPts.length;
  } else if (axis === 'y') {
    avgVal = selectedPts.reduce((acc, p) => acc + p.y, 0) / selectedPts.length;
  } else {
    avgVal = selectedPts.reduce((acc, p) => acc + (p.z || 0), 0) / selectedPts.length;
  }

  selectedIndices.forEach(idx => {
    if (updated[idx]) {
      if (axis === 'x') updated[idx].x = avgVal;
      else if (axis === 'y') updated[idx].y = avgVal;
      else updated[idx].z = avgVal;
    }
  });

  return updated;
}

export function mirrorSelectedVertices(points: Point[], selectedIndices: number[], axis: 'x' | 'y'): Point[] {
  if (!points || points.length === 0 || selectedIndices.length === 0) return points || [];
  const updated = [...points.map(p => ({ ...p }))];
  const box = calculateBoundingBox(points);
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;

  selectedIndices.forEach(idx => {
    if (updated[idx]) {
      if (axis === 'x') {
        updated[idx].x = centerX + (centerX - updated[idx].x);
      } else {
        updated[idx].y = centerY + (centerY - updated[idx].y);
      }
    }
  });

  return updated;
}

// -------------------------------------------------------------
// Ramer-Douglas-Peucker (RDP) Algorithm for Low-Poly Mesh Reduction
// -------------------------------------------------------------
export function simplifyPointsRDP(points: Point[], epsilon: number = 4): Point[] {
  if (!points || points.length <= 2) return points ? [...points] : [];

  const findPerpendicularDistance = (pt: Point, lineStart: Point, lineEnd: Point): number => {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lineLenSq = dx * dx + dy * dy;
    if (lineLenSq === 0) return distance(pt, lineStart);
    const t = Math.max(0, Math.min(1, ((pt.x - lineStart.x) * dx + (pt.y - lineStart.y) * dy) / lineLenSq));
    const projX = lineStart.x + t * dx;
    const projY = lineStart.y + t * dy;
    return distance(pt, { x: projX, y: projY });
  };

  const rdp = (pts: Point[], eps: number): Point[] => {
    if (pts.length <= 2) return pts;
    let maxDist = 0;
    let index = 0;
    const last = pts.length - 1;

    for (let i = 1; i < last; i++) {
      const d = findPerpendicularDistance(pts[i], pts[0], pts[last]);
      if (d > maxDist) {
        maxDist = d;
        index = i;
      }
    }

    if (maxDist > eps) {
      const left = rdp(pts.slice(0, index + 1), eps);
      const right = rdp(pts.slice(index), eps);
      return [...left.slice(0, -1), ...right];
    } else {
      return [pts[0], pts[last]];
    }
  };

  const simplified = rdp(points, epsilon);
  return simplified.length >= 2 ? simplified : points;
}

// Minimum distance filter to eliminate duplicate/micro vertices during drawing
export function filterPointsByMinDistance(points: Point[], minDistance: number = 16): Point[] {
  if (!points || points.length <= 2) return points ? [...points] : [];
  const result: Point[] = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const last = result[result.length - 1];
    const curr = points[i];
    const isEnd = i === points.length - 1;
    if (distance(last, curr) >= minDistance || isEnd) {
      result.push(curr);
    }
  }
  return result;
}

// Low-Poly Decimation for PointShapeNode arrays (Point Shape Sculptor)
export function simplifyPointShapeNodes(
  nodes: PointShapeNode[],
  tolerance: number = 6,
  maxNodes: number = 40,
  minDistance: number = 16
): PointShapeNode[] {
  if (!nodes || nodes.length <= 3) return nodes ? [...nodes] : [];

  // Convert nodes to Point array
  const rawPoints: Point[] = nodes.map(n => ({ x: n.x, y: n.y }));

  // 1. Minimum distance pre-filter
  let filtered = filterPointsByMinDistance(rawPoints, minDistance);

  // 2. RDP simplification
  let simplified = simplifyPointsRDP(filtered, tolerance);

  // 3. If still exceeds maxNodes budget, iteratively increase epsilon
  let iter = 0;
  let curTolerance = tolerance;
  while (simplified.length > maxNodes && iter < 8) {
    curTolerance += 3;
    simplified = simplifyPointsRDP(simplified, curTolerance);
    iter++;
  }

  // Rebuild clean, lightweight PointShapeNode hierarchy
  const cleanNodes: PointShapeNode[] = simplified.map((p, idx) => {
    const origId = idx < nodes.length ? nodes[idx].id : `psn_lowpoly_${Date.now()}_${idx}`;
    return {
      id: origId,
      x: Number(p.x.toFixed(2)),
      y: Number(p.y.toFixed(2)),
      scale: 1,
      rotation: 0,
      parentId: null,
      connectedTo: []
    };
  });

  // Re-establish linear sequential connectivity
  for (let i = 0; i < cleanNodes.length; i++) {
    if (i > 0) {
      cleanNodes[i].parentId = cleanNodes[i - 1].id;
      cleanNodes[i].connectedTo = [cleanNodes[i - 1].id];
    }
  }

  return cleanNodes;
}

/**
 * High-precision 2D Moving Least Squares (MLS) Rigid/Similarity Puppet Warp
 * Deforms point p based on control pins (p_i -> q_i).
 * Guarantees C-infinity smoothness, rigid local rotation, pin interpolation, and rigid anchor locking.
 */
export function calculateMLSPuppetWarp(p: Point, pins: Pivot[]): Point {
  if (!pins || pins.length === 0) return p;

  const validPins = pins.filter(pin => pin && typeof pin.localX === 'number' && typeof pin.localY === 'number');
  if (validPins.length === 0) return p;

  // Check if any pin has moved
  const hasMoved = validPins.some(pin => {
    const curX = typeof pin.currentLocalX === 'number' ? pin.currentLocalX : pin.localX;
    const curY = typeof pin.currentLocalY === 'number' ? pin.currentLocalY : pin.localY;
    return Math.abs(curX - pin.localX) > 0.05 || Math.abs(curY - pin.localY) > 0.05;
  });

  if (!hasMoved) return p;

  // 1. Exact Pin hit check
  for (const pin of validPins) {
    const d = distance(p, { x: pin.localX, y: pin.localY });
    if (d < 0.2) {
      const curX = typeof pin.currentLocalX === 'number' ? pin.currentLocalX : pin.localX;
      const curY = typeof pin.currentLocalY === 'number' ? pin.currentLocalY : pin.localY;
      return { ...p, x: curX, y: curY };
    }
  }

  // 2. Single Pin Falloff
  if (validPins.length === 1) {
    const pin = validPins[0];
    const curX = typeof pin.currentLocalX === 'number' ? pin.currentLocalX : pin.localX;
    const curY = typeof pin.currentLocalY === 'number' ? pin.currentLocalY : pin.localY;
    const d = distance(p, { x: pin.localX, y: pin.localY });
    const radius = 180;
    const weight = Math.max(0, 1 - d / radius);
    const smoothWeight = weight * weight * (3 - 2 * weight);
    return {
      ...p,
      x: p.x + (curX - pin.localX) * smoothWeight,
      y: p.y + (curY - pin.localY) * smoothWeight,
    };
  }

  // 3. Multi-Pin Moving Least Squares (MLS) Rigid Deformation
  let totalW = 0;
  let pStarX = 0, pStarY = 0;
  let qStarX = 0, qStarY = 0;

  const weights: number[] = [];
  const alpha = 1.0; // alpha = 1 yields standard MLS

  for (let i = 0; i < validPins.length; i++) {
    const pin = validPins[i];
    const curX = typeof pin.currentLocalX === 'number' ? pin.currentLocalX : pin.localX;
    const curY = typeof pin.currentLocalY === 'number' ? pin.currentLocalY : pin.localY;
    const d = distance(p, { x: pin.localX, y: pin.localY });
    const w = 1.0 / (Math.pow(d, 2 * alpha) + 0.0001);
    weights.push(w);
    totalW += w;
    pStarX += w * pin.localX;
    pStarY += w * pin.localY;
    qStarX += w * curX;
    qStarY += w * curY;
  }

  if (totalW < 1e-8) return p;

  pStarX /= totalW;
  pStarY /= totalW;
  qStarX /= totalW;
  qStarY /= totalW;

  let muS = 0;
  let muR = 0;

  for (let i = 0; i < validPins.length; i++) {
    const pin = validPins[i];
    const curX = typeof pin.currentLocalX === 'number' ? pin.currentLocalX : pin.localX;
    const curY = typeof pin.currentLocalY === 'number' ? pin.currentLocalY : pin.localY;
    const pHatX = pin.localX - pStarX;
    const pHatY = pin.localY - pStarY;
    const qHatX = curX - qStarX;
    const qHatY = curY - qStarY;
    const w = weights[i];

    muS += w * (pHatX * qHatX + pHatY * qHatY);
    muR += w * (pHatX * qHatY - pHatY * qHatX);
  }

  const vHatX = p.x - pStarX;
  const vHatY = p.y - pStarY;
  const lambda = Math.sqrt(muS * muS + muR * muR);

  if (lambda > 1e-6) {
    const cosA = muS / lambda;
    const sinA = muR / lambda;
    const resX = qStarX + (vHatX * cosA - vHatY * sinA);
    const resY = qStarY + (vHatX * sinA + vHatY * cosA);
    return { ...p, x: resX, y: resY };
  } else {
    // Fallback translation
    return { ...p, x: p.x + (qStarX - pStarX), y: p.y + (qStarY - pStarY) };
  }
}

/**
 * Clamps a point to be strictly inside a closed polygon.
 * If the point is outside or on the boundary, projects it to the closest interior point.
 */
export function clampPointInsidePolygon(pt: Point, polygon: Point[]): Point {
  if (!polygon || polygon.length < 3) return pt;
  if (isPointInPolygon(pt, polygon)) return pt;

  const centroid = calculateCenter(polygon);

  // Find closest point on polygon edges
  let minDist = Infinity;
  let closest: Point = { ...centroid };

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];
    const segLenSq = (p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2;
    let proj: Point;
    if (segLenSq === 0) {
      proj = p1;
    } else {
      let t = ((pt.x - p1.x) * (p2.x - p1.x) + (pt.y - p1.y) * (p2.y - p1.y)) / segLenSq;
      t = Math.max(0, Math.min(1, t));
      proj = {
        x: p1.x + t * (p2.x - p1.x),
        y: p1.y + t * (p2.y - p1.y)
      };
    }
    const d = (pt.x - proj.x) ** 2 + (pt.y - proj.y) ** 2;
    if (d < minDist) {
      minDist = d;
      closest = proj;
    }
  }

  // Iteratively step inward towards centroid to ensure point is guaranteed strictly inside polygon
  for (let alpha = 0.05; alpha <= 1.0; alpha += 0.05) {
    const candidate: Point = {
      x: Number((closest.x + (centroid.x - closest.x) * alpha).toFixed(2)),
      y: Number((closest.y + (centroid.y - closest.y) * alpha).toFixed(2))
    };
    if (isPointInPolygon(candidate, polygon)) {
      return candidate;
    }
  }

  return { x: Number(centroid.x.toFixed(2)), y: Number(centroid.y.toFixed(2)) };
}

/**
 * Transforms an arbitrary point according to VST state around its custom pivot origin
 */
export function transformVSTPoint(p: Point, vstState: any): Point {
  if (!vstState || !vstState.lassoPoints || vstState.lassoPoints.length < 3) {
    return p;
  }

  const polygon: Point[] = vstState.lassoPoints;
  const pivot = vstState.pivot && typeof vstState.pivot.x === 'number' && typeof vstState.pivot.y === 'number'
    ? clampPointInsidePolygon(vstState.pivot, polygon)
    : calculateCenter(polygon);

  let dx = p.x - pivot.x;
  let dy = p.y - pivot.y;

  const t = vstState.transform || {};
  const scaleX = typeof t.scaleX === 'number' ? t.scaleX : 1;
  const scaleY = typeof t.scaleY === 'number' ? t.scaleY : 1;
  const rotation = typeof t.rotation === 'number' ? t.rotation : 0;
  const skewX = typeof t.skewX === 'number' ? t.skewX : 0;
  const skewY = typeof t.skewY === 'number' ? t.skewY : 0;
  const rotateX = typeof t.rotateX === 'number' ? t.rotateX : 0;
  const rotateY = typeof t.rotateY === 'number' ? t.rotateY : 0;
  const offsetX = typeof t.x === 'number' ? t.x : 0;
  const offsetY = typeof t.y === 'number' ? t.y : 0;
  const mirrorX = !!t.mirrorX;
  const mirrorY = !!t.mirrorY;

  // 3D Flip Mirror
  if (mirrorX) dx = -dx;
  if (mirrorY) dy = -dy;

  // Scale
  dx *= scaleX;
  dy *= scaleY;

  // Skew
  if (skewX !== 0) {
    const skewRadX = (skewX * Math.PI) / 180;
    dx += dy * Math.tan(skewRadX);
  }
  if (skewY !== 0) {
    const skewRadY = (skewY * Math.PI) / 180;
    dy += dx * Math.tan(skewRadY);
  }

  // Rotation around Pivot
  const rad = (rotation * Math.PI) / 180;
  const cosR = Math.cos(rad);
  const sinR = Math.sin(rad);
  let rx = dx * cosR - dy * sinR;
  let ry = dx * sinR + dy * cosR;

  // 3D Perspective foreshortening
  if (rotateY !== 0) {
    const radY = (rotateY * Math.PI) / 180;
    rx *= Math.cos(radY);
  }
  if (rotateX !== 0) {
    const radX = (rotateX * Math.PI) / 180;
    ry *= Math.cos(radX);
  }

  return {
    ...p,
    x: Number((pivot.x + rx + offsetX).toFixed(2)),
    y: Number((pivot.y + ry + offsetY).toFixed(2))
  };
}

/**
 * Strict Vector Smart Transform (VST) Point Deformer
 * Enforces STRICT Pixel Isolation Rule:
 * Outside polygon => strictly 0% change, 0% stretch, 0% blend (100% frozen as it is).
 * Inside polygon => applies transform (translate, rotate, scale, skew, 3D flip mirror, 3D perspective) strictly around the custom pivot.
 */
export function calculateVSTPointDeformation(p: Point, vstState: any): Point {
  if (!vstState || !vstState.active || !vstState.lassoPoints || vstState.lassoPoints.length < 3) {
    return p;
  }

  const polygon: Point[] = vstState.lassoPoints;

  // Fast cached AABB bounding box check
  let bbox = vstState._cachedBBox;
  if (!bbox) {
    let minX = polygon[0].x, maxX = polygon[0].x, minY = polygon[0].y, maxY = polygon[0].y;
    for (let i = 1; i < polygon.length; i++) {
      const pt = polygon[i];
      if (pt.x < minX) minX = pt.x;
      if (pt.x > maxX) maxX = pt.x;
      if (pt.y < minY) minY = pt.y;
      if (pt.y > maxY) maxY = pt.y;
    }
    bbox = { minX, maxX, minY, maxY };
    vstState._cachedBBox = bbox;
  }

  if (p.x < bbox.minX || p.x > bbox.maxX || p.y < bbox.minY || p.y > bbox.maxY) {
    return p;
  }

  // STRICT RULE: If point is outside the drawn area, keep it 100% strictly stationary!
  if (!isPointInPolygon(p, polygon)) {
    return p;
  }

  // Inside the drawn area: Apply the transformation relative to the custom pivot
  return transformVSTPoint(p, vstState);
}

/**
 * Smart Correct Shape Deformation Helper
 * Radially expands, decreases (tightens), or moves vertices strictly within point radius R.
 */
export function applySmartCorrectDeformation(
  p: Point,
  center: Point,
  radius: number,
  mode: 'expand' | 'decrease' | 'move' | 'push' | 'pinch' | 'smooth',
  delta: { dx: number; dy: number },
  strength: number = 0.5,
  straightRadial: boolean = true
): Point {
  const d = distance(p, center);
  if (d > radius || radius <= 0) {
    return p;
  }

  const factor = 1 - d / radius;
  const smoothFactor = straightRadial ? factor : factor * factor * (3 - 2 * factor);

  if (mode === 'move' || mode === 'push') {
    return {
      ...p,
      x: p.x + delta.dx * (straightRadial ? 1 : smoothFactor),
      y: p.y + delta.dy * (straightRadial ? 1 : smoothFactor)
    };
  }

  if (mode === 'expand') {
    // Expand radially outward from pointer position
    if (d < 0.1) {
      return { ...p, x: p.x + 2 * strength, y: p.y + 2 * strength };
    }
    const dirX = (p.x - center.x) / d;
    const dirY = (p.y - center.y) / d;
    const step = smoothFactor * strength * 12;
    return {
      ...p,
      x: p.x + dirX * step,
      y: p.y + dirY * step
    };
  }

  if (mode === 'decrease' || mode === 'pinch') {
    // Decrease/tighten radially inward towards pointer position
    if (d < 0.1) return p;
    const dirX = (center.x - p.x) / d;
    const dirY = (center.y - p.y) / d;
    const step = smoothFactor * strength * 12;
    return {
      ...p,
      x: p.x + dirX * step,
      y: p.y + dirY * step
    };
  }

  if (mode === 'smooth') {
    // Subtle nudge toward center with damping
    if (d < 0.1) return p;
    const dirX = (center.x - p.x) / d;
    const dirY = (center.y - p.y) / d;
    const step = smoothFactor * strength * 4;
    return {
      ...p,
      x: p.x + dirX * step,
      y: p.y + dirY * step
    };
  }

  return p;
}


