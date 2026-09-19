// @ts-nocheck
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Pipette, Check, X, Palette, ChevronDown, ChevronUp } from 'lucide-react';

interface CustomColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
  compact?: boolean;
  popover?: boolean;
  inline?: boolean;
  triggerSize?: string;
}

const PRESET_COLORS = [
  '#000000', '#FFFFFF', '#E53935', '#D81B60', '#8E24AA', '#5E35B1',
  '#3949AB', '#1E88E5', '#039BE5', '#00ACC1', '#00897B', '#43A047',
  '#7CB342', '#C0CA33', '#FDD835', '#FFB300', '#FB8C00', '#F4511E',
  '#6D4C41', '#757575', '#37474F', '#FF4081', '#7C4DFF', '#00E676'
];

// Helper: Safe Hex sanitizer
function safeHex(val?: string): string {
  if (!val || typeof val !== 'string') return '#000000';
  let clean = val.trim();
  if (clean.startsWith('rgb')) {
    try {
      const parts = clean.match(/\d+/g);
      if (parts && parts.length >= 3) {
        const r = parseInt(parts[0], 10).toString(16).padStart(2, '0');
        const g = parseInt(parts[1], 10).toString(16).padStart(2, '0');
        const b = parseInt(parts[2], 10).toString(16).padStart(2, '0');
        return `#${r}${g}${b}`;
      }
    } catch (_) {}
  }
  if (!clean.startsWith('#')) clean = '#' + clean;
  if (/^#[0-9A-Fa-f]{6}$/.test(clean)) return clean;
  if (/^#[0-9A-Fa-f]{3}$/.test(clean)) {
    return `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`;
  }
  return '#000000';
}

// Helper: Hex <-> HSV
function hexToHsv(hex: string): { h: number; s: number; v: number } {
  try {
    let c = safeHex(hex).replace('#', '');
    const num = parseInt(c, 16) || 0;
    const r = ((num >> 16) & 255) / 255;
    const g = ((num >> 8) & 255) / 255;
    const b = (num & 255) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;

    let h = 0;
    if (d !== 0) {
      if (max === r) h = ((g - b) / d) % 6;
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h = Math.round(h * 60);
      if (h < 0) h += 360;
    }

    const s = max === 0 ? 0 : d / max;
    const v = max;

    return { h: Math.max(0, Math.min(360, h)), s: Math.max(0, Math.min(100, s * 100)), v: Math.max(0, Math.min(100, v * 100)) };
  } catch (err) {
    console.error('hexToHsv error:', err);
    return { h: 0, s: 0, v: 0 };
  }
}

function hsvToHex(h: number, s: number, v: number): string {
  try {
    const sNorm = Math.max(0, Math.min(100, s)) / 100;
    const vNorm = Math.max(0, Math.min(100, v)) / 100;

    const c = vNorm * sNorm;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = vNorm - c;

    let rNorm = 0, gNorm = 0, bNorm = 0;
    if (h >= 0 && h < 60) { rNorm = c; gNorm = x; bNorm = 0; }
    else if (h >= 60 && h < 120) { rNorm = x; gNorm = c; bNorm = 0; }
    else if (h >= 120 && h < 180) { rNorm = 0; gNorm = c; bNorm = x; }
    else if (h >= 180 && h < 240) { rNorm = 0; gNorm = x; bNorm = c; }
    else if (h >= 240 && h < 300) { rNorm = x; gNorm = 0; bNorm = c; }
    else if (h >= 300 && h <= 360) { rNorm = c; gNorm = 0; bNorm = x; }

    const r = Math.round((rNorm + m) * 255);
    const g = Math.round((gNorm + m) * 255);
    const b = Math.round((bNorm + m) * 255);

    const toHex = (n: number) => {
      const hex = Math.max(0, Math.min(255, n)).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    };

    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch (err) {
    console.error('hsvToHex error:', err);
    return '#000000';
  }
}

function CustomColorPicker({
  color,
  onChange,
  label,
  className = '',
  disabled = false,
  compact = false,
  popover = false,
  inline = true,
  triggerSize = 'w-8 h-8'
}: CustomColorPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const validatedColor = safeHex(color);
  const [hexInput, setHexInput] = useState(validatedColor);
  
  const hsv = hexToHsv(validatedColor);
  const [hue, setHue] = useState(hsv.h);
  const [sat, setSat] = useState(hsv.s);
  const [val, setVal] = useState(hsv.v);

  const satValRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDraggingSatVal = useRef(false);

  useEffect(() => {
    try {
      const targetHex = safeHex(color);
      setHexInput(prev => prev.toLowerCase() === targetHex.toLowerCase() ? prev : targetHex);
      const newHsv = hexToHsv(targetHex);
      setHue(newHsv.h);
      setSat(newHsv.s);
      setVal(newHsv.v);
    } catch (err) {
      console.error('Color sync error:', err);
    }
  }, [color]);

  const pureHueHex = hsvToHex(hue, 100, 100);

  // Paint 2D mixed-color gradient to canvas (immune to CSS background overrides)
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;

    // 1. Base pure hue
    ctx.fillStyle = pureHueHex;
    ctx.fillRect(0, 0, w, h);

    // 2. White to transparent horizontal gradient (Saturation: 0 at left -> 100 at right)
    const whiteGrad = ctx.createLinearGradient(0, 0, w, 0);
    whiteGrad.addColorStop(0, '#ffffff');
    whiteGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(0, 0, w, h);

    // 3. Black to transparent vertical gradient (Value/Brightness: 100 at top -> 0 at bottom)
    const blackGrad = ctx.createLinearGradient(0, 0, 0, h);
    blackGrad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    blackGrad.addColorStop(1, '#000000');
    ctx.fillStyle = blackGrad;
    ctx.fillRect(0, 0, w, h);
  }, [pureHueHex]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const updateColorFromHsv = (h: number, s: number, v: number) => {
    try {
      const newHex = hsvToHex(h, s, v);
      setHexInput(newHex);
      onChange(newHex);
    } catch (err) {
      console.error('updateColorFromHsv error:', err);
    }
  };

  const handleSatValPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    try {
      isDraggingSatVal.current = true;
      if (e.target && typeof (e.target as HTMLElement).setPointerCapture === 'function') {
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }
      handleSatValMove(e);
    } catch (err) {
      console.warn('Pointer down capture warning:', err);
    }
  };

  const handleSatValMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingSatVal.current || !satValRef.current || disabled) return;
    try {
      const rect = satValRef.current.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, e.clientY - rect.top));

      const newSat = (x / rect.width) * 100;
      const newVal = 100 - (y / rect.height) * 100;

      setSat(newSat);
      setVal(newVal);
      updateColorFromHsv(hue, newSat, newVal);
    } catch (err) {
      console.error('handleSatValMove error:', err);
    }
  };

  const handleSatValPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDraggingSatVal.current = false;
    try {
      if (e.target && typeof (e.target as HTMLElement).releasePointerCapture === 'function') {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      }
    } catch (_) {}
  };

  const handleHueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    try {
      const newHue = parseFloat(e.target.value);
      setHue(newHue);
      updateColorFromHsv(newHue, sat, val);
    } catch (err) {
      console.error('handleHueChange error:', err);
    }
  };

  const handleHexInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    try {
      const valStr = e.target.value;
      setHexInput(valStr);
      const formatted = valStr.startsWith('#') ? valStr : '#' + valStr;
      if (/^#([0-9A-Fa-f]{3}){1,2}$/.test(formatted)) {
        const fullHex = safeHex(formatted);
        onChange(fullHex);
        const newHsv = hexToHsv(fullHex);
        setHue(newHsv.h);
        setSat(newHsv.s);
        setVal(newHsv.v);
      }
    } catch (err) {
      console.error('handleHexInputChange error:', err);
    }
  };

  const selectPresetColor = (c: string) => {
    if (disabled) return;
    try {
      const fullHex = safeHex(c);
      onChange(fullHex);
      setHexInput(fullHex);
      const newHsv = hexToHsv(fullHex);
      setHue(newHsv.h);
      setSat(newHsv.s);
      setVal(newHsv.v);
    } catch (err) {
      console.error('selectPresetColor error:', err);
    }
  };

  const handleEyedropper = async () => {
    if (disabled) return;
    if ((window as any).EyeDropper) {
      try {
        const eyeDropper = new (window as any).EyeDropper();
        const result = await eyeDropper.open();
        if (result && result.sRGBHex) {
          selectPresetColor(result.sRGBHex);
        }
      } catch (e) {
        // user canceled
      }
    }
  };

  // The rich, colorful mixed-color box studio UI
  const colorStudioBody = (
    <div className="w-full space-y-3 anim-colorpicker">
      {/* 1. Large 2D Mixed-Color Square Box (Vibrant, colorful, interactive) */}
      <div
        ref={satValRef}
        onPointerDown={handleSatValPointerDown}
        onPointerMove={handleSatValMove}
        onPointerUp={handleSatValPointerUp}
        className="color-sat-val-box w-full h-44 sm:h-48 rounded-xl relative cursor-crosshair overflow-hidden touch-none select-none shadow-md border-2 border-black/80 dark:border-white/30"
        style={{
          backgroundColor: pureHueHex,
        }}
      >
        {/* Canvas guarantees gradient rendering with real color pixels */}
        <canvas
          ref={canvasRef}
          width={320}
          height={200}
          className="color-box-canvas w-full h-full block pointer-events-none object-cover"
        />

        {/* High-contrast Draggable Pointer Handle */}
        <div
          className="w-5 h-5 rounded-full border-2 border-white shadow-xl pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 ring-2 ring-black"
          style={{
            left: `${sat}%`,
            top: `${100 - val}%`,
            backgroundColor: validatedColor
          }}
        />
      </div>

      {/* 2. Rainbow Hue Spectrum Slider Bar */}
      <div className="w-full space-y-1">
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          value={hue}
          disabled={disabled}
          onChange={handleHueChange}
          className="color-hue-slider w-full h-4 rounded-full appearance-none cursor-pointer outline-none border border-black/20"
          style={{
            background: 'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)'
          }}
        />
      </div>

      {/* 3. Color Preview Swatch, Hex Input & Eyedropper Row */}
      <div className="flex items-center gap-2">
        {/* Real Color Preview Square */}
        <div
          className="w-9 h-9 rounded-xl border-2 border-black shadow-sm shrink-0 flex items-center justify-center"
          style={{ backgroundColor: validatedColor }}
        >
          <div className="w-2.5 h-2.5 rounded-full bg-white/80 shadow-sm" />
        </div>

        {/* Hex Direct Input */}
        <div className="flex-1 relative">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500 font-mono text-xs font-bold">#</span>
          <input
            type="text"
            value={hexInput.replace('#', '')}
            disabled={disabled}
            onChange={handleHexInputChange}
            className="w-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 rounded-xl pl-6 pr-2 py-1.5 text-xs font-mono font-black text-black dark:text-white outline-none focus:border-black uppercase transition-colors"
            maxLength={6}
            placeholder="000000"
          />
        </div>

        {/* Eyedropper Button */}
        {(window as any).EyeDropper && (
          <button
            type="button"
            disabled={disabled}
            onClick={handleEyedropper}
            className="p-2 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-black dark:text-white border border-neutral-300 dark:border-neutral-700 rounded-xl shrink-0 transition-colors active:scale-95 cursor-pointer shadow-sm"
            title="Eyedropper - Sample color from screen"
          >
            <Pipette className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 4. Quick Preset Color Swatches */}
      <div className="pt-1">
        <div className="grid grid-cols-8 gap-1.5">
          {PRESET_COLORS.map((c) => {
            const isActive = validatedColor.toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                type="button"
                disabled={disabled}
                onClick={() => selectPresetColor(c)}
                className={`color-swatch-btn h-6 rounded-lg border-2 transition-all relative flex items-center justify-center hover:scale-110 active:scale-95 cursor-pointer ${
                  isActive
                    ? 'border-black dark:border-white ring-2 ring-black/40 dark:ring-white/40 scale-105 z-10'
                    : 'border-black/20 dark:border-white/20 hover:border-black/60'
                }`}
                style={{ backgroundColor: c }}
                title={c}
              >
                {isActive && (
                  <Check className={`w-3.5 h-3.5 ${c === '#FFFFFF' || c === '#FDD835' ? 'text-black' : 'text-white'}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  // If inline (default for full-width panels): render the big mixed-color box directly!
  if (inline && !compact && !popover) {
    return (
      <div className={`anim-colorpicker w-full ${className}`}>
        {colorStudioBody}
      </div>
    );
  }

  // Compact / Popover mode (for small buttons that trigger the studio in a popup)
  return (
    <div className={`anim-colorpicker ${compact ? 'inline-block' : 'w-full'} ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`${triggerSize} rounded-xl border-2 border-black dark:border-white/40 p-0.5 transition-all shadow-md flex items-center justify-center cursor-pointer ${
          disabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95 hover:scale-105'
        }`}
        style={{ background: 'linear-gradient(135deg, #ef4444, #f59e0b, #10b981, #06b6d4, #6366f1, #ec4899)' }}
        title={label || `Color: ${validatedColor}`}
      >
        <div
          className="w-full h-full rounded-lg border border-white/60 shadow-inner"
          style={{ backgroundColor: validatedColor }}
        />
      </button>

      {/* Popover Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-[320px] bg-white dark:bg-neutral-950 border-2 border-black dark:border-neutral-700 rounded-2xl p-4 shadow-2xl space-y-3 animate-in zoom-in-95 duration-150 text-black dark:text-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-1 border-b border-neutral-200 dark:border-neutral-800">
              <span className="text-xs font-black uppercase tracking-wider">Color Studio</span>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {colorStudioBody}
          </div>
        </div>
      )}
    </div>
  );
}

export default React.memo(CustomColorPicker);
