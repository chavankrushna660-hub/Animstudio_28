// @ts-nocheck
import { Point, VectorObject, Rule3DState, Rule3DStrokePath, Rule3DPoint, Rule3DDetectedPart } from '../types';

/**
 * Calculates bounding box of a list of points
 */
export function calculateStrokeBounds(points: Point[]): { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number; centerX: number; centerY: number } {
  if (!points || points.length === 0) {
    return { minX: -50, minY: -50, maxX: 50, maxY: 50, width: 100, height: 100, centerX: 0, centerY: 0 };
  }
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  points.forEach(p => {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  });
  const width = Math.max(10, maxX - minX);
  const height = Math.max(10, maxY - minY);
  const centerX = minX + width / 2;
  const centerY = minY + height / 2;
  return { minX, minY, maxX, maxY, width, height, centerX, centerY };
}

/**
 * Infers semantic classification and 3D surface depth for a given stroke path
 */
function inferSemanticPart(
  pathPoints: Point[],
  bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number; centerX: number; centerY: number },
  isMainContour: boolean,
  partIndex: number
): {
  partName: string;
  side: 'center' | 'left' | 'right';
  baseZ: number;
  isClosed: boolean;
} {
  if (isMainContour) {
    return {
      partName: 'Face Contour',
      side: 'center',
      baseZ: 0,
      isClosed: true
    };
  }

  const pBounds = calculateStrokeBounds(pathPoints);
  const relX = (pBounds.centerX - bounds.centerX) / (bounds.width / 2); // -1.0 (far left) to +1.0 (far right)
  const relY = (pBounds.centerY - bounds.minY) / bounds.height; // 0.0 (top) to 1.0 (bottom)
  const relWidth = pBounds.width / bounds.width;
  const relHeight = pBounds.height / bounds.height;

  const isClosed = pathPoints.length > 2 && Math.hypot(pathPoints[0].x - pathPoints[pathPoints.length - 1].x, pathPoints[0].y - pathPoints[pathPoints.length - 1].y) < 25;

  // Rule 1: Lateral Ears (Left / Right sides near edges, mid height)
  if (Math.abs(relX) > 0.45 && relY >= 0.25 && relY <= 0.7) {
    const side = relX < 0 ? 'left' : 'right';
    return {
      partName: side === 'left' ? 'Left Ear' : 'Right Ear',
      side,
      baseZ: -25, // Ears sit laterally/slightly behind the face plane
      isClosed
    };
  }

  // Rule 2: Eyes (Upper middle, symmetric left/right)
  if (relY >= 0.2 && relY <= 0.55 && Math.abs(relX) > 0.12 && Math.abs(relX) <= 0.48 && relHeight < 0.35) {
    const side = relX < 0 ? 'left' : 'right';
    return {
      partName: side === 'left' ? 'Left Eye' : 'Right Eye',
      side,
      baseZ: 18, // Eyes sit on the forward front surface
      isClosed
    };
  }

  // Rule 3: Nose (Center vertical axis, mid-face between eyes and mouth)
  if (Math.abs(relX) <= 0.22 && relY >= 0.38 && relY <= 0.68) {
    return {
      partName: 'Nose Bridge',
      side: 'center',
      baseZ: 40, // Nose has highest forward protrusion
      isClosed
    };
  }

  // Rule 4: Mouth / Lips (Center, lower third of face)
  if (Math.abs(relX) <= 0.32 && relY > 0.65 && relY <= 0.9) {
    return {
      partName: 'Mouth / Lips',
      side: 'center',
      baseZ: 14,
      isClosed
    };
  }

  // Rule 5: Eyebrows (Top region above eyes)
  if (relY >= 0.12 && relY < 0.32 && Math.abs(relX) > 0.1 && Math.abs(relX) <= 0.48) {
    const side = relX < 0 ? 'left' : 'right';
    return {
      partName: side === 'left' ? 'Left Eyebrow' : 'Right Eyebrow',
      side,
      baseZ: 22,
      isClosed
    };
  }

  // Rule 6: Head / Torso / Limbs for full body drawings and PNG character parts
  if (relY < 0.35 && relWidth < 0.6) {
    return {
      partName: 'Head / Crown',
      side: 'center',
      baseZ: 20,
      isClosed
    };
  }

  if (relY >= 0.35 && relY < 0.75 && Math.abs(relX) < 0.4) {
    return {
      partName: 'Torso / Core',
      side: 'center',
      baseZ: 12,
      isClosed
    };
  }

  if (relX < -0.3 && relY >= 0.25 && relY < 0.75) {
    return {
      partName: 'Left Arm / Flank',
      side: 'left',
      baseZ: 5,
      isClosed
    };
  }

  if (relX > 0.3 && relY >= 0.25 && relY < 0.75) {
    return {
      partName: 'Right Arm / Flank',
      side: 'right',
      baseZ: 5,
      isClosed
    };
  }

  if (relY >= 0.7) {
    const side = relX < -0.05 ? 'left' : relX > 0.05 ? 'right' : 'center';
    return {
      partName: side === 'left' ? 'Left Leg / Base' : side === 'right' ? 'Right Leg / Base' : 'Lower Base',
      side,
      baseZ: 8,
      isClosed
    };
  }

  // Rule 7: Limbs / Hands / Generic Feature
  const side = relX < -0.15 ? 'left' : relX > 0.15 ? 'right' : 'center';
  return {
    partName: `Part ${partIndex + 1}`,
    side,
    baseZ: 10,
    isClosed
  };
}

