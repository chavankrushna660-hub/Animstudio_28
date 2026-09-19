// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { 
  Crosshair, 
  Move, 
  RotateCw, 
  Maximize2, 
  Eye, 
  EyeOff, 
  RefreshCw, 
  X, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Check,
  Layers, 
  Box
} from 'lucide-react';
import { VectorObject, TwitchIdentifiedShape, TwitchToolState } from '../types';

interface TwitchCanvasHudProps {
  selectedObject: VectorObject | null;
  updateObject: (id: string, updates: Partial<VectorObject>) => void;
  activeTool: string;
}

const OPERATIONS_LIST = [
  { id: 'move', label: 'Move Position (X / Y)' },
  { id: 'rotate', label: 'Rotate Angle (°)' },
  { id: 'scale', label: 'Uniform Scale' },
  { id: 'width', label: 'Width / Scale X' },
  { id: 'height', label: 'Height / Scale Y' },
  { id: 'skewX', label: 'Skew Horizontal (X)' },
  { id: 'skewY', label: 'Skew Vertical (Y)' },
  { id: 'flipX', label: '3D Flip Pitch (Rx)' },
  { id: 'flipY', label: '3D Flip Yaw (Ry)' },
  { id: 'perspective', label: 'Perspective Depth' }
] as const;

