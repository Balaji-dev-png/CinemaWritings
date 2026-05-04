"use client";
import { useCallback, useRef } from "react";
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

export function LinkCard({
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
          Math.max(160, resizeRef.current.startW + (me.clientX - resizeRef.current.startX) / z),
          Math.max(80, resizeRef.current.startH + (me.clientY - resizeRef.current.startY) / z)
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

  const d = element.data;
  const url = (d.url as string) || "";

  let favicon = "";
  if (url) {
    try {
      const domain = new URL(url).hostname;
      favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;
    } catch { /* invalid URL */ }
  }

  return (
    <div
      className="absolute director-suite-card rounded-lg select-none"
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
      {/* Delete */}
      <button
        className="absolute top-2 right-2 text-zinc-600 hover:text-red-500 text-xs transition-colors"
        onMouseDown={(e) => { e.stopPropagation(); onRemove(element.id); }}
      >✕</button>

      <div className="p-3 space-y-2">
        {/* Label */}
        <input
          className="bg-transparent text-sm font-bold text-white outline-none border-none w-full"
          placeholder="Label..."
          value={(d.label as string) || ""}
          onChange={(e) => onUpdate(element.id, { label: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
        />

        {/* URL */}
        <input
          className="suite-input w-full text-xs"
          placeholder="https://..."
          value={url}
          onChange={(e) => onUpdate(element.id, { url: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
        />

        {/* Display link */}
        {url && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-medium hover:underline"
            style={{ color: "#c9a84c" }}
          >
            {favicon && (
              <img src={favicon} alt="" className="w-4 h-4" />
            )}
            {(() => { try { return new URL(url).hostname; } catch { return url; } })()}
            <span className="text-zinc-500">↗</span>
          </a>
        )}
      </div>

      {/* Resize handle */}
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        style={{ borderRight: "2px solid #c9a84c", borderBottom: "2px solid #c9a84c" }}
        onMouseDown={startResize} />
    </div>
  );
}
