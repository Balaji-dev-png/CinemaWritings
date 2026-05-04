"use client";
import { useRef, useCallback } from "react";

interface DragOptions {
  boardRef: React.RefObject<HTMLDivElement | null>;
  onMove: (x: number, y: number) => void;
  onEnd?: () => void;
  getZoom?: () => number;
}

export function useDraggable({ boardRef, onMove, onEnd, getZoom }: DragOptions) {
  const dragging = useRef(false);
  const offset = useRef({ dx: 0, dy: 0 });

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, currentX: number, currentY: number) => {
      e.stopPropagation();
      e.preventDefault();
      dragging.current = true;

      const board = boardRef.current;
      const scrollLeft = board?.scrollLeft ?? 0;
      const scrollTop = board?.scrollTop ?? 0;
      const boardRect = board?.getBoundingClientRect();
      const boardLeft = boardRect?.left ?? 0;
      const boardTop = boardRect?.top ?? 0;
      const zoom = getZoom?.() ?? 1;

      offset.current = {
        dx: (e.clientX - boardLeft + scrollLeft) / zoom - currentX,
        dy: (e.clientY - boardTop + scrollTop) / zoom - currentY,
      };

      const handleMove = (me: MouseEvent) => {
        if (!dragging.current) return;
        const sl = board?.scrollLeft ?? 0;
        const st = board?.scrollTop ?? 0;
        const bl = board?.getBoundingClientRect().left ?? 0;
        const bt = board?.getBoundingClientRect().top ?? 0;
        const z = getZoom?.() ?? 1;

        const newX = (me.clientX - bl + sl) / z - offset.current.dx;
        const newY = (me.clientY - bt + st) / z - offset.current.dy;
        onMove(Math.max(0, newX), Math.max(0, newY));
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
    [boardRef, onMove, onEnd, getZoom]
  );

  return { handleMouseDown };
}
