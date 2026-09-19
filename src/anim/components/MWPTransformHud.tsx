import React, { useState, useRef, useEffect } from 'react';
import { 
  RotateCw, 
  Scale, 
  Maximize2, 
  Move, 
  Minimize2, 
  ChevronDown, 
  X, 
  Sliders, 
  Layers, 
  Activity, 
  Compass, 
  CornerDownRight,
  GripHorizontal,
  RefreshCw,
  Trash2
} from 'lucide-react';

interface MWPTransformHudProps {
  position: { x: number; y: number };
  onPositionChange: (pos: { x: number; y: number }) => void;
  property: 'rotate' | 'scale' | 'height' | 'width' | 'skew' | 'move';
  onPropertyChange: (prop: 'rotate' | 'scale' | 'height' | 'width' | 'skew' | 'move') => void;
  incrementValue: number;
  onIncrementChange: (val: number) => void;
  decrementValue: number;
  onDecrementChange: (val: number) => void;
  axis: 'x' | 'y' | 'z' | 'all';
  onAxisChange: (axis: 'x' | 'y' | 'z' | 'all') => void;
  pointCount: number;
  onReset: () => void;
  onClose: () => void;
  isDeleteMode?: boolean;
  onToggleDeleteMode?: () => void;
  onClearAllPoints?: () => void;
}

