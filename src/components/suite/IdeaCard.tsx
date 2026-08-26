"use client";
import { useRef, useCallback } from "react";
import { SuiteElement } from "@/hooks/useSuiteState";
import { useDraggable } from "@/hooks/useDraggable";
import { Lightbulb, Trash2 } from "lucide-react";

const BG_OPTIONS = [
  { color: "#12121e", label: "Midnight" },
  { color: "#0f1e12", label: "Forest" },
  { color: "#0f0f1e", label: "Indigo" },
  { color: "#1e0f12", label: "Crimson" },
  { color: "#1e1a0f", label: "Amber" },
  { color: "#0f1a1e", label: "Teal" },
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
  isSelected?: boolean;
  onSelect?: (multi: boolean) => void;
}

export function IdeaCard({
  element, onMove, onResize, onUpdate, onRemove,
  onConnectClick, connectMode, isConnectSource, getZoom, getPan,
  isSelected, onSelect,
}: Props) {
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });
  const bg = (element.data.bgColor as string) || BG_OPTIONS[0].color;

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
        onResize(
          element.id,
          Math.max(160, resizeRef.current.startW + (me.clientX - resizeRef.current.startX) / z),
          Math.max(120, resizeRef.current.startH + (me.clientY - resizeRef.current.startY) / z)
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
      data-element-id={element.id}
      className={`absolute director-suite-card select-none flex flex-col overflow-hidden ${isConnectSource ? "suite-connect-source" : ""} ${isSelected ? "ring-2 ring-[#c9a84c] shadow-lg shadow-[#c9a84c]/20" : ""}`}
      style={{
        left: element.x,
        top: element.y,
        width: element.width,
        height: element.height,
        background: bg,
        zIndex: 10,
        cursor: connectMode ? "crosshair" : "grab",
      }}
      onMouseDown={(e) => {
        if (connectMode) {
          e.stopPropagation();
          onConnectClick?.(element.id);
          return;
        }
        if (!isSelected) {
          onSelect?.(e.shiftKey || e.metaKey || e.ctrlKey);
        }
        handleMouseDown(e, element.x, element.y);
      }}
      onClick={(e) => {
        if (!connectMode && !e.defaultPrevented) {
          onSelect?.(e.shiftKey || e.metaKey || e.ctrlKey);
        }
      }}
    >
      {/* Header */}
      <div className="director-suite-card-header flex items-center gap-2 px-3 shrink-0">
        <Lightbulb className="w-3.5 h-3.5 shrink-0" style={{ color: "#c9a84c" }} />
        <input
          className="bg-transparent text-sm font-bold gold-accent outline-none border-none flex-1 min-w-0"
          value={(element.data.title as string) || ""}
          placeholder="Idea title..."
          onChange={(e) => onUpdate(element.id, { title: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
        />
        <button
          className="suite-delete-btn ml-auto shrink-0"
          onMouseDown={(e) => { e.stopPropagation(); onRemove(element.id); }}
          title="Delete"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Body */}
      <textarea
        className="flex-1 bg-transparent text-zinc-300 text-xs resize-none outline-none px-3 py-2.5 suite-scrollbar leading-relaxed"
        value={(element.data.content as string) || ""}
        placeholder="Write your idea here..."
        onChange={(e) => onUpdate(element.id, { content: e.target.value })}
        onMouseDown={(e) => e.stopPropagation()}
      />

      {/* Footer — color picker */}
      <div
        className="flex items-center gap-1.5 px-3 py-2 shrink-0"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <span className="suite-label mr-1" style={{ marginBottom: 0 }}>Tone</span>
        {BG_OPTIONS.map((opt) => (
          <button
            key={opt.color}
            className={`suite-color-swatch ${bg === opt.color ? "active" : ""}`}
            style={{ backgroundColor: opt.color, border: `2px solid ${bg === opt.color ? "#c9a84c" : "rgba(255,255,255,0.15)"}` }}
            title={opt.label}
            onMouseDown={(e) => {
              e.stopPropagation();
              onUpdate(element.id, { bgColor: opt.color });
            }}
          />
        ))}
      </div>

      {/* Resize handle */}
      <div className="suite-resize-handle" onMouseDown={startResize} />

      {/* Connect Mode Overlay */}
      {connectMode && (
        <div 
          className="absolute inset-0 z-50 cursor-crosshair" 
          onMouseDown={(e) => { e.stopPropagation(); onConnectClick?.(element.id); }} 
        />
      )}
    </div>
  );
}
