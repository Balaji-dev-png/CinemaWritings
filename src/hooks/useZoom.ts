"use client";
import { useState, useRef, useEffect } from "react";

const MIN_SCALE = 0.2;
const MAX_SCALE = 2.0;
const ZOOM_SENSITIVITY = 0.001;

interface UseZoomProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function useZoom({ containerRef }: UseZoomProps) {
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  
  const scaleRef = useRef(1);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const currentScale = scaleRef.current;
      const delta = -e.deltaY * ZOOM_SENSITIVITY;
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, currentScale + delta * currentScale));

      if (newScale !== currentScale) {
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Calculate logical coordinates relative to the 0 0 origin board
        const logicalX = (mouseX + container.scrollLeft) / currentScale;
        const logicalY = (mouseY + container.scrollTop) / currentScale;

        setScale(newScale);
        
        // Adjust scroll to keep mouse cursor pinned to the exact same logical coordinate
        queueMicrotask(() => {
          container.scrollLeft = logicalX * newScale - mouseX;
          container.scrollTop = logicalY * newScale - mouseY;
        });
      }
    };

    container.addEventListener("wheel", handleWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleWheel);
    };
  }, [containerRef]);

  const resetZoom = () => {
    setScale(1);
    setOrigin({ x: 0, y: 0 });
  };

  return { scale, origin, setScale, setOrigin, resetZoom };
}
