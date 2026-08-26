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
        className="absolute"
        style={{
          top: -3000,
          left: -3000,
          zIndex: active ? 100 : -1,
          pointerEvents: active ? "all" : "none",
          background: "transparent",
          touchAction: "none",
          willChange: "auto",
        }}
      />
    );
  }
);
