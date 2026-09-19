import { Point, VectorObject } from '../types';
import { distance, worldToLocal, localToWorld } from './math';

/**
 * Knife Tool Engine
 * Cuts vector objects along a straight slice line or lasso area into distinct vector objects.
 * All wrapped in try-catch.
 */

export interface KnifeCutResult {
  newObjects: VectorObject[];
  originalId: string;
  success: boolean;
}

export function sliceVectorObjectWithLine(
  obj: VectorObject,
  lineStart: Point,
  lineEnd: Point,
  separateDistance: number = 15
): KnifeCutResult {
  try {
    if (!obj || (!obj.points?.length && !obj.subPaths?.length)) {
      return { newObjects: [], originalId: obj?.id || '', success: false };
    }

    const pivot = obj.pivots?.[0] || { localX: 0, localY: 0 };
    const localStart = worldToLocal(lineStart, obj.transform, pivot);
    const localEnd = worldToLocal(lineEnd, obj.transform, pivot);

    // Line equation: (y2 - y1) * x - (x2 - x1) * y + x2*y1 - y2*x1 = 0
    const A = localEnd.y - localStart.y;
    const B = -(localEnd.x - localStart.x);
    const C = localEnd.x * localStart.y - localEnd.y * localStart.x;
    const normalLen = Math.hypot(A, B);

    if (normalLen < 0.001) {
      return { newObjects: [], originalId: obj.id, success: false };
    }

    const sideA_points: Point[] = [];
    const sideB_points: Point[] = [];

    const allSubpaths = obj.subPaths && obj.subPaths.length > 0 ? obj.subPaths : [obj.points];
    const sideA_subs: Point[][] = [];
    const sideB_subs: Point[][] = [];

    const normX = A / normalLen;
    const normY = B / normalLen;

    allSubpaths.forEach(sub => {
      let curSideA: Point[] = [];
      let curSideB: Point[] = [];

      for (let i = 0; i < sub.length; i++) {
        const p = sub[i];
        const signedDist = (A * p.x + B * p.y + C) / normalLen;

        if (signedDist >= 0) {
          // Side A
          if (curSideB.length > 1) {
            sideB_subs.push(curSideB);
            curSideB = [];
          }
          curSideA.push({
            x: p.x + normX * (separateDistance * 0.5),
            y: p.y + normY * (separateDistance * 0.5)
          });
        } else {
          // Side B
          if (curSideA.length > 1) {
            sideA_subs.push(curSideA);
            curSideA = [];
          }
          curSideB.push({
            x: p.x - normX * (separateDistance * 0.5),
            y: p.y - normY * (separateDistance * 0.5)
          });
        }
      }

      if (curSideA.length > 1) sideA_subs.push(curSideA);
      if (curSideB.length > 1) sideB_subs.push(curSideB);
    });

    if (sideA_subs.length === 0 || sideB_subs.length === 0) {
      // Cut line didn't bisect the object
      return { newObjects: [], originalId: obj.id, success: false };
    }

    const objA: VectorObject = {
      ...obj,
      id: `cut_a_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: `${obj.name || 'Object'} (Part 1)`,
      points: sideA_subs[0] || [],
      subPaths: sideA_subs.length > 1 ? sideA_subs : undefined,
    };

    const objB: VectorObject = {
      ...obj,
      id: `cut_b_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      name: `${obj.name || 'Object'} (Part 2)`,
      points: sideB_subs[0] || [],
      subPaths: sideB_subs.length > 1 ? sideB_subs : undefined,
    };

    return {
      newObjects: [objA, objB],
      originalId: obj.id,
      success: true
    };
  } catch (err: any) {
    console.error('sliceVectorObjectWithLine error:', err);
    return { newObjects: [], originalId: obj?.id || '', success: false };
  }
}
