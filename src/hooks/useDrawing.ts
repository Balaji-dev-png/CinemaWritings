"use client";
import { useRef, useCallback, useEffect, useState } from "react";

export interface DrawingOptions {
  tool: "pen" | "pencil" | "brush" | "eraser" | "select";
  color: string;
  strokeWidth: number;
}

export interface Stroke {
  points: { x: number; y: number }[];
  tool: DrawingOptions["tool"];
  color: string;
  strokeWidth: number;
}

interface UseDrawingProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  viewportRef: React.RefObject<HTMLDivElement | null>;
  zoomRef: React.MutableRefObject<number>;
  panRef: React.MutableRefObject<{ x: number; y: number }>;
  isDrawMode: boolean;
  initialDataUrl?: string;
  onStrokeComplete?: (dataUrl: string) => void;
  scriptId?: string;
  /** Initial strokes loaded from backend (replaces localStorage) */
  initialStrokes?: Stroke[];
  /** Called after every stroke change so the parent can sync strokes to backend */
  onStrokesChange?: (strokes: Stroke[]) => void;
}

function dist2(v: {x: number, y: number}, w: {x: number, y: number}) {
  return (v.x - w.x)*(v.x - w.x) + (v.y - w.y)*(v.y - w.y);
}
function distToSegmentSquared(p: {x: number, y: number}, v: {x: number, y: number}, w: {x: number, y: number}) {
  const l2 = dist2(v, w);
  if (l2 === 0) return dist2(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return dist2(p, { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) });
}

