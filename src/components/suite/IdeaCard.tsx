"use client";
import { useRef, useCallback } from "react";
import { SuiteElement } from "@/hooks/useSuiteState";
import { useDraggable } from "@/hooks/useDraggable";

const BG_COLORS = [
  "#1a1a1a", "#1a2a1a", "#1a1a2a",
  "#2a1a1a", "#2a2a1a", "#1a2a2a",
];

interface Props {
  element: SuiteElement;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
  onConnectClick?: (id: string) => void;
  connectMode?: boolean;
  isConnectSource?: boolean;
  getZoom: () => number;
  getPan: () => { x: number; y: number };
}

export function IdeaCard({
  element, onMove, onResize, onUpdate, onRemove,
  onConnectClick, connectMode, isConnectSource, getZoom, getPan,
}: Props) {
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });
  const bg = (element.data.bgColor as string) || BG_COLORS[0];

  const { handleMouseDown } = useDraggable({
    onMove: useCallback((x: number, y: number) => onMove(element.id, x, y), [onMove, element.id]),
    getZoom,
    getPan,
  });

  const startResize = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startW: element.width,
        startH: element.height,
      };
      const z = getZoom?.() ?? 1;
      const handleMove = (me: MouseEvent) => {
        const dw = (me.clientX - resizeRef.current.startX) / z;
        const dh = (me.clientY - resizeRef.current.startY) / z;
        onResize(
          element.id,
          Math.max(160, resizeRef.current.startW + dw),
          Math.max(120, resizeRef.current.startH + dh)
        );
      };
      const handleUp = () => {
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [element.id, element.width, element.height, onResize, getZoom]
  );

  return (
    <div
      className="absolute director-suite-card rounded-lg select-none"
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        backgroundColor: bg,
        zIndex: 10,
        cursor: connectMode ? "crosshair" : "grab",
        boxShadow: isConnectSource ? "0 0 0 3px #c9a84c, 0 0 20px rgba(201,168,76,0.5)" : "none",
      }}
      onMouseDown={(e) => {
        if (connectMode) {
          e.stopPropagation();
          onConnectClick?.(element.id);
          return;
        }
        handleMouseDown(e, element.x, element.y);
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 director-suite-card-header">
        <input
          className="bg-transparent text-sm font-bold gold-accent outline-none border-none w-full"
          style={{ fontFamily: "inherit" }}
          value={(element.data.title as string) || ""}
          placeholder="Idea"
          onChange={(e) => onUpdate(element.id, { title: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
        />
        <button
          className="ml-2 text-zinc-600 hover:text-red-500 transition-colors text-xs shrink-0"
          onMouseDown={(e) => { e.stopPropagation(); onRemove(element.id); }}
          title="Delete"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <textarea
        className="w-full flex-1 bg-transparent text-zinc-300 text-xs resize-none outline-none p-3 suite-scrollbar"
        style={{ height: element.height - 72 }}
        value={(element.data.content as string) || ""}
        placeholder="Start writing..."
        onChange={(e) => onUpdate(element.id, { content: e.target.value })}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {/* Color picker */}
      <div className="flex items-center gap-1 px-3 pb-2">
        {BG_COLORS.map((c) => (
          <button
            key={c}
            className="w-4 h-4 rounded-full border transition-transform hover:scale-125"
            style={{
              backgroundColor: c,
              borderColor: bg === c ? "#c9a84c" : "#333",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              onUpdate(element.id, { bgColor: c });
            }}
          />
        ))}
      </div>

      {/* Resize handle */}
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        style={{ borderRight: "2px solid #c9a84c", borderBottom: "2px solid #c9a84c" }}
        onMouseDown={startResize}
      />
    </div>
  );
}
