"use client";
import { useRef, useCallback } from "react";

interface DragOptions {
  onMove: (x: number, y: number) => void;
  onStart?: () => void;
  onEnd?: (x: number, y: number) => void;
  getZoom: () => number;
  getPan: () => { x: number; y: number };
}

export function useDraggable({ onMove, onStart, onEnd, getZoom, getPan }: DragOptions) {
  const dragging = useRef(false);
  const offset = useRef({ dx: 0, dy: 0 });
  const rafId = useRef<number | null>(null);
  const currentPos = useRef({ x: 0, y: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, currentX: number, currentY: number) => {
      e.stopPropagation();
      e.preventDefault();
      dragging.current = true;
      currentPos.current = { x: currentX, y: currentY };
      onStart?.();

      const zoom = getZoom();
      const pan = getPan();

      const canvasX = (e.clientX - pan.x) / zoom;
      const canvasY = (e.clientY - pan.y) / zoom;

      offset.current = {
        dx: canvasX - currentX,
        dy: canvasY - currentY,
      };

      let lastX = e.clientX;
      let lastY = e.clientY;

      const updatePosition = () => {
        if (!dragging.current) return;
        
        const currentZoom = getZoom();
        const currentPan = getPan();

        const newCanvasX = (lastX - currentPan.x) / currentZoom;
        const newCanvasY = (lastY - currentPan.y) / currentZoom;

        const newX = newCanvasX - offset.current.dx;
        const newY = newCanvasY - offset.current.dy;

        currentPos.current = { x: newX, y: newY };
        onMove(newX, newY);
        rafId.current = null;
      };

      const handleMove = (me: MouseEvent) => {
        if (!dragging.current) return;
        lastX = me.clientX;
        lastY = me.clientY;
        
        if (rafId.current === null) {
          rafId.current = requestAnimationFrame(updatePosition);
        }
      };

      const handleUp = () => {
        dragging.current = false;
        if (rafId.current !== null) {
          cancelAnimationFrame(rafId.current);
          rafId.current = null;
        }
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
        onEnd?.(currentPos.current.x, currentPos.current.y);
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [onMove, onEnd, getZoom, getPan]
  );

  return { handleMouseDown };
}
