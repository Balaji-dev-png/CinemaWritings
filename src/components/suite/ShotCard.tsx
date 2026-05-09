"use client";
import { useRef, useCallback } from "react";
import { SuiteElement } from "@/hooks/useSuiteState";
import { useDraggable } from "@/hooks/useDraggable";
import { GripHorizontal, Camera, Trash2 } from "lucide-react";

const SHOT_TYPES = [
  "Extreme Wide Shot (EWS)",
  "Wide Shot (WS)",
  "Full Shot (FS)",
  "Medium Wide Shot / Cowboy (MWS)",
  "Medium Shot (MS)",
  "Medium Close-Up (MCU)",
  "Close-Up (CU)",
  "Extreme Close-Up (ECU)",
  "Insert Shot",
  "Over-the-Shoulder (OTS)",
  "Point of View (POV)",
  "Two Shot",
  "Dutch Angle / Canted",
  "Bird's Eye / Top Down",
  "Worm's Eye",
  "Crane Shot",
  "Dolly / Tracking Shot",
  "Steadicam Shot",
  "Handheld Shot",
  "Whip Pan",
  "Rack Focus",
  "Arc Shot",
  "Aerial Shot",
  "Split Screen",
  "Freeze Frame",
];

const CAMERA_MOVEMENTS = [
  "Static",
  "Pan Left",
  "Pan Right",
  "Tilt Up",
  "Tilt Down",
  "Dolly In",
  "Dolly Out",
  "Arc Left",
  "Arc Right",
  "Crane Up",
  "Crane Down",
  "Handheld",
  "Zoom In",
  "Zoom Out",
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

export function ShotCard({
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
          Math.max(240, resizeRef.current.startW + (me.clientX - resizeRef.current.startX) / z),
          Math.max(300, resizeRef.current.startH + (me.clientY - resizeRef.current.startY) / z)
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

  const handleImageUpload = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        onUpdate(element.id, { imageBase64: reader.result as string });
      };
      reader.readAsDataURL(file);
    },
    [element.id, onUpdate]
  );

  const d = element.data;

  return (
    <div
      className={`absolute director-suite-card select-none overflow-hidden ${isConnectSource ? "suite-connect-source" : ""}`}
      style={{
        left: element.x, top: element.y,
        width: element.width, height: element.height,
        zIndex: 10,
        cursor: connectMode ? "crosshair" : "grab",
      }}
      onMouseDown={(e) => {
        if (connectMode) { e.stopPropagation(); onConnectClick?.(element.id); return; }
        handleMouseDown(e, element.x, element.y);
      }}
    >
      {/* Header */}
      <div
        className="director-suite-card-header flex items-center gap-2 px-3"
        style={{ borderLeft: "3px solid #c9a84c", minHeight: 40 }}
      >
        {connectMode && (
          <div
            className="cursor-grab text-zinc-500 hover:text-zinc-300 transition-colors"
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, element.x, element.y); }}
          >
            <GripHorizontal className="w-3.5 h-3.5" />
          </div>
        )}
        <Camera className="w-3.5 h-3.5 shrink-0" style={{ color: "#c9a84c" }} />
        <input
          className="bg-transparent text-sm font-bold gold-accent outline-none border-none flex-1 min-w-0"
          value={(d.shotNumber as string) || "Shot 01"}
          onChange={(e) => onUpdate(element.id, { shotNumber: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Shot 01"
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
      <div
        className="p-3 space-y-2.5 overflow-y-auto suite-scrollbar"
        style={{ height: element.height - 40 }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Shot Type */}
        <div>
          <label className="suite-label">Shot Type</label>
          <select className="suite-select w-full"
            value={(d.shotType as string) || ""}
            onChange={(e) => onUpdate(element.id, { shotType: e.target.value })}>
            <option value="">Select...</option>
            {SHOT_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Camera Movement */}
        <div>
          <label className="suite-label">Camera Movement</label>
          <select className="suite-select w-full"
            value={(d.cameraMovement as string) || ""}
            onChange={(e) => onUpdate(element.id, { cameraMovement: e.target.value })}>
            <option value="">Select...</option>
            {CAMERA_MOVEMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Lens */}
        <div>
          <label className="suite-label">Lens / Focal Length</label>
          <input className="suite-input w-full"
            placeholder="e.g. 50mm, 85mm"
            value={(d.lens as string) || ""}
            onChange={(e) => onUpdate(element.id, { lens: e.target.value })} />
        </div>

        {/* Description */}
        <div>
          <label className="suite-label">Description</label>
          <textarea className="suite-input suite-scrollbar w-full"
            rows={3} placeholder="What happens in this shot..."
            value={(d.description as string) || ""}
            onChange={(e) => onUpdate(element.id, { description: e.target.value })} />
        </div>

        {/* Notes */}
        <div>
          <label className="suite-label">Director Notes</label>
          <textarea className="suite-input suite-scrollbar w-full"
            rows={2} placeholder="Crew / director notes..."
            value={(d.notes as string) || ""}
            onChange={(e) => onUpdate(element.id, { notes: e.target.value })} />
        </div>

        {/* Image Attachment */}
        <div>
          <label className="suite-label">Frame Reference</label>
          {d.imageBase64 ? (
            <div className="relative rounded-lg overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
              <img src={d.imageBase64 as string} alt="Shot ref"
                className="w-full rounded-lg" style={{ maxHeight: 120, objectFit: "cover" }} />
              <button
                className="absolute top-1.5 right-1.5 suite-delete-btn"
                style={{ background: "rgba(0,0,0,0.7)" }}
                onClick={() => onUpdate(element.id, { imageBase64: "" })}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div
              className="suite-drop-zone flex flex-col items-center justify-center gap-1 py-4 text-center"
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = (ev) => {
                  const f = (ev.target as HTMLInputElement).files?.[0];
                  if (f) handleImageUpload(f);
                };
                input.click();
              }}
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add("drag-over"); }}
              onDragLeave={(e) => { e.currentTarget.classList.remove("drag-over"); }}
              onDrop={(e) => {
                e.preventDefault(); e.stopPropagation();
                e.currentTarget.classList.remove("drag-over");
                const f = e.dataTransfer.files[0];
                if (f && f.type.startsWith("image/")) handleImageUpload(f);
              }}
            >
              <span style={{ fontSize: 20 }}>🎞️</span>
              <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.5)" }}>Click or drop frame reference</span>
            </div>
          )}
        </div>

        {/* Reference Link */}
        <div>
          <label className="suite-label">Reference Link</label>
          <input className="suite-input w-full"
            placeholder="https://..."
            value={(d.refLink as string) || ""}
            onChange={(e) => onUpdate(element.id, { refLink: e.target.value })} />
          {typeof d.refLink === "string" && d.refLink && (
            <a href={d.refLink} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-1.5 px-2 py-1 rounded-md text-[10px] font-bold gold-bg"
              onMouseDown={(e) => e.stopPropagation()}>
              🔗 {(() => { try { return new URL(d.refLink).hostname; } catch { return "Open Link"; } })()}
            </a>
          )}
        </div>
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
