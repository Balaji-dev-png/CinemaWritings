"use client";
import { useCallback, useRef } from "react";
import { SuiteElement } from "@/hooks/useSuiteState";
import { useDraggable } from "@/hooks/useDraggable";
import { Link as LinkIcon, ExternalLink, Trash2 } from "lucide-react";

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

export function LinkCard({ element, onMove, onResize, onUpdate, onRemove, onConnectClick, connectMode, isConnectSource, getZoom, getPan }: Props) {
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });

  const { handleMouseDown } = useDraggable({
    onMove: useCallback((x: number, y: number) => onMove(element.id, x, y), [onMove, element.id]),
    getZoom, getPan,
  });

  const startResize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: element.width, startH: element.height };
    const z = getZoom?.() ?? 1;
    const mv = (me: MouseEvent) => onResize(element.id, Math.max(160, resizeRef.current.startW + (me.clientX - resizeRef.current.startX) / z), Math.max(180, resizeRef.current.startH + (me.clientY - resizeRef.current.startY) / z));
    const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
  }, [element.id, element.width, element.height, onResize, getZoom]);

  const d = element.data;
  const url = (d.url as string) || "";
  let favicon = "";
  let hostname = "";
  if (url) {
    try {
      const parsed = new URL(url);
      hostname = parsed.hostname;
      favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=16`;
    } catch { /* invalid URL */ }
  }

  return (
    <div
      className={`absolute director-suite-card select-none overflow-hidden ${isConnectSource ? "suite-connect-source" : ""}`}
      style={{ left: element.x, top: element.y, width: element.width, height: element.height, zIndex: 10, cursor: connectMode ? "crosshair" : "default" }}
      onMouseDown={(e) => { if (connectMode) { e.stopPropagation(); onConnectClick?.(element.id); return; } handleMouseDown(e, element.x, element.y); }}
    >
      {/* Header */}
      <div className="director-suite-card-header flex items-center gap-2 px-3">
        <LinkIcon className="w-3.5 h-3.5 shrink-0" style={{ color: "#c9a84c" }} />
        <span className="text-xs font-bold gold-accent tracking-wider">LINK</span>
        <button className="suite-delete-btn ml-auto shrink-0" onMouseDown={(e) => { e.stopPropagation(); onRemove(element.id); }} title="Delete">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Body */}
      <div className="p-3 space-y-2" onMouseDown={(e) => e.stopPropagation()}>
        {/* Label */}
        <div>
          <label className="suite-label">Label</label>
          <input
            className="bg-transparent text-sm font-semibold text-zinc-100 outline-none border-none w-full"
            placeholder="Link title..."
            value={(d.label as string) || ""}
            onChange={(e) => onUpdate(element.id, { label: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>

        {/* URL */}
        <div>
          <label className="suite-label">URL</label>
          <input
            className="suite-input w-full"
            placeholder="https://..."
            value={url}
            onChange={(e) => onUpdate(element.id, { url: e.target.value })}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>

        {/* Preview chip */}
        {url && hostname && (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 mt-1 px-2.5 py-2 rounded-xl transition-colors"
            style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.2)" }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {favicon && <img src={favicon} alt="" className="w-4 h-4 rounded-sm shrink-0" />}
            <span className="text-xs font-medium gold-accent flex-1 min-w-0 truncate">{hostname}</span>
            <ExternalLink className="w-3 h-3 shrink-0" style={{ color: "rgba(201,168,76,0.6)" }} />
          </a>
        )}
      </div>

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
