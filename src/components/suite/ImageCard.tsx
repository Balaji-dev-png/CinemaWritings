"use client";
import { useRef, useCallback } from "react";
import { SuiteElement } from "@/hooks/useSuiteState";
import { useDraggable } from "@/hooks/useDraggable";
import { ImageIcon, Trash2, Upload } from "lucide-react";

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

export function ImageCard({ element, onMove, onResize, onUpdate, onRemove, onConnectClick, connectMode, isConnectSource, getZoom, getPan, isSelected, onSelect }: Props) {
  const resizeRef = useRef({ startX: 0, startY: 0, startW: 0, startH: 0 });

  const { handleMouseDown } = useDraggable({
    onMove: useCallback((x: number, y: number) => onMove(element.id, x, y), [onMove, element.id]),
    getZoom, getPan,
  });

  const startResize = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); e.preventDefault();
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startW: element.width, startH: element.height };
    const z = getZoom?.() ?? 1;
    const mv = (me: MouseEvent) => onResize(element.id, Math.max(120, resizeRef.current.startW + (me.clientX - resizeRef.current.startX) / z), Math.max(100, resizeRef.current.startH + (me.clientY - resizeRef.current.startY) / z));
    const up = () => { window.removeEventListener("mousemove", mv); window.removeEventListener("mouseup", up); };
    window.addEventListener("mousemove", mv); window.addEventListener("mouseup", up);
  }, [element.id, element.width, element.height, onResize, getZoom]);

  const handleFileUpload = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => onUpdate(element.id, { src: reader.result as string });
    reader.readAsDataURL(file);
  }, [element.id, onUpdate]);

  const d = element.data;
  const src = (d.src as string) || "";

  return (
    <div
      data-element-id={element.id}
      className={`absolute director-suite-card select-none overflow-hidden flex flex-col group ${isConnectSource ? "suite-connect-source" : ""} ${isSelected ? "ring-2 ring-[#c9a84c] shadow-lg shadow-[#c9a84c]/20" : ""}`}
      style={{ left: element.x, top: element.y, width: element.width, height: element.height, zIndex: 10, cursor: connectMode ? "crosshair" : "grab" }}
      onMouseDown={(e) => { 
        if (connectMode) { e.stopPropagation(); onConnectClick?.(element.id); return; } 
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
      <div className="director-suite-card-header flex items-center gap-2 px-3 shrink-0" style={{ borderLeft: "3px solid #c9a84c" }}>
        <ImageIcon className="w-3.5 h-3.5 shrink-0" style={{ color: "#c9a84c" }} />
        <span className="text-xs font-bold gold-accent tracking-wider">IMAGE</span>
        <button className="suite-delete-btn ml-auto shrink-0" onMouseDown={(e) => { e.stopPropagation(); onRemove(element.id); }} title="Delete">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>

      {/* Image / Upload area */}
      <div className="flex-1 overflow-hidden relative" onMouseDown={(e) => e.stopPropagation()}>
        {src ? (
          <>
            <img src={src} alt="Reference" className="w-full h-full object-cover" style={{ backgroundColor: "#0a0a12" }} />
            <button className="absolute top-2 right-2 suite-delete-btn opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }} onClick={() => onUpdate(element.id, { src: "" })}>
              <Trash2 className="w-3 h-3" />
            </button>
          </>
        ) : (
          <div className="w-full h-full suite-drop-zone flex flex-col items-center justify-center gap-3 rounded-none border-0"
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add("drag-over"); }}
            onDragLeave={(e) => e.currentTarget.classList.remove("drag-over")}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove("drag-over"); const f = e.dataTransfer.files[0]; if (f?.type.startsWith("image/")) handleFileUpload(f); }}
          >
            <input className="suite-input text-xs" style={{ width: "80%" }} placeholder="Paste image URL & press Enter..." onMouseDown={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === "Enter") { const val = (e.target as HTMLInputElement).value.trim(); if (val) onUpdate(element.id, { src: val }); } }} />
            <span className="text-zinc-600 text-[10px]">— or —</span>
            <button className="gold-bg px-3 py-1.5 text-[11px] rounded-lg flex items-center gap-1.5"
              onClick={() => { const i = document.createElement("input"); i.type = "file"; i.accept = "image/*"; i.onchange = (ev) => { const f = (ev.target as HTMLInputElement).files?.[0]; if (f) handleFileUpload(f); }; i.click(); }}>
              <Upload className="w-3 h-3" /> Upload Image
            </button>
          </div>
        )}
      </div>

      {/* Caption */}
      <div className="director-suite-card-header px-3 py-1.5 shrink-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", borderBottom: "none" }} onMouseDown={(e) => e.stopPropagation()}>
        <input className="bg-transparent text-xs outline-none border-none w-full" style={{ color: "rgba(148,163,184,0.6)" }}
          placeholder="Add a caption..." value={(d.caption as string) || ""} onChange={(e) => onUpdate(element.id, { caption: e.target.value })} />
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
