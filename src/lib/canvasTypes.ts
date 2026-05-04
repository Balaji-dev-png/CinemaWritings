/**
 * Creative Workspace — Canvas Type Definitions
 *
 * Central types for all canvas elements, tools, viewport,
 * and serialization. Every canvas feature imports from here.
 */

// ─── Tool Types ──────────────────────────────────────────────────────────────

export type Tool =
  | "select"
  | "hand"
  | "text"
  | "sticky"
  | "shot"
  | "idea"
  | "image"
  | "link"
  | "connect";

// ─── Viewport ────────────────────────────────────────────────────────────────

export interface ViewportState {
  offsetX: number;
  offsetY: number;
  zoom: number;
}

// ─── Drawing Strokes (Legacy/Hidden) ─────────────────────────────────────────

export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
}

export interface DrawingStroke {
  id: string;
  type: "pencil" | "highlighter";
  points: StrokePoint[];
  color: string;
  width: number;
  opacity: number;
}

// ─── Canvas Element Types ────────────────────────────────────────────────────

export interface BaseElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  opacity: number;
  locked: boolean;
}

export interface RectangleElement extends BaseElement {
  type: "rectangle";
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  borderRadius: number;
}

export interface CircleElement extends BaseElement {
  type: "circle";
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
}

export interface ArrowElement extends BaseElement {
  type: "arrow";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeColor: string;
  strokeWidth: number;
  label: string;
  dashPattern: number[];
}

export interface LineElement extends BaseElement {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeColor: string;
  strokeWidth: number;
  dashPattern: number[];
}

export interface TextElement extends BaseElement {
  type: "text";
  content: string;
  fontSize: number;
  fontWeight: string;
  fontFamily: string;
  color: string;
  backgroundColor: string;
}

export interface StickyNoteElement extends BaseElement {
  type: "sticky";
  content: string;
  color: "yellow" | "pink" | "blue" | "green" | "purple" | "orange";
  fontSize: number;
}

export interface ImageElement extends BaseElement {
  type: "image";
  src: string;
  alt: string;
  objectFit: "cover" | "contain" | "fill";
}

export interface LinkCardElement extends BaseElement {
  type: "link-card";
  url: string;
  title: string;
  description: string;
  thumbnail: string;
  favicon: string;
}

export interface ShotElement extends BaseElement {
  type: "shot";
  shotNumber: string;
  shotType: string;
  sceneRef: string;
  description: string;
  duration: string;
  color: string;
  // Director's Suite Fields
  imageUrl: string;
  lens: string;
  movement: string;
  notes: string;
}

export interface IdeaElement extends BaseElement {
  type: "idea";
  title: string;
  content: string;
  color: string;
}

export interface MermaidElement extends BaseElement {
  type: "mermaid";
  code: string;
  renderedSvg: string;
}

export type CanvasElement =
  | RectangleElement
  | CircleElement
  | ArrowElement
  | LineElement
  | TextElement
  | StickyNoteElement
  | ImageElement
  | LinkCardElement
  | ShotElement
  | IdeaElement
  | MermaidElement;

// ─── Connection Edges ────────────────────────────────────────────────────────

export interface EdgeConnection {
  id: string;
  sourceId: string;
  targetId: string;
  label: string;
  color: string;
  style: "solid" | "dashed" | "dotted";
}

// ─── Canvas State (Serializable) ─────────────────────────────────────────────

export interface CanvasState {
  elements: CanvasElement[];
  edges: EdgeConnection[];
  strokes: DrawingStroke[]; // Kept for legacy compatibility
  viewport: ViewportState;
  gridVisible: boolean;
  nextZIndex: number;
}

// ─── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_VIEWPORT: ViewportState = {
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
};

export const DEFAULT_CANVAS_STATE: CanvasState = {
  elements: [],
  edges: [],
  strokes: [],
  viewport: DEFAULT_VIEWPORT,
  gridVisible: true,
  nextZIndex: 1,
};

// ─── Sticky Note Colors ──────────────────────────────────────────────────────

export const STICKY_COLORS: Record<
  StickyNoteElement["color"],
  { bg: string; border: string; text: string }
> = {
  yellow: { bg: "#fef9c3", border: "#fde047", text: "#713f12" },
  pink: { bg: "#fce7f3", border: "#f9a8d4", text: "#831843" },
  blue: { bg: "#dbeafe", border: "#93c5fd", text: "#1e3a5f" },
  green: { bg: "#dcfce7", border: "#86efac", text: "#14532d" },
  purple: { bg: "#f3e8ff", border: "#c084fc", text: "#581c87" },
  orange: { bg: "#ffedd5", border: "#fdba74", text: "#7c2d12" },
};

// ─── Idea Colors ─────────────────────────────────────────────────────────────

