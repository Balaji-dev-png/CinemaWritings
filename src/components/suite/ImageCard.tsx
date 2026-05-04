"use client";
import { useRef, useCallback } from "react";
import { SuiteElement } from "@/hooks/useSuiteState";
import { useDraggable } from "@/hooks/useDraggable";

interface Props {
  element: SuiteElement;
  boardRef: React.RefObject<HTMLDivElement | null>;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number) => void;
  onUpdate: (id: string, data: Record<string, unknown>) => void;
  onRemove: (id: string) => void;
  onConnectClick?: (id: string) => void;
  connectMode?: boolean;
  isConnectSource?: boolean;
  getZoom?: () => number;
}

export function ImageCard({
  element, boardRef, onMove, onResize, onUpdate, onRemove,
  onConnectClick, connectMode, isConnectSource, getZoom,
}: Props) {
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });

  const { handleMouseDown } = useDraggable({
    boardRef,
    onMove: useCallback((x: number, y: number) => onMove(element.id, x, y), [onMove, element.id]),
    getZoom,
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
      className="absolute director-suite-card rounded-lg select-none overflow-hidden"
      style={{
        left: element.x, top: element.y,
        width: element.width, height: element.height,
        zIndex: 10,
        cursor: connectMode ? "crosshair" : "grab",
        boxShadow: isConnectSource ? "0 0 0 3px #c9a84c, 0 0 20px rgba(201,168,76,0.5)" : "none",
      }}
      onMouseDown={(e) => {
        if (connectMode) { e.stopPropagation(); onConnectClick?.(element.id); return; }
        handleMouseDown(e, element.x, element.y);
      }}
    >
      {/* Delete button */}
      <button
        className="absolute top-2 right-2 text-zinc-600 hover:text-red-500 text-xs z-20 transition-colors"
        onMouseDown={(e) => { e.stopPropagation(); onRemove(element.id); }}
      >✕</button>

      {/* Image area */}
      {src ? (
        <img src={src} alt="Reference"
          className="w-full object-contain bg-black/30"
          style={{ height: element.height - 40 }} />
      ) : (
        <div className="flex flex-col items-center justify-center gap-2"
          style={{ height: element.height - 40 }}>
          {/* URL input */}
          <input
            className="suite-input text-xs w-[80%]"
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

      {/* Caption */}
      <div className="px-3 py-1.5" onMouseDown={(e) => e.stopPropagation()}>
        <input
          className="bg-transparent text-xs text-zinc-400 outline-none border-none w-full"
          placeholder="Caption..."
          value={(d.caption as string) || ""}
          onChange={(e) => onUpdate(element.id, { caption: e.target.value })}
        />
      </div>

      {/* Resize handle */}
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        style={{ borderRight: "2px solid #c9a84c", borderBottom: "2px solid #c9a84c" }}
        onMouseDown={startResize} />
    </div>
  );
}
