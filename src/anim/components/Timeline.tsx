// @ts-nocheck
import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Square, 
  Repeat, 
  Plus, 
  Trash2, 
  Copy, 
  FileText, 
  Settings, 
  Eye, 
  EyeOff,
  GitPullRequest,
  Maximize,
  SlidersHorizontal,
  Clock
} from 'lucide-react';
import CustomSelect from './CustomSelect';

interface TimelineProps {
  frames: any[];
  currentFrameIndex: number;
  setCurrentFrameIndex: React.Dispatch<React.SetStateAction<number>>;
  addFrame: () => void;
  deleteFrame: (idx: number) => void;
  duplicateFrame: (idx: number) => void;
  copyFrame: (idx: number) => void;
  pasteFrame: (idx: number) => void;
  onionSkinEnabled: boolean;
  setOnionSkinEnabled: (enabled: boolean) => void;
  showBones: boolean;
  setShowBones: (enabled: boolean) => void;
  batchAddFrames: (count: number) => void;
  fps: number;
  setFps: (fps: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  isRecording?: boolean;
  autoTween: boolean;
  setAutoTween: (enabled: boolean) => void;
  showCanvasSizePanel?: boolean;
  setShowCanvasSizePanel?: (show: boolean) => void;
  autoFramesActive?: boolean;
  onToggleAutoFrames?: () => void;
  autoFramesStatus?: 'idle' | 'countdown' | 'recording' | 'paused';
  autoFramesDelay?: number;
  setAutoFramesDelay?: (seconds: number) => void;
  autoFramesCountdown?: number;
  autoFramesTimeRemaining?: number;
  onStartAutoFrames?: () => void;
  onPauseAutoFrames?: () => void;
  onResumeAutoFrames?: () => void;
  onStopAutoFrames?: () => void;
  style?: React.CSSProperties;
}

function Timeline({
  frames,
  currentFrameIndex,
  setCurrentFrameIndex,
  addFrame,
  deleteFrame,
  duplicateFrame,
  copyFrame,
  pasteFrame,
  onionSkinEnabled,
  setOnionSkinEnabled,
  showBones,
  setShowBones,
  batchAddFrames,
  fps,
  setFps,
  isPlaying,
  setIsPlaying,
  isRecording = false,
  autoTween = false,
  setAutoTween,
  showCanvasSizePanel = false,
  setShowCanvasSizePanel,
  autoFramesActive = false,
  onToggleAutoFrames,
  autoFramesStatus = 'idle',
  autoFramesDelay = 3,
  setAutoFramesDelay,
  autoFramesCountdown = 3,
  autoFramesTimeRemaining = 3,
  onStartAutoFrames,
  onPauseAutoFrames,
  onResumeAutoFrames,
  onStopAutoFrames,
  style,
}: TimelineProps) {
  const [loopEnabled, setLoopEnabled] = useState(true);
  const [copiedFrameIndex, setCopiedFrameIndex] = useState<number | null>(null);
  const [onionConfigOpen, setOnionConfigOpen] = useState(false);
  const [onionPrev, setOnionPrev] = useState(1);
  const [onionNext, setOnionNext] = useState(0);
  const [batchCount, setBatchCount] = useState<number>(20);

  const playbackTimerRef = useRef<any>(null);
  const currentFrameIndexRef = useRef(currentFrameIndex);
  currentFrameIndexRef.current = currentFrameIndex;

  // Playback timer handling
  useEffect(() => {
    if (!isPlaying) {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
      return;
    }

    const intervalMs = 1000 / fps;
    playbackTimerRef.current = setInterval(() => {
      try {
        const curr = currentFrameIndexRef.current;
        if (curr >= frames.length - 1) {
          if (loopEnabled && !isRecording) {
            setCurrentFrameIndex(0);
          } else {
            if (playbackTimerRef.current) {
              clearInterval(playbackTimerRef.current);
              playbackTimerRef.current = null;
            }
            setIsPlaying(false);
          }
        } else {
          setCurrentFrameIndex(curr + 1);
        }
      } catch (err) {
        console.error("Playback loop error caught safely:", err);
        if (playbackTimerRef.current) {
          clearInterval(playbackTimerRef.current);
          playbackTimerRef.current = null;
        }
        setIsPlaying(false);
      }
    }, intervalMs);

    return () => {
      if (playbackTimerRef.current) {
        clearInterval(playbackTimerRef.current);
        playbackTimerRef.current = null;
      }
    };
  }, [isPlaying, fps, frames.length, loopEnabled, isRecording, setCurrentFrameIndex, setIsPlaying]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleStop = () => {
    setIsPlaying(false);
    setCurrentFrameIndex(0);
  };

  const handleCopy = (idx: number) => {
    copyFrame(idx);
    setCopiedFrameIndex(idx);
  };

  const handlePaste = (idx: number) => {
    pasteFrame(idx);
  };

  return (
    <div id="anim-timeline-container" style={style} className="bg-white border-0 p-3 shrink-0 flex flex-col gap-3 font-bold select-none overflow-y-auto text-black">
      {/* Playback Controls & Frame Rate Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Playback Buttons */}
        <div className="flex items-center gap-2 sm:gap-2.5 bg-white border-0 p-2 rounded-2xl shadow-sm">
          <button
            id="timeline-play-btn"
            onClick={handlePlayPause}
            className={`p-3 rounded-2xl transition-all cursor-pointer border-0 ${
              isPlaying 
                ? 'timeline-active-btn !bg-[#facc15] !text-black scale-105 shadow-none' 
                : 'bg-white text-black hover:bg-neutral-100'
            }`}
            style={isPlaying ? { backgroundColor: '#facc15', color: '#000000', border: 'none', boxShadow: 'none' } : { border: 'none' }}
            title={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? <Pause className="w-6 h-6 fill-current stroke-[3.2]" /> : <Play className="w-6 h-6 fill-current stroke-[3.2]" />}
          </button>
          <button
            onClick={handleStop}
            className="p-3 rounded-2xl bg-white hover:bg-neutral-100 text-black transition-colors cursor-pointer border-0"
            title="Stop & Reset to First Frame"
          >
            <Square className="w-6 h-6 fill-current stroke-[3]" />
          </button>
          <div className="w-[2px] h-8 bg-neutral-200 mx-1"></div>
          <button
            onClick={() => setLoopEnabled(!loopEnabled)}
            className={`p-3 rounded-2xl transition-colors cursor-pointer border-0 ${
              loopEnabled 
                ? 'text-black bg-neutral-100 shadow-sm' 
                : 'text-neutral-500 hover:bg-neutral-100 hover:text-black'
            }`}
            title="Toggle Loop"
          >
            <Repeat className="w-6 h-6 stroke-[3]" />
          </button>
        </div>

        {/* Frame Actions (Copy, Paste, Duplicate, Delete) */}
        <div className="flex items-center gap-2.5 bg-white border-0 p-2 rounded-2xl shadow-sm">
          <span className="text-sm text-black font-black tracking-wider uppercase px-2.5 font-mono">{currentFrameIndex + 1}</span>
          <div className="w-[2px] h-8 bg-neutral-200 mx-1"></div>
          <button
            type="button"
            onClick={() => handleCopy(currentFrameIndex)}
            className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-neutral-100 text-black transition-all text-sm flex items-center gap-2.5 cursor-pointer font-black border-0"
            title="Copy current frame nodes"
          >
            <Copy className="w-5 h-5 stroke-[2.8]" />
            <span className="text-sm font-black inline">Copy</span>
          </button>
          <button
            type="button"
            onClick={() => handlePaste(currentFrameIndex)}
            disabled={copiedFrameIndex === null}
            className={`px-3.5 py-2.5 rounded-2xl bg-white hover:bg-neutral-100 text-black transition-all text-sm flex items-center gap-2.5 cursor-pointer font-black border-0 ${
              copiedFrameIndex === null ? 'opacity-30 cursor-not-allowed' : ''
            }`}
            title="Paste copied nodes into current frame"
          >
            <FileText className="w-5 h-5 stroke-[2.8]" />
            <span className="text-sm font-black inline">Paste</span>
          </button>
          <button
            type="button"
            onClick={() => duplicateFrame(currentFrameIndex)}
            className="px-4 py-2.5 rounded-2xl bg-white hover:bg-neutral-100 text-black transition-all text-sm flex items-center gap-2.5 cursor-pointer font-black border-0 shadow-sm"
            title="Duplicate current frame"
          >
            <Plus className="w-5 h-5 stroke-[3.2]" />
            <span className="text-sm font-black inline">Duplicate</span>
          </button>
          {frames.length > 1 && (
            <button
              type="button"
              onClick={() => deleteFrame(currentFrameIndex)}
              className="px-3.5 py-2.5 rounded-2xl bg-white hover:bg-rose-50 text-rose-600 transition-all text-sm flex items-center gap-2.5 cursor-pointer font-black border-0"
              title="Delete current frame"
            >
              <Trash2 className="w-5 h-5 stroke-[2.8]" />
              <span className="text-sm font-black inline">Delete</span>
            </button>
          )}
        </div>

        {/* Center: Onion Skinning, Bones, Auto-Tween & AutoFrames */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="flex items-center gap-1.5 bg-white border-0 p-2 rounded-2xl shadow-sm">
            <button
              onClick={() => setOnionSkinEnabled(!onionSkinEnabled)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-sm font-black transition-colors cursor-pointer border-0 ${
                onionSkinEnabled 
                  ? 'timeline-active-btn !bg-[#facc15] !text-black shadow-none' 
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
              style={onionSkinEnabled ? { backgroundColor: '#facc15', color: '#000000', border: 'none', boxShadow: 'none' } : { border: 'none' }}
            >
              {onionSkinEnabled ? <Eye className="w-5 h-5 shrink-0 stroke-[3.2] !text-black" /> : <EyeOff className="w-5 h-5 shrink-0 stroke-[2.8]" />}
              <span className="text-sm font-black">ONION SKIN</span>
            </button>
            <button
              onClick={() => setOnionConfigOpen(!onionConfigOpen)}
              className={`p-2.5 rounded-2xl bg-white hover:bg-neutral-100 text-black transition-colors cursor-pointer border-0 ${
                onionConfigOpen ? '!bg-[#facc15] shadow-none' : ''
              }`}
              title="Onion Skin Config"
            >
              <Settings className="w-5 h-5 stroke-[2.8]" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-white border-0 p-2 rounded-2xl shadow-sm">
            <button
              onClick={() => setAutoTween(!autoTween)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-sm font-black transition-colors cursor-pointer border-0 ${
                autoTween 
                  ? 'timeline-active-btn !bg-[#facc15] !text-black shadow-none' 
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
              style={autoTween ? { backgroundColor: '#facc15', color: '#000000', border: 'none', boxShadow: 'none' } : { border: 'none' }}
              title="Toggle real-time automatic tweening interpolation between keyframes"
            >
              <SlidersHorizontal className={`w-5 h-5 shrink-0 stroke-[3] ${autoTween ? '!text-black' : ''}`} />
              <span className="text-sm font-black">AUTO-TWEEN</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-white border-0 p-2 rounded-2xl shadow-sm">
            <button
              onClick={() => setShowBones(!showBones)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-sm font-black transition-colors cursor-pointer border-0 ${
                showBones 
                  ? 'timeline-active-btn !bg-[#facc15] !text-black shadow-none' 
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
              style={showBones ? { backgroundColor: '#facc15', color: '#000000', border: 'none', boxShadow: 'none' } : { border: 'none' }}
              title="Show or hide rigged bones skeleton overlay on canvas"
            >
              <GitPullRequest className={`w-5 h-5 shrink-0 stroke-[3] ${showBones ? '!text-black' : ''}`} />
              <span className="text-sm font-black">{showBones ? 'HIDE BONES' : 'SHOW BONES'}</span>
            </button>
          </div>

          {/* AUTO FRAMES BUTTON */}
          <div className="flex items-center bg-white border-0 p-2 rounded-2xl shadow-sm">
            <button
              onClick={() => onToggleAutoFrames?.()}
              className={`flex items-center gap-2.5 px-4.5 py-3 rounded-2xl text-sm font-black transition-all cursor-pointer border-0 ${
                autoFramesActive || autoFramesStatus !== 'idle'
                  ? 'timeline-active-btn !bg-[#facc15] !text-black shadow-none' 
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
              style={autoFramesActive || autoFramesStatus !== 'idle' ? { backgroundColor: '#facc15', color: '#000000', border: 'none', boxShadow: 'none' } : { border: 'none' }}
              title="Auto Frames: Automatically add frames at timed intervals as you transform drawings on canvas"
            >
              <Clock className={`w-6 h-6 shrink-0 stroke-[3] ${autoFramesActive || autoFramesStatus !== 'idle' ? '!text-black' : 'text-amber-500'}`} />
              <span className="text-sm sm:text-base tracking-wider font-black">AUTO FRAMES</span>
              {autoFramesStatus === 'recording' && (
                <span className="relative flex h-4 w-4 ml-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 ring-2 ring-white"></span>
                </span>
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-white border-0 p-2 rounded-2xl shadow-sm">
            <button
              onClick={() => setShowCanvasSizePanel?.(!showCanvasSizePanel)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl text-sm font-black transition-colors cursor-pointer border-0 ${
                showCanvasSizePanel 
                  ? 'timeline-active-btn !bg-[#facc15] !text-black shadow-none' 
                  : 'bg-white text-black hover:bg-neutral-100'
              }`}
              style={showCanvasSizePanel ? { backgroundColor: '#facc15', color: '#000000', border: 'none', boxShadow: 'none' } : { border: 'none' }}
              title="Set custom canvas width and height"
            >
              <Maximize className={`w-5 h-5 shrink-0 stroke-[3] ${showCanvasSizePanel ? '!text-black' : 'text-amber-500'}`} />
              <span className="text-sm font-black">CANVAS SIZE</span>
            </button>
          </div>

          {/* Quick Onion Overlay */}
          {onionConfigOpen && (
            <div className="absolute bottom-32 left-1/2 -translate-x-1/2 bg-white border-0 p-4 rounded-2xl shadow-2xl z-50 flex items-center gap-5 text-xs text-black animate-fade-in">
              <div className="flex flex-col gap-1.5">
                <span className="font-black text-black uppercase tracking-wider text-[11px]">PREVIOUS FRAMES</span>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={onionPrev}
                  onChange={(e) => setOnionPrev(Number(e.target.value))}
                  className="w-28 accent-amber-500 cursor-pointer h-2"
                />
                <span className="text-right text-xs text-amber-600 font-mono font-black">{onionPrev} frames</span>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-black text-black uppercase tracking-wider text-[11px]">NEXT FRAMES</span>
                <input
                  type="range"
                  min="0"
                  max="5"
                  value={onionNext}
                  onChange={(e) => setOnionNext(Number(e.target.value))}
                  className="w-28 accent-amber-500 cursor-pointer h-2"
                />
                <span className="text-right text-xs text-amber-600 font-mono font-black">{onionNext} frames</span>
              </div>
            </div>
          )}
        </div>

        {/* Right: FPS presets & slider */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 bg-white border-0 px-4 py-2 rounded-2xl text-sm text-black shadow-sm">
          <span className="text-neutral-600 font-black tracking-wider uppercase hidden md:inline text-sm">SPEED</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFps(12)}
              className={`px-3 py-1.5 rounded-xl font-black text-sm cursor-pointer transition-colors border-0 ${
                fps === 12 ? 'bg-[#facc15] text-black shadow-none' : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              12
            </button>
            <button
              onClick={() => setFps(24)}
              className={`px-3 py-1.5 rounded-xl font-black text-sm cursor-pointer transition-colors border-0 ${
                fps === 24 ? 'bg-[#facc15] text-black shadow-none' : 'bg-white text-black hover:bg-neutral-100'
              }`}
            >
              24
            </button>
          </div>
          <input
            type="range"
            min="6"
            max="60"
            step="1"
            value={fps}
            onChange={(e) => setFps(Number(e.target.value))}
            className="w-20 sm:w-28 accent-amber-500 cursor-pointer h-2.5"
          />
          <span className="font-black text-black w-16 text-right text-sm font-mono">{fps} FPS</span>
        </div>
      </div>

      {/* DOWNSIDE AUTOFRAMES SECONDS & CONTROLS ROW */}
      {autoFramesActive && (
        <div 
          id="autoframes-downside-options" 
          className="w-full bg-white border-0 p-4 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-4 animate-fade-in text-black shrink-0 z-30"
        >
          {/* Label and Badge */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2.5 bg-[#facc15] text-black px-4 py-2 rounded-2xl font-black text-sm uppercase tracking-wider shadow-none">
              <Clock className="w-5 h-5 stroke-[3]" />
              <span>AutoFrames Seconds</span>
            </div>
            <span className="font-mono text-base font-black text-black bg-neutral-100 px-3.5 py-2 rounded-2xl shadow-none">
              {autoFramesDelay} SECONDS
            </span>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-neutral-600 font-black uppercase tracking-wider mr-1 hidden sm:inline">Presets:</span>
            {[2, 3, 5, 10, 15].map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => setAutoFramesDelay?.(sec)}
                className={`h-10 px-4 rounded-xl text-sm font-black transition-all cursor-pointer border-0 ${
                  autoFramesDelay === sec
                    ? 'bg-[#facc15] text-black shadow-none scale-105'
                    : 'bg-white hover:bg-neutral-100 text-black shadow-sm'
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          {/* Slider */}
          <div className="flex items-center gap-3 min-w-[200px] sm:min-w-[240px] flex-1 max-w-xs">
            <span className="text-sm text-neutral-600 font-black">2s</span>
            <input
              type="range"
              min="2"
              max="15"
              step="1"
              value={autoFramesDelay}
              onChange={(e) => setAutoFramesDelay?.(Number(e.target.value))}
              className="w-full accent-amber-500 cursor-pointer h-3 rounded-lg bg-neutral-200"
            />
            <span className="text-sm text-neutral-600 font-black">15s</span>
          </div>

          {/* Action Control Buttons */}
          <div className="flex items-center gap-2.5">
            {autoFramesStatus === 'idle' ? (
              <button
                type="button"
                onClick={onStartAutoFrames}
                className="h-11 px-5 bg-white hover:bg-neutral-100 text-black font-black text-sm uppercase rounded-2xl tracking-wider transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-sm border-0 active:scale-95"
              >
                <Play className="w-5 h-5 fill-current stroke-[2.8]" />
                Start Auto Frames ({autoFramesDelay}s)
              </button>
            ) : autoFramesStatus === 'countdown' ? (
              <div className="h-11 px-5 flex items-center justify-center font-black text-black text-sm bg-neutral-100 rounded-2xl border-0 animate-pulse">
                Starting in {autoFramesCountdown}s...
              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                {autoFramesStatus === 'recording' ? (
                  <button
                    type="button"
                    onClick={onPauseAutoFrames}
                    className="h-11 px-4 bg-white hover:bg-neutral-100 text-black font-black text-sm rounded-2xl flex items-center justify-center gap-2 border-0 cursor-pointer shadow-sm"
                  >
                    <Pause className="w-5 h-5 fill-current" />
                    Pause ({autoFramesTimeRemaining}s)
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={onResumeAutoFrames}
                    className="h-11 px-4 bg-white hover:bg-neutral-100 text-black font-black text-sm rounded-2xl flex items-center justify-center gap-2 border-0 cursor-pointer shadow-sm"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Resume
                  </button>
                )}
                <button
                  type="button"
                  onClick={onStopAutoFrames}
                  className="h-11 px-4 bg-rose-600 hover:bg-rose-500 text-white font-black text-sm rounded-2xl flex items-center justify-center gap-2 border-0 cursor-pointer shadow-sm"
                >
                  <Square className="w-5 h-5 fill-current" />
                  Stop
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Frame Cells Row */}
      <div className="flex items-center gap-3 overflow-x-auto py-2 pr-12 scrollbar-thin select-none">
        {frames.map((frame, index) => {
          const isActive = index === currentFrameIndex;
          return (
            <div
              key={index}
              onClick={() => {
                setIsPlaying(false);
                setCurrentFrameIndex(index);
              }}
              className={`group min-w-[84px] h-22 rounded-2xl border-0 flex flex-col justify-between p-3 cursor-pointer transition-all relative shrink-0 shadow-sm ${
                isActive
                  ? 'bg-neutral-100 scale-[1.02]'
                  : 'bg-white hover:bg-neutral-50'
              }`}
            >
              {/* Frame Label */}
              <div className="flex items-center justify-between">
                <span className={`text-sm sm:text-base font-mono ${isActive ? 'text-black font-black' : 'text-neutral-700 font-bold'}`}>
                  {index + 1}
                </span>
                {frame.objects && Object.keys(frame.objects).length > 0 && (
                  <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm" title="Has keyframe transforms"></span>
                )}
              </div>

              {/* Indicator info */}
              <span className="text-xs text-neutral-500 block text-right select-none font-black font-mono">
                {frame.objects ? Object.keys(frame.objects).length : 0} nodes
              </span>
            </div>
          );
        })}

        {/* Append Frame Button */}
        <button
          id="timeline-add-frame-btn"
          onClick={addFrame}
          className="min-w-[84px] h-22 rounded-2xl border-0 bg-yellow-300 hover:bg-yellow-200 flex items-center justify-center text-black transition-all cursor-pointer shrink-0 shadow-sm active:scale-95"
          title="Add New Frame"
        >
          <Plus className="w-8 h-8 stroke-[3.5] text-black" />
        </button>

        {/* Batch Add Frames Section */}
        <div className="flex items-center gap-2.5 bg-white border-0 p-3 rounded-2xl shrink-0 h-22 shadow-sm">
          <div className="flex flex-col justify-center min-w-36">
            <span className="text-xs text-black font-black uppercase tracking-wider mb-1">Batch Add</span>
            <CustomSelect
              value={String(batchCount)}
              onChange={(val) => setBatchCount(Number(val))}
              options={[
                { value: "10", label: "10 Frames" },
                { value: "20", label: "20 Frames" },
                { value: "30", label: "30 Frames" },
                { value: "40", label: "40 Frames" },
                { value: "50", label: "50 Frames" },
                { value: "100", label: "100 Frames" }
              ]}
              placeholder="Batch Count"
              className="w-full"
            />
          </div>
          <button
            onClick={() => {
              batchAddFrames(batchCount);
            }}
            className="h-10 px-5 rounded-xl bg-white hover:bg-neutral-100 text-black font-black text-sm transition-all flex items-center justify-center self-end cursor-pointer shadow-sm border-0 active:scale-95"
          >
            ADD
          </button>
        </div>
      </div>
    </div>
  );
}

export default React.memo(Timeline);
