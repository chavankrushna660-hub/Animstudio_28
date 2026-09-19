import { Point, VectorObject } from '../types';
import { distance, worldToLocal, localToWorld } from './math';

/**
 * Real Vector Eraser Engine
 * Truly removes/cuts geometry from vector objects instead of painting white.
 * Background transparency is preserved 100%.
 * All functions are enclosed in try-catch blocks.
 */

export interface EraserResult {
  updatedObjects: { [id: string]: VectorObject };
  deletedObjectIds: string[];
  affected: boolean;
}

export function applyRealVectorEraser(
  objects: { [id: string]: VectorObject },
  eraserPos: Point,
  radius: number,
  mode: 'cut' | 'stroke',
  activeLayerId?: string
): EraserResult {
  try {
    const updatedObjects: { [id: string]: VectorObject } = { ...objects };
    const deletedObjectIds: string[] = [];
    let affected = false;

    for (const id of Object.keys(objects)) {
      const obj = objects[id];
      if (!obj || obj.isLocked || obj.isHidden) continue;
      if (activeLayerId && obj.layerId && obj.layerId !== activeLayerId) continue;

      const pivot = obj.pivots?.[0] || { localX: 0, localY: 0 };
      const localEraserPos = worldToLocal(eraserPos, obj.transform, pivot);
      const effectiveRadius = radius / (Math.max(0.1, obj.transform.scaleX || 1));

      // 1. STROKE ERASE MODE: Delete entire object if touched
      if (mode === 'stroke') {
        let isHit = false;
        const allPoints: Point[] = [
          ...(obj.points || []),
          ...(obj.subPaths ? obj.subPaths.flat() : [])
        ];

        for (const p of allPoints) {
          if (distance(localEraserPos, p) <= effectiveRadius) {
            isHit = true;
            break;
          }
        }

        if (isHit) {
          deletedObjectIds.push(id);
          delete updatedObjects[id];
          affected = true;
        }
        continue;
      }

      // 2. REAL CUT / SLICE ERASE MODE: Cut out points inside eraser radius
      if (mode === 'cut') {
        const processPointList = (pts: Point[]): Point[][] => {
          const survivingSubpaths: Point[][] = [];
          let currentSub: Point[] = [];

          for (let i = 0; i < pts.length; i++) {
            const p = pts[i];
            const dist = distance(localEraserPos, p);

            if (dist > effectiveRadius) {
              currentSub.push(p);
            } else {
              // Point is erased! Split current subpath
              if (currentSub.length > 0) {
                survivingSubpaths.push(currentSub);
                currentSub = [];
              }
            }
          }

          if (currentSub.length > 0) {
            survivingSubpaths.push(currentSub);
          }

          return survivingSubpaths;
        };

        let objectChanged = false;
        let nextSubPaths: Point[][] = [];

        if (obj.subPaths && obj.subPaths.length > 0) {
          for (const sub of obj.subPaths) {
            const split = processPointList(sub);
            if (split.length !== 1 || split[0].length !== sub.length) {
              objectChanged = true;
            }
            nextSubPaths.push(...split);
          }
        } else if (obj.points && obj.points.length > 0) {
          const split = processPointList(obj.points);
          if (split.length !== 1 || split[0].length !== obj.points.length) {
            objectChanged = true;
          }
          nextSubPaths = split;
        }

        // Filter out single-point residual fragments
        nextSubPaths = nextSubPaths.filter(sub => sub.length > 1);

        if (objectChanged) {
          affected = true;
          if (nextSubPaths.length === 0) {
            // Entire drawing erased away
            deletedObjectIds.push(id);
            delete updatedObjects[id];
          } else {
            updatedObjects[id] = {
              ...obj,
              points: nextSubPaths[0] || [],
              subPaths: nextSubPaths.length > 1 ? nextSubPaths : undefined,
            };
          }
        }
      }
    }

    return { updatedObjects, deletedObjectIds, affected };
  } catch (err: any) {
    console.error('applyRealVectorEraser error:', err);
    return { updatedObjects: objects, deletedObjectIds: [], affected: false };
  }
}
