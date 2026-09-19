// @ts-nocheck
import React, { useState, useRef, useEffect } from 'react';
import { 
  MousePointer2, 
  ZoomIn,
  PenTool, 
  Paintbrush, 
  Eraser, 
  Target, 
  Scissors, 
  Pin, 
  Scaling, 
  Wand2, 
  Pencil, 
  PenLine, 
  PaintBucket, 
  LassoSelect, 
  BoxSelect, 
  Smile,
  Rotate3d, 
  Box, 
  Shapes, 
  Grid3x3, 
  Spline, 
  Anchor, 
  Droplets,
  Hand,
  Move,
  Layers3,
  Lock,
  Route,
  GitFork,
  Workflow,
  Network,
  Disc,
  Activity,
  Pipette,
  Crosshair,
  SlidersHorizontal,
  FolderTree,
  Bone,
  CircleDot,
  RefreshCw,
  Zap,
  LineSquiggle,
  SplinePointer,
  Wrench,
  Maximize2, 
  Minimize2,
  ChevronUp,
  ChevronDown,
  ArrowUp
} from 'lucide-react';

interface ToolbarProps {
  activeTool: string;
  setActiveTool: (tool: string) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

function Toolbar({
  activeTool,
  setActiveTool,
  collapsed,
  setCollapsed,
}: ToolbarProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'DRAW' | 'SELECT' | 'SHAPE' | 'RIG'>('ALL');

  const tools = [
    { id: 'SEL', shortId: 'SEL', name: 'Select', label: 'Select Tool (SEL)', icon: MousePointer2, category: 'SELECT' },
    { id: 'ZOM', shortId: 'ZOM', name: 'Zoom & Pan', label: 'Zoom Tool (ZOM)', icon: ZoomIn, category: 'SELECT' },
    { id: 'PEN', shortId: 'PEN', name: 'Vector Pen', label: 'Vector Pen (PEN)', icon: PenTool, category: 'DRAW' },
    { id: 'BRS', shortId: 'BRS', name: 'Brush', label: 'Brush Tool (BRS)', icon: Paintbrush, category: 'DRAW' },
    { id: 'ERS', shortId: 'ERS', name: 'Eraser', label: 'Eraser Tool (ERS)', icon: Eraser, category: 'DRAW' },
    { id: 'PVT', shortId: 'PVT', name: 'Pivot Center', label: 'Pivot Center Tool (PVT)', icon: Target, category: 'SELECT' },
    { id: "KNF", shortId: 'KNF', name: 'Knife Cut', label: 'Knife Tool (KNF)', icon: Scissors, category: 'DRAW' },
    { id: "PIN", shortId: 'PIN', name: 'Puppet Pin', label: 'Puppet Warp Pin (PIN)', icon: Pin, category: 'RIG' },
    { id: 'VST', shortId: 'VST', name: 'Transform', label: 'Transform Tool (VST)', icon: Scaling, category: 'SELECT' },
    { id: 'SCT', shortId: 'SCT', name: 'Smooth Line', label: 'Smooth Line Tool (SCT)', icon: Spline, category: 'SELECT' },
    { id: 'VLB', shortId: 'VLB', name: 'Vector Line', label: 'Vector Line Brush (VLB)', icon: Pencil, category: 'DRAW' },
    { id: 'FIL', shortId: 'FIL', name: 'Fill Bucket', label: 'Paint Bucket Fill (FIL)', icon: PaintBucket, category: 'DRAW' },
    { id: 'LSO', shortId: 'LSO', name: 'Lasso Select', label: 'Lasso Area Select (LSO)', icon: LassoSelect, category: 'SELECT' },
    { id: 'FSL', shortId: 'FSL', name: 'Box Select', label: 'Box Free Selection (FSL)', icon: BoxSelect, category: 'SELECT' },
    { id: 'VEX', shortId: 'VEX', name: 'Part Isolator', label: 'Vector Part Isolator (VEX)', icon: Scissors, category: 'SELECT' },
    { id: 'PSE', shortId: 'PSE', name: 'Poses', label: 'Face & Mouth Poses (PSE)', icon: Smile, category: 'RIG' },
    { id: '360', shortId: '360', name: '360° View', label: '360° Turnaround (360)', icon: Rotate3d, category: 'RIG' },
    { id: 'WSC', shortId: 'WSC', name: 'Wire Sculpt', label: '3D Wire Sculpt (WSC)', icon: Box, category: 'SHAPE' },
    { id: 'SHP', shortId: 'SHP', name: 'Shapes', label: 'Geometric Shapes Tool (SHP)', icon: Shapes, category: 'SHAPE' },
    { id: 'MSH', shortId: 'MSH', name: 'Mesh Wrap', label: 'Geometry Mesh Deform (MSH)', icon: Grid3x3, category: 'SHAPE' },
    { id: 'SPL', shortId: 'SPL', name: 'Spline Reshape', label: 'Spline Reshape Tool (SPL)', icon: Spline, category: 'SHAPE' },
    { id: 'SWP', shortId: 'SWP', name: 'Pin Warp', label: 'Pin Anchor Warp (SWP)', icon: Anchor, category: 'RIG' },
    { id: 'CAG', shortId: 'CAG', name: 'Cage Deform', label: 'Cage Bounding Deform (CAG)', icon: BoxSelect, category: 'SHAPE' },
    { id: 'LQB', shortId: 'LQB', name: 'Liquify Brush', label: 'Liquify Smudge Brush (LQB)', icon: Droplets, category: 'SHAPE' },
    { id: 'SPD', shortId: 'SPD', name: 'Stroke Pull', label: 'Direct Stroke Touch Pull (SPD)', icon: Hand, category: 'SHAPE' },
    { id: 'SPT', shortId: 'SPT', name: 'Stroke Move', label: 'Direct Stroke Position Move (SPT)', icon: Move, category: 'SHAPE' },
    { id: 'S3D', shortId: 'S3D', name: '3D Depth', label: '3D Depth & Layers (S3D)', icon: Layers3, category: 'SHAPE' },
    { id: 'CON', shortId: 'CON', name: 'IK Constraint', label: 'Rig IK Constraints (CON)', icon: Lock, category: 'RIG' },
    { id: 'MOT', shortId: 'MOT', name: 'Motion Path', label: 'Motion Path Trajectory (MOT)', icon: Route, category: 'RIG' },
    { id: 'CPT', shortId: 'CPT', name: 'Curve Path', label: 'Curve Path Tool (CPT)', icon: GitFork, category: 'SHAPE' },
    { id: 'VDF', shortId: 'VDF', name: 'Curve Deformer', label: 'Vector Curve Deformer (VDF)', icon: Workflow, category: 'SHAPE' },
    { id: 'VPR', shortId: 'VPR', name: 'Pen Reshape', label: 'Vector Pen Reshape (VPR)', icon: SplinePointer, category: 'SHAPE' },
    { id: 'PBM', shortId: 'PBM', name: 'Points Move', label: 'Direct Points Movement (PBM)', icon: Network, category: 'SHAPE' },
    { id: 'RPD', shortId: 'RPD', name: 'Rigid Deform', label: 'Rigid Point Deform (RPD)', icon: Disc, category: 'SHAPE' },
    { id: 'CRV', shortId: 'CRV', name: 'Curve Line', label: 'Curve Line Deformer (CRV)', icon: LineSquiggle, category: 'SHAPE' },
    { id: 'EYE', shortId: 'EYE', name: 'Eyedropper', label: 'Eyedropper Color Picker (EYE)', icon: Pipette, category: 'DRAW' },
    { id: 'CONTOUR_EDITOR', shortId: 'CNE', name: 'Contour Editor', label: 'Contour Editor (Bezier & Points)', icon: Crosshair, category: 'SHAPE' },
    { id: 'CUTTER', shortId: 'CTR', name: 'Cutter', label: 'Cutter Tool (Line Trim)', icon: Scissors, category: 'DRAW' },
    { id: 'MASTER_CONTROLLER', shortId: 'MCT', name: 'Master Controls', label: 'Master Controller (MCT)', icon: SlidersHorizontal, category: 'RIG' },
    { id: 'PEG_HIERARCHY', shortId: 'PEG', name: 'Hierarchy', label: 'Hierarchy Tree (PEG)', icon: FolderTree, category: 'RIG' },
    { id: 'BONE_CURVE', shortId: 'BNC', name: 'Bone Deformer', label: 'Bone & Curve Rig Deformer (BNC)', icon: Bone, category: 'RIG' },
    { id: 'PTS', shortId: 'PTS', name: 'Point Sculptor', label: 'Point Shape Sculptor (PTS)', icon: CircleDot, category: 'SHAPE' },
    { id: 'SCB', shortId: 'SCB', name: 'Sculpt Brush', label: 'Sculpt & Correct Brush (SCB)', icon: Paintbrush, category: 'SHAPE' },
    { id: 'LIN', shortId: 'LIN', name: 'Line Shape', label: 'Line Shape Edit (LIN)', icon: Move, category: 'DRAW' },
    { id: 'SWAP_STUDIO', shortId: 'SWP', name: 'Swap Parts', label: 'Drawing Substitution Swap (SWP)', icon: RefreshCw, category: 'RIG' },
    { id: 'TWT', shortId: 'TWT', name: 'Twitch Jitter', label: 'Twitch Shake & Jitter (TWT)', icon: Zap, category: 'RIG' },
    { id: 'MWP', shortId: 'MWP', name: 'Mesh Puppet', label: 'Mesh Wrap Puppet Wrap (MWP)', icon: Grid3x3, category: 'SHAPE' },
  ];

  const handleScroll = () => {
    if (scrollContainerRef.current) {
      setIsScrolled(scrollContainerRef.current.scrollTop > 30);
    }
  };

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollNudge = (delta: number) => {
    scrollContainerRef.current?.scrollBy({ top: delta, behavior: 'smooth' });
  };

  const visibleTools = activeCategory === 'ALL'
    ? tools
    : tools.filter(t => t.category === activeCategory);

  return (
    <div
      id="anim-toolbar-container"
      className={`bg-white dark:bg-[#1c2026] border-r-2 border-neutral-200 dark:border-neutral-800 flex flex-col h-full shrink-0 select-none z-30 shadow-md relative transition-[width] duration-200 ${
        collapsed ? 'w-24 min-w-[96px] max-w-[96px]' : 'w-72 min-w-[288px] max-w-[288px]'
      }`}
    >
      {/* Expand / Collapse Button directly replacing the removed header div at its exact place */}
      <button
        id="toolbar-collapse-btn"
        onClick={() => setCollapsed(!collapsed)}
        className={`w-full border-b border-neutral-200 dark:border-neutral-800 !bg-white hover:!bg-neutral-100 !text-black transition-all cursor-pointer flex items-center shrink-0 z-20 shadow-xs active:scale-[0.99] ${
          collapsed
            ? 'h-12 justify-center p-2'
            : 'h-12 justify-between px-3.5'
        }`}
        title={collapsed ? "Expand toolbar" : "Collapse toolbar"}
      >
        {collapsed ? (
          <Maximize2 className="w-5 h-5 stroke-[2.8] !text-black" />
        ) : (
          <>
            <span className="text-xs font-black uppercase tracking-wider !text-black flex items-center gap-1.5">
              <Wrench className="w-4 h-4 stroke-[2.5] !text-black" />
              <span>Toolbox ({visibleTools.length})</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider !text-black">Collapse</span>
              <Minimize2 className="w-4 h-4 stroke-[2.8] !text-black" />
            </div>
          </>
        )}
      </button>

      {/* Expanded Quick Category Filter Bar */}
      {!collapsed && (
        <div className="flex items-center gap-1 px-2.5 py-2 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/60 overflow-x-auto scrollbar-none shrink-0">
          {(['ALL', 'DRAW', 'SELECT', 'SHAPE', 'RIG'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                scrollToTop();
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-black transition-all uppercase tracking-wider cursor-pointer whitespace-nowrap ${
                activeCategory === cat
                  ? 'bg-amber-400 text-black shadow-xs'
                  : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:text-black dark:hover:text-white border border-neutral-200 dark:border-neutral-700'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Scrollable Tools List Container - Solid, Fixed bounds, No accidental disappear */}
      <div 
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch'
        }}
        className="flex-1 overflow-y-auto p-3 flex flex-col gap-3.5 scrollbar-thin select-none items-center pb-28"
      >
        {visibleTools.map((t, idx) => {
          const isActive = activeTool === t.id;
          const Icon = t.icon;
          const isGroupDivider = activeCategory === 'ALL' && [6, 14, 26, 36].includes(idx);
          return (
            <React.Fragment key={t.id}>
              {isGroupDivider && (
                <div className={`shrink-0 my-1 rounded-full bg-neutral-300 dark:bg-neutral-700/60 ${collapsed ? 'w-10 h-[2px]' : 'w-full h-[1.5px]'}`} />
              )}
              <button
                id={`tool-btn-${t.id}`}
                onClick={() => setActiveTool(t.id)}
                data-active-tool={isActive ? "true" : undefined}
                className={`relative group cursor-pointer border shrink-0 transition-all ${
                  isActive ? 'active-tool-btn !bg-[#facc15] !text-black shadow-md scale-105 z-10 border-amber-500' : 'border-neutral-200 dark:border-neutral-700'
                } ${
                  collapsed
                    ? 'w-16 h-16 rounded-2xl flex items-center justify-center p-0'
                    : 'w-full flex items-center gap-3.5 p-3.5 rounded-2xl text-left min-h-[64px]'
                } ${
                  !isActive
                    ? 'bg-white hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-black dark:text-white shadow-xs'
                    : ''
                }`}
                style={isActive ? { backgroundColor: '#facc15', color: '#000000', borderColor: '#ca8a04' } : undefined}
                title={t.label}
              >
                <div className={`w-11 h-11 shrink-0 flex items-center justify-center rounded-xl ${isActive ? 'scale-110' : ''} transition-transform`}>
                  <Icon className={`w-7 h-7 stroke-[3.2] ${isActive ? '!text-black stroke-[3.8]' : 'text-black dark:text-white group-hover:text-amber-600'}`} />
                </div>
                {!collapsed && (
                  <div className="overflow-hidden truncate flex-1 min-w-0">
                    <span className={`text-xs uppercase tracking-wider block font-black leading-tight ${isActive ? '!text-black font-black' : 'text-neutral-500 dark:text-neutral-400'}`}>
                      {t.shortId || t.id}
                    </span>
                    <span className={`text-base font-black block leading-snug truncate transition-colors mt-0.5 ${isActive ? '!text-black font-black' : 'text-black dark:text-white group-hover:text-neutral-900 dark:group-hover:text-amber-400'}`}>
                      {t.name || t.label.split('(')[0].trim()}
                    </span>
                  </div>
                )}

                {/* Collapsed Tooltip Overlay */}
                {collapsed && (
                  <div className="absolute left-20 bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-black dark:text-white text-xs font-black px-3.5 py-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-2xl">
                    <div className="font-black text-sm">{t.label}</div>
                  </div>
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* Bottom Sticky Controls (Scroll Nudge & Home for Touchscreens) */}
      <div className="h-12 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-around px-2 shrink-0 bg-white dark:bg-[#1c2026] z-20">
        <button
          onClick={() => scrollNudge(-160)}
          className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
          title="Scroll up"
          aria-label="Scroll up"
        >
          <ChevronUp className="w-5 h-5 stroke-[2.8]" />
        </button>
        <button
          onClick={scrollToTop}
          className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer text-[10px] font-black uppercase"
          title="Back to Top"
        >
          TOP
        </button>
        <button
          onClick={() => scrollNudge(160)}
          className="p-1.5 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-300 cursor-pointer"
          title="Scroll down"
          aria-label="Scroll down"
        >
          <ChevronDown className="w-5 h-5 stroke-[2.8]" />
        </button>
      </div>
    </div>
  );
}

export default React.memo(Toolbar);
