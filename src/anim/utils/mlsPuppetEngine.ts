import { Point, PuppetPin, VectorObject } from '../types';
import { distance } from './math';

/**
 * Moving Least Squares (MLS) Puppet Warp Engine
 * Computes organic, physics-smooth deformation based on control pins.
 * All wrapped in try-catch.
 */

export function deformPointsWithMLS(
  points: Point[],
  pins: PuppetPin[],
  alpha: number = 1.0
): Point[] {
  try {
    if (!pins || pins.length < 2) return points;

    // Moving Least Squares similarity deformation
    return points.map(v => {
      let wSum = 0;
      const weights: number[] = [];

      for (let i = 0; i < pins.length; i++) {
        const pin = pins[i];
        const distSq = (v.x - pin.origX) ** 2 + (v.y - pin.origY) ** 2;
        const w = 1 / Math.max(0.0001, Math.pow(distSq, alpha));
        weights.push(w);
        wSum += w;
      }

      if (wSum === 0) return { ...v };

      // Centroids
      let pStarX = 0;
      let pStarY = 0;
      let qStarX = 0;
      let qStarY = 0;

      for (let i = 0; i < pins.length; i++) {
        const pin = pins[i];
        const normW = weights[i] / wSum;
        pStarX += normW * pin.origX;
        pStarY += normW * pin.origY;
        qStarX += normW * pin.x;
        qStarY += normW * pin.y;
      }

      // Linear similarity transformation
      let mu = 0;
      for (let i = 0; i < pins.length; i++) {
        const pin = pins[i];
        const phatX = pin.origX - pStarX;
        const phatY = pin.origY - pStarY;
        mu += weights[i] * (phatX * phatX + phatY * phatY);
      }

      if (mu === 0) return { ...v };

      let curX = 0;
      let curY = 0;
      const vHatX = v.x - pStarX;
      const vHatY = v.y - pStarY;

      for (let i = 0; i < pins.length; i++) {
        const pin = pins[i];
        const phatX = pin.origX - pStarX;
        const phatY = pin.origY - pStarY;
        const qhatX = pin.x - qStarX;
        const qhatY = pin.y - qStarY;

        // A_i matrix computation
        const s = (weights[i] / mu);
        const a11 = s * (phatX * vHatX + phatY * vHatY);
        const a12 = s * (phatX * vHatY - phatY * vHatX);

        curX += a11 * qhatX - a12 * qhatY;
        curY += a12 * qhatX + a11 * qhatY;
      }

      return {
        x: Number((curX + qStarX).toFixed(2)),
        y: Number((curY + qStarY).toFixed(2))
      };
    });
  } catch (err: any) {
    console.error('deformPointsWithMLS error:', err);
    return points;
  }
}