export default function MWPTransformHud({
  position,
  onPositionChange,
  property,
  onPropertyChange,
  incrementValue,
  onIncrementChange,
  decrementValue,
  onDecrementChange,
  axis,
  onAxisChange,
  pointCount,
  onReset,
  onClose,
  isDeleteMode = false,
  onToggleDeleteMode,
  onClearAllPoints
}: MWPTransformHudProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isDraggingBox, setIsDraggingBox] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; boxX: number; boxY: number } | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    window.addEventListener('pointerdown', handleOutsideClick);
    return () => window.removeEventListener('pointerdown', handleOutsideClick);
  }, []);

  // Handle Dragging of the HUD Box
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDraggingBox(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      boxX: position.x,
      boxY: position.y
    };
  };

  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!isDraggingBox || !dragStartRef.current) return;
      const dx = e.clientX - dragStartRef.current.mouseX;
      const dy = e.clientY - dragStartRef.current.mouseY;
      onPositionChange({
        x: Math.max(10, Math.min(window.innerWidth - 300, dragStartRef.current.boxX + dx)),
        y: Math.max(10, Math.min(window.innerHeight - 340, dragStartRef.current.boxY + dy))
      });
    };

    const handlePointerUp = () => {
      setIsDraggingBox(false);
      dragStartRef.current = null;
    };

    if (isDraggingBox) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDraggingBox, onPositionChange]);

  const propertiesList: { id: 'rotate' | 'scale' | 'height' | 'width' | 'skew' | 'move'; label: string; icon: any; unit: string }[] = [
    { id: 'rotate', label: 'Rotate (Degree)', icon: RotateCw, unit: '°' },
    { id: 'scale', label: 'Scale (Uniform)', icon: Scale, unit: '%' },
    { id: 'height', label: 'Height (Y-Scale)', icon: Maximize2, unit: '%' },
    { id: 'width', label: 'Width (X-Scale)', icon: Minimize2, unit: '%' },
    { id: 'skew', label: 'Skew Angle', icon: Compass, unit: '°' },
    { id: 'move', label: 'Move (Position)', icon: Move, unit: 'px' }
  ];

  const currentPropObj = propertiesList.find(p => p.id === property) || propertiesList[0];
  const CurrentIcon = currentPropObj.icon;
  const netDelta = incrementValue - decrementValue;

  return (
    <div 
      id="mwp-transform-hud-box"
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      className="fixed z-50 w-72 bg-neutral-900/95 border-2 border-amber-500/80 rounded-xl shadow-2xl text-white select-none overflow-visible animate-in fade-in zoom-in-95 duration-150"
    >
      {/* Draggable Header Bar */}
      <div 
        onPointerDown={handlePointerDown}
        className="flex items-center justify-between px-3 py-2 bg-neutral-800/90 border-b border-neutral-700/80 rounded-t-lg cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-4 h-4 text-amber-400/80" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-black tracking-wider uppercase bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
              MWP
            </span>
            <span className="text-xs font-bold text-neutral-200">
              Transform Box
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-semibold bg-neutral-950/80 px-1.5 py-0.5 rounded text-amber-300 border border-neutral-700">
            {pointCount} {pointCount === 1 ? 'Point' : 'Points'}
          </span>
          {onToggleDeleteMode && (
            <button
              onClick={onToggleDeleteMode}
              title={isDeleteMode ? 'Delete Mode Active (Click points to delete)' : 'Toggle Delete Points Mode'}
              className={`p-1 rounded transition-colors ${
                isDeleteMode 
                  ? 'bg-rose-500 text-white animate-pulse' 
                  : 'hover:bg-neutral-700 text-neutral-400 hover:text-rose-400'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onClearAllPoints && (
            <button
              onClick={onClearAllPoints}
              title="Clear All Points & Reset Drawing"
              className="p-1 hover:bg-neutral-700 text-neutral-400 hover:text-rose-300 rounded transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
            </button>
          )}
          <button
            onClick={onReset}
            title="Reset Sliders to 0"
            className="p-1 hover:bg-neutral-700 text-neutral-400 hover:text-amber-300 rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            title="Close Transform Box"
            className="p-1 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Body */}
      <div className="p-3 space-y-3">
        {/* In-App Custom Styled Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
            Transform Property
          </label>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2 bg-neutral-950 border border-amber-500/50 hover:border-amber-400 rounded-lg text-xs font-semibold text-neutral-100 shadow-inner transition-colors"
          >
            <div className="flex items-center gap-2">
              <CurrentIcon className="w-4 h-4 text-amber-400" />
              <span>{currentPropObj.label}</span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-neutral-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {dropdownOpen && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-neutral-950 border border-neutral-700 rounded-lg shadow-2xl py-1 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
              {propertiesList.map(item => {
                const ItemIcon = item.icon;
                const isSelected = item.id === property;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onPropertyChange(item.id);
                      setDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium transition-colors ${
                      isSelected 
                        ? 'bg-amber-500/20 text-amber-300 font-bold border-l-2 border-amber-400' 
                        : 'text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
                    }`}
                  >
                    <ItemIcon className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-neutral-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2 Sliders: Increment & Decrement */}
        <div className="space-y-2.5 bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800">
          {/* Slider 1: Increment */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                <span> Increment</span>
              </span>
              <span className="font-mono font-bold text-emerald-300 bg-emerald-950/60 px-1.5 py-0.2 rounded border border-emerald-800/50">
                +{incrementValue} {currentPropObj.unit}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              step={1}
              value={incrementValue}
              onChange={(e) => onIncrementChange(Number(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Slider 2: Decrement */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1">
              <span className="font-semibold text-rose-400 flex items-center gap-1">
                <span> Decrement</span>
              </span>
              <span className="font-mono font-bold text-rose-300 bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-800/50">
                -{decrementValue} {currentPropObj.unit}
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={200}
              step={1}
              value={decrementValue}
              onChange={(e) => onDecrementChange(Number(e.target.value))}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>

          {/* Net Applied Value Indicator */}
          <div className="flex items-center justify-between pt-1 border-t border-neutral-800/80 text-[10px]">
            <span className="text-neutral-400">Net Delta:</span>
            <span className={`font-mono font-black ${netDelta > 0 ? 'text-emerald-400' : netDelta < 0 ? 'text-rose-400' : 'text-neutral-300'}`}>
              {netDelta > 0 ? `+${netDelta}` : netDelta} {currentPropObj.unit}
            </span>
          </div>
        </div>

        {/* Direction / Axis Selector */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
            Direction / Axis
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {(['x', 'y', 'z', 'all'] as const).map((ax) => {
              const isSelected = axis === ax;
              return (
                <button
                  key={ax}
                  onClick={() => onAxisChange(ax)}
                  className={`py-1.5 text-xs font-black uppercase rounded-lg border transition-all ${
                    isSelected
                      ? 'bg-amber-500 text-neutral-950 border-amber-400 shadow-md shadow-amber-500/20'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:border-neutral-700 hover:text-white'
                  }`}
                >
                  {ax}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
