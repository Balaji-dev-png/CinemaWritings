"use client";
import { useRef, useCallback } from "react";

interface DragOptions {
  onMove: (x: number, y: number) => void;
  onEnd?: () => void;
  getZoom: () => number;
  getPan: () => { x: number; y: number };
}

export function useDraggable({ onMove, onEnd, getZoom, getPan }: DragOptions) {
  const dragging = useRef(false);
  const offset = useRef({ dx: 0, dy: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, currentX: number, currentY: number) => {
      e.stopPropagation();
      e.preventDefault();
      dragging.current = true;

      const zoom = getZoom();
      const pan = getPan();

      // Convert viewport mouse position to canvas position
      const canvasX = (e.clientX - pan.x) / zoom;
      const canvasY = (e.clientY - pan.y) / zoom;

      // Calculate the offset from the element's actual position
      offset.current = {
        dx: canvasX - currentX,
        dy: canvasY - currentY,
      };

      const handleMove = (me: MouseEvent) => {
        if (!dragging.current) return;
        
        const currentZoom = getZoom();
        const currentPan = getPan();

        const newCanvasX = (me.clientX - currentPan.x) / currentZoom;
        const newCanvasY = (me.clientY - currentPan.y) / currentZoom;

        // Apply offset to get the top-left of the card
        const newX = newCanvasX - offset.current.dx;
        const newY = newCanvasY - offset.current.dy;

        // Optionally clamp to >= 0 or let it go negative (infinite canvas allows negative!)
        // Milanote allows infinite scrolling in any direction, so we don't clamp.
        onMove(newX, newY);
      };

      const handleUp = () => {
        dragging.current = false;
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
        onEnd?.();
      };

      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [onMove, onEnd, getZoom, getPan]
  );

  return { handleMouseDown };
}
