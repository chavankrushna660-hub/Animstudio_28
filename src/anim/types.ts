// @ts-nocheck
export interface Point {
  x: number;
  y: number;
  z?: number;
  t?: number;
  w?: number;
  color?: string;
  thickness?: number;
  angle?: number;
  jitterX?: number;
  jitterY?: number;
  grainOpacity?: number;
  gap?: boolean;
}

declare global {
  interface Window {
    customAlert: (message: string, title?: string) => Promise<void>;
    customConfirm: (message: string, title?: string) => Promise<boolean>;
    customPrompt: (message: string, defaultValue?: string, title?: string) => Promise<string | null>;
  }
}

export interface RealismSettings {
  autoTaperEnabled: boolean;
  minThickness: number;
  maxThickness: number;
  thinningFactor: number;
  autoShadingEnabled: boolean;
  shadingLightAngle: number; // degrees (e.g. 45 from top-left)
  shadingHighlightOpacity: number; // e.g. 0.2
  shadingShadowOpacity: number; // e.g. 0.3
  
  microJitterEnabled: boolean;
  microJitterAmount: number; // max jitter pixels
  paperGrainEnabled: boolean;
  paperGrainIntensity: number; // e.g. 0.4
  inkBleedEnabled: boolean;
  inkBleedBlur: number; // e.g. 3
  inkBleedOpacity: number; // e.g. 0.3
  inkBleedWidthOffset: number; // e.g. 6
}

export interface Transform {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  width?: number;
  height?: number;
  opacity?: number;
  skewX?: number;
  skewY?: number;
  rotateX?: number;
  rotateY?: number;
  perspective?: number;
  cameraAngleX?: number;
  cameraAngleY?: number;
}

export interface Pivot {
  id: string;
  name: string;
  localX: number;
  localY: number;
  locked: boolean;
  isActive?: boolean;
  currentLocalX?: number;
  currentLocalY?: number;
}

export interface Bone {
  id: string;
  name: string;
  startObjectId: string;
  endObjectId: string;
  startLocalX: number;
  startLocalY: number;
  endLocalX: number;
  endLocalY: number;
  lockedDistance: number;
  allowDetach: boolean;
  minAngle: number;
  maxAngle: number;
  enableConstraints: boolean;
  currentAngle?: number;
  color?: string;
  thickness?: number;
}

export interface MeshPoint {
  id: string;
  originalX: number;
  originalY: number;
  currentX: number;
  currentY: number;
  pinned: boolean;
  pinType: 'fixed' | 'semi-fixed' | 'free' | null;
}

export interface MeshState {
  active: boolean;
  densityX: number;
  densityY: number;
  points: MeshPoint[];
  originalPoints: MeshPoint[];
  pointSize: number;
  showGrid: boolean;
  showPoints: boolean;
  previewMode: boolean;
  
  // HyperGraph fields
  editMode?: 'node' | 'lattice' | 'curve' | 'symmetry';
  latticeDensity?: number;
  latticePoints?: MeshPoint[];
  falloffRadius?: number;
  symmetryActive?: boolean;
  symmetryAxis?: 'horizontal' | 'vertical';
  curvePoints?: Point[];
  selectedLatticeIndex?: number | null;
  linkedClusters?: { [index: number]: number[] }; // mapped master index to connected indices
  pointExtrudeMode?: boolean;
}

export interface ObjectShadow {
  enabled: boolean;
  blur: number;
  offsetX: number;
  offsetY: number;
  color: string;
  opacity: number;
}

export interface ObjectInnerShadow {
  enabled: boolean;
  angle: number;
  distance: number;
  size: number;
  opacity: number;
  color?: string;
  blur?: number;
}

export interface ObjectRimLight {
  enabled: boolean;
  color: string;
  thickness: number;
  softness: number;
  position: 'inner' | 'outer';
}

export interface ObjectOverlay {
  enabled: boolean;
  color: string;
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
}

export interface View360 {
  id: string;
  name: string;
  angle: number; // 0 to 360
  drawingId: string; // The original drawing object ID
  drawingName?: string; // The original drawing name
  pivots?: Pivot[];
  bones?: Bone[];
}

export interface LassoDeformState {
  active: boolean; // Is lasso deformation active?
  lassoPoints: Point[]; // Lasso points in LOCAL coordinates of the object
  transform: Transform; // Transform applied exclusively to the vertices inside the lasso
}

