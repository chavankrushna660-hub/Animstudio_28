// @ts-nocheck
import React, { useState } from 'react';
import { 
  Crosshair, 
  Eye, 
  EyeOff, 
  RotateCw, 
  Move, 
  Scale, 
  Layers, 
  Activity, 
  Crop, 
  PenTool, 
  Trash2, 
  Copy, 
  Lock, 
  Unlock, 
  Plus, 
  RefreshCw, 
  Sliders, 
  Maximize2,
  Box,
  SlidersHorizontal,
  ChevronDown,
  Compass,
  Check
} from 'lucide-react';
import { VectorObject, TwitchIdentifiedShape, TwitchToolState } from '../types';
import { scanDrawingShapes, calculateCentroid, calculateArea, getPointsBounds, applyLineToolDimensions, calculatePerimeter } from '../utils/twitchEngine';

interface TwitchToolPanelProps {
  selectedObject: VectorObject | null;
  updateObject: (id: string, updates: Partial<VectorObject>) => void;
  objects: { [id: string]: VectorObject };
  activeTool: string;
}

export default function TwitchToolPanel({
  selectedObject,
  updateObject,
  objects,
  activeTool
}: TwitchToolPanelProps) {
  if (activeTool !== 'TWT' && activeTool !== 'twitch') {
    return null;
  }

  if (!selectedObject) {
    return (
      <div className="bg-neutral-950/80 border border-neutral-800/80 rounded-2xl p-4 text-center space-y-2 select-none shadow-xl">
        <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center mx-auto text-neutral-300">
          <Crosshair className="w-5 h-5" />
        </div>
        <h4 className="text-xs font-black uppercase tracking-wider text-neutral-200"> Twitch Tool Active</h4>
      </div>
    );
  }

  const twitchState: TwitchToolState = selectedObject.twitchState || {
    active: true,
    activeMode: 'edit',
    selectedShapeId: null,
    hoveredShapeId: null,
    shapes: [],
    hudBoxPosition: { x: 80, y: 120 },
    hudTransformProperty: 'move',
    hudIncrementValue: 0,
    hudDecrementValue: 0,
    hudAxis: 'all',
    showHudBox: true,
    autoScanOnSelect: true
  };

  const shapes = twitchState.shapes || [];
  const selectedShape = shapes.find(s => s.id === twitchState.selectedShapeId) || null;

  // Helper to update Twitch Tool state on object
  const setTwitchState = (newState: Partial<TwitchToolState>) => {
    updateObject(selectedObject.id, {
      twitchState: {
        ...twitchState,
        ...newState
      }
    });
  };

  // Perform Deep Scan with progressive scanning feedback
  const handleDeepScan = () => {
    setTwitchState({ isScanning: true, scanProgress: 10, scanStatusText: "Creating planar graph..." });
    setTimeout(() => {
      setTwitchState({ scanProgress: 50, scanStatusText: "Detecting closed shapes & cycles..." });
      setTimeout(() => {
        const scannedShapes = scanDrawingShapes(selectedObject);
        setTwitchState({
          shapes: scannedShapes,
          selectedShapeId: scannedShapes.length > 0 ? scannedShapes[0].id : null,
          lastScannedObjectId: selectedObject.id,
          isScanning: false,
          scanProgress: 100,
          scanStatusText: "Complete!"
        });
      }, 250);
    }, 200);
  };

  // Toggle Hide / Show on specific shape
  const handleToggleHideShape = (shapeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updatedShapes = shapes.map(s => {
      if (s.id === shapeId) {
        return { ...s, isHidden: !s.isHidden };
      }
      return s;
    });
    setTwitchState({ shapes: updatedShapes });
  };

  // Toggle Lock / Unlock on specific shape
  const handleToggleLockShape = (shapeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updatedShapes = shapes.map(s => {
      if (s.id === shapeId) {
        return { ...s, isLocked: !s.isLocked };
      }
      return s;
    });
    setTwitchState({ shapes: updatedShapes });
  };

  // Duplicate selected shape
  const handleDuplicateShape = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!selectedShape) return;
    const duplicated: TwitchIdentifiedShape = {
      ...selectedShape,
      id: `shape_dup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: `${selectedShape.name}_Copy`,
      transform: {
        ...selectedShape.transform,
        x: (selectedShape.transform.x || 0) + 20,
        y: (selectedShape.transform.y || 0) + 20
      }
    };
    const updatedShapes = [...shapes, duplicated];
    setTwitchState({
      shapes: updatedShapes,
      selectedShapeId: duplicated.id
    });
  };

  // Delete selected shape
  const handleDeleteShape = (shapeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updatedShapes = shapes.filter(s => s.id !== shapeId);
    setTwitchState({
      shapes: updatedShapes,
      selectedShapeId: updatedShapes.length > 0 ? updatedShapes[0].id : null
    });
  };

  // Update properties of the currently selected shape
  const updateSelectedShape = (updates: Partial<TwitchIdentifiedShape>) => {
    if (!selectedShape) return;
    const updatedShapes = shapes.map(s => {
      if (s.id === selectedShape.id) {
        return { ...s, ...updates };
      }
      return s;
    });
    setTwitchState({ shapes: updatedShapes });
  };

  // Update transform of the selected shape
  const updateSelectedShapeTransform = (tUpdates: Partial<TwitchIdentifiedShape['transform']>) => {
    if (!selectedShape) return;
    updateSelectedShape({
      transform: {
        ...selectedShape.transform,
        ...tUpdates
      }
    });
  };

  // Reset selected shape transform
  const handleResetShapeTransform = () => {
    if (!selectedShape) return;
    updateSelectedShape({
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
      curvePoints: selectedShape.origPoints ? selectedShape.origPoints.map((p, i) => ({
        id: `crv_${i}`,
        x: p.x,
        y: p.y,
        origX: p.x,
        origY: p.y,
        t: i / Math.max(1, selectedShape.origPoints.length - 1)
      })) : undefined
    });
  };

  const b = selectedShape ? (selectedShape.boundingBox || selectedShape.bounds || getPointsBounds(selectedShape.points)) : null;
  const areaVal = selectedShape ? (selectedShape.area || calculateArea(selectedShape.points) || Math.round((b?.width || 10) * (b?.height || 10) * 0.7)) : 0;
  const centroidVal = selectedShape ? (selectedShape.centroid || calculateCentroid(selectedShape.points)) : { x: 0, y: 0 };

  return (
    <div className="space-y-3.5 bg-neutral-950/85 border border-neutral-800/90 rounded-2xl p-3.5 shadow-2xl shadow-black/60 text-neutral-200 select-none">
      {/* Header Banner */}
      <div className="flex items-center justify-between border-b border-neutral-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-neutral-800 border border-neutral-700 flex items-center justify-center text-neutral-300">
            <Crosshair className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-neutral-200">
               TWITCH TOOL
            </h3>
            <p className="text-[10px] text-neutral-400 font-medium truncate max-w-[170px]">
              {selectedObject.name || 'Drawing Dissector'}
            </p>
          </div>
        </div>
        <button
          onClick={handleDeepScan}
          disabled={twitchState.isScanning}
          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-neutral-950 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1 shadow-md shadow-amber-500/20"
          title="Deep scan drawing strokes & internal compound shapes"
        >
          <RefreshCw className={`w-3 h-3 ${twitchState.isScanning ? 'animate-spin' : ''}`} />
          {twitchState.isScanning ? 'Scanning...' : 'Scan Shapes'}
        </button>
      </div>

      {/* Progress feedback during scanning */}
      {twitchState.isScanning && (
        <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-1.5 animate-pulse">
          <div className="flex justify-between text-[10px] font-bold text-blue-400">
            <span>{twitchState.scanStatusText || 'Scanning Drawing Topology...'}</span>
            <span>{twitchState.scanProgress || 50}%</span>
          </div>
          <div className="w-full h-1.5 bg-neutral-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 rounded-full transition-all duration-300"
              style={{ width: `${twitchState.scanProgress || 50}%` }}
            />
          </div>
        </div>
      )}

      {/* Auto-Scan Status / Shape Count */}
      <div className="flex items-center justify-between text-[10px] bg-neutral-900/70 px-3 py-2 rounded-xl border border-neutral-800/80">
        <span className="text-neutral-400 font-bold uppercase tracking-wider">Detected Shapes:</span>
        <span className="text-amber-400 font-black font-mono">
          {shapes.length > 0 ? `${shapes.length} Found` : '0 (Click Scan)'}
        </span>
      </div>

      {shapes.length === 0 ? (
        <div className="p-4 bg-neutral-900/50 border border-dashed border-neutral-800 rounded-xl text-center space-y-2">
          <button
            onClick={handleDeepScan}
            className="w-full py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-md border-2 border-neutral-300 transition-all flex items-center justify-center gap-1.5"
          >
            <Crosshair className="w-3.5 h-3.5" />
             Scan Shapes Now
          </button>
        </div>
      ) : (
        <>
          {/* 5 Modes Selector Tabs */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
              MODES:
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[
                { id: 'edit', label: 'Edit Mode', icon: Move },
                { id: 'transform', label: 'Transform Mode', icon: Sliders },
                { id: 'curve', label: 'Curve Deform', icon: Activity },
                { id: 'mesh', label: 'Mesh Deform', icon: Crop },
                { id: 'line', label: 'Line Edit', icon: PenTool },
                { id: 'new_shape', label: 'New Shape', icon: Plus }
              ].map(m => {
                const Icon = m.icon;
                const isActive = twitchState.activeMode === m.id;
                return (
                  <button
                    key={m.id}
                    onClick={() => setTwitchState({ activeMode: m.id as any })}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
                      isActive
                        ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 font-black'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white hover:bg-neutral-800'
                    }`}
                  >
                    <Icon className="w-3 h-3 shrink-0" />
                    <span className="truncate">{m.label.split(' ')[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Identified Shapes List ( Twitch Shapes) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-neutral-400">
              <span className="font-black uppercase tracking-wider"> Twitch Shapes:</span>
              <span className="text-neutral-500 font-mono">{shapes.length} total</span>
            </div>
            <div className="max-h-36 overflow-y-auto space-y-1 pr-0.5 scrollbar-thin">
              {shapes.map((s, idx) => {
                const isSelected = twitchState.selectedShapeId === s.id;
                return (
                  <div
                    key={s.id}
                    onClick={() => setTwitchState({ selectedShapeId: s.id })}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-blue-600/20 border-blue-500/60 text-blue-300 font-bold'
                        : 'bg-neutral-900/60 border-neutral-800/60 text-neutral-300 hover:bg-neutral-800/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-4 h-4 rounded-full bg-neutral-800 text-[9px] font-mono font-bold flex items-center justify-center text-amber-400 shrink-0">
                        {idx + 1}
                      </span>
                      <span className="truncate font-semibold text-[11px]">{s.name}</span>
                      <span className="text-[9px] text-neutral-500 font-mono">
                        ({s.isClosed ? 'Closed' : 'Open'})
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Lock / Unlock Toggle */}
                      <button
                        onClick={(e) => handleToggleLockShape(s.id, e)}
                        className={`p-1 rounded-md transition-colors ${
                          s.isLocked ? 'text-amber-400 bg-amber-500/20' : 'text-neutral-500 hover:text-white'
                        }`}
                        title={s.isLocked ? "Unlock Shape" : "Lock Shape"}
                      >
                        {s.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                      </button>

                      {/* Hide / Show Eye Toggle */}
                      <button
                        onClick={(e) => handleToggleHideShape(s.id, e)}
                        className={`p-1 rounded-md transition-colors ${
                          s.isHidden
                            ? 'text-rose-400 bg-rose-500/20 hover:bg-rose-500/30'
                            : 'text-neutral-400 hover:text-white hover:bg-neutral-700'
                        }`}
                        title={s.isHidden ? "Click to show shape" : "Click to hide shape"}
                      >
                        {s.isHidden ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SELECTED SHAPE DETAILS & TRANSFORMS */}
          {selectedShape && (
            <div className="space-y-3 pt-2 border-t border-neutral-800/90">
              {/* Selected Shape Meta Box */}
              <div className="bg-neutral-900/80 p-2.5 rounded-xl border border-neutral-800 space-y-1.5 text-[10px]">
                <div className="flex items-center justify-between text-neutral-400 border-b border-neutral-800 pb-1.5">
                  <span className="font-black uppercase text-amber-400">SELECTED SHAPE:</span>
                  <div className="flex gap-1.5">
                    <button
                      onClick={handleDuplicateShape}
                      className="text-neutral-400 hover:text-white flex items-center gap-0.5 text-[9px] uppercase font-bold"
                      title="Duplicate this shape"
                    >
                      <Copy className="w-3 h-3" /> Dup
                    </button>
                    <button
                      onClick={(e) => handleDeleteShape(selectedShape.id, e)}
                      className="text-rose-400 hover:text-rose-300 flex items-center gap-0.5 text-[9px] uppercase font-bold"
                      title="Delete this shape"
                    >
                      <Trash2 className="w-3 h-3" /> Del
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-x-2 gap-y-1 pt-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-neutral-400 font-bold">Name:</span>
                    <input
                      type="text"
                      value={selectedShape.name}
                      onChange={(e) => updateSelectedShape({ name: e.target.value })}
                      className="bg-neutral-800 text-white px-1.5 py-0.5 rounded font-bold w-24 text-[10px] focus:outline-none focus:border-amber-400 border border-neutral-700"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 font-bold">Type:</span>
                    <span className="text-amber-300 font-mono font-bold">
                      {selectedShape.isClosed ? 'Closed Loop' : 'Open Stroke'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 font-bold">Points:</span>
                    <span className="text-amber-400 font-mono font-bold">{selectedShape.points?.length || 0} pts</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 font-bold">Perimeter:</span>
                    <span className="text-amber-400 font-mono font-bold">{selectedShape.perimeterLength || calculatePerimeter(selectedShape.points, selectedShape.isClosed)} px</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 font-bold">Area:</span>
                    <span className="text-amber-400 font-mono font-bold">{areaVal} px²</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-400 font-bold">Bounds:</span>
                    <span className="text-amber-400 font-mono font-bold">{b?.width || 0} x {b?.height || 0}px</span>
                  </div>
                  <div className="flex items-center justify-between col-span-2 text-neutral-400 font-mono text-[9px] pt-0.5 border-t border-neutral-800/60">
                    <span>Centroid: ({centroidVal.x}, {centroidVal.y})</span>
                    <span>Origin: ({b?.minX || 0}, {b?.minY || 0})</span>
                  </div>
                </div>
              </div>

              {/* TRANSFORMS SECTION (With numeric step +/- buttons) */}
              {twitchState.activeMode === 'transform' && (
                <div className="space-y-2 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800 text-[10px]">
                  <div className="flex items-center justify-between border-b border-neutral-800 pb-1">
                    <span className="font-black uppercase text-amber-400 tracking-wider">TRANSFORMS:</span>
                    <button
                      onClick={handleResetShapeTransform}
                      className="text-[9px] text-neutral-400 hover:text-amber-400 uppercase font-mono font-bold"
                    >
                      Reset All
                    </button>
                  </div>

                  {/* Move X, Y with [-5] [+5] */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <div className="flex justify-between text-neutral-400 font-bold">
                        <span>X:</span>
                        <span className="text-amber-400 font-mono">{selectedShape.transform.x || 0}px</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateSelectedShapeTransform({ x: (selectedShape.transform.x || 0) - 5 })}
                          className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded font-mono font-bold"
                        >
                          -5
                        </button>
                        <input
                          type="range"
                          min="-200"
                          max="200"
                          value={selectedShape.transform.x || 0}
                          onChange={(e) => updateSelectedShapeTransform({ x: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-neutral-800 rounded appearance-none accent-amber-500"
                        />
                        <button
                          onClick={() => updateSelectedShapeTransform({ x: (selectedShape.transform.x || 0) + 5 })}
                          className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded font-mono font-bold"
                        >
                          +5
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-neutral-400 font-bold">
                        <span>Y:</span>
                        <span className="text-amber-400 font-mono">{selectedShape.transform.y || 0}px</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateSelectedShapeTransform({ y: (selectedShape.transform.y || 0) - 5 })}
                          className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded font-mono font-bold"
                        >
                          -5
                        </button>
                        <input
                          type="range"
                          min="-200"
                          max="200"
                          value={selectedShape.transform.y || 0}
                          onChange={(e) => updateSelectedShapeTransform({ y: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-neutral-800 rounded appearance-none accent-amber-500"
                        />
                        <button
                          onClick={() => updateSelectedShapeTransform({ y: (selectedShape.transform.y || 0) + 5 })}
                          className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded font-mono font-bold"
                        >
                          +5
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Rotation & 3D Flip with [-1][+1] / [-5][+5] */}
                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-neutral-400 font-bold">
                      <span>Rotation (Z):</span>
                      <span className="text-amber-400 font-mono">{selectedShape.transform.rotation || 0}°</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => updateSelectedShapeTransform({ rotation: (selectedShape.transform.rotation || 0) - 5 })}
                        className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded font-mono font-bold"
                      >
                        -5°
                      </button>
                      <button
                        onClick={() => updateSelectedShapeTransform({ rotation: (selectedShape.transform.rotation || 0) - 1 })}
                        className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded font-mono font-bold"
                      >
                        -1°
                      </button>
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        value={selectedShape.transform.rotation || 0}
                        onChange={(e) => updateSelectedShapeTransform({ rotation: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-neutral-800 rounded appearance-none accent-amber-500"
                      />
                      <button
                        onClick={() => updateSelectedShapeTransform({ rotation: (selectedShape.transform.rotation || 0) + 1 })}
                        className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded font-mono font-bold"
                      >
                        +1°
                      </button>
                      <button
                        onClick={() => updateSelectedShapeTransform({ rotation: (selectedShape.transform.rotation || 0) + 5 })}
                        className="px-1.5 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded font-mono font-bold"
                      >
                        +5°
                      </button>
                    </div>
                  </div>

                  {/* Scale X & Scale Y */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <div className="flex justify-between text-neutral-400 font-bold">
                        <span>Scale X:</span>
                        <span className="text-amber-400 font-mono">{(selectedShape.transform.scaleX || 1).toFixed(2)}x</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateSelectedShapeTransform({ scaleX: Math.max(0.1, (selectedShape.transform.scaleX || 1) - 0.1) })}
                          className="px-1 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded font-mono font-bold text-[9px]"
                        >
                          -0.1
                        </button>
                        <input
                          type="range"
                          min="0.1"
                          max="3.0"
                          step="0.05"
                          value={selectedShape.transform.scaleX || 1}
                          onChange={(e) => updateSelectedShapeTransform({ scaleX: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-neutral-800 rounded appearance-none accent-amber-500"
                        />
                        <button
                          onClick={() => updateSelectedShapeTransform({ scaleX: Math.min(5.0, (selectedShape.transform.scaleX || 1) + 0.1) })}
                          className="px-1 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded font-mono font-bold text-[9px]"
                        >
                          +0.1
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-neutral-400 font-bold">
                        <span>Scale Y:</span>
                        <span className="text-amber-400 font-mono">{(selectedShape.transform.scaleY || 1).toFixed(2)}x</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => updateSelectedShapeTransform({ scaleY: Math.max(0.1, (selectedShape.transform.scaleY || 1) - 0.1) })}
                          className="px-1 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded font-mono font-bold text-[9px]"
                        >
                          -0.1
                        </button>
                        <input
                          type="range"
                          min="0.1"
                          max="3.0"
                          step="0.05"
                          value={selectedShape.transform.scaleY || 1}
                          onChange={(e) => updateSelectedShapeTransform({ scaleY: parseFloat(e.target.value) })}
                          className="w-full h-1 bg-neutral-800 rounded appearance-none accent-amber-500"
                        />
                        <button
                          onClick={() => updateSelectedShapeTransform({ scaleY: Math.min(5.0, (selectedShape.transform.scaleY || 1) + 0.1) })}
                          className="px-1 py-0.5 bg-neutral-800 hover:bg-neutral-700 rounded font-mono font-bold text-[9px]"
                        >
                          +0.1
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Skew X, Skew Y, 3D Flip X, 3D Flip Y */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-neutral-800/60">
                    <div className="space-y-1">
                      <div className="flex justify-between text-neutral-400 font-bold text-[9px]">
                        <span>Skew X:</span>
                        <span className="text-amber-400 font-mono">{selectedShape.transform.skewX || 0}°</span>
                      </div>
                      <input
                        type="range"
                        min="-60"
                        max="60"
                        value={selectedShape.transform.skewX || 0}
                        onChange={(e) => updateSelectedShapeTransform({ skewX: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-neutral-800 rounded appearance-none accent-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-neutral-400 font-bold text-[9px]">
                        <span>Skew Y:</span>
                        <span className="text-amber-400 font-mono">{selectedShape.transform.skewY || 0}°</span>
                      </div>
                      <input
                        type="range"
                        min="-60"
                        max="60"
                        value={selectedShape.transform.skewY || 0}
                        onChange={(e) => updateSelectedShapeTransform({ skewY: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-neutral-800 rounded appearance-none accent-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-neutral-400 font-bold text-[9px]">
                        <span>3D Flip X (Rx):</span>
                        <span className="text-amber-400 font-mono">{selectedShape.transform.rotateX || 0}°</span>
                      </div>
                      <input
                        type="range"
                        min="-90"
                        max="90"
                        value={selectedShape.transform.rotateX || 0}
                        onChange={(e) => updateSelectedShapeTransform({ rotateX: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-neutral-800 rounded appearance-none accent-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-neutral-400 font-bold text-[9px]">
                        <span>3D Flip Y (Ry):</span>
                        <span className="text-amber-400 font-mono">{selectedShape.transform.rotateY || 0}°</span>
                      </div>
                      <input
                        type="range"
                        min="-90"
                        max="90"
                        value={selectedShape.transform.rotateY || 0}
                        onChange={(e) => updateSelectedShapeTransform({ rotateY: parseFloat(e.target.value) })}
                        className="w-full h-1 bg-neutral-800 rounded appearance-none accent-amber-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CURVE DEFORM CONTROLS */}
              {twitchState.activeMode === 'curve' && (
                <div className="space-y-2.5 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800 text-[10px]">
                  

                  <div className="space-y-1 pt-1">
                    <div className="flex justify-between text-neutral-400 font-bold">
                      <span>Handle Points:</span>
                      <span className="text-amber-400 font-mono">{selectedShape.curvePoints?.length || 7} handles</span>
                    </div>
                    <div className="grid grid-cols-4 gap-1">
                      {[4, 6, 8, 12].map((cnt) => (
                        <button
                          key={cnt}
                          onClick={() => {
                            if (!selectedShape.origPoints || selectedShape.origPoints.length === 0) return;
                            const pts = selectedShape.origPoints;
                            const newHandles = [];
                            for (let i = 0; i < cnt; i++) {
                              const t = i / (cnt - 1);
                              const idx = Math.min(pts.length - 1, Math.round(t * (pts.length - 1)));
                              const p = pts[idx];
                              newHandles.push({
                                id: `crv_${i}`,
                                x: p.x,
                                y: p.y,
                                origX: p.x,
                                origY: p.y,
                                t
                              });
                            }
                            updateSelectedShape({ curvePoints: newHandles });
                          }}
                          className={`py-1 rounded text-[9px] font-black uppercase transition-all ${
                            (selectedShape.curvePoints?.length || 7) === cnt
                              ? 'bg-amber-500 text-neutral-950'
                              : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                          }`}
                        >
                          {cnt} pts
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      if (!selectedShape.origPoints) return;
                      const count = selectedShape.curvePoints?.length || 7;
                      const step = (selectedShape.origPoints.length - 1) / (count - 1);
                      const restored = selectedShape.curvePoints?.map((cp, i) => {
                        const idx = Math.min(selectedShape.origPoints.length - 1, Math.round(i * step));
                        const pt = selectedShape.origPoints[idx];
                        return { ...cp, x: pt.x, y: pt.y, origX: pt.x, origY: pt.y };
                      });
                      updateSelectedShape({ curvePoints: restored });
                    }}
                    className="w-full py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold rounded-lg transition-colors uppercase tracking-wider"
                  >
                    Reset Curve Handles
                  </button>
                </div>
              )}

              {/* MESH WARP CONTROLS */}
              {twitchState.activeMode === 'mesh' && (
                <div className="space-y-2.5 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800 text-[10px]">
                  

                  <button
                    onClick={() => {
                      if (!selectedShape.meshGrid) return;
                      const restored = selectedShape.meshGrid.map(mp => ({ ...mp, x: mp.origX, y: mp.origY }));
                      updateSelectedShape({ meshGrid: restored });
                    }}
                    className="w-full py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold rounded-lg transition-colors uppercase tracking-wider"
                  >
                    Reset Mesh Lattice
                  </button>
                </div>
              )}

              {/* EDIT MODE / DIRECT HAND GRAB */}
              {twitchState.activeMode === 'edit' && (
                <div className="space-y-2.5 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800 text-[10px]">
                  
                  
                  <button
                    onClick={() => {
                      if (!selectedShape.origPoints) return;
                      updateSelectedShape({
                        points: selectedShape.origPoints.map(p => ({ ...p }))
                      });
                    }}
                    className="w-full py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold rounded-lg transition-colors uppercase tracking-wider"
                  >
                    Restore Original Stroke Points
                  </button>
                </div>
              )}

              {/* LINE EDIT CONTROLS */}
              {twitchState.activeMode === 'line' && (
                <div className="space-y-3 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800 text-[10px]">
                  

                  {/* Target Line Width */}
                  <div className="space-y-1 bg-neutral-950/60 p-2 rounded-lg border border-neutral-800">
                    <div className="flex justify-between items-center text-neutral-400 font-bold">
                      <span>Line Width:</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={selectedShape.targetLineWidth ?? (b?.width || 50)}
                          onChange={(e) => updateSelectedShape({ targetLineWidth: Math.max(2, parseFloat(e.target.value) || 2) })}
                          className="w-14 px-1.5 py-0.5 bg-neutral-800 text-amber-400 font-mono font-bold text-right rounded border border-neutral-700 focus:outline-none focus:border-amber-400"
                        />
                        <span className="text-[9px] text-neutral-500 font-mono">px</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="600"
                      value={selectedShape.targetLineWidth ?? (b?.width || 50)}
                      onChange={(e) => updateSelectedShape({ targetLineWidth: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  {/* Target Line Height */}
                  <div className="space-y-1 bg-neutral-950/60 p-2 rounded-lg border border-neutral-800">
                    <div className="flex justify-between items-center text-neutral-400 font-bold">
                      <span>Line Height:</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          value={selectedShape.targetLineHeight ?? (b?.height || 50)}
                          onChange={(e) => updateSelectedShape({ targetLineHeight: Math.max(2, parseFloat(e.target.value) || 2) })}
                          className="w-14 px-1.5 py-0.5 bg-neutral-800 text-amber-400 font-mono font-bold text-right rounded border border-neutral-700 focus:outline-none focus:border-amber-400"
                        />
                        <span className="text-[9px] text-neutral-500 font-mono">px</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="600"
                      value={selectedShape.targetLineHeight ?? (b?.height || 50)}
                      onChange={(e) => updateSelectedShape({ targetLineHeight: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  {/* Stroke Thickness */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-neutral-400 font-bold">
                      <span>Stroke Thickness:</span>
                      <span className="text-amber-400 font-mono font-bold">{selectedShape.strokeWidth || selectedObject.strokeWidth || 4}px</span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="40"
                      value={selectedShape.strokeWidth || selectedObject.strokeWidth || 4}
                      onChange={(e) => updateSelectedShape({ strokeWidth: parseInt(e.target.value, 10) })}
                      className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>

                  {/* Apply / OK Button */}
                  <div className="pt-1 space-y-1.5">
                    <button
                      onClick={() => {
                        const targetW = selectedShape.targetLineWidth ?? (b?.width || 50);
                        const targetH = selectedShape.targetLineHeight ?? (b?.height || 50);
                        const deformedShape = applyLineToolDimensions(selectedShape, targetW, targetH);
                        const updatedShapes = (twitchState.shapes || []).map(s => s.id === selectedShape.id ? deformedShape : s);
                        setTwitch({ shapes: updatedShapes });
                      }}
                      className="w-full py-2 bg-gradient-to-r from-neutral-800 to-neutral-900 hover:from-neutral-700 hover:to-neutral-800 text-white font-black rounded-xl transition-all shadow-md uppercase tracking-wider flex items-center justify-center gap-1.5 border border-neutral-700"
                    >
                      <Check className="w-3.5 h-3.5" />
                      OK / Apply Line Deformation
                    </button>

                    <button
                      onClick={() => {
                        if (!selectedShape.origPoints || selectedShape.origPoints.length === 0) return;
                        const origB = getPointsBounds(selectedShape.origPoints);
                        updateSelectedShape({
                          targetLineWidth: origB.width,
                          targetLineHeight: origB.height,
                          points: selectedShape.origPoints.map(p => ({ ...p }))
                        });
                      }}
                      className="w-full py-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-bold rounded-lg transition-colors uppercase tracking-wider text-[9px]"
                    >
                      Reset to Natural Stroke Bounds
                    </button>
                  </div>
                </div>
              )}

              {/* NEW SHAPE MODE */}
              {twitchState.activeMode === 'new_shape' && (
                <div className="space-y-2.5 bg-neutral-900/60 p-2.5 rounded-xl border border-neutral-800 text-[10px]">
                  
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
