"use client";
import { forwardRef } from "react";

interface Props {
  width: number;
  height: number;
  active: boolean;
}

export const DrawingCanvas = forwardRef<HTMLCanvasElement, Props>(
  function DrawingCanvas({ width, height, active }, ref) {
    return (
      <canvas
        ref={ref}
        width={width}
        height={height}
        className="absolute top-0 left-0"
        style={{
          zIndex: active ? 10 : 1,
          pointerEvents: active ? "auto" : "none",
          cursor: active ? "crosshair" : "default",
        }}
      />
    );
  }
);