export function useDrawing({
  canvasRef, viewportRef, zoomRef, panRef,
  isDrawMode, initialDataUrl, onStrokeComplete,
  initialStrokes, onStrokesChange
}: UseDrawingProps) {
  const [tool, setTool] = useState<DrawingOptions["tool"]>("pen");
  const [color, setColor] = useState("#c9a84c");
  const [strokeWidth, setStrokeWidth] = useState(2);

  const isDrawing = useRef(false);
  const currentStroke = useRef<{ x: number; y: number }[]>([]);
  const strokes = useRef<Stroke[]>([]);
  const optionsRef = useRef<DrawingOptions>({ tool: "pen", color: "#c9a84c", strokeWidth: 2 });

  // Keep options ref in sync — no re-renders on draw
  useEffect(() => { optionsRef.current = { tool, color, strokeWidth }; }, [tool, color, strokeWidth]);

  // isDrawMode ref to avoid stale closure in pointer handlers
  const isDrawModeRef = useRef(isDrawMode);
  useEffect(() => { isDrawModeRef.current = isDrawMode; }, [isDrawMode]);

  const draggingStrokeIndex = useRef<number | null>(null);
  const dragStartPos = useRef<{x: number, y: number} | null>(null);

  // rAF state
  const rafId = useRef<number | null>(null);
  const isDirty = useRef(false);

  // ── Load initial strokes from backend prop ────────────────────────────
  useEffect(() => {
    if (initialStrokes && initialStrokes.length > 0) {
      strokes.current = initialStrokes;
      // Redraw will happen when canvas mounts via the redrawAll effect
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // run once on mount only

  const persistStrokes = useCallback(() => {
    onStrokesChange?.([...strokes.current]);
  }, [onStrokesChange]);

  // ── Coordinate conversion ──────────────────────────────────────────────
  // Pure ref-based — never causes re-render
  const viewportToCanvas = useCallback((clientX: number, clientY: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return { x: 0, y: 0 };
    const rect = viewport.getBoundingClientRect();
    const vx = clientX - rect.left;
    const vy = clientY - rect.top;
    return {
      x: (vx - panRef.current.x) / zoomRef.current + 3000,
      y: (vy - panRef.current.y) / zoomRef.current + 3000,
    };
  }, [viewportRef, zoomRef, panRef]);

  // ── Drawing helpers ───────────────────────────────────────────────────
  const applyStyle = useCallback((ctx: CanvasRenderingContext2D) => {
    const { tool, color, strokeWidth } = optionsRef.current;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = strokeWidth * 3;
      ctx.globalAlpha = 1;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = color;
      ctx.lineWidth = tool === "brush" ? strokeWidth * 4 : strokeWidth;
      ctx.globalAlpha = tool === "pencil" ? 0.8 : tool === "brush" ? 0.6 : 1;
    }
  }, []);

  const drawStroke = useCallback((
    ctx: CanvasRenderingContext2D,
    points: { x: number; y: number }[],
    stroke: Partial<Stroke>
  ) => {
    if (points.length < 2) return;
    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = stroke.color || "#c9a84c";
    ctx.lineWidth = stroke.tool === "brush" ? (stroke.strokeWidth || 2) * 4 : (stroke.strokeWidth || 2);
    ctx.globalAlpha = stroke.tool === "pencil" ? 0.8 : stroke.tool === "brush" ? 0.6 : 1;
    ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      const midX = (points[i].x + points[i + 1].x) / 2;
      const midY = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, midX, midY);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
    ctx.stroke();
    ctx.restore();
  }, []);

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (const stroke of strokes.current) {
      drawStroke(ctx, stroke.points, stroke);
    }
  }, [canvasRef, drawStroke]);

  // rAF-throttled — coalesce multiple pointer events into one frame
  const scheduleRedraw = useCallback(() => {
    if (rafId.current !== null) return;
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      if (isDirty.current) {
        isDirty.current = false;
        redrawAll();
      }
    });
  }, [redrawAll]);

  // ── Load initial data URL ─────────────────────────────────────────────
  useEffect(() => {
    if (initialDataUrl && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      const img = new Image();
      img.onload = () => {
        ctx?.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height);
        ctx?.drawImage(img, 0, 0);
      };
      img.src = initialDataUrl;
    }
  }, [initialDataUrl, canvasRef]);

  // ── Pointer handlers — stable refs, NO deps on isDrawMode ────────────
  // Use isDrawModeRef to avoid re-registering listeners on every mode toggle
  const onPointerDown = useCallback((e: PointerEvent) => {
    if (!isDrawModeRef.current || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const pos = viewportToCanvas(e.clientX, e.clientY);

    if (optionsRef.current.tool === "select") {
      for (let i = strokes.current.length - 1; i >= 0; i--) {
        const s = strokes.current[i];
        if (s.tool === "eraser") continue;
        const hitRadius = Math.max(10, (s.tool === "brush" ? s.strokeWidth * 4 : s.strokeWidth) * 2);
        const radiusSq = hitRadius * hitRadius;
        let hit = false;
        for (let j = 0; j < s.points.length - 1; j++) {
          if (distToSegmentSquared(pos, s.points[j], s.points[j + 1]) <= radiusSq) { hit = true; break; }
        }
        if (hit) { draggingStrokeIndex.current = i; dragStartPos.current = pos; isDrawing.current = true; return; }
      }
      return;
    }

    isDrawing.current = true;
    currentStroke.current = [pos];

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    applyStyle(ctx);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, [canvasRef, viewportToCanvas, applyStyle]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!isDrawing.current || !isDrawModeRef.current) return;
    const pos = viewportToCanvas(e.clientX, e.clientY);

    // Select / drag stroke
    if (optionsRef.current.tool === "select" && draggingStrokeIndex.current !== null && dragStartPos.current) {
      const dx = pos.x - dragStartPos.current.x;
      const dy = pos.y - dragStartPos.current.y;
      dragStartPos.current = pos;
      const s = strokes.current[draggingStrokeIndex.current];
      for (const p of s.points) { p.x += dx; p.y += dy; }
      isDirty.current = true;
      scheduleRedraw();
      return;
    }

    // Drawing — incremental render (single segment per move = fastest)
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: false });
    if (!ctx) return;

    currentStroke.current.push(pos);
    const points = currentStroke.current;
    const len = points.length;

    ctx.beginPath();
    if (len >= 3) {
      const prev = points[len - 2];
      const curr = points[len - 1];
      const mid = { x: (prev.x + curr.x) / 2, y: (prev.y + curr.y) / 2 };
      ctx.moveTo((points[len - 3].x + prev.x) / 2, (points[len - 3].y + prev.y) / 2);
      ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
    } else {
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(pos.x, pos.y);
    }
    ctx.stroke();
  }, [canvasRef, viewportToCanvas, applyStyle, scheduleRedraw]);

  const onPointerUp = useCallback((e: PointerEvent) => {
    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (optionsRef.current.tool === "select") {
      draggingStrokeIndex.current = null;
      dragStartPos.current = null;
      persistStrokes();
      if (onStrokeComplete && canvasRef.current) {
        onStrokeComplete(canvasRef.current.toDataURL("image/png"));
      }
      return;
    }

    if (currentStroke.current.length > 1) {
      strokes.current.push({
        points: [...currentStroke.current],
        tool: optionsRef.current.tool,
        color: optionsRef.current.color,
        strokeWidth: optionsRef.current.strokeWidth,
      });
      persistStrokes();
    }
    currentStroke.current = [];

    if (canvasRef.current) {
      onStrokeComplete?.(canvasRef.current.toDataURL("image/png"));
    }
  }, [canvasRef, onStrokeComplete, persistStrokes]);

  // ── Register listeners once — stable handlers don't cause re-registration
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // passive: false only on pointerdown to prevent scroll
    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    canvas.addEventListener("pointermove", onPointerMove, { passive: true });
    canvas.addEventListener("pointerup", onPointerUp, { passive: true });
    canvas.addEventListener("pointercancel", onPointerUp, { passive: true });
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, [onPointerDown, onPointerMove, onPointerUp, canvasRef]);

  const undo = useCallback(() => {
    strokes.current.pop();
    persistStrokes();
    redrawAll();
    if (canvasRef.current) onStrokeComplete?.(canvasRef.current.toDataURL("image/png"));
  }, [redrawAll, canvasRef, onStrokeComplete, persistStrokes]);

  const clearAll = useCallback(() => {
    strokes.current = [];
    persistStrokes();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d")?.clearRect(0, 0, canvas.width, canvas.height);
    onStrokeComplete?.("");
  }, [canvasRef, onStrokeComplete, persistStrokes]);

  return { tool, setTool, color, setColor, strokeWidth, setStrokeWidth, undo, clearAll };
}
