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
  { id: "wide", label: "Wide Shot (WS)", icon: "🎬", color: "#3b82f6" },
  { id: "medium", label: "Medium Shot (MS)", icon: "🎥", color: "#8b5cf6" },
  { id: "close-up", label: "Close Up (CU)", icon: "👁", color: "#ef4444" },
  {
    id: "extreme-close-up",
    label: "Extreme Close Up (ECU)",
    icon: "🔍",
    color: "#f97316",
  },
  {
    id: "over-shoulder",
    label: "Over-the-Shoulder (OTS)",
    icon: "🤝",
    color: "#10b981",
  },
  { id: "pov", label: "POV Shot", icon: "👤", color: "#06b6d4" },
  { id: "insert", label: "Insert Shot", icon: "📌", color: "#f59e0b" },
  { id: "two-shot", label: "Two Shot", icon: "👥", color: "#ec4899" },
  { id: "birds-eye", label: "Bird's Eye View", icon: "🦅", color: "#14b8a6" },
  { id: "low-angle", label: "Low Angle", icon: "⬆️", color: "#6366f1" },
  { id: "high-angle", label: "High Angle", icon: "⬇️", color: "#a855f7" },
  { id: "dutch-angle", label: "Dutch Angle", icon: "↗️", color: "#e11d48" },
] as const;

// ─── History Action ──────────────────────────────────────────────────────────

export interface CanvasHistoryEntry {
  elements: CanvasElement[];
  edges: EdgeConnection[];
  strokes: DrawingStroke[];
}
