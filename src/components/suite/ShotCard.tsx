"use client";
import { useRef, useCallback } from "react";
import { SuiteElement } from "@/hooks/useSuiteState";
import { useDraggable } from "@/hooks/useDraggable";

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
  boardRef: React.RefObject<HTMLDivElement | null>;
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
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 director-suite-card-header"
        style={{ borderLeft: "3px solid #c9a84c" }}>
        <input
          className="bg-transparent text-sm font-bold gold-accent outline-none border-none w-24"
          value={(d.shotNumber as string) || "Shot 01"}
          onChange={(e) => onUpdate(element.id, { shotNumber: e.target.value })}
          onMouseDown={(e) => e.stopPropagation()}
        />
        <button
          className="text-zinc-600 hover:text-red-500 transition-colors text-xs"
          onMouseDown={(e) => { e.stopPropagation(); onRemove(element.id); }}
        >✕</button>
      </div>

      {/* Fields */}
      <div className="p-3 space-y-2 overflow-y-auto suite-scrollbar" style={{ height: element.height - 44 }}
        onMouseDown={(e) => e.stopPropagation()}>

        {/* Shot Type */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-0.5">Shot Type</label>
          <select className="suite-select w-full text-xs"
            value={(d.shotType as string) || ""}
            onChange={(e) => onUpdate(element.id, { shotType: e.target.value })}>
            <option value="">Select...</option>
            {SHOT_TYPES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Camera Movement */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-0.5">Camera Movement</label>
          <select className="suite-select w-full text-xs"
            value={(d.cameraMovement as string) || ""}
            onChange={(e) => onUpdate(element.id, { cameraMovement: e.target.value })}>
            <option value="">Select...</option>
            {CAMERA_MOVEMENTS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {/* Lens */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-0.5">Lens</label>
          <input className="suite-input w-full text-xs"
            placeholder="e.g. 50mm"
            value={(d.lens as string) || ""}
            onChange={(e) => onUpdate(element.id, { lens: e.target.value })} />
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-0.5">Description</label>
          <textarea className="suite-input w-full text-xs resize-none suite-scrollbar"
            rows={3} placeholder="What happens in this shot..."
            value={(d.description as string) || ""}
            onChange={(e) => onUpdate(element.id, { description: e.target.value })} />
        </div>

        {/* Notes */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-0.5">Notes</label>
          <textarea className="suite-input w-full text-xs resize-none suite-scrollbar"
            rows={2} placeholder="Crew/director notes..."
            value={(d.notes as string) || ""}
            onChange={(e) => onUpdate(element.id, { notes: e.target.value })} />
        </div>

        {/* Image Attachment */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-0.5">Image</label>
          {d.imageBase64 ? (
            <div className="relative">
              <img src={d.imageBase64 as string} alt="Shot ref"
                className="w-full rounded" style={{ maxHeight: 120, objectFit: "contain" }} />
              <button className="absolute top-1 right-1 text-[10px] bg-black/70 text-white rounded px-1"
                onClick={() => onUpdate(element.id, { imageBase64: "" })}>✕</button>
            </div>
          ) : (
            <div
              className="border border-dashed border-zinc-700 rounded p-3 text-center text-zinc-600 text-[11px] cursor-pointer hover:border-[#c9a84c] transition-colors"
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
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={(e) => {
                e.preventDefault(); e.stopPropagation();
                const f = e.dataTransfer.files[0];
                if (f && f.type.startsWith("image/")) handleImageUpload(f);
              }}
            >
              📷 Click or drop image
            </div>
          )}
        </div>

        {/* Reference Link */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-zinc-500 block mb-0.5">Reference Link</label>
          <input className="suite-input w-full text-xs"
            placeholder="https://..."
            value={(d.refLink as string) || ""}
            onChange={(e) => onUpdate(element.id, { refLink: e.target.value })} />
          {typeof d.refLink === "string" && d.refLink && (
            <a href={d.refLink} target="_blank" rel="noopener noreferrer"
              className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold tracking-wide"
              style={{ backgroundColor: "#c9a84c", color: "#0d0d0d" }}>
              🔗 {(() => { try { return new URL(d.refLink).hostname; } catch { return "Link"; } })()}
            </a>
          )}
        </div>
      </div>

      {/* Resize handle */}
      <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
        style={{ borderRight: "2px solid #c9a84c", borderBottom: "2px solid #c9a84c" }}
        onMouseDown={startResize} />
    </div>
  );
}