export interface SubExtrusion {
  id: string;
  name?: string;
  pointIndices: number[];
  extrudeX: number;
  extrudeY: number;
  extrudeZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  rotateX: number;
  rotateY: number;
  rotateZ: number;
  color?: string;
  bevelProfile?: 'flat' | 'bevel' | 'dome' | 'taper' | 'scurve' | 'hourglass';
  subExtrusions?: SubExtrusion[];
}

export interface VectorObject {
  id: string;
  name: string;
  type: 'stroke' | 'shape' | 'image' | 'text' | '3d' | '360_container';
  points: Point[]; // Boundary points or stroke path
  shapeType?: 'circle' | 'rectangle' | 'triangle' | 'star' | 'line';
  strokeColor: string;
  strokeWidth: number;
  fillColor: string;
  opacity: number;
  transform: Transform;
  pivots: Pivot[];
  pins?: Pivot[]; // Puppet pins for deformation
  subPaths?: Point[][]; // Sub-paths for multi-step detailed drawings
  parentId: string | null;
  childrenIds: string[];
  layerId: string;
  imageUrl?: string; // If image type
  text?: string; // If text type
  fontSize?: number;
  fontFamily?: string;
  isLocked: boolean;
  isHidden: boolean;
  isContinuousDrawing?: boolean;
  joinedStrokesDemo?: Point[];
  hiddenPoints?: number[];
  mwpBasePoints?: Point[];
  mwpBaseSubPaths?: Point[][];
  hiddenSubPaths?: { [subPathIdx: number]: number[] };
  subPathFills?: { [subPathIdx: number]: string }; // Individual fill color per sub-path / inner loop
  subPathStrokes?: { [subPathIdx: number]: { strokeColor?: string, strokeWidth?: number } }; // Individual stroke style per sub-path
  hiddenLassoRegions?: { localLassoPoints: Point[] }[];
  keepOnlyLassoRegions?: { localLassoPoints: Point[] }[];
  keepAttachedTo?: string | null; // Drawing ID to keep permanently attached
  attachedGroupId?: string; // Group ID for permanent relative move linking
  lassoFills?: { localLassoPoints: Point[], color: string, origBounds?: { minX: number, minY: number, width: number, height: number }, origPoints?: Point[] }[]; // Sub-areas colored via lasso tool
  fillEraseStrokes?: { points: Point[], radius: number }[]; // Custom areas where fill was erased by dragging
  zIndex?: number; // Sorting order within the layer
  z?: number; // 3D Layer Depth value (lower = background, higher = foreground)
  shadow?: ObjectShadow;
  innerShadow?: ObjectInnerShadow;
  rimLight?: ObjectRimLight;
  overlay?: ObjectOverlay;
  meshState?: MeshState;
  brushType?: string;
  strokeOpacity?: number;
  hardness?: number;
  blur?: number;
  shadowEnabled?: boolean;
  shadowColor?: string;
  shadowBlur?: number;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  hide3DGrid?: boolean;
  hollowEnabled?: boolean;
  innerSpace3D?: number;
  depth3D?: number;
  fillGaps3D?: boolean;
  fillGaps?: boolean;
  autoFillGaps?: boolean;
  activeViewId?: string;
  autoFillInnerRegion?: boolean;
  deepGapCorrected?: boolean;
  gapFillExpansion?: number;
  selectedFaceIndex?: number;
  selectedEdgeIndex?: number;
  shape3DType?: 'car' | 'character' | 'chair' | 'sphere' | 'box' | 'sword';
  transform3D?: {
    x: number; // 3D Translation X
    y: number; // 3D Translation Y
    z: number; // 3D Translation Z (Depth)
    rx: number; // Euler Rotation X (Pitch)
    ry: number; // Euler Rotation Y (Yaw)
    rz: number; // Euler Rotation Z (Roll)
    sx: number; // Scale X
    sy: number; // Scale Y
    sz: number; // Scale Z
    enabled?: boolean;
    rotateX?: number;
    rotateY?: number;
    rotateZ?: number;
    scaleX?: number;
    scaleY?: number;
    scaleZ?: number;
    translateZ?: number;
    perspective?: number;
    depthTaper?: number; // 3D Conical Taper (-100 to 100)
    depthCurvature?: number; // 3D Z-Arc Curvature Bend (-180 to 180)
    twistZ?: number; // 3D Helical Twist Z (-360 to 360)
    shearZ?: number; // 3D Diagonal Shear Z Offset (-100 to 100)
    inflateDepth?: number; // 3D Inflate Bulge Puff Depth (0 to 100)
    bevelProfile?: 'flat' | 'bevel' | 'dome' | 'taper' | 'scurve' | 'hourglass';
    wireframe?: boolean;
    faces?: {
      front: { color: string; opacity: number; visible: boolean };
      back: { color: string; opacity: number; visible: boolean };
      sides: { color: string; opacity: number; visible: boolean };
    };
    extrusion?: {
      depth: number;
      segments: number;
      bevel: number;
    };
    cachedMesh?: any;
    isMeshDirty?: boolean;
  };
  vertices3D?: { x: number; y: number; z: number }[]; // Raw local 3D vertices
  subPaths3D?: { x: number; y: number; z: number }[][]; // Projected sub-paths for facial features and details
  faces3D?: { indices: number[]; fillColor: string; baseColor: string }[]; // Indexed polygonal faces
  bones3D?: { id: string; name: string; parentId?: string; rx: number; ry: number; rz: number; startVertexIdx: number; endVertexIdx: number }[]; // 3D Kinematics bones
  views360?: View360[];
  currentAngle360?: number;
  activeViewId360?: string;
  lockAngle360?: boolean;
  container360Id?: string;
  associatedViewId?: string;
  vstState?: VSTState;
  smartCorrectState?: SmartCorrectState;
  smartMeshColor?: any;
  lassoDeformState?: LassoDeformState;
  lassoControlPoints?: LassoControlPoint[];
  originalPointsBackup?: Point[];
  originalSubPathsBackup?: Point[][];
  smartWarp?: SmartWarpState;
  cageState?: CageState;
  wireframeMode?: boolean;
  selectedPointIndices?: number[];
  savedSelections?: { id: string; name: string; vertexIndices: number[]; color?: string }[];
  wireframeSelectionDone?: boolean;
  subExtrusions?: SubExtrusion[];
  activeSubExtrusionId?: string | null;
  
