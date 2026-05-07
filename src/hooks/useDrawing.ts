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
}

// Distance math helpers
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
  canvasRef,
  viewportRef,
  zoomRef,
  panRef,
  isDrawMode,
  initialDataUrl,
  onStrokeComplete,
  scriptId
}: UseDrawingProps) {
  const [tool, setTool] = useState<DrawingOptions["tool"]>("pen");
  const [color, setColor] = useState("#c9a84c");
  const [strokeWidth, setStrokeWidth] = useState(2);

  const isDrawing = useRef(false);
  const currentStroke = useRef<{ x: number; y: number }[]>([]);
  const strokes = useRef<Stroke[]>([]);
  const optionsRef = useRef<DrawingOptions>({ tool: "pen", color: "#c9a84c", strokeWidth: 2 });
  
  const draggingStrokeIndex = useRef<number | null>(null);
  const dragStartPos = useRef<{x: number, y: number} | null>(null);
  const rafId = useRef<number | null>(null);
  const isDirty = useRef(false);

  useEffect(() => {
    optionsRef.current = { tool, color, strokeWidth };
  }, [tool, color, strokeWidth]);

  // Load strokes array if present
  useEffect(() => {
    if (scriptId) {
      try {
        const stored = localStorage.getItem(`cinema_strokes_${scriptId}`);
        if (stored) {
          strokes.current = JSON.parse(stored);
        }
      } catch(e) {}
    }
  }, [scriptId]);

  // Save to local storage on change
  const persistStrokes = useCallback(() => {
    if (scriptId) {
      localStorage.setItem(`cinema_strokes_${scriptId}`, JSON.stringify(strokes.current));
    }
  }, [scriptId]);

  // Convert viewport mouse position → canvas element position
  const viewportToCanvas = useCallback((clientX: number, clientY: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return { x: 0, y: 0 };

    const rect = viewport.getBoundingClientRect();
    const viewportX = clientX - rect.left;
    const viewportY = clientY - rect.top;
    const unpannedX = viewportX - panRef.current.x;
    const unpannedY = viewportY - panRef.current.y;
    const canvasX = (unpannedX / zoomRef.current) + 3000;
    const canvasY = (unpannedY / zoomRef.current) + 3000;

    return { x: canvasX, y: canvasY };
  }, [viewportRef, zoomRef, panRef]);

  const applyToolStyle = useCallback((ctx: CanvasRenderingContext2D) => {
    const { tool, color, strokeWidth } = optionsRef.current;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
      ctx.lineWidth = strokeWidth * 3;
      ctx.globalAlpha = 1;
    } else if (tool === "select") {
      ctx.globalCompositeOperation = "source-over";
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
    if (stroke.tool) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = stroke.color || "#c9a84c";
      ctx.lineWidth = stroke.tool === "brush" ? (stroke.strokeWidth || 2) * 4 : (stroke.strokeWidth || 2);
      ctx.globalAlpha = stroke.tool === "pencil" ? 0.8 : stroke.tool === "brush" ? 0.6 : 1;
      ctx.globalCompositeOperation = stroke.tool === "eraser" ? "destination-out" : "source-over";
    }

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
    strokes.current.forEach(stroke => {
      drawStroke(ctx, stroke.points, stroke);
    });
  }, [canvasRef, drawStroke]);

  // rAF-throttled redraw: only redraws when isDirty
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

  // Initial load
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

  const onPointerDown = useCallback((e: PointerEvent) => {
    if (!isDrawMode) return;
    if (e.button !== 0) return;

    e.preventDefault();
    e.stopPropagation();

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.setPointerCapture(e.pointerId);
    
    const pos = viewportToCanvas(e.clientX, e.clientY);

    if (optionsRef.current.tool === "select") {
      let hitIndex = -1;
      // Reverse loop to pick topmost line
      for (let i = strokes.current.length - 1; i >= 0; i--) {
        const s = strokes.current[i];
        if (s.tool === "eraser") continue;
        
        let hit = false;
        const width = s.tool === "brush" ? (s.strokeWidth * 4) : s.strokeWidth;
        const hitRadius = Math.max(10, width * 2);
        const radiusSq = hitRadius * hitRadius;

        for (let j = 0; j < s.points.length - 1; j++) {
           if (distToSegmentSquared(pos, s.points[j], s.points[j+1]) <= radiusSq) {
             hit = true;
             break;
           }
        }
        if (hit) {
          hitIndex = i;
          break;
        }
      }
      
      if (hitIndex !== -1) {
        draggingStrokeIndex.current = hitIndex;
        dragStartPos.current = pos;
        isDrawing.current = true;
      }
      return;
    }

    isDrawing.current = true;
    currentStroke.current = [pos];

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    applyToolStyle(ctx);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  }, [isDrawMode, canvasRef, viewportToCanvas, applyToolStyle]);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!isDrawing.current || !isDrawMode) return;

    const pos = viewportToCanvas(e.clientX, e.clientY);

    if (optionsRef.current.tool === "select" && draggingStrokeIndex.current !== null && dragStartPos.current) {
      const dx = pos.x - dragStartPos.current.x;
      const dy = pos.y - dragStartPos.current.y;
      dragStartPos.current = pos;
      
      const s = strokes.current[draggingStrokeIndex.current];
      for (const p of s.points) {
        p.x += dx;
        p.y += dy;
      }
      isDirty.current = true;
      scheduleRedraw();
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    currentStroke.current.push(pos);
    const points = currentStroke.current;
    const len = points.length;

    applyToolStyle(ctx);
    ctx.beginPath();

    if (len >= 3) {
      const prev = points[len - 2];
      const curr = points[len - 1];
      const mid = {
        x: (prev.x + curr.x) / 2,
        y: (prev.y + curr.y) / 2
      };
      ctx.moveTo((points[len - 3].x + prev.x) / 2, (points[len - 3].y + prev.y) / 2);
      ctx.quadraticCurveTo(prev.x, prev.y, mid.x, mid.y);
    } else {
      ctx.moveTo(points[0].x, points[0].y);
      ctx.lineTo(pos.x, pos.y);
    }
    ctx.stroke();
  }, [isDrawMode, canvasRef, viewportToCanvas, applyToolStyle, scheduleRedraw]);

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

    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL("image/png");
      onStrokeComplete?.(dataUrl);
    }
  }, [canvasRef, onStrokeComplete, persistStrokes]);

  const undo = useCallback(() => {
    strokes.current.pop();
    persistStrokes();
    redrawAll();
    const canvas = canvasRef.current;
    if (canvas) {
      onStrokeComplete?.(canvas.toDataURL("image/png"));
    }
  }, [redrawAll, canvasRef, onStrokeComplete, persistStrokes]);

  const clearAll = useCallback(() => {
    strokes.current = [];
    persistStrokes();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx?.clearRect(0, 0, canvas.width, canvas.height);
    onStrokeComplete?.("");
  }, [canvasRef, onStrokeComplete, persistStrokes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);

    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
  }, [onPointerDown, onPointerMove, onPointerUp, canvasRef]);

  return {
    tool, setTool,
    color, setColor,
    strokeWidth, setStrokeWidth,
    undo,
    clear: clearAll,
  };
}