/**
 * Constructs 3D Soul & Stroke Memory from a 2D VectorObject (Drawings & PNG Images)
 */
export function build3DSoulFromVectorObject(
  sourceObject: VectorObject,
  volumetricDepth: number = 45,
  profile: 'ellipsoid' | 'cylinder' | 'planar' | 'spherical' = 'ellipsoid'
): Rule3DState {
  const allPoints: Point[] = [];
  if (sourceObject.points && sourceObject.points.length > 0) {
    allPoints.push(...sourceObject.points);
  }
  if (sourceObject.subPaths && sourceObject.subPaths.length > 0) {
    sourceObject.subPaths.forEach(sub => allPoints.push(...sub));
  }

  const bounds = calculateStrokeBounds(allPoints.length > 0 ? allPoints : [{ x: 0, y: 0 }]);
  const halfW = bounds.width / 2 || 1;
  const halfH = bounds.height / 2 || 1;

  const rawPaths: { points: Point[]; isMain: boolean; subPathIdx?: number; customName?: string }[] = [];

  const isPngImage = sourceObject.type === 'image' || !!sourceObject.imageUrl;

  if (sourceObject.points && sourceObject.points.length > 0) {
    rawPaths.push({ points: sourceObject.points, isMain: true });
  }

  if (sourceObject.subPaths && sourceObject.subPaths.length > 0) {
    sourceObject.subPaths.forEach((sub, idx) => {
      rawPaths.push({ points: sub, isMain: rawPaths.length === 0, subPathIdx: idx });
    });
  }

  // If PNG image with only bounding box points (<=4 points) and no subpaths, generate multi-part volumetric contour slices
  if (isPngImage && rawPaths.length <= 1 && (rawPaths[0]?.points?.length || 0) <= 4) {
    const minX = bounds.minX;
    const maxX = bounds.maxX;
    const minY = bounds.minY;
    const maxY = bounds.maxY;
    const cX = bounds.centerX;
    const cY = bounds.centerY;

    // 1. Silhouette Perimeter (32 points)
    const perimeter: Point[] = [];
    const steps = 32;
    for (let i = 0; i < steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const px = cX + Math.cos(angle) * (bounds.width / 2);
      const py = cY + Math.sin(angle) * (bounds.height / 2);
      perimeter.push({ x: Number(px.toFixed(2)), y: Number(py.toFixed(2)) });
    }
    rawPaths[0] = { points: perimeter, isMain: true, customName: 'Silhouette Boundary' };

    // 2. Head / Top Crown Slice
    const headSlice: Point[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      headSlice.push({
        x: Number((minX + t * bounds.width).toFixed(2)),
        y: Number((minY + 0.2 * bounds.height).toFixed(2))
      });
    }
    rawPaths.push({ points: headSlice, isMain: false, subPathIdx: 0, customName: 'Head / Crown' });

    // 3. Torso / Core Mid Slice
    const torsoSlice: Point[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      torsoSlice.push({
        x: Number((minX + t * bounds.width).toFixed(2)),
        y: Number((minY + 0.5 * bounds.height).toFixed(2))
      });
    }
    rawPaths.push({ points: torsoSlice, isMain: false, subPathIdx: 1, customName: 'Torso / Core' });

    // 4. Base / Limbs Lower Slice
    const baseSlice: Point[] = [];
    for (let i = 0; i <= 16; i++) {
      const t = i / 16;
      baseSlice.push({
        x: Number((minX + t * bounds.width).toFixed(2)),
        y: Number((minY + 0.8 * bounds.height).toFixed(2))
      });
    }
    rawPaths.push({ points: baseSlice, isMain: false, subPathIdx: 2, customName: 'Base / Limbs' });
  }

  const strokes3D: Rule3DStrokePath[] = [];
  const detectedParts: Rule3DDetectedPart[] = [];

  rawPaths.forEach((pathItem, pathIdx) => {
    if (!pathItem.points || pathItem.points.length === 0) return;

    const semantic = pathItem.customName
      ? {
          partName: pathItem.customName,
          side: pathItem.customName.includes('Left') ? 'left' as const : pathItem.customName.includes('Right') ? 'right' as const : 'center' as const,
          baseZ: pathItem.customName.includes('Head') ? 22 : pathItem.customName.includes('Torso') ? 14 : pathItem.customName.includes('Boundary') ? 0 : 8,
          isClosed: pathItem.points.length > 2
        }
      : inferSemanticPart(pathItem.points, bounds, pathItem.isMain, pathIdx);

    const pBounds = calculateStrokeBounds(pathItem.points);

    const points3D: Rule3DPoint[] = pathItem.points.map(pt => {
      // Local offset relative to drawing center
      const dx = (pt.x - bounds.centerX) / halfW; // -1 to 1
      const dy = (pt.y - bounds.centerY) / halfH; // -1 to 1
      const r2 = dx * dx + dy * dy;

      let surfaceZ = 0;
      let nx = 0, ny = 0, nz = 1;

      if (profile === 'ellipsoid' || profile === 'spherical') {
        const factor = Math.max(0, 1 - Math.min(1, r2));
        surfaceZ = Math.sqrt(factor) * volumetricDepth;
        nx = dx;
        ny = dy;
        nz = Math.sqrt(factor);
      } else if (profile === 'cylinder') {
        const factorX = Math.max(0, 1 - Math.min(1, dx * dx));
        surfaceZ = Math.sqrt(factorX) * volumetricDepth;
        nx = dx;
        ny = 0;
        nz = Math.sqrt(factorX);
      } else {
        surfaceZ = 0;
        nx = 0;
        ny = 0;
        nz = 1;
      }

      // Add semantic feature depth protrusion (e.g. nose forward, ears lateral)
      const finalZ = surfaceZ + semantic.baseZ;

      return {
        x: pt.x,
        y: pt.y,
        z: finalZ,
        normalX: nx,
        normalY: ny,
        normalZ: nz,
        pressure: pt.thickness || 1,
        thickness: pt.thickness,
        color: pt.color,
        gap: pt.gap
      };
    });

    const path3D: Rule3DStrokePath = {
      id: `stroke_3d_${pathIdx}_${Date.now()}`,
      partName: semantic.partName,
      side: semantic.side,
      baseZ: semantic.baseZ,
      points3D,
      subPathIndex: pathItem.subPathIdx,
      isClosed: semantic.isClosed,
      strokeColor: sourceObject.strokeColor,
      strokeWidth: sourceObject.strokeWidth,
      fillColor: sourceObject.fillColor,
      opacity: sourceObject.opacity ?? 1,
      center3D: {
        x: pBounds.centerX,
        y: pBounds.centerY,
        z: semantic.baseZ + volumetricDepth * 0.5
      }
    };

    strokes3D.push(path3D);

    // Register detected part for user fine-tuning
    const existingPart = detectedParts.find(p => p.name === semantic.partName);
    if (existingPart) {
      existingPart.strokeCount += 1;
    } else {
      detectedParts.push({
        id: `part_${pathIdx}`,
        name: semantic.partName,
        side: semantic.side,
        depthOffset: semantic.baseZ,
        visible: true,
        strokeCount: 1
      });
    }
  });

  return {
    enabled: true,
    yaw: 0,
    pitch: 0,
    roll: 0,
    scale3D: 1.0,
    translateX: 0,
    translateY: 0,
    translateZ: 0,
    perspective: 500,
    volumetricDepth,
    foreshorteningEnabled: true,
    occlusionEnabled: true,
    noseDepth: 40,
    eyeDepth: 18,
    earDepth: -25,
    curvatureProfile: profile,
    firstShape: {
      points: sourceObject.points ? [...sourceObject.points.map(p => ({ ...p }))] : [],
      subPaths: sourceObject.subPaths ? sourceObject.subPaths.map(s => s.map(p => ({ ...p }))) : [],
      subPathFills: sourceObject.subPathFills ? { ...sourceObject.subPathFills } : undefined,
      subPathStrokes: sourceObject.subPathStrokes ? { ...sourceObject.subPathStrokes } : undefined,
      strokeColor: sourceObject.strokeColor || '#000000',
      strokeWidth: sourceObject.strokeWidth || 3,
      fillColor: sourceObject.fillColor || 'transparent',
      center: { x: bounds.centerX, y: bounds.centerY },
      bounds,
      strokes3D
    },
    previousState: undefined,
    detectedParts
  };
}