  // Spline-Based Stroke fields
  splineActive?: boolean;
  splinePoints?: Point[]; // Bezier curve points
  splineControlPoints?: { start: Point; cp1: Point; cp2: Point; end: Point }[];
  splineTwistPoints?: { t: number; rotation: number; scale: number; id: string }[];
  splineUniformStretch?: boolean;
  splineOriginalPoints?: Point[];
  curvePathState?: CurvePathState;
  flexCurveState?: FlexCurveState;
  customVectorDeformState?: CustomVectorDeformState;
  pointShapeState?: PointShapeState;
  lineEditState?: LineEditState;
  twitchState?: TwitchToolState; // Twitch Tool (TWT): Point-based Shape & Stroke Decomposer, Hide/Show, Deformer and Transformer
  rule3DState?: Rule3DState; // Strict Rule-Based 2D-to-3D Stroke Memory Engine State
  attachedParts?: AttachedShapePart[]; // Hierarchical Shape Studio attached parts (eyes, legs, mouth, etc.)
}

export interface Rule3DPoint {
  x: number;
  y: number;
  z: number;
  normalX?: number;
  normalY?: number;
  normalZ?: number;
  pressure?: number;
  thickness?: number;
  color?: string;
  gap?: boolean;
}

export interface Rule3DStrokePath {
  id: string;
  partName: string; // 'face' | 'leftEye' | 'rightEye' | 'nose' | 'mouth' | 'leftEar' | 'rightEar' | 'arm' | 'contour' | 'feature' | string
  side: 'center' | 'left' | 'right';
  baseZ: number; // Inferred z depth (e.g. +30 for nose, +15 for eyes, -25 for ears)
  points3D: Rule3DPoint[];
  subPathIndex?: number;
  isClosed?: boolean;
  strokeColor?: string;
  strokeWidth?: number;
  fillColor?: string;
  opacity?: number;
  center3D: { x: number; y: number; z: number };
}

export interface Rule3DDetectedPart {
  id: string;
  name: string;
  side: 'center' | 'left' | 'right';
  depthOffset: number;
  visible: boolean;
  strokeCount: number;
}

export interface Rule3DState {
  enabled: boolean;
  
