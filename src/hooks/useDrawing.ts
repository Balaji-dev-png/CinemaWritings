"use client";
import { useRef, useCallback, useEffect, useState } from "react";

export interface Stroke {
  points: { x: number; y: number }[];
  color: string;
  width: number;
  tool: "pen" | "pencil" | "brush" | "eraser";
}

interface DrawingOptions {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  boardRef: React.RefObject<HTMLDivElement | null>;
  active: boolean;
  onSaveDataUrl: (url: string) => void;
  initialDataUrl: string;
}

export function useDrawing({
  canvasRef,
  boardRef,
  active,
  onSaveDataUrl,
  initialDataUrl,
}: DrawingOptions) {
  const [tool, setTool] = useState<Stroke["tool"]>("pen");
  const [color, setColor] = useState("#c9a84c");
  const [width, setWidth] = useState(2);
  const strokesRef = useRef<Stroke[]>([]);
  const currentStroke = useRef<Stroke | null>(null);
  const isDrawing = useRef(false);

  // Tool presets
  const getToolProps = useCallback(
    (t: Stroke["tool"]) => {
      switch (t) {
        case "pen":
          return { width: width, opacity: 1, cap: "round" as CanvasLineCap };
        case "pencil":
          return { width: width, opacity: 0.8, cap: "round" as CanvasLineCap };
        case "brush":
          return { width: Math.max(width, 10), opacity: 1, cap: "round" as CanvasLineCap };
        case "eraser":
          return { width: 20, opacity: 1, cap: "round" as CanvasLineCap };
      }
    },
    [width]
  );

  const redrawAll = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokesRef.current) {
      if (stroke.points.length < 2) continue;
      const props = getToolProps(stroke.tool);
      ctx.beginPath();
      ctx.strokeStyle = stroke.tool === "eraser" ? "#0d0d0d" : stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = props.cap;
      ctx.globalAlpha = stroke.tool === "pencil" ? 0.8 : 1;
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }, [canvasRef, getToolProps]);

  // Load initial drawing
  useEffect(() => {
    if (!initialDataUrl || !canvasRef.current) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvasRef.current?.getContext("2d");
      if (ctx && canvasRef.current) {
        ctx.drawImage(img, 0, 0);
      }
    };
    img.src = initialDataUrl;
  }, [initialDataUrl, canvasRef]);

  const getCanvasPoint = useCallback(
    (e: MouseEvent) => {
      const canvas = canvasRef.current;
      const board = boardRef.current;
      if (!canvas || !board) return { x: 0, y: 0 };

      const rect = board.getBoundingClientRect();
      return {
        x: e.clientX - rect.left + board.scrollLeft,
        y: e.clientY - rect.top + board.scrollTop,
      };
    },
    [canvasRef, boardRef]
  );

  const handleMouseDown = useCallback(
    (e: MouseEvent) => {
      if (!active) return;
      isDrawing.current = true;
      const point = getCanvasPoint(e);
      currentStroke.current = {
        points: [point],
        color,
        width: tool === "brush" ? Math.max(width, 10) : tool === "eraser" ? 20 : width,
        tool,
      };
    },
    [active, color, width, tool, getCanvasPoint]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDrawing.current || !currentStroke.current || !active) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const point = getCanvasPoint(e);
      currentStroke.current.points.push(point);

      const stroke = currentStroke.current;
      const pts = stroke.points;
      if (pts.length < 2) return;

      ctx.beginPath();
      ctx.strokeStyle = stroke.tool === "eraser" ? "#0d0d0d" : stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = "round";
      ctx.globalAlpha = stroke.tool === "pencil" ? 0.8 : 1;
      ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
      ctx.stroke();
      ctx.globalAlpha = 1;
    },
    [active, canvasRef, getCanvasPoint]
  );

  const handleMouseUp = useCallback(() => {
    if (!isDrawing.current || !currentStroke.current) return;
    isDrawing.current = false;
    strokesRef.current.push(currentStroke.current);
    currentStroke.current = null;

    // Save snapshot
    const canvas = canvasRef.current;
    if (canvas) {
      onSaveDataUrl(canvas.toDataURL("image/png"));
    }
  }, [canvasRef, onSaveDataUrl]);

  const undo = useCallback(() => {
    strokesRef.current.pop();
    redrawAll();
    const canvas = canvasRef.current;
    if (canvas) {
      onSaveDataUrl(canvas.toDataURL("image/png"));
    }
  }, [redrawAll, canvasRef, onSaveDataUrl]);

  const clearAll = useCallback(() => {
    strokesRef.current = [];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    onSaveDataUrl("");
  }, [canvasRef, onSaveDataUrl]);

  // Attach / detach canvas listeners
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("mousedown", handleMouseDown);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("mouseup", handleMouseUp);
    canvas.addEventListener("mouseleave", handleMouseUp);

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("mouseup", handleMouseUp);
      canvas.removeEventListener("mouseleave", handleMouseUp);
    };
  }, [canvasRef, handleMouseDown, handleMouseMove, handleMouseUp]);

  return {
    tool,
    setTool,
    color,
    setColor,
    width,
    setWidth,
    undo,
    clearAll,
  };
}
