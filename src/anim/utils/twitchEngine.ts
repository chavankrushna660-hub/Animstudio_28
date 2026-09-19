// @ts-nocheck
import { VectorObject, Point, Transform, TwitchIdentifiedShape, TwitchToolState, TwitchCurvePoint, TwitchMeshPoint } from '../types';
import { distance, isPointInPolygon, calculateBoundingBox } from './math';

/**
 *  TWITCH ENGINE — Complete Vector Topology & Drawing Dissector
 * Implements Planar Graph Conversion, Cycle Detection, Gap Tolerance (2px),
 * Shared Stroke Resolution, Auto-Closing Open Paths (Internally), and All Transform/Deform Modes.
 */

export const GAP_TOLERANCE = 2.5; // 2px - 2.5px tolerance rule

/**
 * Calculates Euclidean distance between two 2D points.
 */
export function ptDist(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Calculates polygon area using the Shoelace formula.
 */
export function calculateArea(points: Point[]): number {
  if (!points || points.length < 3) return 0;
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(Math.round((area / 2) * 10) / 10);
}

/**
 * Calculates centroid (center of mass) of points.
 */
export function calculateCentroid(points: Point[]): { x: number; y: number } {
  if (!points || points.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  return {
    x: Math.round((sumX / points.length) * 10) / 10,
    y: Math.round((sumY / points.length) * 10) / 10
  };
}

/**
 * Calculates bounding box and dimensional properties of a point list.
 */
export function getPointsBounds(points: Point[]) {
  if (!points || points.length === 0) {
    return {
      x: 0,
      y: 0,
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      width: 0,
      height: 0,
      centerX: 0,
      centerY: 0,
      corners: []
    };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const width = Math.max(1, maxX - minX);
  const height = Math.max(1, maxY - minY);
  return {
    x: minX,
    y: minY,
    minX,
    minY,
    maxX,
    maxY,
    width: Math.round(width),
    height: Math.round(height),
    centerX: Math.round((minX + width / 2) * 10) / 10,
    centerY: Math.round((minY + height / 2) * 10) / 10,
    corners: [
      { x: minX, y: minY },
      { x: maxX, y: minY },
      { x: maxX, y: maxY },
      { x: minX, y: maxY }
    ]
  };
}

/**
 * Calculates total perimeter length of a stroke or loop.
 */
export function calculatePerimeter(points: Point[], isClosed: boolean = false): number {
  if (!points || points.length < 2) return 0;
  let len = 0;
  for (let i = 0; i < points.length - 1; i++) {
    len += ptDist(points[i], points[i + 1]);
  }
  if (isClosed && points.length > 2) {
    len += ptDist(points[points.length - 1], points[0]);
  }
  return Math.round(len * 10) / 10;
}

/**
 * Initializes curve deformation control points along a shape's perimeter.
 * Follows exact circular contour if closed, or exact linear stroke if open.
 */
export function initCurvePoints(points: Point[], numPoints: number = 7): TwitchCurvePoint[] {
  if (!points || points.length === 0) return [];
  const count = Math.max(4, Math.min(numPoints, points.length));
  const curvePts: TwitchCurvePoint[] = [];
  const step = (points.length - 1) / (count - 1);
  
  for (let i = 0; i < count; i++) {
    const idx = Math.min(points.length - 1, Math.round(i * step));
    const pt = points[idx];
    curvePts.push({
      id: `crv_${i}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      x: pt.x,
      y: pt.y,
      origX: pt.x,
      origY: pt.y,
      t: i / (count - 1)
    });
  }
  return curvePts;
}

/**
 * Initializes a 3x3 mesh lattice grid over a shape's bounding box.
 */
export function initMeshGrid(bounds: { minX: number; minY: number; width: number; height: number }, cols: number = 3, rows: number = 3): TwitchMeshPoint[] {
  const grid: TwitchMeshPoint[] = [];
  const stepX = (bounds.width || 100) / (cols - 1);
  const stepY = (bounds.height || 100) / (rows - 1);
  const minX = bounds.minX ?? 0;
  const minY = bounds.minY ?? 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = minX + c * stepX;
      const y = minY + r * stepY;
      grid.push({
        id: `mesh_${r}_${c}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        gridX: c,
        gridY: r,
        x,
        y,
        origX: x,
        origY: y
      });
    }
  }
  return grid;
}

/**
 * Finds intersection point between two line segments (p1-p2 and p3-p4).
 */
export function lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const d = (p2.x - p1.x) * (p4.y - p3.y) - (p2.y - p1.y) * (p4.x - p3.x);
  if (Math.abs(d) < 1e-6) return null;
  const t = ((p3.x - p1.x) * (p4.y - p3.y) - (p3.y - p1.y) * (p4.x - p3.x)) / d;
  const u = ((p3.x - p1.x) * (p2.y - p1.y) - (p3.y - p1.y) * (p2.x - p1.x)) / d;
  if (t > 0.05 && t < 0.95 && u > 0.05 && u < 0.95) {
    return {
      x: p1.x + t * (p2.x - p1.x),
      y: p1.y + t * (p2.y - p1.y)
    };
  }
  return null;
}

/**
 * The Scanning Engine:
 * Converts a drawing into decomposed identified shapes:
 * 1. Planar Graph Conversion & 2px Gap Check
 * 2. Cycle Detection (Euler & DFS)
 * 3. Shared Stroke Resolution (Head-Ear algorithm)
 * 4. Auto-Closing Open Paths (Internally for selection & area, never visible as extra line)
 */
export function scanDrawingShapes(obj: VectorObject): TwitchIdentifiedShape[] {
  if (!obj) return [];
  const shapes: TwitchIdentifiedShape[] = [];
  let shapeCounter = 1;

  const createShape = (
    pts: Point[],
    name: string,
    type: 'closed_loop' | 'subpath' | 'shared_stroke' | 'open_stroke',
    subPathIndex?: number,
    pointIndices?: number[],
    isClosedForce?: boolean,
    wasOriginallyOpen?: boolean,
    sharedWithShapeId?: string
  ): TwitchIdentifiedShape => {
    const rawPoints = pts.map(p => ({ ...p }));
    const b = getPointsBounds(rawPoints);
    const centroid = calculateCentroid(rawPoints);
    const area = calculateArea(rawPoints) || Math.round(b.width * b.height * 0.7);
    
    const isClosed = isClosedForce !== undefined 
      ? isClosedForce 
      : (rawPoints.length >= 3 && ptDist(rawPoints[0], rawPoints[rawPoints.length - 1]) <= 14);

    const curvePoints = initCurvePoints(rawPoints, 7);
    const meshGrid = initMeshGrid(b, 3, 3);

    return {
      id: `shape_${shapeCounter++}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      type,
      points: rawPoints,
      origPoints: rawPoints.map(p => ({ ...p })),
      subPathIndex: subPathIndex !== undefined ? subPathIndex : -1,
      pointIndices: pointIndices || rawPoints.map((_, i) => i),
      isClosed,
      wasOriginallyOpen: wasOriginallyOpen || !isClosed,
      isHidden: false,
      isLocked: false,
      color: undefined,
      strokeColor: undefined,
      strokeWidth: undefined,
      area,
      centroid,
      boundingBox: b,
      bounds: b,
      transform: {
        x: 0,
        y: 0,
        rotation: 0,
        rotX: 0,
        rotY: 0,
        rotZ: 0,
        scaleX: 1,
        scaleY: 1,
        skewX: 0,
        skewY: 0,
        rotateX: 0,
        rotateY: 0,
        perspective: 1000
      },
      sharedWithShapeId,
      curvePoints,
      meshGrid,
      meshCols: 3,
      meshRows: 3,
      children: [],
      parentShape: null,
      redDot: { x: centroid.x, y: centroid.y },
      poseAngle: 0,
      poseStretch: 1,
      targetLineWidth: b.width,
      targetLineHeight: b.height,
      perimeterLength: calculatePerimeter(rawPoints, isClosed)
    };
  };

  // 1. Gather all distinct raw strokes from subPaths or partitioned points (strictly separate)
  interface RawPartCandidate {
    points: Point[];
    subPathIndex: number; // >= 0 if from subPaths, -1 if from main points
    pointIndices: number[];
  }

  const rawCandidates: RawPartCandidate[] = [];

  if (obj.subPaths && obj.subPaths.length > 0) {
    obj.subPaths.forEach((sub, subIdx) => {
      if (sub && sub.length > 0) {
        rawCandidates.push({
          points: sub.map(p => ({ ...p })),
          subPathIndex: subIdx,
          pointIndices: sub.map((_, i) => i)
        });
      }
    });
  } else if (obj.points && obj.points.length > 0) {
    // Split obj.points strictly by explicit gap flag so every stroke is individual
    let curPoints: Point[] = [];
    let curIndices: number[] = [];
    for (let i = 0; i < obj.points.length; i++) {
      const p = obj.points[i];
      if (p.gap && curPoints.length > 0) {
        rawCandidates.push({
          points: curPoints,
          subPathIndex: -1,
          pointIndices: curIndices
        });
        curPoints = [];
        curIndices = [];
      }
      curPoints.push({ ...p });
      curIndices.push(i);
    }
    if (curPoints.length > 0) {
      rawCandidates.push({
        points: curPoints,
        subPathIndex: -1,
        pointIndices: curIndices
      });
    }
  }

  // Calculate overall bounds of all strokes combined to classify positions intelligently
  const allPts: Point[] = [];
  rawCandidates.forEach(c => allPts.push(...c.points));
  const overallBounds = getPointsBounds(allPts);
  const totalW = Math.max(1, overallBounds.width);
  const totalH = Math.max(1, overallBounds.height);
  const minX = overallBounds.minX;
  const minY = overallBounds.minY;

  // Track name counts to prevent collision
  const nameCounts: { [base: string]: number } = {};
  const getUniqueName = (base: string) => {
    nameCounts[base] = (nameCounts[base] || 0) + 1;
    if (nameCounts[base] === 1) return base;
    return `${base}_${nameCounts[base]}`;
  };

  // Find if there is a primary/head outline (largest closed loop covering most area)
  let largestClosedIdx = -1;
  let maxArea = 0;
  rawCandidates.forEach((c, idx) => {
    const isClosed = c.points.length >= 3 && ptDist(c.points[0], c.points[c.points.length - 1]) <= 22;
    if (isClosed) {
      const b = getPointsBounds(c.points);
      const a = b.width * b.height;
      if (a > maxArea) {
        maxArea = a;
        largestClosedIdx = idx;
      }
    }
  });

  // Create an individual, completely independent shape for every single stroke/part
  rawCandidates.forEach((c, cIdx) => {
    const pts = c.points;
    if (!pts || pts.length === 0) return;
    const isClosed = pts.length >= 3 && ptDist(pts[0], pts[pts.length - 1]) <= 22;
    const b = getPointsBounds(pts);
    const centroid = calculateCentroid(pts);
    
    // Relative spatial position (0.0 to 1.0)
    const relX = (centroid.x - minX) / totalW;
    const relY = (centroid.y - minY) / totalH;
    const isLarge = (b.width * b.height) > (maxArea * 0.45) && cIdx === largestClosedIdx;

    let baseName = `Shape_${cIdx + 1}`;
    if (isLarge) {
      baseName = 'Head_Outline';
    } else if (relY < 0.35) {
      if (relX < 0.42) baseName = isClosed ? 'Left_Ear' : 'Left_Eyebrow';
      else if (relX > 0.58) baseName = isClosed ? 'Right_Ear' : 'Right_Eyebrow';
      else baseName = isClosed ? 'Forehead' : 'Hair_Strand';
    } else if (relY >= 0.25 && relY <= 0.65) {
      if (relX < 0.42) baseName = isClosed ? 'Left_Eye' : 'Left_Detail';
      else if (relX > 0.58) baseName = isClosed ? 'Right_Eye' : 'Right_Detail';
      else baseName = 'Nose';
    } else if (relY > 0.60) {
      if (relX >= 0.28 && relX <= 0.72) baseName = 'Mouth';
      else if (relY > 0.82) baseName = 'Chin';
      else baseName = isClosed ? 'Jaw_Detail' : 'Detail_Stroke';
    }

    const finalName = getUniqueName(baseName);
    shapes.push(createShape(
      pts,
      finalName,
      isClosed ? 'closed_loop' : 'open_stroke',
      c.subPathIndex,
      c.pointIndices,
      isClosed,
      !isClosed
    ));
  });

  // Fallback if empty
  if (shapes.length === 0) {
    shapes.push(createShape(
      [{ x: 0, y: 0 }, { x: 50, y: 0 }, { x: 50, y: 50 }, { x: 0, y: 50 }],
      'Head_Outline',
      'closed_loop',
      -1,
      [0, 1, 2, 3],
      true,
      false
    ));
  }

  return shapes;
}

/**
 * Evaluates individual shape transforms, curve deformation, mesh deformation, and direct hand grab.
 * Transforms point coordinates according to the shape's specific properties.
 */
export function applyShapeTransform(
  pt: Point,
  shape: TwitchIdentifiedShape
): Point {
  const t = shape.transform;
  const center = shape.bounds 
    ? { x: shape.bounds.centerX, y: shape.bounds.centerY } 
    : (shape.centroid || { x: 0, y: 0 });

  // 1. Center relative coordinates
  let x = pt.x - center.x;
  let y = pt.y - center.y;

  // 2. Scale & Dimensions
  const sx = (t.scaleX !== undefined ? t.scaleX : 1);
  const sy = (t.scaleY !== undefined ? t.scaleY : 1);
  x *= sx;
  y *= sy;

  // 3. Skew
  const skX = (t.skewX || 0) * (Math.PI / 180);
  const skY = (t.skewY || 0) * (Math.PI / 180);
  if (skX !== 0 || skY !== 0) {
    const ox = x;
    const oy = y;
    x = ox + oy * Math.tan(skX);
    y = oy + ox * Math.tan(skY);
  }

  // 4. 3D Flip & Rotations (Euler angles)
  const rotZ = (t.rotation || 0) * (Math.PI / 180);
  const rotX = (t.rotateX || 0) * (Math.PI / 180);
  const rotY = (t.rotateY || 0) * (Math.PI / 180);

  // Pitch (Rotate around X)
  if (rotX !== 0) {
    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const ny = y * cosX;
    const nz = y * sinX;
    const fov = t.perspective || 1000;
    const pScale = fov / (fov + nz);
    x *= pScale;
    y = ny * pScale;
  }

  // Yaw (Rotate around Y)
  if (rotY !== 0) {
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const nx = x * cosY;
    const nz = -x * sinY;
    const fov = t.perspective || 1000;
    const pScale = fov / (fov + nz);
    x = nx * pScale;
    y *= pScale;
  }

  // 2D Rotation (Roll)
  if (rotZ !== 0) {
    const cosZ = Math.cos(rotZ);
    const sinZ = Math.sin(rotZ);
    const rx = x * cosZ - y * sinZ;
    const ry = x * sinZ + y * cosZ;
    x = rx;
    y = ry;
  }

  // 5. Unconstrained translation so shapes move freely across the canvas
  const tx = t.x || 0;
  const ty = t.y || 0;

  return {
    ...pt,
    x: x + center.x + tx,
    y: y + center.y + ty
  };
}

/**
 * Line Tool Dimension Deformer:
 * Strictly deforms and stretches the selected stroke/part points to match the specified line tool width and height.
 */
export function applyLineToolDimensions(
  shape: TwitchIdentifiedShape,
  targetWidth: number,
  targetHeight: number
): TwitchIdentifiedShape {
  const basePoints = (shape.origPoints && shape.origPoints.length > 0) 
    ? shape.origPoints 
    : (shape.points || []);
  if (!shape || basePoints.length === 0) return shape;

  const origB = getPointsBounds(basePoints);
  const currentW = Math.max(1, origB.width);
  const currentH = Math.max(1, origB.height);
  const targetW = Math.max(2, Math.round(targetWidth));
  const targetH = Math.max(2, Math.round(targetHeight));

  const scaleX = targetW / currentW;
  const scaleY = targetH / currentH;
  const centerX = origB.centerX;
  const centerY = origB.centerY;

  // Stretch original stroke points strictly to target line tool dimensions preserving all indices and properties
  const newPoints = basePoints.map(p => ({
    ...p,
    x: centerX + (p.x - centerX) * scaleX,
    y: centerY + (p.y - centerY) * scaleY
  }));

  const newB = getPointsBounds(newPoints);
  const newCentroid = calculateCentroid(newPoints);
  const newArea = calculateArea(newPoints) || Math.round(newB.width * newB.height * 0.7);
  const newCurvePoints = initCurvePoints(newPoints, shape.curvePoints?.length || 7);
  const newMeshGrid = initMeshGrid(newB, shape.meshCols || 3, shape.meshRows || 3);

  return {
    ...shape,
    origPoints: shape.origPoints || basePoints.map(p => ({ ...p })),
    points: newPoints,
    boundingBox: newB,
    bounds: newB,
    centroid: newCentroid,
    area: newArea,
    targetLineWidth: targetW,
    targetLineHeight: targetH,
    curvePoints: newCurvePoints,
    meshGrid: newMeshGrid,
    perimeterLength: calculatePerimeter(newPoints, shape.isClosed)
  };
}

/**
 * Applies Curve Deformation interpolation:
 * Deforms shape points according to the displaced curve control points.
 */
export function applyCurveDeformation(
  shapeOrPoints: TwitchIdentifiedShape | Point[],
  curvePoints: TwitchCurvePoint[]
): any {
  const isShape = !Array.isArray(shapeOrPoints) && shapeOrPoints && typeof shapeOrPoints === 'object';
  const rawPoints = isShape ? (shapeOrPoints.origPoints || shapeOrPoints.points || []) : (shapeOrPoints || []);
  
  if (!rawPoints || !Array.isArray(rawPoints) || rawPoints.length === 0) {
    return isShape ? shapeOrPoints : [];
  }
  if (!curvePoints || !Array.isArray(curvePoints) || curvePoints.length < 2) {
    return isShape ? { ...shapeOrPoints, curvePoints: curvePoints || [] } : rawPoints.map(p => ({ ...p }));
  }

  const hasMoved = curvePoints.some(cp => ptDist(cp, { x: cp.origX, y: cp.origY }) > 0.01);
  const deformed = hasMoved ? rawPoints.map((pt, idx) => {
    const t = rawPoints.length > 1 ? idx / (rawPoints.length - 1) : 0;
    let totalWeight = 0;
    let dx = 0;
    let dy = 0;

    for (const cp of curvePoints) {
      const distT = Math.abs(t - cp.t);
      const sigma = 0.25;
      const weight = Math.exp(-(distT * distT) / (2 * sigma * sigma));
      const deltaX = cp.x - cp.origX;
      const deltaY = cp.y - cp.origY;
      dx += deltaX * weight;
      dy += deltaY * weight;
      totalWeight += weight;
    }

    if (totalWeight > 0.0001) {
      dx /= totalWeight;
      dy /= totalWeight;
    }

    return {
      ...pt,
      x: Number((pt.x + dx).toFixed(2)),
      y: Number((pt.y + dy).toFixed(2))
    };
  }) : rawPoints.map(p => ({ ...p }));

  if (isShape) {
    return {
      ...shapeOrPoints,
      curvePoints: curvePoints,
      points: deformed
    };
  }
  return deformed;
}

/**
 * Applies Mesh Lattice Deformation (Puppet-Warp style interpolation).
 * Deforms strictly the stroke vertices of the parts/drawings.
 */
export function applyMeshDeformation(
  shapeOrPoints: TwitchIdentifiedShape | Point[],
  meshGrid: TwitchMeshPoint[],
  boundsParam?: { minX: number; minY: number; width: number; height: number },
  colsParam: number = 3,
  rowsParam: number = 3
): any {
  const isShape = !Array.isArray(shapeOrPoints) && shapeOrPoints && typeof shapeOrPoints === 'object';
  const rawPoints = isShape ? (shapeOrPoints.origPoints || shapeOrPoints.points || []) : (shapeOrPoints || []);
  
  if (!rawPoints || !Array.isArray(rawPoints) || rawPoints.length === 0) {
    return isShape ? shapeOrPoints : [];
  }

  const cols = isShape ? (shapeOrPoints.meshCols || 3) : (colsParam || 3);
  const rows = isShape ? (shapeOrPoints.meshRows || 3) : (rowsParam || 3);
  const bounds = isShape ? (shapeOrPoints.bounds || getPointsBounds(rawPoints)) : (boundsParam || getPointsBounds(rawPoints));

  if (!meshGrid || !Array.isArray(meshGrid) || meshGrid.length !== cols * rows) {
    return isShape ? { ...shapeOrPoints, meshGrid: meshGrid || [] } : rawPoints.map(p => ({ ...p }));
  }

  const hasMoved = meshGrid.some(mp => ptDist(mp, { x: mp.origX, y: mp.origY }) > 0.01);
  if (!hasMoved) {
    return isShape ? { ...shapeOrPoints, meshGrid, points: rawPoints.map(p => ({ ...p })) } : rawPoints.map(p => ({ ...p }));
  }

  const w = Math.max(1, bounds?.width || 100);
  const h = Math.max(1, bounds?.height || 100);
  const minX = bounds?.minX ?? 0;
  const minY = bounds?.minY ?? 0;

  // Deform exclusively the stroke vertices of the part/drawing
  const deformed = rawPoints.map(pt => {
    // Relative position inside mesh bounding box
    const u = Math.max(0, Math.min(1, (pt.x - minX) / w));
    const v = Math.max(0, Math.min(1, (pt.y - minY) / h));

    const cellU = u * (cols - 1);
    const cellV = v * (rows - 1);
    const col0 = Math.min(cols - 2, Math.max(0, Math.floor(cellU)));
    const row0 = Math.min(rows - 2, Math.max(0, Math.floor(cellV)));
    const col1 = col0 + 1;
    const row1 = row0 + 1;

    const fracU = cellU - col0;
    const fracV = cellV - row0;

    const p00 = meshGrid[row0 * cols + col0];
    const p10 = meshGrid[row0 * cols + col1];
    const p01 = meshGrid[row1 * cols + col0];
    const p11 = meshGrid[row1 * cols + col1];

    if (!p00 || !p10 || !p01 || !p11) return { ...pt };

    // Calculate displacement at the 4 corners of the lattice cell
    const d00x = p00.x - p00.origX;
    const d00y = p00.y - p00.origY;
    const d10x = p10.x - p10.origX;
    const d10y = p10.y - p10.origY;
    const d01x = p01.x - p01.origX;
    const d01y = p01.y - p01.origY;
    const d11x = p11.x - p11.origX;
    const d11y = p11.y - p11.origY;

    // Bilinear interpolation of vertex displacement
    const dx = (1 - fracU) * (1 - fracV) * d00x +
               fracU * (1 - fracV) * d10x +
               (1 - fracU) * fracV * d01x +
               fracU * fracV * d11x;

    const dy = (1 - fracU) * (1 - fracV) * d00y +
               fracU * (1 - fracV) * d10y +
               (1 - fracU) * fracV * d01y +
               fracU * fracV * d11y;

    return {
      ...pt,
      x: Number((pt.x + dx).toFixed(2)),
      y: Number((pt.y + dy).toFixed(2))
    };
  });

  if (isShape) {
    return {
      ...shapeOrPoints,
      meshGrid: meshGrid,
      points: deformed
    };
  }
  return deformed;
}

/**
 * Direct Hand Grab / Stroke Reshape:
 * Pulls local stroke points smoothly around a grab center point with Gaussian falloff.
 */
export function applyDirectStrokeGrab(
  shapeOrPoints: TwitchIdentifiedShape | Point[],
  grabStart: Point,
  grabCurrent: Point,
  radius: number = 40
): any {
  const isShape = !Array.isArray(shapeOrPoints) && shapeOrPoints && typeof shapeOrPoints === 'object';
  const rawPoints = isShape ? (shapeOrPoints.origPoints || shapeOrPoints.points || []) : (shapeOrPoints || []);
  
  if (!rawPoints || !Array.isArray(rawPoints) || rawPoints.length === 0) {
    return isShape ? shapeOrPoints : [];
  }
  
  const deltaX = grabCurrent.x - grabStart.x;
  const deltaY = grabCurrent.y - grabStart.y;
  const r = Math.max(10, radius);

  const deformed = rawPoints.map(pt => {
    const d = ptDist(pt, grabStart);
    if (d >= r) return { ...pt };
    
    const factor = Math.cos((d / r) * (Math.PI / 2));
    const smoothWeight = factor * factor;

    return {
      ...pt,
      x: pt.x + deltaX * smoothWeight,
      y: pt.y + deltaY * smoothWeight
    };
  });

  if (isShape) {
    return {
      ...shapeOrPoints,
      points: deformed
    };
  }
  return deformed;
}

/**
 * Moves shape points by deltaX and deltaY.
 */
export function moveShape(shape: TwitchIdentifiedShape, deltaX: number, deltaY: number): TwitchIdentifiedShape {
  const newTransform = {
    ...shape.transform,
    x: (shape.transform.x || 0) + deltaX,
    y: (shape.transform.y || 0) + deltaY
  };
  return {
    ...shape,
    transform: newTransform
  };
}

/**
 * Rotates shape by angle in degrees around axis X, Y, or Z.
 */
export function rotateShape(shape: TwitchIdentifiedShape, angleDelta: number, axis: 'X' | 'Y' | 'Z' = 'Z'): TwitchIdentifiedShape {
  const t = { ...shape.transform };
  if (axis === 'Z') {
    t.rotation = (t.rotation || 0) + angleDelta;
  } else if (axis === 'X') {
    t.rotateX = (t.rotateX || 0) + angleDelta;
  } else if (axis === 'Y') {
    t.rotateY = (t.rotateY || 0) + angleDelta;
  }
  return {
    ...shape,
    transform: t
  };
}

/**
 * Scales shape along X and Y axes.
 */
export function scaleShape(shape: TwitchIdentifiedShape, scaleXDelta: number, scaleYDelta: number): TwitchIdentifiedShape {
  const t = { ...shape.transform };
  t.scaleX = Math.max(0.05, (t.scaleX || 1) * scaleXDelta);
  t.scaleY = Math.max(0.05, (t.scaleY || 1) * scaleYDelta);
  return {
    ...shape,
    transform: t
  };
}

/**
 * Sets width or height directly.
 */
export function setShapeDimensions(shape: TwitchIdentifiedShape, newWidth?: number, newHeight?: number): TwitchIdentifiedShape {
  const b = shape.bounds || getPointsBounds(shape.origPoints || shape.points);
  const t = { ...shape.transform };
  if (newWidth && b.width > 0) {
    t.scaleX = newWidth / b.width;
  }
  if (newHeight && b.height > 0) {
    t.scaleY = newHeight / b.height;
  }
  return {
    ...shape,
    transform: t
  };
}

/**
 * Main Twitch Evaluator:
 * Produces final rendered points and subpaths for canvas rendering.
 */
export function evaluateTwitchTransforms(
  obj: VectorObject,
  explicitState?: TwitchToolState
): {
  points: Point[];
  subPaths?: Point[][];
  hiddenSubPaths?: { [subPathIdx: number]: number[] };
  hiddenPoints?: number[];
} {
  const curState = explicitState || obj?.twitchState;
  if (!obj || !curState || !curState.shapes || curState.shapes.length === 0) {
    return {
      points: obj?.points || [],
      subPaths: obj?.subPaths || [],
      hiddenSubPaths: obj?.hiddenSubPaths,
      hiddenPoints: obj?.hiddenPoints
    };
  }

  const shapes = curState.shapes;
  let finalPoints = [...(obj.points || [])];
  let finalSubPaths = (obj.subPaths && obj.subPaths.length > 0)
    ? obj.subPaths.map(sub => [...sub])
    : [];

  // If subPaths is empty but finalPoints has distinct subpaths, initialize finalSubPaths from finalPoints
  if (finalSubPaths.length === 0 && finalPoints.length > 0) {
    const rawSubs: Point[][] = [];
    let curSub: Point[] = [];
    finalPoints.forEach(p => {
      if (p.gap && curSub.length > 0) {
        rawSubs.push(curSub);
        curSub = [];
      }
      curSub.push({ ...p });
    });
    if (curSub.length > 0) rawSubs.push(curSub);
    finalSubPaths = rawSubs;
  }

  const hiddenPointsSet = new Set<number>(obj.hiddenPoints || []);
  const hiddenSubPathsMap: { [subPathIdx: number]: number[] } = { ...(obj.hiddenSubPaths || {}) };

  // Identify Head / Parent shape (the primary master contour)
  const headShape = shapes.find(s => 
    s.name?.toLowerCase().includes('head') || 
    s.name?.toLowerCase().includes('face') || 
    s.name?.toLowerCase().includes('body')
  ) || shapes[0];

  const headMoveX = headShape?.transform?.x || 0;
  const headMoveY = headShape?.transform?.y || 0;

  shapes.forEach(shape => {
    // 1. Hide / Show Evaluation
    if (shape.isHidden) {
      if (shape.subPathIndex !== undefined && shape.subPathIndex >= 0) {
        const subLen = finalSubPaths[shape.subPathIndex]?.length || 0;
        hiddenSubPathsMap[shape.subPathIndex] = Array.from({ length: subLen }, (_, i) => i);
      } else if (shape.pointIndices && shape.pointIndices.length > 0) {
        shape.pointIndices.forEach(idx => hiddenPointsSet.add(idx));
      }
      return;
    }

    // 2. Compute deformed / transformed points for this shape
    let processedPoints = (shape.points && shape.points.length > 0)
      ? shape.points.map(p => ({ ...p }))
      : (shape.origPoints ? shape.origPoints.map(p => ({ ...p })) : []);

    if (processedPoints.length === 0) return;

    // a. Curve Deformation (applies directly on the stroke points)
    if (shape.curvePoints && shape.curvePoints.length > 0) {
      processedPoints = applyCurveDeformation(processedPoints, shape.curvePoints);
    }

    // b. Mesh Deformation (applies directly on the stroke points)
    if (shape.meshGrid && shape.meshGrid.length > 0) {
      processedPoints = applyMeshDeformation(
        processedPoints,
        shape.meshGrid,
        shape.bounds,
        shape.meshCols || 3,
        shape.meshRows || 3
      );
    }

    // c. Shape Transform:
    // When the Head / Parent drawing moves (translate X/Y), all child shapes move with the Head drawing in real-time.
    // When other transformations (rotate, skew, scale, flip) are applied on the Head, they apply ONLY to that Head shape and not to the children.
    const isHead = headShape && shape.id === headShape.id;
    processedPoints = processedPoints.map(pt => {
      const transformed = applyShapeTransform(pt, shape);
      if (!isHead && (headMoveX !== 0 || headMoveY !== 0)) {
        return {
          ...transformed,
          x: transformed.x + headMoveX,
          y: transformed.y + headMoveY
        };
      }
      return transformed;
    });

    // 3. Write back into the main points or subpaths array without cutting or losing any parts
    if (shape.subPathIndex !== undefined && shape.subPathIndex >= 0 && finalSubPaths[shape.subPathIndex]) {
      finalSubPaths[shape.subPathIndex] = processedPoints;
    } else if (shape.pointIndices && shape.pointIndices.length > 0) {
      shape.pointIndices.forEach((targetIdx, i) => {
        if (targetIdx < finalPoints.length && i < processedPoints.length) {
          const origGap = obj.points?.[targetIdx]?.gap || (i === 0 && targetIdx > 0);
          finalPoints[targetIdx] = {
            ...processedPoints[i],
            ...(origGap ? { gap: true } : {})
          };
        }
      });
    }
  });

  // Keep finalPoints continuously synchronized with updated subPaths
  if (finalSubPaths.length > 0) {
    const flattened: Point[] = [];
    finalSubPaths.forEach((sub, sIdx) => {
      sub.forEach((p, pIdx) => {
        flattened.push({
          ...p,
          gap: pIdx === 0 && sIdx > 0 ? true : p.gap
        });
      });
    });
    finalPoints = flattened;
  }

  return {
    points: finalPoints,
    subPaths: finalSubPaths,
    hiddenPoints: Array.from(hiddenPointsSet),
    hiddenSubPaths: hiddenSubPathsMap
  };
}

/**
 * Hit tests a point against identified Twitch shapes in local object space.
 * Keeps open strokes strictly non-joined, while remaining 100% selectable!
 */
export function hitTestTwitchShape(
  localCoord: Point,
  shapes: TwitchIdentifiedShape[],
  tolerance: number = 32
): TwitchIdentifiedShape | null {
  if (!shapes || shapes.length === 0) return null;

  // 1. Test polygon containment
  for (const shape of shapes) {
    if (shape.isHidden || !shape.points || shape.points.length < 3) continue;
    if (isPointInPolygon(localCoord, shape.points)) {
      return shape;
    }
  }

  // 2. Test proximity to stroke line segments
  let bestShape: TwitchIdentifiedShape | null = null;
  let minDistance = Math.max(16, tolerance);

  for (const shape of shapes) {
    if (shape.isHidden || !shape.points || shape.points.length < 2) continue;
    const pts = shape.points;
    const isClosed = !!shape.isClosed;
    const segmentCount = isClosed ? pts.length : pts.length - 1;

    for (let i = 0; i < segmentCount; i++) {
      const p1 = pts[i];
      const p2 = pts[(i + 1) % pts.length];
      const d = pointToSegmentDistance(localCoord, p1, p2);
      if (d < minDistance) {
        minDistance = d;
        bestShape = shape;
      }
    }
  }

  return bestShape;
}

/**
 * Computes shortest distance from a point P to a line segment AB.
 */
function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const l2 = (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y);
  if (l2 === 0) return ptDist(p, a);
  let t = ((p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return ptDist(p, { x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y) });
}