  // Transform values (Current 3D orientation)
  yaw: number; // Y-axis rotation in degrees (-180° to +180°)
  pitch: number; // X-axis rotation in degrees (-180° to +180°)
  roll: number; // Z-axis rotation in degrees (-180° to +180°)
  scale3D: number; // 3D Uniform scale multiplier
  translateX: number;
  translateY: number;
  translateZ: number;
  
  // Perspective & Volumetric rules
  perspective: number; // Camera focal length (100 to 1500, default 500)
  volumetricDepth: number; // Depth bulge / spherical curvature (0 to 150)
  foreshorteningEnabled: boolean; // Angle-based thickness scaling & horizontal compression
  occlusionEnabled: boolean; // Back-face culling & silhouette depth clipping
  
  // Feature depth offsets (semantic protrusions)
  noseDepth: number; // Protrusion offset for nose
  eyeDepth: number; // Protrusion offset for eyes
  earDepth: number; // Inset offset for ears
  curvatureProfile: 'ellipsoid' | 'cylinder' | 'planar' | 'spherical';
  
  // 3-State Memory Architecture
  // 1. FirstShape: Immutable reference of original drawing & pristine 3D soul
  firstShape: {
    points: Point[];
    subPaths?: Point[][];
    subPathFills?: { [subPathIdx: number]: string };
    subPathStrokes?: { [subPathIdx: number]: { strokeColor?: string, strokeWidth?: number } };
    strokeColor: string;
    strokeWidth: number;
    fillColor: string;
    center: Point;
    bounds: { minX: number; minY: number; maxX: number; maxY: number; width: number; height: number };
    strokes3D: Rule3DStrokePath[];
  };
  
  // 2. PreviousState: Last transform state for interpolation
  previousState?: {
    yaw: number;
    pitch: number;
    roll: number;
    scale3D: number;
    translateX: number;
    translateY: number;
    translateZ: number;
  };
  
  // Detected semantic parts list
  detectedParts: Rule3DDetectedPart[];
}

export interface AttachedShapePart {
  id: string;
  name: string;
  objectId: string; // ID of the attached vector drawing object
  parentObjectId: string; // ID of the parent drawing
  category?: 'eye' | 'mouth' | 'leg' | 'arm' | 'tail' | 'head' | 'hair' | 'accessory' | 'custom';
  isHidden?: boolean;
  locked?: boolean;
  offsetX?: number;
  offsetY?: number;
  relativeRotation?: number;
  relativeScaleX?: number;
  relativeScaleY?: number;
  autoSwapGroup?: string;
}

export interface LineEditNode {
  id: string;
  x: number;
  y: number;
  origX?: number;
  origY?: number;
}

export interface LineEditState {
  active: boolean;
  targetDrawingId: string | null;
  nodes: LineEditNode[];
  subPathNodes?: LineEditNode[][];
  isClosed: boolean;
  pullRadius: number;
  pullElasticity: number;
  subdivision: number;
  showNodes: boolean;
  preserveLength: boolean;
  smoothTension: number;
  mode: 'pull' | 'node' | 'smooth' | 'placePoint' | 'extrude';
  extrudeDirection?: 'out' | 'in';
  extrudeStrength?: number;
  customPoints?: { id: string; x: number; y: number; origX?: number; origY?: number }[];
}

export interface PointShapeNode {
  id: string;
  x: number;
  y: number;
  z?: number;
  scale?: number;
  rotation?: number;
  parentId?: string | null;
  connectedTo?: string[];
  color?: string;
  size?: number;
  pinned?: boolean;
}

export interface PointShapeState {
  mode: 'place' | 'edit' | 'join' | 'brush';
  nodes: PointShapeNode[];
  selectedNodeId?: string | null;
  showPoints: boolean;
  showStrokes: boolean;
  autoJoin: boolean;
  isClosed: boolean;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  targetDrawingId?: string | null;
  brushRadius?: number;
  brushStrength?: number;
  brushType?: 'push' | 'smooth' | 'inflate';
  lowPolyMode?: boolean;
  minDistance?: number;
  maxNodes?: number;
  simplifyTolerance?: number;
}

export interface SculptBrushState {
  brushRadius: number;
  brushStrength: number;
  brushMode: 'expand' | 'collapse' | 'smooth' | 'push';
  autoTargetAll: boolean;
  autoCorrectStrokes: boolean;
}