/**
 * 3D Point Transformation with Euler Angles & 4x4 matrix representation
 */
export function transform3DPoint(
  pt: { x: number; y: number; z: number },
  origin: { x: number; y: number; z: number },
  yawDeg: number, // Y-axis
  pitchDeg: number, // X-axis
  rollDeg: number, // Z-axis
  scale: number,
  tx: number,
  ty: number,
  tz: number
): { x: number; y: number; z: number } {
  // Translate to local pivot origin
  let x = (pt.x - origin.x) * scale;
  let y = (pt.y - origin.y) * scale;
  let z = (pt.z - origin.z) * scale;

  const radY = (yawDeg * Math.PI) / 180;
  const radX = (pitchDeg * Math.PI) / 180;
  const radZ = (rollDeg * Math.PI) / 180;

  // 1. Rotation Pitch (around X-axis)
  if (pitchDeg !== 0) {
    const cosX = Math.cos(radX);
    const sinX = Math.sin(radX);
    const y1 = y * cosX - z * sinX;
    const z1 = y * sinX + z * cosX;
    y = y1;
    z = z1;
  }

  // 2. Rotation Yaw (around Y-axis)
  if (yawDeg !== 0) {
    const cosY = Math.cos(radY);
    const sinY = Math.sin(radY);
    const x2 = x * cosY + z * sinY;
    const z2 = -x * sinY + z * cosY;
    x = x2;
    z = z2;
  }

  // 3. Rotation Roll (around Z-axis)
  if (rollDeg !== 0) {
    const cosZ = Math.cos(radZ);
    const sinZ = Math.sin(radZ);
    const x3 = x * cosZ - y * sinZ;
    const y3 = x * sinZ + y * cosZ;
    x = x3;
    y = y3;
  }

  return {
    x: x + origin.x + tx,
    y: y + origin.y + ty,
    z: z + origin.z + tz
  };
}