export default function TwitchCanvasHud({
  selectedObject,
  updateObject,
  activeTool
}: TwitchCanvasHudProps) {
  if (activeTool !== 'TWT' && activeTool !== 'twitch') return null;
  if (!selectedObject) return null;

  const twitchState: TwitchToolState = selectedObject.twitchState;
  if (!twitchState || !twitchState.active) return null;
  // Strictly show the Transform HUD Box ONLY when transform mode is active
  if (twitchState.activeMode !== 'transform') return null;
  if (twitchState.showHudBox === false) return null;

  const shapes = twitchState.shapes || [];
  const selectedShape = shapes.find(s => s.id === twitchState.selectedShapeId) || shapes[0] || null;

  const [pos, setPos] = useState<{ x: number; y: number }>(
    twitchState.hudBoxPosition || { x: 30, y: 70 }
  );
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ startX: number; startY: number; initPosX: number; initPosY: number }>({
    startX: 0,
    startY: 0,
    initPosX: 30,
    initPosY: 70
  });

  // In-app custom dropdown states (Zero browser-native dialogs)
  const [targetDropdownOpen, setTargetDropdownOpen] = useState(false);
  const [operationDropdownOpen, setOperationDropdownOpen] = useState(false);
  const hudContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (hudContainerRef.current && !hudContainerRef.current.contains(e.target as Node)) {
        setTargetDropdownOpen(false);
        setOperationDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const handlePointerDownHeader = (e: React.PointerEvent) => {
    e.stopPropagation();
    setTargetDropdownOpen(false);
    setOperationDropdownOpen(false);
    setIsDragging(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPosX: pos.x,
      initPosY: pos.y
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveHeader = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.startX;
    const dy = e.clientY - dragStartRef.current.startY;
    const newPos = {
      x: Math.max(10, Math.min(window.innerWidth - 320, dragStartRef.current.initPosX + dx)),
      y: Math.max(10, Math.min(window.innerHeight - 380, dragStartRef.current.initPosY + dy))
    };
    setPos(newPos);
  };

  const handlePointerUpHeader = (e: React.PointerEvent) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch (err) {}
      // Persist hudBoxPosition
      updateObject(selectedObject.id, {
        twitchState: {
          ...twitchState,
          hudBoxPosition: pos
        }
      });
    }
  };

  // Helper to update Twitch state
  const setTwitch = (newState: Partial<TwitchToolState>) => {
    updateObject(selectedObject.id, {
      twitchState: {
        ...twitchState,
        ...newState
      }
    });
  };

  // Helper to update selected shape
  const updateSelectedShape = (updates: Partial<TwitchIdentifiedShape>) => {
    if (!selectedShape) return;
    const updatedShapes = shapes.map(s => {
      if (s.id === selectedShape.id) {
        return { ...s, ...updates };
      }
      return s;
    });
    setTwitch({ shapes: updatedShapes });
  };

  const updateTransform = (tUpdates: Partial<TwitchIdentifiedShape['transform']>) => {
    if (!selectedShape) return;
    updateSelectedShape({
      transform: {
        ...selectedShape.transform,
        ...tUpdates
      }
    });
  };

  const currentProperty = twitchState.hudTransformProperty || 'move';

  // Apply value based on active property and increment/decrement
  const handleApplyPropertyValue = (val: number, isDirect: boolean = false) => {
    if (!selectedShape) return;
    const cur = selectedShape.transform || { x: 0, y: 0, rotation: 0, scaleX: 1, scaleY: 1, skewX: 0, skewY: 0, rotateX: 0, rotateY: 0, perspective: 1000 };

    switch (currentProperty) {
      case 'move':
        if (twitchState.hudAxis === 'y') {
          updateTransform({ y: val });
        } else if (twitchState.hudAxis === 'x') {
          updateTransform({ x: val });
        } else {
          updateTransform({ x: val, y: val });
        }
        break;
      case 'rotate':
        updateTransform({ rotation: val });
        break;
      case 'scale':
        const sVal = Math.max(0.05, 1 + val / 100);
        updateTransform({ scaleX: sVal, scaleY: sVal });
        break;
      case 'width':
        updateTransform({ scaleX: Math.max(0.05, 1 + val / 100) });
        break;
      case 'height':
        updateTransform({ scaleY: Math.max(0.05, 1 + val / 100) });
        break;
      case 'skewX':
        updateTransform({ skewX: val });
        break;
      case 'skewY':
        updateTransform({ skewY: val });
        break;
      case 'flipX':
        updateTransform({ rotateX: val });
        break;
      case 'flipY':
        updateTransform({ rotateY: val });
        break;
      case 'perspective':
        updateTransform({ perspective: 1000 - val * 4 });
        break;
    }
  };

  return (
    <div
      ref={hudContainerRef}
      style={{ left: `${pos.x}px`, top: `${pos.y}px` }}
      className="absolute z-50 w-72 bg-neutral-950/95 border border-neutral-800/90 rounded-2xl shadow-2xl shadow-black/80 text-neutral-200 select-none"
    >
      {/* Draggable Header */}
      <div
        onPointerDown={handlePointerDownHeader}
        onPointerMove={handlePointerMoveHeader}
        onPointerUp={handlePointerUpHeader}
        className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-neutral-900 to-neutral-950 border-b border-neutral-800 rounded-t-2xl cursor-grab active:cursor-grabbing"
      >
        <div className="flex items-center gap-1.5 pointer-events-none">
          <div className="w-4 h-4 rounded-md bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300">
            <Crosshair className="w-2.5 h-2.5" />
          </div>
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-400">
            Twitch Transform HUD
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setTwitch({ showHudBox: false })}
            className="p-1 rounded-md text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Minimize HUD"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Body Content */}
      <div className="p-3 space-y-3">
        {/* Active Shape Selector & Hide/Show Switch */}
        {shapes.length > 0 ? (
          <div className="relative">
            <div className="flex items-center justify-between bg-neutral-900/90 px-2.5 py-1.5 rounded-xl border border-neutral-800">
              <div className="flex items-center gap-1.5 truncate flex-1 mr-2">
                <span className="text-[10px] font-black text-neutral-400 uppercase">Target:</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOperationDropdownOpen(false);
                    setTargetDropdownOpen(prev => !prev);
                  }}
                  className="flex items-center gap-1 bg-neutral-800/80 hover:bg-neutral-700/80 text-amber-300 px-2 py-1 rounded-lg border border-neutral-700/60 font-bold text-[11px] truncate flex-1 text-left justify-between transition-colors cursor-pointer"
                >
                  <span className="truncate">
                    {selectedShape ? `${shapes.findIndex(s => s.id === selectedShape.id) + 1}. ${selectedShape.name}` : 'Select Shape'}
                  </span>
                  {targetDropdownOpen ? (
                    <ChevronUp className="w-3 h-3 text-amber-400 shrink-0 ml-1" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-amber-400 shrink-0 ml-1" />
                  )}
                </button>
              </div>

              {selectedShape && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const updatedShapes = shapes.map(s => s.id === selectedShape.id ? { ...s, isHidden: !s.isHidden } : s);
                    setTwitch({ shapes: updatedShapes });
                  }}
                  className={`p-1.5 rounded-lg text-xs transition-all ${
                    selectedShape.isHidden
                      ? 'text-rose-400 bg-rose-500/20 hover:bg-rose-500/30'
                      : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                  }`}
                  title={selectedShape.isHidden ? "Click to Show Shape" : "Click to Hide Shape"}
                >
                  {selectedShape.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Custom In-App Target Shape Dropdown Popover */}
            {targetDropdownOpen && (
              <div 
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-neutral-900 border border-neutral-700/90 rounded-xl shadow-2xl shadow-black/90 p-1.5 max-h-52 overflow-y-auto space-y-0.5"
              >
                <div className="px-2 py-1 text-[9px] font-black text-neutral-400 uppercase tracking-wider border-b border-neutral-800 flex justify-between">
                  <span>Select Sub-Shape</span>
                  <span>{shapes.length} Found</span>
                </div>
                {shapes.map((s, idx) => {
                  const isSelected = selectedShape && s.id === selectedShape.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setTwitch({ selectedShapeId: s.id });
                        setTargetDropdownOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] flex items-center justify-between transition-all ${
                        isSelected 
                          ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold' 
                          : 'hover:bg-neutral-800 text-neutral-300 hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="w-4 h-4 rounded-full bg-neutral-800 text-neutral-400 text-[9px] font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <span className="truncate">{s.name}</span>
                        {s.isHidden && (
                          <span className="text-[9px] text-rose-400 bg-rose-500/10 px-1 py-0.2 rounded shrink-0">Hidden</span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-1">
                        <span className="text-[9px] font-mono text-neutral-500">
                          {s.isClosed ? 'Loop' : 'Stroke'}
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div className="text-[10px] text-neutral-400 text-center py-1">
            No shapes scanned yet. Use Right Panel to scan drawing shapes.
          </div>
        )}

        {/* Transform Operation Custom In-App Dropdown Selector */}
        <div className="space-y-1 relative">
          <div className="flex items-center justify-between text-[10px] text-neutral-400">
            <span className="font-bold uppercase tracking-wider">Operation:</span>
            <span className="font-mono text-amber-400 font-bold uppercase">{currentProperty}</span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setTargetDropdownOpen(false);
              setOperationDropdownOpen(prev => !prev);
            }}
            className="w-full bg-neutral-900 hover:bg-neutral-850 text-white text-xs px-2.5 py-2 rounded-xl border border-neutral-700/80 font-bold flex items-center justify-between transition-colors cursor-pointer shadow-sm"
          >
            <span className="text-neutral-100 truncate">
              {OPERATIONS_LIST.find(o => o.id === currentProperty)?.label || 'Move Position (X / Y)'}
            </span>
            {operationDropdownOpen ? (
              <ChevronUp className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-amber-400 shrink-0 ml-1" />
            )}
          </button>

          {/* In-App Custom Operation Dropdown List */}
          {operationDropdownOpen && (
            <div 
              onClick={(e) => e.stopPropagation()}
              className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-neutral-900 border border-neutral-700/90 rounded-xl shadow-2xl shadow-black/90 p-1.5 max-h-56 overflow-y-auto space-y-0.5"
            >
              <div className="px-2 py-1 text-[9px] font-black text-neutral-400 uppercase tracking-wider border-b border-neutral-800">
                Transform Mode Operation
              </div>
              {OPERATIONS_LIST.map((op) => {
                const isSelected = currentProperty === op.id;
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => {
                      setTwitch({ hudTransformProperty: op.id });
                      setOperationDropdownOpen(false);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold'
                        : 'hover:bg-neutral-800 text-neutral-300 hover:text-white border border-transparent'
                    }`}
                  >
                    <span>{op.label}</span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Axis Buttons (X, Y, Z / 3D, All) */}
        <div className="space-y-1">
          <span className="text-[9px] text-neutral-400 font-bold uppercase tracking-wider block">Axis / Direction:</span>
          <div className="grid grid-cols-4 gap-1">
            {(['all', 'x', 'y', 'z'] as const).map(ax => (
              <button
                key={ax}
                onClick={() => setTwitch({ hudAxis: ax })}
                className={`py-1 text-[10px] font-black uppercase rounded-lg transition-all ${
                  (twitchState.hudAxis || 'all') === ax
                    ? 'bg-amber-500 text-neutral-950 shadow-sm shadow-amber-500/20'
                    : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
                }`}
              >
                {ax === 'z' ? '3D' : ax}
              </button>
            ))}
          </div>
        </div>

        {/* Dual Increment / Decrement Sliders (-200 to +200) */}
        {selectedShape && (
          <div className="space-y-2 pt-1 border-t border-neutral-800">
            {/* Direct Slider */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px]">
                <span className="text-neutral-400 font-bold">Slider (-200 to +200):</span>
                <span className="text-amber-400 font-mono font-bold">
                  {currentProperty === 'move' ? (twitchState.hudAxis === 'y' ? selectedShape.transform.y : selectedShape.transform.x) || 0 : (
                    currentProperty === 'rotate' ? `${selectedShape.transform.rotation || 0}°` : (
                      currentProperty === 'scale' ? `${(selectedShape.transform.scaleX || 1).toFixed(2)}x` : 0
                    )
                  )}
                </span>
              </div>
              <input
                type="range"
                min="-200"
                max="200"
                value={
                  currentProperty === 'move'
                    ? (twitchState.hudAxis === 'y' ? selectedShape.transform.y : selectedShape.transform.x) || 0
                    : currentProperty === 'rotate'
                    ? selectedShape.transform.rotation || 0
                    : currentProperty === 'scale'
                    ? ((selectedShape.transform.scaleX || 1) - 1) * 100
                    : 0
                }
                onChange={(e) => handleApplyPropertyValue(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Quick Step Buttons (-10, -1, 0, +1, +10) */}
            <div className="grid grid-cols-5 gap-1 pt-1">
              {[-10, -1, 0, 1, 10].map(step => (
                <button
                  key={step}
                  onClick={() => {
                    if (step === 0) {
                      handleApplyPropertyValue(0);
                    } else {
                      const curVal = currentProperty === 'move' ? (twitchState.hudAxis === 'y' ? selectedShape.transform.y : selectedShape.transform.x) || 0 : (selectedShape.transform.rotation || 0);
                      handleApplyPropertyValue(curVal + step);
                    }
                  }}
                  className="py-1 text-[9px] font-black bg-neutral-900 hover:bg-neutral-800 text-neutral-300 hover:text-white rounded-md transition-all font-mono"
                >
                  {step === 0 ? 'Reset' : (step > 0 ? `+${step}` : `${step}`)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