export interface CustomVectorDeformNode {
  id: string;
  x: number;
  y: number;
  origX: number;
  origY: number;
  parentNodeId?: string; // ID of the parent point from which this point was extruded
  z?: number;
  origZ?: number;
  scaleX?: number;
  scaleY?: number;
  scaleZ?: number;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  skewX?: number;
  skewY?: number;
  width?: number;
  height?: number;
  depth?: number;
  color?: string;
  radius?: number;
  opacity?: number;
  blur?: number;
}

export interface CustomVectorDeformState {
  active: boolean;
  isDrawingPhase: boolean;
  isBound?: boolean; // Set to true when user clicks "Done" in Right Panel to lock points to stroke/area
  nodes: CustomVectorDeformNode[];
  selectedNodeIndex?: number;
  origObjectPoints?: Point[];
  stiffness?: number;
  rigidLinear?: boolean;
  extrudePointMode?: boolean; // Extrude connected point mode (vector pen style joint chain)
  captureRadius?: number; // Point captured area radius
}

export interface FlexCurveControlPoint {
  id: string;
  x: number;
  y: number;
  origX: number;
  origY: number;
}

export interface FlexCurveState {
  active: boolean;
  isAttached: boolean;
  points: FlexCurveControlPoint[];
  influenceRadius: number;
  preserveLength: boolean;
}

export interface CurvePathState {
  active: boolean;
  hPointsCount: number;
  vPointsCount: number;
  hControlPoints: Point[];
  vControlPoints: Point[];
  hControlPoints0: Point[];
  vControlPoints0: Point[];
}

export interface CagePoint {
  id: string;
  originalX: number;
  originalY: number;
  currentX: number;
  currentY: number;
}

export interface CageState {
  active: boolean;
  points: CagePoint[];
  showGrid: boolean;
}

export interface LiquifyBrushSettings {
  brushSize: number;
  brushStrength: number;
  brushMode: 'push' | 'pull' | 'pinch' | 'bulge' | 'twist-cw' | 'twist-ccw' | 'restore';
}

export interface VSTState {
  active: boolean;
  lassoPoints: Point[]; // Closed polygon area in local object space
  pivot?: Point; // Custom transform origin pivot point (always strictly inside lasso polygon)
  transform: Transform & {
    mirrorX?: boolean;
    mirrorY?: boolean;
  };
  tintColor?: string;
  tintOpacity?: number;
}

export interface SmartCorrectState {
  active?: boolean;
  mode: 'expand' | 'decrease' | 'move' | 'push' | 'pinch' | 'smooth';
  radius: number; // capture radius
  strength: number; // 0 to 1
  straightRadial?: boolean;
}

export interface SmartWarpPin {
  id: string;
  originalX: number;
  originalY: number;
  currentX: number;
  currentY: number;
  size: number;
  color: string;
  locked: boolean;
  influenceRadius: number;
  influenceFalloff: 'linear' | 'smooth' | 'sharp';
}

export interface SmartWarpState {
  pins: SmartWarpPin[];
  pinSize: number;
  influenceRadius: number;
  influenceFalloff: 'linear' | 'smooth' | 'sharp';
  showInfluenceArea: boolean;
  previewMode: boolean;
}

export interface LassoControlPoint {
  id: string;
  originalX: number;
  originalY: number;
  currentX: number;
  currentY: number;
  pointIndex: number;
  subPathIndex?: number; // if it belongs to subPaths
}

export interface Layer {
  id: string;
  name: string;
  zIndex: number;
  depth?: number; // 3D Multiplane Depth (Z-position, e.g. -500 to +500)
  parallaxFactor?: number; // Parallax motion multiplier (e.g. 0.2 to 2.0)
  visible: boolean;
  locked: boolean;
  opacity: number;
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay';
}

export interface FrameObjectState {
  transform: Transform;
  fillColor?: string;
  strokeColor?: string;
  opacity?: number;
  pivots?: Pivot[];
  pins?: Pivot[];
  points?: Point[];
  subPaths?: Point[][];
  [key: string]: any;
}

export interface Frame {
  index: number;
  objects: { [objectId: string]: FrameObjectState };
  boneAngles?: { [boneId: string]: number };
}

