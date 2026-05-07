"use client";
import { useRef, useCallback } from "react";
import { SuiteElement } from "@/hooks/useSuiteState";
import { useDraggable } from "@/hooks/useDraggable";
import { GripHorizontal } from "lucide-react";

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

export function ImageCard({
  element, onMove, onResize, onUpdate, onRemove,
  onConnectClick, connectMode, isConnectSource, getZoom, getPan,
}: Props) {
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });

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
        startX: e.clientX, startY: e.clientY,
        startW: element.width, startH: element.height,
      };
      const z = getZoom?.() ?? 1;
      const handleMv = (me: MouseEvent) => {
        onResize(element.id,
          Math.max(120, resizeRef.current.startW + (me.clientX - resizeRef.current.startX) / z),
          Math.max(100, resizeRef.current.startH + (me.clientY - resizeRef.current.startY) / z)
        );
      };
      const handleUp = () => {
        window.removeEventListener("mousemove", handleMv);
        window.removeEventListener("mouseup", handleUp);
      };
      window.addEventListener("mousemove", handleMv);
      window.addEventListener("mouseup", handleUp);
    },
    [element.id, element.width, element.height, onResize, getZoom]
  );

  const handleFileUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        onUpdate(element.id, { src: reader.result as string });
      };
      reader.readAsDataURL(file);
    },
    [element.id, onUpdate]
  );

  const d = element.data;
  const src = (d.src as string) || "";

  return (
    <div
      className="absolute director-suite-card rounded-lg select-none overflow-hidden group"
      style={{
        left: element.x, top: element.y,
        width: element.width, height: element.height,
        zIndex: 10,
        cursor: connectMode ? "crosshair" : "grab",
        boxShadow: isConnectSource ? "0 0 0 3px #c9a84c, 0 0 20px rgba(201,168,76,0.5)" : "0 8px 24px rgba(0,0,0,0.8)",
        display: "flex",
        flexDirection: "column",
      }}
      onMouseDown={(e) => {
        if (connectMode) { e.stopPropagation(); onConnectClick?.(element.id); return; }
        handleMouseDown(e, element.x, element.y);
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0 director-suite-card-header"
        style={{ borderLeft: "3px solid #c9a84c" }}
      >
        <div className="flex items-center gap-2">
          {connectMode && (
            <div
              className="cursor-grab text-zinc-500 hover:text-white"
              onMouseDown={(e) => {
                e.stopPropagation();
                handleMouseDown(e, element.x, element.y);
              }}
            >
              <GripHorizontal className="w-4 h-4" />
            </div>
          )}
          <span className="text-xs font-bold gold-accent">IMAGE</span>
        </div>
        <button
          className="text-zinc-600 hover:text-red-500 text-xs transition-colors"
          onMouseDown={(e) => { e.stopPropagation(); onRemove(element.id); }}
        >✕</button>
      </div>

      {/* Image / upload area — fills remaining space */}
      <div className="flex-1 overflow-hidden relative" onMouseDown={(e) => e.stopPropagation()}>
        {src ? (
          <img
            src={src}
            alt="Reference"
            className="w-full h-full object-contain"
            style={{ backgroundColor: "#0d0d0d" }}
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-3"
            style={{ backgroundColor: "#111" }}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => {
              e.preventDefault(); e.stopPropagation();
              const f = e.dataTransfer.files[0];
              if (f && f.type.startsWith("image/")) handleFileUpload(f);
            }}
          >
            <input
              className="suite-input text-xs"
              style={{ width: "80%" }}
              placeholder="Paste image URL..."
              onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  const val = (e.target as HTMLInputElement).value.trim();
                  if (val) onUpdate(element.id, { src: val });
                }
              }}
            />
            <span className="text-zinc-600 text-[10px]">or</span>
            <button
              className="px-3 py-1.5 text-[11px] rounded gold-bg font-bold"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = (ev) => {
                  const f = (ev.target as HTMLInputElement).files?.[0];
                  if (f) handleFileUpload(f);
                };
                input.click();
              }}
            >
              📁 Upload Image
            </button>
          </div>
        )}
      </div>

      {/* Caption */}
      <div className="px-3 py-1.5 shrink-0 director-suite-card-header" onMouseDown={(e) => e.stopPropagation()}>
        <input
          className="bg-transparent text-xs text-zinc-400 outline-none border-none w-full"
          placeholder="Caption..."
          value={(d.caption as string) || ""}
          onChange={(e) => onUpdate(element.id, { caption: e.target.value })}
        />
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
