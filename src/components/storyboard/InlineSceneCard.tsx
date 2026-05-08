"use client";
import { useCallback, useRef } from "react";
import { SceneCard, SHOT_TYPES, CAMERA_MOVEMENTS } from "@/lib/storyboard-api";
import { useDraggable } from "@/hooks/useDraggable";
import { GripHorizontal, Trash2, Camera } from "lucide-react";

interface Props {
  card: SceneCard;
  onUpdate: (id: string, patch: Partial<SceneCard>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onConnectClick?: (id: string) => void;
  connectMode?: boolean;
  isConnectSource?: boolean;
  getZoom: () => number;
  getPan: () => { x: number; y: number };
}

const ASPECT_RATIOS = [
  { value: "16:9", label: "16:9", css: "aspect-video" },
  { value: "2.39:1", label: "2.39:1", css: "aspect-[2.39/1]" },
  { value: "4:3", label: "4:3", css: "aspect-[4/3]" },
  { value: "1.85:1", label: "1.85:1", css: "aspect-[1.85/1]" },
];

export function InlineSceneCard({
  card,
  onUpdate,
  onRemove,
  onMove,
  onConnectClick,
  connectMode,
  isConnectSource,
  getZoom,
  getPan,
}: Props) {
  const { handleMouseDown } = useDraggable({
    onMove: useCallback((x: number, y: number) => onMove(card.id, x, y), [onMove, card.id]),
    getZoom,
    getPan,
  });

  const handleChange = (field: keyof SceneCard, value: string) => {
    onUpdate(card.id, { [field]: value });
  };

  const currentAspect = ASPECT_RATIOS.find((a) => a.value === card.aspect_ratio) || ASPECT_RATIOS[0];

  return (
    <div
      className={`absolute director-suite-card select-none overflow-hidden ${
        isConnectSource ? "suite-connect-source ring-2 ring-[#c9a84c]" : ""
      }`}
      style={{
        left: card.x || 0,
        top: card.y || 0,
        width: card.width || 320,
        zIndex: 10,
        cursor: connectMode ? "crosshair" : "default",
        background: "rgba(10,10,20,0.95)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
      }}
      onMouseDown={(e) => {
        if (connectMode) {
          e.stopPropagation();
          onConnectClick?.(card.id);
        }
      }}
    >
      {/* Header / Drag Handle */}
      <div
        className="director-suite-card-header flex items-center gap-2 px-3"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", minHeight: 40 }}
      >
        <div
          className="cursor-grab text-zinc-500 hover:text-zinc-300 transition-colors p-1"
          onMouseDown={(e) => {
            if (!connectMode) handleMouseDown(e, card.x || 0, card.y || 0);
          }}
        >
          <GripHorizontal className="w-4 h-4" />
        </div>
        <Camera className="w-3.5 h-3.5 shrink-0" style={{ color: "#c9a84c" }} />
        <input
          className="bg-transparent text-sm font-bold gold-accent outline-none border-none flex-1 min-w-0"
          value={card.shot_number || ""}
          onChange={(e) => handleChange("shot_number", e.target.value)}
          onMouseDown={(e) => e.stopPropagation()}
          placeholder="Shot Number"
        />
        <button
          className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-white/5 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(card.id);
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Image Preview Area */}
      <div className={`${currentAspect.css} w-full relative bg-black/50 overflow-hidden`}>
        {card.image_url ? (
          <img src={card.image_url} alt="Frame" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-[10px] text-zinc-600 font-medium">No Image</span>
          </div>
        )}
      </div>

      {/* Inline Editing Form */}
      <div className="p-3 space-y-2.5 text-xs">
        <div>
          <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
            Scene Heading
          </label>
          <input
            className="w-full bg-black/20 border border-white/5 rounded px-2 py-1 text-zinc-200 outline-none focus:border-[#c9a84c]/50 transition-colors"
            placeholder="INT. ROOM - DAY"
            value={card.scene_heading || ""}
            onChange={(e) => handleChange("scene_heading", e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
              Aspect Ratio
            </label>
            <select
              className="w-full bg-black/20 border border-white/5 rounded px-2 py-1 text-zinc-200 outline-none focus:border-[#c9a84c]/50 appearance-none"
              value={card.aspect_ratio || "16:9"}
              onChange={(e) => handleChange("aspect_ratio", e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {ASPECT_RATIOS.map((a) => (
                <option key={a.value} value={a.value} className="bg-zinc-900">
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
              Lens
            </label>
            <input
              className="w-full bg-black/20 border border-white/5 rounded px-2 py-1 text-zinc-200 outline-none focus:border-[#c9a84c]/50"
              placeholder="50mm"
              value={card.lens || ""}
              onChange={(e) => handleChange("lens", e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>

        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
              Shot Type
            </label>
            <select
              className="w-full bg-black/20 border border-white/5 rounded px-2 py-1 text-zinc-200 outline-none focus:border-[#c9a84c]/50 appearance-none"
              value={card.shot_type || "MS"}
              onChange={(e) => handleChange("shot_type", e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {Object.entries(SHOT_TYPES).map(([k, v]) => (
                <option key={k} value={k} className="bg-zinc-900">
                  {k} - {v}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
              Movement
            </label>
            <select
              className="w-full bg-black/20 border border-white/5 rounded px-2 py-1 text-zinc-200 outline-none focus:border-[#c9a84c]/50 appearance-none"
              value={card.camera_movement || "static"}
              onChange={(e) => handleChange("camera_movement", e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {Object.entries(CAMERA_MOVEMENTS).map(([k, v]) => (
                <option key={k} value={k} className="bg-zinc-900">
                  {v}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div>
          <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
            Image URL
          </label>
          <input
            className="w-full bg-black/20 border border-white/5 rounded px-2 py-1 text-zinc-200 outline-none focus:border-[#c9a84c]/50 transition-colors"
            placeholder="https://..."
            value={card.image_url || ""}
            onChange={(e) => handleChange("image_url", e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>

        <div>
          <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
            Technical Notes
          </label>
          <textarea
            className="w-full bg-black/20 border border-white/5 rounded px-2 py-1 text-zinc-200 outline-none focus:border-[#c9a84c]/50 resize-none min-h-[40px] suite-scrollbar"
            placeholder="Lighting, crew notes..."
            value={card.technical_notes || ""}
            onChange={(e) => handleChange("technical_notes", e.target.value)}
            onMouseDown={(e) => e.stopPropagation()}
          />
        </div>
      </div>
    </div>
  );
}