export interface LoopRule {
  id: string;
  name: string;
  targetVariable: string;
  action: 'add' | 'multiply';
  amountPerStep: number;
  direction: 'clockwise' | 'counter-clockwise' | 'positive' | 'negative';
  stopCondition: {
    type: 'after_n_steps' | 'when_loop_completes';
    steps?: number;
    triggerLoopId?: string;
    triggerCount?: number;
  };
  framesPerStep: number;
  oscillate?: boolean;
  minValue?: number;
  maxValue?: number;
}

export interface Variable {
  id: string;
  name: string;
  linkedObjectId: string;
  property: 'rotation' | 'x' | 'y' | 'scaleX' | 'scaleY' | 'opacity';
  currentValue: number;
}

export interface Project {
  id: string;
  name: string;
  canvasSize: { w: number; h: number };
  fps: number;
  layers: Layer[];
  objects: { [id: string]: VectorObject };
  frames: Frame[];
  bones: Bone[];
}

export interface BrushSettings {
  brushType: 'solid' | 'calligraphy' | 'pencil' | 'marker' | 'airbrush' | 'glow' | 'cold' | 'dry' | 'smooth' | 'water' | 'charcoal' | 'oil' | 'ink' | 'spray' | 'dotted' | 'dashed' | 'crayon' | 'ribbon' | 'organic' | 'watercolor';
  strokeColor: string;
  strokeWidth: number;
  strokeOpacity: number;
  hardness: number;
  blur: number;
  chiselAngle?: number; // Calligraphy angle (0-180 deg)
  textureDensity?: number; // Pencil texture jitter factor
  jitterEnabled?: boolean; // Jitter toggle
  jitterAmount?: number; // Jitter strength (0 to 1)
  rotationJitter?: boolean; // Random rotation jitter per stamp
  sizeJitter?: boolean; // Random 5-10% size jitter
  flow?: number; // 0 to 1
  wetness?: number; // 0 to 1 for water brush
  dryness?: number; // 0 to 1 for dry bristle effect
  coldTemperature?: number; // -100 to 100 for temperature shifts
  smoothSmoothing?: number; // 0 to 100 auto-smoothing stabilizer
  streamline?: number; // 0 to 1 line smoothing stabilizer
  scatter?: number; // 0 to 50px scattering
  randomRotation?: boolean; // Random rotation per stamp (Math.random() * 360)
  randomSize?: boolean; // Random size variation per stamp
  hue?: number; // 0 to 360
  saturation?: number; // 0 to 100
  lightness?: number; // 0 to 100
  colorJitter?: number; // 0 to 100%
  touchOffset?: boolean; // Touch offset to prevent finger blocking view
  shadowEnabled: boolean;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
}

export interface EraserSettings {
  radius: number; // 5 to 250
  mode: 'cut' | 'stroke' | 'point' | 'area'; // 'cut' = real vector cut / erase points within radius, 'stroke' = delete entire touched stroke
  smoothEdges: boolean;
  hardness?: number; // 0 to 1
  feather?: number; // 0 to 50
  eraseActiveLayerOnly?: boolean;
}

export interface KnifeSettings {
  mode: 'line' | 'lasso';
  separateDistance: number;
  keepSide?: 'both' | 'left' | 'right';
  autoSeparate?: boolean;
  smoothCut?: boolean;
}

export interface PivotSettings {
  snapToCenter?: boolean;
  snapPosition?: 'center' | 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right' | 'custom';
  showCrosshair?: boolean;
}

export interface MLSettings {
  stabilizerEnabled: boolean;
  stabilizerStrength: number; // 0 to 1
  predictiveCurvature: boolean;
  shapeRecognizerEnabled: boolean;
  spatialAcceleration: boolean;
}

export interface BezierAnchor {
  id: string;
  x: number;
  y: number;
  handleIn?: Point | null; // cp1 (direction point)
  handleOut?: Point | null; // cp2 (direction point)
  isCorner?: boolean; // sharp corner vs smooth bezier
  selected?: boolean;
}

export interface BezierToolState {
  active: boolean;
  anchors: BezierAnchor[];
  selectedAnchorIndex: number | null;
  selectedHandleType: 'anchor' | 'in' | 'out' | null;
  isClosed: boolean;
  cornerMode: boolean;
  touchOffset: boolean;
}

export interface PuppetPin {
  id: string;
  x: number;
  y: number;
  origX: number;
  origY: number;
  weight?: number;
  locked?: boolean;
}

export interface RealPuppetState {
  active: boolean;
  pins: PuppetPin[];
  selectedPinId: string | null;
  meshDensity: number;
  influenceRadius: number;
  autoRig: boolean;
}

