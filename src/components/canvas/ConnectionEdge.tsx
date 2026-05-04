"use client";
import {
  EdgeConnection,
  CanvasElement,
  ViewportState,
} from "@/lib/canvasTypes";
import { useMemo } from "react";

interface EdgeProps {
  edge: EdgeConnection;
  elements: CanvasElement[];
  viewport: ViewportState;
  isSelected: boolean;
  onSelect: (id: string, additive: boolean) => void;
  onRemove: (id: string) => void;
}

export function ConnectionEdge({
  edge,
  elements,
  viewport,
  isSelected,
  onSelect,
  onRemove,
}: EdgeProps) {
  const source = elements.find((e) => e.id === edge.sourceId);
  const target = elements.find((e) => e.id === edge.targetId);

  if (!source || !target) return null;

  // Calculate center points in canvas local coordinates
  const ssx = source.x + (source.width || 200) / 2;
  const ssy = source.y + (source.height || 100) / 2;
  const ttx = target.x + (target.width || 200) / 2;
  const tty = target.y + (target.height || 100) / 2;

  // Smooth Apple-style bezier path
  const path = useMemo(() => {
    const dx = ttx - ssx;
    const dy = tty - ssy;

    // Calculate control points for a smooth flow
    const curvature = 0.4;
    const cx1 = ssx + dx * curvature;
    const cy1 = ssy;
    const cx2 = ttx - dx * curvature;
    const cy2 = tty;

    return `M ${ssx} ${ssy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${ttx} ${tty}`;
  }, [ssx, ssy, ttx, tty]);

  return (
    <g
      className="group/edge cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onSelect(edge.id, e.shiftKey);
      }}
    >
      {/* Invisible hit area for better ergonomics */}
      <path
        d={path}
        fill="none"
        stroke="transparent"
        strokeWidth={30}
        className="pointer-events-auto"
      />

      {/* Glow effect when selected */}
      {isSelected && (
        <path
          d={path}
          fill="none"
          stroke="#3b82f6"
          strokeWidth={6}
          strokeOpacity={0.2}
          className="blur-sm"
        />
      )}

      {/* Visual path */}
      <path
        d={path}
        fill="none"
        stroke={isSelected ? "#3b82f6" : "#3b82f6"}
        strokeWidth={isSelected ? 3 : 2}
        strokeOpacity={isSelected ? 1 : 0.4}
        strokeDasharray={
          edge.style === "dashed"
            ? "8 4"
            : edge.style === "dotted"
              ? "2 4"
              : "none"
        }
        className="transition-all duration-300 ease-in-out"
        style={{
          filter: isSelected
            ? "drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))"
            : "none",
        }}
      />

      {/* Connection dots at ends */}
      <circle cx={ssx} cy={ssy} r={3} fill="#3b82f6" />
      <circle cx={ttx} cy={tty} r={3} fill="#3b82f6" />

      {/* Label background and text if label exists */}
      {edge.label && (
        <g transform={`translate(${(ssx + ttx) / 2}, ${(ssy + tty) / 2})`}>
          <rect
            x="-40"
            y="-10"
            width="80"
            height="20"
            rx="10"
            fill="#1a1a2e"
            stroke="#334155"
            strokeWidth="1"
          />
          <text
            textAnchor="middle"
            dy="5"
            className="fill-zinc-400 font-bold uppercase tracking-widest pointer-events-none"
            style={{ fontSize: 8 }}
          >
            {edge.label}
          </text>
        </g>
      )}

      {/* Selection handle for deletion */}
      {isSelected && (
        <circle
          cx={ttx}
          cy={tty}
          r={4}
          fill="#3b82f6"
          className="animate-pulse"
        />
      )}
    </g>
  );
}