export const IDEA_COLORS = [
  { id: "blue", value: "#3b82f6" },
  { id: "purple", value: "#8b5cf6" },
  { id: "green", value: "#10b981" },
  { id: "amber", value: "#f59e0b" },
  { id: "red", value: "#ef4444" },
  { id: "pink", value: "#ec4899" },
];

// ─── Shot Types ──────────────────────────────────────────────────────────────

export const SHOT_TYPES = [
  // Distance
  { id: "ews", label: "Extreme Wide Shot (EWS)", icon: "🌍", color: "#64748b" },
  { id: "ws", label: "Wide Shot (WS)", icon: "🏔", color: "#64748b" },
  { id: "fs", label: "Full Shot (FS)", icon: "🧍", color: "#64748b" },
  { id: "mws", label: "Medium Wide Shot (MWS)", icon: "🤠", color: "#8b5cf6" },
  { id: "ms", label: "Medium Shot (MS)", icon: "👤", color: "#8b5cf6" },
  { id: "mcu", label: "Medium Close-Up (MCU)", icon: "🗣", color: "#8b5cf6" },
  { id: "cu", label: "Close-Up (CU)", icon: "👁", color: "#ef4444" },
  { id: "ecu", label: "Extreme Close-Up (ECU)", icon: "🔍", color: "#ef4444" },
  { id: "insert", label: "Insert Shot", icon: "📌", color: "#f59e0b" },
  // Angle
  { id: "eye-level", label: "Eye Level", icon: "👀", color: "#10b981" },
  { id: "low-angle", label: "Low Angle", icon: "⬆️", color: "#10b981" },
  { id: "high-angle", label: "High Angle", icon: "⬇️", color: "#10b981" },
  { id: "birds-eye", label: "Bird's Eye / Top Down", icon: "🦅", color: "#14b8a6" },
  { id: "dutch-angle", label: "Dutch Angle / Canted", icon: "↗️", color: "#e11d48" },
  { id: "worms-eye", label: "Worm's Eye", icon: "🐛", color: "#10b981" },
  // Movement
  { id: "static", label: "Static Shot", icon: "⏸️", color: "#3b82f6" },
  { id: "pan", label: "Pan", icon: "↔️", color: "#3b82f6" },
  { id: "tilt", label: "Tilt", icon: "↕️", color: "#3b82f6" },
  { id: "dolly", label: "Dolly / Tracking", icon: "🚂", color: "#3b82f6" },
  { id: "dolly-zoom", label: "Dolly Zoom (Vertigo)", icon: "😵‍💫", color: "#8b5cf6" },
  { id: "zoom", label: "Zoom", icon: "🔎", color: "#3b82f6" },
  { id: "handheld", label: "Handheld", icon: "🫨", color: "#f59e0b" },
  { id: "steadicam", label: "Steadicam", icon: "🛹", color: "#3b82f6" },
  { id: "crane", label: "Crane / Jib", icon: "🏗", color: "#8b5cf6" },
  { id: "aerial", label: "Aerial Shot", icon: "🚁", color: "#3b82f6" },
  { id: "arc", label: "Arc Shot", icon: "🔄", color: "#3b82f6" },
  { id: "whip-pan", label: "Whip Pan", icon: "💨", color: "#e11d48" },
  // Relationship
  { id: "two-shot", label: "Two Shot (2S)", icon: "👥", color: "#ec4899" },
  { id: "three-shot", label: "Three Shot", icon: "👪", color: "#ec4899" },
  { id: "ots", label: "Over-the-Shoulder (OTS)", icon: "👤👤", color: "#ec4899" },
  { id: "pov", label: "Point of View (POV)", icon: "🎥", color: "#ec4899" },
  { id: "reaction", label: "Reaction Shot", icon: "😲", color: "#ec4899" },
  { id: "cutaway", label: "Cutaway", icon: "✂️", color: "#ec4899" },
  // Special
  { id: "freeze-frame", label: "Freeze Frame", icon: "🧊", color: "#a855f7" },
  { id: "split-screen", label: "Split Screen", icon: "🪟", color: "#a855f7" },
  { id: "rack-focus", label: "Rack Focus", icon: "🔬", color: "#a855f7" },
  { id: "deep-focus", label: "Deep Focus", icon: "🏞", color: "#a855f7" },
  { id: "shallow-focus", label: "Shallow Focus", icon: "🎯", color: "#a855f7" },
  { id: "single", label: "Single", icon: "🧍‍♂️", color: "#ec4899" },
] as const;

// ─── History Action ──────────────────────────────────────────────────────────

export interface CanvasHistoryEntry {
  elements: CanvasElement[];
  edges: EdgeConnection[];
  strokes: DrawingStroke[];
}