/**
 * Perspective Projection of 3D point to 2D Screen Space
 */
export function project3DToScreen(
  pt: { x: number; y: number; z: number },
  origin: { x: number; y: number },
  focalLength: number = 500
): { x: number; y: number; scale: number; isBehindCamera: boolean } {
  const zDist = pt.z;
  const denominator = focalLength - zDist;

  if (denominator <= 20) {
    return {
      x: origin.x + (pt.x - origin.x) * 10,
      y: origin.y + (pt.y - origin.y) * 10,
      scale: 10,
      isBehindCamera: true
    };
  }

  const scale = focalLength / denominator;
  const projX = origin.x + (pt.x - origin.x) * scale;
  const projY = origin.y + (pt.y - origin.y) * scale;

  return {
    x: projX,
    y: projY,
    scale,
    isBehindCamera: false
  };
}

/**
 * Strict Rule-Based 2D-to-3D Execution Pipeline:
 * Takes the FirstShape Stroke Memory, applies 3D transforms, calculates occlusion,
 * foreshortens lines, and yields updated 2D points & subPaths for real-time rendering.
 */
export function evaluateRule3DTransform(
  sourceObject: VectorObject,
  ruleState: Rule3DState
): {
  points: Point[];
  subPaths: Point[][];
  hiddenSubPaths: { [subPathIdx: number]: number[] };
  strokesWithDepth: {
    stroke: Rule3DStrokePath;
    projectedPoints: Point[];
    avgZ: number;
    isVisible: boolean;
    foreshortenScale: number;
  }[];
} {
  const first = ruleState.firstShape;
  if (!first || !first.strokes3D || first.strokes3D.length === 0) {
    return {
      points: sourceObject.points || [],
      subPaths: sourceObject.subPaths || [],
      hiddenSubPaths: {},
      strokesWithDepth: []
    };
  }

  const origin3D = { x: first.center.x, y: first.center.y, z: 0 };
  const focal = ruleState.perspective || 500;
  const yaw = ruleState.yaw || 0;
  const pitch = ruleState.pitch || 0;
  const roll = ruleState.roll || 0;
  const scale3D = ruleState.scale3D ?? 1.0;
  const tx = ruleState.translateX || 0;
  const ty = ruleState.translateY || 0;
  const tz = ruleState.translateZ || 0;

  const strokesWithDepth: {
    stroke: Rule3DStrokePath;
    projectedPoints: Point[];
    avgZ: number;
    isVisible: boolean;
    foreshortenScale: number;
  }[] = [];

  // Evaluate each stroke in 3D
  first.strokes3D.forEach(stroke => {
    // Check if user set custom depth offset for this part
    const customPart = ruleState.detectedParts.find(p => p.name === stroke.partName);
    let depthOffset = stroke.baseZ;
    if (customPart && customPart.depthOffset !== undefined) {
      depthOffset = customPart.depthOffset;
    }

    // Apply specific semantic adjustments
    if (stroke.partName.includes('Nose') && ruleState.noseDepth !== undefined) {
      depthOffset = ruleState.noseDepth;
    } else if (stroke.partName.includes('Eye') && ruleState.eyeDepth !== undefined) {
      depthOffset = ruleState.eyeDepth;
    } else if (stroke.partName.includes('Ear') && ruleState.earDepth !== undefined) {
      depthOffset = ruleState.earDepth;
    }

    // Live sync: Use dynamically deformed points from sourceObject if modified by Line Edit or Sculpt tools
    let currentLivePoints: Point[] = [];
    if (stroke.subPathIndex === undefined) {
      currentLivePoints = (sourceObject.points && sourceObject.points.length > 0) ? sourceObject.points : stroke.points3D;
    } else {
      currentLivePoints = (sourceObject.subPaths && sourceObject.subPaths[stroke.subPathIndex] && sourceObject.subPaths[stroke.subPathIndex].length > 0)
        ? sourceObject.subPaths[stroke.subPathIndex]
        : stroke.points3D;
    }

    // Map to 3D Points
    const halfW = first.bounds.width / 2 || 1;
    const halfH = first.bounds.height / 2 || 1;
    const firstCenterX = first.bounds.minX + halfW;
    const firstCenterY = first.bounds.minY + halfH;
    const profile = ruleState.curvatureProfile || 'ellipsoid';
    const volDepth = ruleState.volumetricDepth || 45;

    const points3DToTransform: Rule3DPoint[] = currentLivePoints.map((pt, pIdx) => {
      const existing3d = stroke.points3D[pIdx];
      if (existing3d && Math.abs(existing3d.x - pt.x) < 1e-3 && Math.abs(existing3d.y - pt.y) < 1e-3) {
        return existing3d;
      }
      
      const dx = (pt.x - firstCenterX) / halfW;
      const dy = (pt.y - firstCenterY) / halfH;
      const r2 = dx * dx + dy * dy;

      let surfaceZ = 0;
      let nx = 0, ny = 0, nz = 1;

      if (profile === 'ellipsoid' || profile === 'spherical') {
        const factor = Math.max(0, 1 - Math.min(1, r2));
        surfaceZ = Math.sqrt(factor) * volDepth;
        nx = dx;
        ny = dy;
        nz = Math.sqrt(factor);
      } else if (profile === 'cylinder') {
        const factorX = Math.max(0, 1 - Math.min(1, dx * dx));
        surfaceZ = Math.sqrt(factorX) * volDepth;
        nx = dx;
        ny = 0;
        nz = Math.sqrt(factorX);
      }

      return {
        x: pt.x,
        y: pt.y,
        z: surfaceZ + stroke.baseZ,
        normalX: nx,
        normalY: ny,
        normalZ: nz,
        pressure: pt.thickness || 1,
        thickness: pt.thickness,
        color: pt.color,
        gap: pt.gap
      };
    });

    // Transform all points of this stroke
    let sumZ = 0;
    let sumNormalZ = 0;

    const projectedPoints: Point[] = points3DToTransform.map(p3d => {
      // Adjust Z by part offset
      const localPt = { x: p3d.x, y: p3d.y, z: p3d.z + (depthOffset - stroke.baseZ) };
      const transformed = transform3DPoint(localPt, origin3D, yaw, pitch, roll, scale3D, tx, ty, tz);
      sumZ += transformed.z;

      // Transform normal vector
      const normPt = { x: (p3d.normalX || 0), y: (p3d.normalY || 0), z: (p3d.normalZ || 1) };
      const transformedNormal = transform3DPoint(normPt, { x: 0, y: 0, z: 0 }, yaw, pitch, roll, 1, 0, 0, 0);
      sumNormalZ += transformedNormal.z;

      // Perspective projection
      const proj = project3DToScreen(transformed, first.center, focal);

      // Foreshortening factor: Cosine of angle facing camera
      const cosAngle = Math.max(0.3, Math.abs(Math.cos((yaw * Math.PI) / 180)));
      const strokeThickness = ruleState.foreshorteningEnabled
        ? (p3d.thickness || stroke.strokeWidth || 3) * proj.scale * cosAngle
        : (p3d.thickness || stroke.strokeWidth || 3) * proj.scale;

      return {
        x: proj.x,
        y: proj.y,
        z: transformed.z,
        thickness: Math.max(0.5, strokeThickness),
        color: p3d.color,
        gap: p3d.gap
      };
    });

    const avgZ = sumZ / Math.max(1, points3DToTransform.length);
    const avgNormalZ = sumNormalZ / Math.max(1, points3DToTransform.length);

    // Rule-Based Occlusion & Back-face Culling:
    // When turning, lateral features on the far side (e.g. right ear when turning left, or left ear when turning right)
    // rotate behind the head / contour plane (avgZ becomes significantly negative or normal points backwards)
    let isVisible = true;
    if (customPart && customPart.visible === false) {
      isVisible = false;
    }

    if (ruleState.occlusionEnabled) {
      // Ear occlusion:
      if (stroke.partName.includes('Ear')) {
        if (stroke.side === 'right' && yaw > 28) {
          // Turning right -> right ear disappears behind the head
          isVisible = false;
        } else if (stroke.side === 'left' && yaw < -28) {
          // Turning left -> left ear disappears behind the head
          isVisible = false;
        }
      }

      // Eye partial/full occlusion at extreme profile turns
      if (stroke.partName.includes('Eye')) {
        if (stroke.side === 'right' && yaw > 75) {
          isVisible = false;
        } else if (stroke.side === 'left' && yaw < -75) {
          isVisible = false;
        }
      }

      // Back-face culling for features if rotated past 95°
      if (Math.abs(yaw) > 95 && stroke.partName !== 'Face Contour') {
        if (avgNormalZ < -0.1) {
          isVisible = false;
        }
      }
    }

    const foreshortenScale = Math.max(0.2, Math.abs(Math.cos((yaw * Math.PI) / 180)));

    strokesWithDepth.push({
      stroke,
      projectedPoints,
      avgZ,
      isVisible,
      foreshortenScale
    });
  });

  // Painter's Algorithm: Sort strokes by Z-depth (lower Z in back, higher Z in front)
  strokesWithDepth.sort((a, b) => a.avgZ - b.avgZ);

  // Extract main points and subPaths
  let finalPoints: Point[] = [];
  const finalSubPaths: Point[][] = [];
  const hiddenSubPaths: { [subPathIdx: number]: number[] } = {};

  strokesWithDepth.forEach(item => {
    if (item.stroke.subPathIndex === undefined) {
      finalPoints = item.isVisible ? item.projectedPoints : [];
    } else {
      const sIdx = item.stroke.subPathIndex;
      finalSubPaths[sIdx] = item.projectedPoints;
      if (!item.isVisible) {
        // Mark all points in this subPath as hidden
        hiddenSubPaths[sIdx] = item.projectedPoints.map((_, i) => i);
      }
    }
  });

  return {
    points: finalPoints.length > 0 ? finalPoints : (strokesWithDepth[0]?.projectedPoints || []),
    subPaths: finalSubPaths,
    hiddenSubPaths,
    strokesWithDepth
  };
}
