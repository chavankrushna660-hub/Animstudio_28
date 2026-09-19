import React from 'react';
import { 
  LayoutGrid, 
  RotateCw, 
  Scale, 
  Maximize2, 
  Move, 
  Trash2, 
  Plus, 
  RefreshCw, 
  Layers, 
  Palette, 
  Sliders, 
  Eye, 
  CheckCircle,
  HelpCircle,
  Minimize2,
  Compass
} from 'lucide-react';
import { MeshWarpPuppetState, MWPExtrudePoint, MWPTransformPoint } from '../utils/meshPuppetWrapEngine';
import CustomColorPicker from './CustomColorPicker';

interface MeshPuppetWrapPanelProps {
  state: MeshWarpPuppetState;
  setState: React.Dispatch<React.SetStateAction<MeshWarpPuppetState>>;
  selectedObjectName?: string;
  onClearAllPoints: () => void;
  onResetSliders: () => void;
  onRemovePoint: (id: string, mode: 'extrude' | 'transform') => void;
}

export default function MeshPuppetWrapPanel({
  state,
  setState,
  selectedObjectName,
  onClearAllPoints,
  onResetSliders,
  onRemovePoint
}: MeshPuppetWrapPanelProps) {
  const isExtrude = state.activeMode === 'extrude';

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-3 space-y-4 text-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg border border-amber-500/30">
            <LayoutGrid className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-amber-300">
              Mesh Puppet Wrap (MWP)
            </h3>
            <p className="text-[10px] text-neutral-400">
              {selectedObjectName ? `Target: ${selectedObjectName}` : 'Select a drawing or PNG to edit'}
            </p>
          </div>
        </div>

        <button
          onClick={onClearAllPoints}
          title="Clear all points"
          className="px-2 py-1 bg-neutral-950 hover:bg-rose-950/50 text-neutral-400 hover:text-rose-300 border border-neutral-800 hover:border-rose-800 rounded text-[10px] font-bold flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-3 h-3" />
          Clear
        </button>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-neutral-950 rounded-lg border border-neutral-800">
        <button
          onClick={() => setState(prev => ({ ...prev, activeMode: 'extrude' }))}
          className={`py-2 px-2.5 rounded-md text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
            isExtrude
              ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 font-black'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Extrude Mode</span>
        </button>

        <button
          onClick={() => setState(prev => ({ ...prev, activeMode: 'transform' }))}
          className={`py-2 px-2.5 rounded-md text-xs font-black flex items-center justify-center gap-1.5 transition-all ${
            !isExtrude
              ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20 font-black'
              : 'text-neutral-400 hover:text-white hover:bg-neutral-900'
          }`}
        >
          <RotateCw className="w-3.5 h-3.5" />
          <span>Transform Mode</span>
        </button>
      </div>

      {/* Point Actions: Delete Mode Toggle & Clear All */}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setState(prev => ({ ...prev, isDeleteMode: !prev.isDeleteMode }))}
          className={`py-2 px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 border transition-all ${
            state.isDeleteMode
              ? 'bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-500/30 animate-pulse'
              : 'bg-neutral-950 text-neutral-300 hover:text-rose-400 border-neutral-800 hover:border-rose-800/60'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{state.isDeleteMode ? 'Delete Mode: ON' : 'Delete Points'}</span>
        </button>

        <button
          onClick={onClearAllPoints}
          className="py-2 px-2.5 bg-neutral-950 hover:bg-rose-950/40 text-neutral-300 hover:text-rose-300 border border-neutral-800 hover:border-rose-700/60 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Clear All Points</span>
        </button>
      </div>

      {state.isDeleteMode && (
        <div className="p-2 bg-rose-950/40 border border-rose-800/60 rounded-lg text-[11px] text-rose-200 flex items-center gap-1.5">
          <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
          <span>Click any blue point on canvas to delete it immediately!</span>
        </div>
      )}

      {/* EXTRUDE MODE CONTROLS */}
      {isExtrude ? (
        <div className="space-y-3.5">
          {/* Point Size / Capture Area Slider */}
          <div className="bg-neutral-950/80 p-3 rounded-lg border border-neutral-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-amber-300 flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5" />
                Point Size (Capture Area)
              </span>
              <span className="font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
                {state.captureRadius} px
              </span>
            </div>

            <input
              type="range"
              min={10}
              max={300}
              step={2}
              value={
                state.selectedExtrudePointId
                  ? (state.extrudePoints.find(p => p.id === state.selectedExtrudePointId)?.captureRadius || state.captureRadius)
                  : state.captureRadius
              }
              onChange={(e) => {
                const val = Number(e.target.value);
                setState(prev => ({
                  ...prev,
                  captureRadius: val,
                  defaultCaptureRadius: val,
                  extrudePoints: prev.selectedExtrudePointId
                    ? prev.extrudePoints.map(pt => pt.id === prev.selectedExtrudePointId ? { ...pt, captureRadius: val } : pt)
                    : prev.extrudePoints
                }));
              }}
              className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
            />

            <div className="flex items-center justify-between text-[10px] text-neutral-500 font-mono">
              <span>10px (Micro)</span>
              <span>150px (Medium)</span>
              <span>300px (Macro)</span>
            </div>
          </div>

          {/* Color & Stroke for Extrusions */}
          <div className="bg-neutral-950/80 p-3 rounded-lg border border-neutral-800 space-y-2.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1">
              <Palette className="w-3 h-3 text-amber-400" />
              Extrusion Color & Style
            </label>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-neutral-400 block mb-1">Fill Color</span>
                <div className="flex items-center gap-2">
                  <CustomColorPicker
                    compact
                    popover
                    triggerSize="w-8 h-8"
                    color={state.extrudeCustomColor}
                    onChange={(newCol) => setState(prev => ({ ...prev, extrudeCustomColor: newCol }))}
                  />
                  <span className="text-[10px] font-mono text-neutral-300 uppercase">{state.extrudeCustomColor}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-neutral-400 block mb-1">Stroke Color</span>
                <div className="flex items-center gap-2">
                  <CustomColorPicker
                    compact
                    popover
                    triggerSize="w-8 h-8"
                    color={state.extrudeStrokeColor}
                    onChange={(newCol) => setState(prev => ({ ...prev, extrudeStrokeColor: newCol }))}
                  />
                  <span className="text-[10px] font-mono text-neutral-300 uppercase">{state.extrudeStrokeColor}</span>
                </div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[10px] font-semibold text-neutral-400 mb-1">
                <span>Stroke Width</span>
                <span className="font-mono text-amber-300">{state.extrudeStrokeWidth} px</span>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                value={state.extrudeStrokeWidth}
                onChange={(e) => setState(prev => ({ ...prev, extrudeStrokeWidth: Number(e.target.value) }))}
                className="w-full h-1 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>
          </div>

          {/* Placed Extrude Points List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase">
              <span>Placed Extrude Points ({state.extrudePoints.length})</span>
            </div>

            {state.extrudePoints.length === 0 ? (
              <div className="p-3 bg-neutral-950/50 border border-dashed border-neutral-800 rounded-lg text-center text-xs text-neutral-500 font-bold">
                 No extrude points placed
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {state.extrudePoints.map((pt, idx) => (
                  <div
                    key={pt.id}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-md text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400" />
                      <span className="font-mono text-neutral-300">Point #{idx + 1}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">({Math.round(pt.x)}, {Math.round(pt.y)})</span>
                    </div>
                    <button
                      onClick={() => onRemovePoint(pt.id, 'extrude')}
                      className="text-neutral-500 hover:text-rose-400 p-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Strict Stability Guarantee Badge */}
          <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-2 text-[11px] text-amber-200/90 leading-tight">
            <CheckCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong>Zero-Vibration Guarantee:</strong> Only the stroke/drawing within the exact capture radius extrudes. All non-placed points stay strictly 100% frozen as-is!
            </span>
          </div>
        </div>
      ) : (
        /* TRANSFORM MODE CONTROLS */
        <div className="space-y-3.5">
          {/* Quick HUD controls in panel */}
          <div className="bg-neutral-950/80 p-3 rounded-lg border border-neutral-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <RotateCw className="w-3.5 h-3.5" />
                Canvas HUD Transform Box
              </span>
              <button
                onClick={onResetSliders}
                className="text-[10px] font-bold text-neutral-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Reset (0)
              </button>
            </div>

            {/* Transform Mode Property Grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'rotate', label: 'Rotate', icon: RotateCw },
                { id: 'scale', label: 'Scale', icon: Scale },
                { id: 'height', label: 'Height', icon: Maximize2 },
                { id: 'width', label: 'Width', icon: Minimize2 },
                { id: 'skew', label: 'Skew', icon: Compass },
                { id: 'move', label: 'Move', icon: Move }
              ].map(item => {
                const ItemIcon = item.icon;
                const isSelected = state.hudTransformProperty === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setState(prev => ({ ...prev, hudTransformProperty: item.id as any }))}
                    className={`py-1.5 px-2 rounded-md text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-neutral-950 shadow-sm shadow-amber-500/30'
                        : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                    }`}
                  >
                    <ItemIcon className="w-3 h-3" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Sliders Preview in Right Panel */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-semibold text-emerald-400"> Increment</span>
                  <span className="font-mono font-bold text-emerald-300 bg-emerald-950/60 px-1.5 py-0.2 rounded">
                    +{state.hudIncrementValue}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={1}
                  value={state.hudIncrementValue}
                  onChange={(e) => setState(prev => ({ ...prev, hudIncrementValue: Number(e.target.value) }))}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-semibold text-rose-400"> Decrement</span>
                  <span className="font-mono font-bold text-rose-300 bg-rose-950/60 px-1.5 py-0.2 rounded">
                    -{state.hudDecrementValue}
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={1}
                  value={state.hudDecrementValue}
                  onChange={(e) => setState(prev => ({ ...prev, hudDecrementValue: Number(e.target.value) }))}
                  className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
                />
              </div>
            </div>

            {/* Direction Axis Selector */}
            <div className="pt-2 border-t border-neutral-800">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1">
                Direction / Axis
              </span>
              <div className="grid grid-cols-4 gap-1">
                {(['x', 'y', 'z', 'all'] as const).map(ax => (
                  <button
                    key={ax}
                    onClick={() => setState(prev => ({ ...prev, hudAxis: ax }))}
                    className={`py-1 text-xs font-black uppercase rounded border transition-all ${
                      state.hudAxis === ax
                        ? 'bg-amber-500 text-neutral-950 border-amber-400'
                        : 'bg-neutral-900 text-neutral-400 border-neutral-800 hover:text-white'
                    }`}
                  >
                    {ax}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Placed Transform Points List */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase">
              <span>Placed Boundary Points ({state.transformPoints.length})</span>
            </div>

            {state.transformPoints.length === 0 ? (
              <div className="p-3 bg-neutral-950/50 border border-dashed border-neutral-800 rounded-lg text-center text-xs text-neutral-500">
                 Click anywhere on stroke or PNG to place transform boundary points. The draggable HUD box appears on canvas automatically!
              </div>
            ) : (
              <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                {state.transformPoints.map((pt, idx) => (
                  <div
                    key={pt.id}
                    className="flex items-center justify-between px-2.5 py-1.5 bg-neutral-950 border border-neutral-800 rounded-md text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                      <span className="font-mono text-neutral-300">Boundary Point #{idx + 1}</span>
                      <span className="text-[10px] text-neutral-500 font-mono">({Math.round(pt.x)}, {Math.round(pt.y)})</span>
                    </div>
                    <button
                      onClick={() => onRemovePoint(pt.id, 'transform')}
                      className="text-neutral-500 hover:text-rose-400 p-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