export interface TwitchCurvePoint {
  id: string;
  x: number;
  y: number;
  origX: number;
  origY: number;
  t: number; // Parameter along shape perimeter (0 to 1)
}

export interface TwitchMeshPoint {
  id: string;
  gridX: number; // 0 to cols-1
  gridY: number; // 0 to rows-1
  x: number;
  y: number;
  origX: number;
  origY: number;
}

export interface TwitchIdentifiedShape {
  id: string;
  name: string; // e.g. "Head_Outline", "Left_Eye", "Right_Eye", "Nose", "Mouth", "Left_Ear", "Right_Ear"
  type: 'closed_loop' | 'subpath' | 'shared_stroke' | 'open_stroke';
  points: Point[]; // Local points defining the shape contour
  origPoints: Point[]; // Base original shape points
  subPathIndex?: number; // -1 for main stroke, or subPath index
  pointIndices?: number[]; // Point indices in parent points array
  isClosed: boolean;
  wasOriginallyOpen?: boolean;
  isHidden: boolean; // Point-based or panel-based Hide/Show anytime!
  isLocked?: boolean; // Lock / Unlock shape from modifications
  color?: string; // Fill or tint color override
  strokeColor?: string;
  strokeWidth?: number;
  area: number; // Area in px²
  centroid: { x: number; y: number };
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
    minX?: number;
    minY?: number;
    maxX?: number;
    maxY?: number;
    centerX?: number;
    centerY?: number;
    corners?: Point[];
  };
  bounds?: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  };
  // Individual Transform for this identified shape
  transform: {
    x: number;
    y: number;
    rotation: number;
    rotX?: number;
    rotY?: number;
    rotZ?: number;
    scaleX: number;
    scaleY: number;
    skewX: number;
    skewY: number;
    rotateX: number;
    rotateY: number;
    perspective: number;
  };
  // Shared stroke contour data
  sharedWithShapeId?: string;
  sharedStrokeIndices?: number[];
  
  // Curve deformation mode points
  curvePoints?: TwitchCurvePoint[];
  
  // Mesh deformation grid
  meshGrid?: TwitchMeshPoint[];
  meshCols?: number;
  meshRows?: number;
  
  // Hierarchy / parent-child
  children?: string[];
  parentShape?: string | null;
  
  // Red dot placed on shape click (centroid / click position)
  redDot?: { x: number; y: number } | null;

  // Quick pose / line edit parameters
  poseAngle?: number;
  poseStretch?: number;
  targetLineWidth?: number;
  targetLineHeight?: number;
  lineAngle?: number;
  lineLength?: number;
  perimeterLength?: number;
}

export interface TwitchToolState {
  active: boolean;
  activeMode: 'edit' | 'transform' | 'curve' | 'mesh' | 'line' | 'new_shape';
  selectedShapeId: string | null;
  hoveredShapeId: string | null;
  shapes: TwitchIdentifiedShape[];
  
  // Scanning animation state
  isScanning?: boolean;
  scanProgress?: number; // 0 to 100
  scanStatusText?: string;
  scanLineY?: number; // 0 to 1 normalized
  
  // Canvas HUD Transform Box State
  hudBoxPosition: { x: number; y: number }; // Canvas / screen coordinates for draggable box
  hudTransformProperty: 'move' | 'rotate' | 'scale' | 'height' | 'width' | 'skewX' | 'skewY' | 'perspective' | 'flipX' | 'flipY';
  hudIncrementValue: number; // 0 to +200 px / deg
  hudDecrementValue: number; // 0 to +200 px / deg
  hudAxis: 'x' | 'y' | 'z' | 'all';
  showHudBox: boolean;
  
  // Direct Hand Grab / Stroke Reshape state
  isGrabbingStroke?: boolean;
  grabStartPoint?: Point | null;
  grabCurrentPoint?: Point | null;
  grabRadius?: number;
  
  // Red dot indicator placement
  placedPoint?: { x: number; y: number; shapeId: string } | null;

  // New shape drawing state
  newShapeDrawing?: Point[];
  
  // Curve / Mesh drag state
  selectedCurvePointId?: string | null;
  selectedMeshPointId?: string | null;
  
  // Auto scan on select
  autoScanOnSelect?: boolean;
  lastScannedObjectId?: string | null;
}


