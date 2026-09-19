// @ts-nocheck
import React, { useState } from 'react';
import { 
  Box, 
  Rotate3d, 
  Eye, 
  EyeOff, 
  Layers, 
  RefreshCw, 
  ShieldCheck, 
  Compass, 
  Maximize2, 
  Sliders, 
  SlidersHorizontal,
  ChevronDown,
  ChevronRight,
  RotateCcw
} from 'lucide-react';
import { VectorObject, Rule3DState, Rule3DDetectedPart } from '../types';
import { build3DSoulFromVectorObject } from '../utils/stroke3DEngine';

interface RuleTransform3DStudioProps {
  selectedObject: VectorObject | null;
  updateObject: (id: string, updates: Partial<VectorObject>) => void;
  historyPush?: () => void;
}

export const RuleTransform3DStudio: React.FC<RuleTransform3DStudioProps> = ({
  selectedObject,
  updateObject,
  historyPush
}) => {
  const [showPartsList, setShowPartsList] = useState(false);
  const [showAdvancedRules, setShowAdvancedRules] = useState(true);

  if (!selectedObject) {
    return (
      <div className="bg-neutral-900/60 p-3.5 rounded-2xl border border-neutral-800 space-y-2 text-center">
        <Rotate3d className="w-6 h-6 text-indigo-400 mx-auto animate-pulse" />
        <span className="text-xs font-black uppercase tracking-wider text-neutral-300 block">
          3D Transform
        </span>
      </div>
    );
  }

  const ruleState: Rule3DState | undefined = selectedObject.rule3DState;
  const isEngineActive = !!(ruleState && ruleState.enabled);

  const handleInitEngine = (profile: 'ellipsoid' | 'cylinder' | 'planar' | 'spherical' = 'ellipsoid') => {
    const newRuleState = build3DSoulFromVectorObject(selectedObject, 45, profile);
    updateObject(selectedObject.id, {
      rule3DState: newRuleState
    });
    if (historyPush) historyPush();
  };

  const handleUpdateRuleState = (updates: Partial<Rule3DState>) => {
    if (!selectedObject) return;
    const current = selectedObject.rule3DState;
    if (!current) {
      const initial = build3DSoulFromVectorObject(selectedObject, 45);
      updateObject(selectedObject.id, {
        rule3DState: {
          ...initial,
          ...updates,
          previousState: {
            yaw: initial.yaw,
            pitch: initial.pitch,
            roll: initial.roll,
            scale3D: initial.scale3D,
            translateX: initial.translateX,
            translateY: initial.translateY,
            translateZ: initial.translateZ
          }
        }
      });
      return;
    }

    // Save previous state for undo/delta before modifying
    const previousState = {
      yaw: current.yaw,
      pitch: current.pitch,
      roll: current.roll,
      scale3D: current.scale3D,
      translateX: current.translateX,
      translateY: current.translateY,
      translateZ: current.translateZ
    };

    updateObject(selectedObject.id, {
      rule3DState: {
        ...current,
        ...updates,
        previousState
      }
    });
  };

  const handleResetToFirstShape = () => {
    if (!selectedObject || !ruleState) return;
    handleUpdateRuleState({
      yaw: 0,
      pitch: 0,
      roll: 0,
      scale3D: 1.0,
      translateX: 0,
      translateY: 0,
      translateZ: 0
    });
    if (historyPush) historyPush();
  };

  const handleLockCurrentAsFirstShape = () => {
    if (!selectedObject) return;
    const freshState = build3DSoulFromVectorObject(
      selectedObject, 
      ruleState?.volumetricDepth || 45,
      ruleState?.curvatureProfile || 'ellipsoid'
    );
    updateObject(selectedObject.id, {
      rule3DState: {
        ...freshState,
        yaw: 0,
        pitch: 0,
        roll: 0
      }
    });
    if (historyPush) historyPush();
  };

  const handleUndoToPreviousState = () => {
    if (!selectedObject || !ruleState || !ruleState.previousState) return;
    const prev = ruleState.previousState;
    updateObject(selectedObject.id, {
      rule3DState: {
        ...ruleState,
        yaw: prev.yaw,
        pitch: prev.pitch,
        roll: prev.roll,
        scale3D: prev.scale3D,
        translateX: prev.translateX,
        translateY: prev.translateY,
        translateZ: prev.translateZ
      }
    });
    if (historyPush) historyPush();
  };

  const handleTogglePartVisibility = (partId: string) => {
    if (!selectedObject || !ruleState) return;
    const updated = ruleState.detectedParts.map(p => 
      p.id === partId ? { ...p, visible: !p.visible } : p
    );
    handleUpdateRuleState({ detectedParts: updated });
  };

  const handleUpdatePartDepth = (partId: string, depthOffset: number) => {
    if (!selectedObject || !ruleState) return;
    const updated = ruleState.detectedParts.map(p => 
      p.id === partId ? { ...p, depthOffset } : p
    );
    handleUpdateRuleState({ detectedParts: updated });
  };

  return (
    <div className="space-y-4 bg-gradient-to-b from-indigo-950/40 via-neutral-900/60 to-neutral-900/80 p-3.5 rounded-2xl border border-indigo-500/30 shadow-xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Rotate3d className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <span className="text-[11px] font-black uppercase tracking-wider text-indigo-200 block">
              3D Transform
            </span>
            <span className="text-[9px] text-indigo-400 font-bold">
              3D Depth & Orbit
            </span>
          </div>
        </div>

        {/* Master Toggle */}
        <button
          type="button"
          onClick={() => {
            if (!isEngineActive) {
              handleInitEngine();
            } else {
              handleUpdateRuleState({ enabled: false });
            }
          }}
          className={`px-2.5 py-1 text-[10px] font-black rounded-lg transition-all flex items-center gap-1.5 ${
            isEngineActive
              ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/30'
              : 'bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700'
          }`}
        >
          <Rotate3d className="w-3 h-3" />
          {isEngineActive ? '3D Active' : 'Enable 3D'}
        </button>
      </div>

      {!isEngineActive ? (
        <div className="space-y-3 pt-1">
          <button
            type="button"
            onClick={() => handleInitEngine('ellipsoid')}
            className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-[11px] font-black rounded-xl shadow-lg shadow-indigo-900/40 transition-all flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            <Box className="w-4 h-4 text-amber-300" />
            Create 3D Mesh
          </button>
        </div>
      ) : (
        <div className="space-y-3.5 pt-1 text-xs">
          {/* Three-State Memory Architecture Bar */}
          <div className="bg-neutral-900/90 p-2.5 rounded-xl border border-indigo-500/20 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-neutral-400">
              <span className="font-extrabold uppercase tracking-wider text-indigo-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Base Shape
              </span>
              <span className="text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Base Protected
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1">
              <button
                type="button"
                onClick={handleResetToFirstShape}
                className="py-1.5 px-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-[9.5px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                title="Reset rotation and transforms back to 0° FirstShape state"
              >
                <RefreshCw className="w-3 h-3 text-indigo-400" />
                Reset 0°
              </button>

              <button
                type="button"
                onClick={handleUndoToPreviousState}
                disabled={!ruleState?.previousState}
                className="py-1.5 px-2 bg-neutral-800 hover:bg-neutral-700 disabled:opacity-40 text-neutral-200 text-[9.5px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                title="Revert to previous frame transform"
              >
                <RotateCcw className="w-3 h-3 text-amber-400" />
                Prev Frame
              </button>

              <button
                type="button"
                onClick={handleLockCurrentAsFirstShape}
                className="py-1.5 px-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 text-[9.5px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1"
                title="Lock current drawing shape as the new base FirstShape"
              >
                <ShieldCheck className="w-3 h-3 text-indigo-400" />
                Lock Shape
              </button>
            </div>
          </div>

          {/* Real-time 3D Rotation Sliders */}
          <div className="space-y-3 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-300 block">
              3D Rotation
            </span>

            {/* 3D Yaw (Y-Axis / Left-Right Turn) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-neutral-300 font-bold">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                  3D Yaw (Turn Left ↔ Right)
                </span>
                <span className="font-mono text-indigo-400 bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-500/20">
                  {Math.round(ruleState.yaw || 0)}°
                </span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={ruleState.yaw || 0}
                onChange={(e) => handleUpdateRuleState({ yaw: parseFloat(e.target.value) })}
                className="w-full accent-indigo-500"
              />
            </div>

            {/* 3D Pitch (X-Axis / Up-Down Tilt) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-neutral-300 font-bold">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-pink-500 inline-block" />
                  3D Pitch (Tilt Up ↕ Down)
                </span>
                <span className="font-mono text-pink-400 bg-pink-500/10 px-1.5 py-0.2 rounded border border-pink-500/20">
                  {Math.round(ruleState.pitch || 0)}°
                </span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={ruleState.pitch || 0}
                onChange={(e) => handleUpdateRuleState({ pitch: parseFloat(e.target.value) })}
                className="w-full accent-pink-500"
              />
            </div>

            {/* 3D Roll (Z-Axis) */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-neutral-300 font-bold">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  3D Roll (Z-Axis Spin)
                </span>
                <span className="font-mono text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                  {Math.round(ruleState.roll || 0)}°
                </span>
              </div>
              <input
                type="range"
                min="-180"
                max="180"
                value={ruleState.roll || 0}
                onChange={(e) => handleUpdateRuleState({ roll: parseFloat(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </div>
          </div>

          {/* Quick 3D Angle Turn Presets */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-neutral-400 block">
              Angle Presets
            </span>
            <div className="grid grid-cols-4 gap-1">
              {[
                { label: 'Front (0°)', yaw: 0, pitch: 0 },
                { label: '¾ Left (-45°)', yaw: -45, pitch: 0 },
                { label: '¾ Right (45°)', yaw: 45, pitch: 0 },
                { label: 'Prof. L (-90°)', yaw: -90, pitch: 0 },
                { label: 'Prof. R (90°)', yaw: 90, pitch: 0 },
                { label: 'Top-Down', yaw: 0, pitch: 35 },
                { label: 'Low Angle', yaw: 0, pitch: -25 },
                { label: 'Back (180°)', yaw: 180, pitch: 0 }
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    handleUpdateRuleState({ yaw: preset.yaw, pitch: preset.pitch });
                    if (historyPush) historyPush();
                  }}
                  className={`py-1.5 px-1 text-[9px] font-bold rounded-lg transition-all text-center ${
                    Math.round(ruleState.yaw || 0) === preset.yaw && Math.round(ruleState.pitch || 0) === preset.pitch
                      ? 'bg-indigo-500 text-white font-black'
                      : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Advanced 3D Rules & Depth Configuration */}
          <div className="space-y-2.5 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
            <button
              type="button"
              onClick={() => setShowAdvancedRules(!showAdvancedRules)}
              className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-indigo-300"
            >
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-400" />
                3D Volumetric Depth & Rules
              </span>
              {showAdvancedRules ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </button>

            {showAdvancedRules && (
              <div className="space-y-3 pt-2">
                {/* Occlusion & Back-face culling */}
                <div className="flex items-center justify-between bg-neutral-950/40 p-2 rounded-lg border border-neutral-800">
                  <div>
                    <span className="text-[10px] text-neutral-200 font-bold block">
                      Occlusion & Back-Face Culling
                    </span>
                    <span className="text-[8.5px] text-neutral-400 block">
                      Hides far ear/eye & occluded lines during turn
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={ruleState.occlusionEnabled}
                    onChange={(e) => handleUpdateRuleState({ occlusionEnabled: e.target.checked })}
                    className="w-4 h-4 rounded accent-indigo-500"
                  />
                </div>

                {/* Foreshortening */}
                <div className="flex items-center justify-between bg-neutral-950/40 p-2 rounded-lg border border-neutral-800">
                  <div>
                    <span className="text-[10px] text-neutral-200 font-bold block">
                      3D Foreshortening
                    </span>
                    <span className="text-[8.5px] text-neutral-400 block">
                      Adjusts stroke thickness and width by angle
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={ruleState.foreshorteningEnabled}
                    onChange={(e) => handleUpdateRuleState({ foreshorteningEnabled: e.target.checked })}
                    className="w-4 h-4 rounded accent-indigo-500"
                  />
                </div>

                {/* Volumetric Bulge Depth */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-neutral-300 font-bold">
                    <span>Volumetric Depth Curvature</span>
                    <span className="font-mono text-indigo-400">{Math.round(ruleState.volumetricDepth || 45)}px</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="120"
                    value={ruleState.volumetricDepth || 45}
                    onChange={(e) => handleUpdateRuleState({ volumetricDepth: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500"
                  />
                </div>

                {/* Camera Perspective Focal Length */}
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-neutral-300 font-bold">
                    <span>Camera Perspective (Focal Length)</span>
                    <span className="font-mono text-indigo-400">{Math.round(ruleState.perspective || 500)}px</span>
                  </div>
                  <input
                    type="range"
                    min="150"
                    max="1200"
                    value={ruleState.perspective || 500}
                    onChange={(e) => handleUpdateRuleState({ perspective: parseFloat(e.target.value) })}
                    className="w-full accent-indigo-500"
                  />
                </div>

                {/* Specific Protrusion Depth Offsets */}
                <div className="grid grid-cols-3 gap-2 pt-1 border-t border-neutral-800/80">
                  <div className="space-y-1">
                    <span className="text-[8.5px] text-neutral-400 font-bold block">Nose Protrusion</span>
                    <input
                      type="range"
                      min="0"
                      max="80"
                      value={ruleState.noseDepth ?? 40}
                      onChange={(e) => handleUpdateRuleState({ noseDepth: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                    <span className="text-[8.5px] text-indigo-300 font-mono text-center block">+{ruleState.noseDepth ?? 40}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8.5px] text-neutral-400 font-bold block">Eye Depth</span>
                    <input
                      type="range"
                      min="0"
                      max="50"
                      value={ruleState.eyeDepth ?? 18}
                      onChange={(e) => handleUpdateRuleState({ eyeDepth: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                    <span className="text-[8.5px] text-indigo-300 font-mono text-center block">+{ruleState.eyeDepth ?? 18}</span>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[8.5px] text-neutral-400 font-bold block">Ear Inset</span>
                    <input
                      type="range"
                      min="-60"
                      max="0"
                      value={ruleState.earDepth ?? -25}
                      onChange={(e) => handleUpdateRuleState({ earDepth: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-500"
                    />
                    <span className="text-[8.5px] text-indigo-300 font-mono text-center block">{ruleState.earDepth ?? -25}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Detected Semantic Parts Inspector */}
          {ruleState.detectedParts && ruleState.detectedParts.length > 0 && (
            <div className="space-y-2 bg-neutral-900/60 p-3 rounded-xl border border-neutral-800">
              <button
                type="button"
                onClick={() => setShowPartsList(!showPartsList)}
                className="w-full flex items-center justify-between text-[10px] font-black uppercase tracking-wider text-indigo-300"
              >
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  Semantic Parts ({ruleState.detectedParts.length} Detected)
                </span>
                {showPartsList ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>

              {showPartsList && (
                <div className="space-y-2 pt-1 max-h-48 overflow-y-auto pr-1">
                  {ruleState.detectedParts.map((part) => (
                    <div
                      key={part.id}
                      className="flex items-center justify-between bg-neutral-950/60 p-2 rounded-lg border border-neutral-800/80"
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleTogglePartVisibility(part.id)}
                          className={`p-1 rounded hover:bg-neutral-800 ${part.visible ? 'text-indigo-400' : 'text-neutral-600'}`}
                        >
                          {part.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                        </button>
                        <div>
                          <span className="text-[9.5px] font-bold text-neutral-200 block">
                            {part.name}
                          </span>
                          <span className="text-[8px] text-neutral-500 capitalize">
                            Side: {part.side} | {part.strokeCount} {part.strokeCount === 1 ? 'stroke' : 'strokes'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 w-20">
                        <input
                          type="range"
                          min="-50"
                          max="80"
                          value={part.depthOffset}
                          onChange={(e) => handleUpdatePartDepth(part.id, parseFloat(e.target.value))}
                          className="w-full accent-indigo-500 h-1.5"
                          title="Adjust individual 3D depth protrusion"
                        />
                        <span className="text-[8px] font-mono text-indigo-300 w-5 text-right">
                          {Math.round(part.depthOffset)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RuleTransform3DStudio;
