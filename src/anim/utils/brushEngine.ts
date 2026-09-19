import { Point, BrushSettings } from '../types';

/**
 * High-performance Brush Engine
 * Implements digital, organic, and physical media brush styles with jitter and rotation.
 * All functions are enclosed in try-catch blocks for strict stability.
 */

export function renderBrushSegment(
  ctx: CanvasRenderingContext2D,
  seg: Point[],
  brushSettings: BrushSettings
): void {
  try {
    if (!seg || seg.length === 0) return;

    const baseColor = brushSettings.strokeColor || '#000000';
    const baseWidth = Math.max(1, brushSettings.strokeWidth || 3.5);
    const brushType = brushSettings.brushType || 'solid';
    const opacity = brushSettings.strokeOpacity ?? 1.0;
    const hasJitter = !!(brushSettings.jitterEnabled || brushSettings.rotationJitter || brushSettings.sizeJitter);
    const jitterStrength = brushSettings.jitterAmount ?? 0.5;

    ctx.save();

    // Configure Shadows
    if (brushSettings.shadowEnabled) {
      ctx.shadowColor = brushSettings.shadowColor || '#000000';
      ctx.shadowBlur = brushSettings.shadowBlur || 4;
      ctx.shadowOffsetX = brushSettings.shadowOffsetX || 2;
      ctx.shadowOffsetY = brushSettings.shadowOffsetY || 2;
    }

    ctx.globalAlpha = Math.max(0, Math.min(1, (ctx.globalAlpha || 1) * opacity));

    if (brushType === 'calligraphy') {
      // Calligraphy Chisel Nib: continuous angled ribbon stroke
      ctx.fillStyle = baseColor;
      const angle = ((brushSettings.chiselAngle ?? 45) * Math.PI) / 180;
      const dx = Math.cos(angle) * (baseWidth * 0.8);
      const dy = Math.sin(angle) * (baseWidth * 0.8);

      if (seg.length === 1) {
        ctx.beginPath();
        ctx.moveTo(seg[0].x - dx, seg[0].y - dy);
        ctx.lineTo(seg[0].x + dx, seg[0].y + dy);
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = Math.max(1, baseWidth * 0.4);
        ctx.stroke();
      } else {
        for (let i = 1; i < seg.length; i++) {
          const p1 = seg[i - 1];
          const p2 = seg[i];
          let cdx = dx;
          let cdy = dy;
          if (hasJitter) {
            const rotJitter = brushSettings.rotationJitter ? (Math.random() - 0.5) * 0.4 * jitterStrength : 0;
            const szJitter = brushSettings.sizeJitter ? 1 + (Math.random() - 0.5) * 0.15 * jitterStrength : 1;
            cdx = (Math.cos(angle + rotJitter) * (baseWidth * 0.8)) * szJitter;
            cdy = (Math.sin(angle + rotJitter) * (baseWidth * 0.8)) * szJitter;
          }
          ctx.beginPath();
          ctx.moveTo(p1.x - cdx, p1.y - cdy);
          ctx.lineTo(p2.x - cdx, p2.y - cdy);
          ctx.lineTo(p2.x + cdx, p2.y + cdy);
          ctx.lineTo(p1.x + cdx, p1.y + cdy);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else if (brushType === 'pencil') {
      // Textured Charcoal / Graphite Pencil
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = Math.max(0.5, baseWidth * 0.7);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      if (seg.length === 1) {
        ctx.arc(seg[0].x, seg[0].y, baseWidth / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.moveTo(seg[0].x, seg[0].y);
        for (let i = 1; i < seg.length; i++) {
          const xc = (seg[i].x + seg[i - 1].x) / 2;
          const yc = (seg[i].y + seg[i - 1].y) / 2;
          ctx.quadraticCurveTo(seg[i - 1].x, seg[i - 1].y, xc, yc);
        }
        ctx.lineTo(seg[seg.length - 1].x, seg[seg.length - 1].y);
        ctx.stroke();
      }

      // Graphite Grain Sprinkles
      ctx.fillStyle = baseColor;
      const grainCount = Math.min(8, Math.max(2, Math.floor(baseWidth * 0.4)));
      for (let i = 0; i < seg.length; i++) {
        for (let k = 0; k < grainCount; k++) {
          const spread = (baseWidth * 0.5) * (hasJitter ? (1 + Math.random() * 0.3) : 1);
          const gx = seg[i].x + (Math.random() - 0.5) * spread;
          const gy = seg[i].y + (Math.random() - 0.5) * spread;
          ctx.fillRect(gx, gy, 1, 1);
        }
      }
    } else if (brushType === 'marker') {
      // Translucent Marker / Highlighter
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = baseWidth * 1.2;
      ctx.lineCap = 'square';
      ctx.lineJoin = 'miter';
      ctx.globalAlpha = Math.min(1, ctx.globalAlpha * 0.6);
      ctx.beginPath();
      if (seg.length === 1) {
        ctx.fillRect(seg[0].x - baseWidth / 2, seg[0].y - baseWidth / 2, baseWidth, baseWidth);
      } else {
        ctx.moveTo(seg[0].x, seg[0].y);
        for (let i = 1; i < seg.length; i++) {
          const xc = (seg[i].x + seg[i - 1].x) / 2;
          const yc = (seg[i].y + seg[i - 1].y) / 2;
          ctx.quadraticCurveTo(seg[i - 1].x, seg[i - 1].y, xc, yc);
        }
        ctx.lineTo(seg[seg.length - 1].x, seg[seg.length - 1].y);
        ctx.stroke();
      }
    } else if (brushType === 'airbrush') {
      // Soft Airbrush Spray
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = baseWidth * 1.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.filter = `blur(${Math.max(2, baseWidth * 0.3)}px)`;
      ctx.beginPath();
      if (seg.length === 1) {
        ctx.arc(seg[0].x, seg[0].y, baseWidth, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
      } else {
        ctx.moveTo(seg[0].x, seg[0].y);
        for (let i = 1; i < seg.length; i++) {
          const xc = (seg[i].x + seg[i - 1].x) / 2;
          const yc = (seg[i].y + seg[i - 1].y) / 2;
          ctx.quadraticCurveTo(seg[i - 1].x, seg[i - 1].y, xc, yc);
        }
        ctx.lineTo(seg[seg.length - 1].x, seg[seg.length - 1].y);
        ctx.stroke();
      }
    } else if (brushType === 'water') {
      // Water / Wet Blend: Fluid translucent wash with inner core (strictly matches water icon)
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = baseWidth * 1.4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = Math.min(1, ctx.globalAlpha * 0.45);
      ctx.beginPath();
      if (seg.length === 1) {
        ctx.arc(seg[0].x, seg[0].y, baseWidth * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
      } else {
        ctx.moveTo(seg[0].x, seg[0].y);
        for (let i = 1; i < seg.length; i++) {
          const xc = (seg[i].x + seg[i - 1].x) / 2;
          const yc = (seg[i].y + seg[i - 1].y) / 2;
          ctx.quadraticCurveTo(seg[i - 1].x, seg[i - 1].y, xc, yc);
        }
        ctx.lineTo(seg[seg.length - 1].x, seg[seg.length - 1].y);
        ctx.stroke();
      }

      // Inner wet core
      ctx.globalAlpha = Math.min(1, opacity * 0.75);
      ctx.lineWidth = baseWidth * 0.7;
      ctx.stroke();
    } else if (brushType === 'dry') {
      // Dry Brush / Chalk Bristle: 4 parallel filaments with dry skips (strictly matches dry icon)
      ctx.strokeStyle = baseColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const filaments = [
        { offset: -0.38, width: baseWidth * 0.38, dash: [18, 4, 12, 3, 20, 2] },
        { offset: -0.12, width: baseWidth * 0.32, dash: [14, 5, 16, 4] },
        { offset: 0.15, width: baseWidth * 0.28, dash: [8, 3, 22, 5, 10, 2] },
        { offset: 0.38, width: baseWidth * 0.22, dash: [12, 6, 14, 5] },
      ];

      for (const fil of filaments) {
        ctx.lineWidth = Math.max(0.8, fil.width);
        ctx.setLineDash(fil.dash.map(d => Math.max(2, d * (baseWidth / 12))));
        ctx.beginPath();
        if (seg.length === 1) {
          ctx.arc(seg[0].x, seg[0].y + fil.offset * baseWidth, fil.width / 2, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          for (let i = 0; i < seg.length; i++) {
            const pt = seg[i];
            const prev = seg[Math.max(0, i - 1)];
            const next = seg[Math.min(seg.length - 1, i + 1)];
            const angle = Math.atan2(next.y - prev.y, next.x - prev.x) + Math.PI / 2;
            const fx = pt.x + Math.cos(angle) * (fil.offset * baseWidth);
            const fy = pt.y + Math.sin(angle) * (fil.offset * baseWidth);
            if (i === 0) ctx.moveTo(fx, fy);
            else ctx.lineTo(fx, fy);
          }
          ctx.stroke();
        }
      }
      ctx.setLineDash([]);
    } else if (brushType === 'cold') {
      // Cold / Frost Crystalline Line with frost crystal facets (strictly matches cold icon)
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = Math.max(1, baseWidth * 0.85);
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.beginPath();
      if (seg.length === 1) {
        ctx.arc(seg[0].x, seg[0].y, baseWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
      } else {
        ctx.moveTo(seg[0].x, seg[0].y);
        for (let i = 1; i < seg.length; i++) {
          const p1 = seg[i - 1];
          const p2 = seg[i];
          const midX = (p1.x + p2.x) / 2;
          const midY = (p1.y + p2.y) / 2;
          const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
          const offset = (i % 2 === 0 ? 1 : -1) * (baseWidth * 0.35);
          const jx = midX + Math.cos(angle + Math.PI / 2) * offset;
          const jy = midY + Math.sin(angle + Math.PI / 2) * offset;
          ctx.lineTo(jx, jy);
          ctx.lineTo(p2.x, p2.y);
        }
        ctx.stroke();

        // Ice frost crystal diamonds along stroke
        ctx.fillStyle = baseColor;
        for (let i = 1; i < seg.length; i += 4) {
          const pt = seg[i];
          const r = Math.max(1.8, baseWidth * 0.45);
          ctx.beginPath();
          ctx.moveTo(pt.x, pt.y - r);
          ctx.lineTo(pt.x + r * 0.7, pt.y);
          ctx.lineTo(pt.x, pt.y + r);
          ctx.lineTo(pt.x - r * 0.7, pt.y);
          ctx.closePath();
          ctx.fill();
        }
      }
    } else if (brushType === 'smooth') {
      // Super Smooth Streamline Vector
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = baseWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      if (seg.length === 1) {
        ctx.arc(seg[0].x, seg[0].y, baseWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
      } else {
        ctx.moveTo(seg[0].x, seg[0].y);
        for (let i = 1; i < seg.length; i++) {
          const xc = (seg[i].x + seg[i - 1].x) / 2;
          const yc = (seg[i].y + seg[i - 1].y) / 2;
          ctx.quadraticCurveTo(seg[i - 1].x, seg[i - 1].y, xc, yc);
        }
        ctx.lineTo(seg[seg.length - 1].x, seg[seg.length - 1].y);
        ctx.stroke();
      }
    } else if (brushType === 'glow') {
      // Neon Glow Aura with radiant outer spread and crisp hot core
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      if (seg.length === 1) {
        ctx.arc(seg[0].x, seg[0].y, baseWidth * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.globalAlpha = Math.min(1, opacity * 0.25);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(seg[0].x, seg[0].y, baseWidth * 0.7, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.globalAlpha = Math.min(1, opacity * 0.7);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(seg[0].x, seg[0].y, baseWidth * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.globalAlpha = 1;
        ctx.fill();
      } else {
        ctx.moveTo(seg[0].x, seg[0].y);
        for (let i = 1; i < seg.length; i++) {
          const xc = (seg[i].x + seg[i - 1].x) / 2;
          const yc = (seg[i].y + seg[i - 1].y) / 2;
          ctx.quadraticCurveTo(seg[i - 1].x, seg[i - 1].y, xc, yc);
        }
        ctx.lineTo(seg[seg.length - 1].x, seg[seg.length - 1].y);

        // Wide outer aura
        ctx.strokeStyle = baseColor;
        ctx.lineWidth = baseWidth * 2.6;
        ctx.globalAlpha = Math.min(1, opacity * 0.25);
        ctx.stroke();

        // Mid vibrant aura
        ctx.lineWidth = baseWidth * 1.4;
        ctx.globalAlpha = Math.min(1, opacity * 0.65);
        ctx.stroke();

        // Center intense core
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = Math.max(1.5, baseWidth * 0.45);
        ctx.globalAlpha = Math.min(1, opacity * 0.95);
        ctx.stroke();
      }
    } else if (brushType === 'charcoal') {
      // Organic Rough Charcoal
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = baseWidth * 1.1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = Math.min(1, ctx.globalAlpha * 0.85);

      ctx.beginPath();
      if (seg.length === 1) {
        ctx.arc(seg[0].x, seg[0].y, baseWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
      } else {
        ctx.moveTo(seg[0].x, seg[0].y);
        for (let i = 1; i < seg.length; i++) {
          const jitterX = hasJitter ? (Math.random() - 0.5) * 1.5 * jitterStrength : 0;
          const jitterY = hasJitter ? (Math.random() - 0.5) * 1.5 * jitterStrength : 0;
          const xc = (seg[i].x + seg[i - 1].x) / 2 + jitterX;
          const yc = (seg[i].y + seg[i - 1].y) / 2 + jitterY;
          ctx.quadraticCurveTo(seg[i - 1].x, seg[i - 1].y, xc, yc);
        }
        ctx.lineTo(seg[seg.length - 1].x, seg[seg.length - 1].y);
        ctx.stroke();
      }
    } else if (brushType === 'oil') {
      // Thick Oil Paint with Bristle Ridges
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = baseWidth * 1.25;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      if (seg.length === 1) {
        ctx.arc(seg[0].x, seg[0].y, baseWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
      } else {
        ctx.moveTo(seg[0].x, seg[0].y);
        for (let i = 1; i < seg.length; i++) {
          const xc = (seg[i].x + seg[i - 1].x) / 2;
          const yc = (seg[i].y + seg[i - 1].y) / 2;
          ctx.quadraticCurveTo(seg[i - 1].x, seg[i - 1].y, xc, yc);
        }
        ctx.lineTo(seg[seg.length - 1].x, seg[seg.length - 1].y);
        ctx.stroke();
      }

      // Oil Glaze highlight
      ctx.save();
      ctx.strokeStyle = '#ffffff';
      ctx.globalAlpha = Math.min(1, ctx.globalAlpha * 0.25);
      ctx.lineWidth = Math.max(1, baseWidth * 0.3);
      ctx.beginPath();
      if (seg.length > 1) {
        ctx.moveTo(seg[0].x - 1, seg[0].y - 1);
        for (let i = 1; i < seg.length; i++) {
          const xc = (seg[i].x + seg[i - 1].x) / 2 - 1;
          const yc = (seg[i].y + seg[i - 1].y) / 2 - 1;
          ctx.quadraticCurveTo(seg[i - 1].x - 1, seg[i - 1].y - 1, xc, yc);
        }
        ctx.stroke();
      }
      ctx.restore();
    } else if (brushType === 'ink') {
      // Japanese Sumi-e / Fountain Pen Ink
      ctx.strokeStyle = baseColor;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (let i = 1; i < seg.length; i++) {
        const p1 = seg[i - 1];
        const p2 = seg[i];
        const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        // Speed thinning: faster strokes are thinner
        const speed = Math.min(10, Math.max(1, dist));
        let curWidth = Math.max(1, baseWidth * (1.2 - speed * 0.05));
        if (hasJitter && brushSettings.sizeJitter) {
          curWidth *= (1 + (Math.random() - 0.5) * 0.15 * jitterStrength);
        }
        ctx.lineWidth = curWidth;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
    } else if (brushType === 'spray') {
      // Spray Paint Splatter Droplets (exactly matches spray icon)
      ctx.fillStyle = baseColor;
      const radius = Math.max(6, baseWidth * 1.8);
      const density = Math.min(25, Math.max(8, Math.floor(baseWidth * 1.2)));

      for (let i = 0; i < seg.length; i++) {
        const pt = seg[i];
        for (let d = 0; d < density; d++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.pow(Math.random(), 0.7) * radius;
          const sx = pt.x + Math.cos(angle) * dist;
          const sy = pt.y + Math.sin(angle) * dist;
          const dropSize = Math.max(0.6, Math.random() * (baseWidth * 0.35));
          ctx.beginPath();
          ctx.arc(sx, sy, dropSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (brushType === 'dotted') {
      // Precision Round Dotted Line (exactly matches dotted icon)
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = baseWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([0.1, Math.max(6, baseWidth * 2.5)]);
      ctx.beginPath();
      if (seg.length === 1) {
        ctx.arc(seg[0].x, seg[0].y, baseWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
      } else {
        ctx.moveTo(seg[0].x, seg[0].y);
        for (let i = 1; i < seg.length; i++) {
          const xc = (seg[i].x + seg[i - 1].x) / 2;
          const yc = (seg[i].y + seg[i - 1].y) / 2;
          ctx.quadraticCurveTo(seg[i - 1].x, seg[i - 1].y, xc, yc);
        }
        ctx.lineTo(seg[seg.length - 1].x, seg[seg.length - 1].y);
        ctx.stroke();
      }
    } else if (brushType === 'dashed') {
      // Precision Dashed Line (exactly matches dashed icon)
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = baseWidth;
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'miter';
      ctx.setLineDash([Math.max(6, baseWidth * 2.2), Math.max(4, baseWidth * 1.5)]);
      ctx.beginPath();
      if (seg.length === 1) {
        ctx.fillRect(seg[0].x - baseWidth, seg[0].y - baseWidth / 2, baseWidth * 2, baseWidth);
      } else {
        ctx.moveTo(seg[0].x, seg[0].y);
        for (let i = 1; i < seg.length; i++) {
          const xc = (seg[i].x + seg[i - 1].x) / 2;
          const yc = (seg[i].y + seg[i - 1].y) / 2;
          ctx.quadraticCurveTo(seg[i - 1].x, seg[i - 1].y, xc, yc);
        }
        ctx.lineTo(seg[seg.length - 1].x, seg[seg.length - 1].y);
        ctx.stroke();
      }
    } else if (brushType === 'crayon') {
      // Wax Crayon Stippled Texture (exactly matches crayon icon)
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = baseWidth * 1.1;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.setLineDash([2, 3]);
      ctx.beginPath();
      if (seg.length === 1) {
        ctx.arc(seg[0].x, seg[0].y, baseWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
      } else {
        ctx.moveTo(seg[0].x, seg[0].y);
        for (let i = 1; i < seg.length; i++) {
          const xc = (seg[i].x + seg[i - 1].x) / 2;
          const yc = (seg[i].y + seg[i - 1].y) / 2;
          ctx.quadraticCurveTo(seg[i - 1].x, seg[i - 1].y, xc, yc);
        }
        ctx.lineTo(seg[seg.length - 1].x, seg[seg.length - 1].y);
        ctx.stroke();
      }

      // Inner stippled wax core
      ctx.setLineDash([]);
      ctx.lineWidth = Math.max(1, baseWidth * 0.5);
      ctx.globalAlpha = Math.min(1, ctx.globalAlpha * 0.7);
      ctx.stroke();
    } else if (brushType === 'ribbon') {
      // 3D Twisted Ribbon Band (exactly matches ribbon icon)
      ctx.lineCap = 'butt';
      ctx.lineJoin = 'round';

      for (let i = 1; i < seg.length; i++) {
        const p1 = seg[i - 1];
        const p2 = seg[i];
        const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x) + Math.PI / 2;
        const w = baseWidth * 0.9;
        const phase = Math.sin(i * 0.35);

        const nx = Math.cos(angle) * w;
        const ny = Math.sin(angle) * w;

        // Front ribbon
        ctx.beginPath();
        ctx.moveTo(p1.x - nx, p1.y - ny);
        ctx.lineTo(p2.x - nx, p2.y - ny);
        ctx.lineTo(p2.x + nx * phase, p2.y + ny * phase);
        ctx.lineTo(p1.x + nx * phase, p1.y + ny * phase);
        ctx.closePath();
        ctx.fillStyle = baseColor;
        ctx.fill();

        // Shaded side
        ctx.beginPath();
        ctx.moveTo(p1.x + nx * phase, p1.y + ny * phase);
        ctx.lineTo(p2.x + nx * phase, p2.y + ny * phase);
        ctx.lineTo(p2.x + nx, p2.y + ny);
        ctx.lineTo(p1.x + nx, p1.y + ny);
        ctx.closePath();
        ctx.fillStyle = '#475569';
        ctx.globalAlpha = Math.min(1, ctx.globalAlpha * 0.6);
        ctx.fill();
        ctx.globalAlpha = opacity;
      }
    } else if (brushType === 'organic') {
      // Botanical Leaf Sprouting Stroke (exactly matches organic icon)
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = Math.max(1.5, baseWidth * 0.6);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      if (seg.length === 1) {
        ctx.arc(seg[0].x, seg[0].y, baseWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
      } else {
        ctx.moveTo(seg[0].x, seg[0].y);
        for (let i = 1; i < seg.length; i++) {
          const xc = (seg[i].x + seg[i - 1].x) / 2;
          const yc = (seg[i].y + seg[i - 1].y) / 2;
          ctx.quadraticCurveTo(seg[i - 1].x, seg[i - 1].y, xc, yc);
        }
        ctx.lineTo(seg[seg.length - 1].x, seg[seg.length - 1].y);
        ctx.stroke();

        // Sprout decorative organic leaflets every few points
        ctx.fillStyle = baseColor;
        for (let i = 2; i < seg.length; i += 4) {
          const p = seg[i];
          const prev = seg[i - 1];
          const angle = Math.atan2(p.y - prev.y, p.x - prev.x);
          const side = (i % 8 === 2) ? 1 : -1;
          const leafAngle = angle + (Math.PI / 3) * side;
          const leafLen = Math.max(6, baseWidth * 1.5);
          const lx = p.x + Math.cos(leafAngle) * leafLen;
          const ly = p.y + Math.sin(leafAngle) * leafLen;

          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.quadraticCurveTo(
            p.x + Math.cos(leafAngle - 0.4 * side) * (leafLen * 0.6),
            p.y + Math.sin(leafAngle - 0.4 * side) * (leafLen * 0.6),
            lx, ly
          );
          ctx.quadraticCurveTo(
            p.x + Math.cos(leafAngle + 0.4 * side) * (leafLen * 0.6),
            p.y + Math.sin(leafAngle + 0.4 * side) * (leafLen * 0.6),
            p.x, p.y
          );
          ctx.fill();
        }
      }
    } else if (brushType === 'watercolor') {
      // Multi-Tone Watercolor Wash (matches watercolor icon)
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = baseWidth * 1.6;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalAlpha = Math.min(1, ctx.globalAlpha * 0.4);

      ctx.beginPath();
      if (seg.length === 1) {
        ctx.arc(seg[0].x, seg[0].y, baseWidth * 0.8, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
      } else {
        ctx.moveTo(seg[0].x, seg[0].y);
        for (let i = 1; i < seg.length; i++) {
          const xc = (seg[i].x + seg[i - 1].x) / 2;
          const yc = (seg[i].y + seg[i - 1].y) / 2;
          ctx.quadraticCurveTo(seg[i - 1].x, seg[i - 1].y, xc, yc);
        }
        ctx.lineTo(seg[seg.length - 1].x, seg[seg.length - 1].y);
        ctx.stroke();

        // Inner saturated pigment layer
        ctx.globalAlpha = Math.min(1, opacity * 0.75);
        ctx.lineWidth = baseWidth * 0.8;
        ctx.stroke();
      }
    } else {
      // Solid Monoline Vector Brush (with optional Stamp Jitter)
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = baseWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();

      if (seg.length === 1) {
        ctx.arc(seg[0].x, seg[0].y, baseWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = baseColor;
        ctx.fill();
      } else {
        ctx.moveTo(seg[0].x, seg[0].y);
        for (let i = 1; i < seg.length; i++) {
          let xc = (seg[i].x + seg[i - 1].x) / 2;
          let yc = (seg[i].y + seg[i - 1].y) / 2;
          if (hasJitter && brushSettings.rotationJitter) {
            const rot = (Math.random() - 0.5) * Math.PI * 2 * jitterStrength * 0.1;
            xc += Math.cos(rot) * 0.5;
            yc += Math.sin(rot) * 0.5;
          }
          ctx.quadraticCurveTo(seg[i - 1].x, seg[i - 1].y, xc, yc);
        }
        ctx.lineTo(seg[seg.length - 1].x, seg[seg.length - 1].y);
        ctx.stroke();
      }
    }

    ctx.restore();
  } catch (err: any) {
    console.error('renderBrushSegment error:', err);
    ctx.restore();
  }
}
