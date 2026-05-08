"use client";
import { useCallback, useRef, useState } from "react";
import { SceneCard, SHOT_TYPES, CAMERA_MOVEMENTS } from "@/lib/storyboard-api";
import { useDraggable } from "@/hooks/useDraggable";
import { GripHorizontal, Trash2, Camera } from "lucide-react";

interface Props {
  card: SceneCard;
  onUpdate: (patch: Partial<SceneCard>) => void;
  onRemove: (id: string) => void;
  onMove: (x: number, y: number) => void;
  onConnectClick?: (id: string) => void;
  connectMode?: boolean;
  isConnectSource?: boolean;
  isSelected?: boolean;
  onSelect?: (multi: boolean) => void;
  getZoom: () => number;
  getPan: () => { x: number; y: number };
}

const ASPECT_RATIOS = [
  { value: "2.76:1", label: "2.76:1 (Ultra Panavision 70)", css: "aspect-[2.76/1]" },
  { value: "2.59:1", label: "2.59:1 (Cinerama)", css: "aspect-[2.59/1]" },
  { value: "2.55:1", label: "2.55:1 (Early CinemaScope)", css: "aspect-[2.55/1]" },
  { value: "2.39:1", label: "2.39:1 (Modern Anamorphic)", css: "aspect-[2.39/1]" },
  { value: "2.35:1", label: "2.35:1 (Classic Anamorphic)", css: "aspect-[2.35/1]" },
  { value: "2.20:1", label: "2.20:1 (Standard 70mm)", css: "aspect-[2.20/1]" },
  { value: "2.1:1", label: "2.1:1 (APS-C)", css: "aspect-[2.1/1]" },
  { value: "2:1", label: "2:1 (Univisium / Streaming)", css: "aspect-[2/1]" },
  { value: "1.91:1", label: "1.91:1 (Digital Landscape)", css: "aspect-[1.91/1]" },
  { value: "1.90:1", label: "1.90:1 (Digital IMAX)", css: "aspect-[1.90/1]" },
  { value: "1.85:1", label: "1.85:1 (Theatrical Flat)", css: "aspect-[1.85/1]" },
  { value: "1.78:1", label: "1.78:1 (16:9 HD)", css: "aspect-video" },
  { value: "1.66:1", label: "1.66:1 (European Widescreen)", css: "aspect-[1.66/1]" },
  { value: "1.60:1", label: "1.60:1 (16:10 Widescreen PC)", css: "aspect-[1.6/1]" },
  { value: "1.50:1", label: "1.50:1 (3:2 Still Photo)", css: "aspect-[3/2]" },
  { value: "1.43:1", label: "1.43:1 (IMAX 70mm)", css: "aspect-[1.43/1]" },
  { value: "1.37:1", label: "1.37:1 (Academy Ratio)", css: "aspect-[1.37/1]" },
  { value: "1.33:1", label: "1.33:1 (4:3 SDTV)", css: "aspect-[4/3]" },
  { value: "1.25:1", label: "1.25:1 (5:4 Large Format)", css: "aspect-[5/4]" },
  { value: "1:1", label: "1:1 (Square)", css: "aspect-square" },
  { value: "0.80:1", label: "0.80:1 (4:5 Portrait)", css: "aspect-[4/5]" },
  { value: "0.56:1", label: "0.56:1 (9:16 Vertical)", css: "aspect-[9/16]" },
  { value: "21:9", label: "21:9 (Ultrawide)", css: "aspect-[21/9]" },
  { value: "32:9", label: "32:9 (Super Ultrawide)", css: "aspect-[32/9]" },
];

export function InlineSceneCard({
  card,
  onUpdate,
  onRemove,
  onMove,
  onConnectClick,
  connectMode,
  isConnectSource,
  isSelected,
  onSelect,
  getZoom,
  getPan,
}: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

  const { handleMouseDown: startDrag } = useDraggable({
    onMove: useCallback((x: number, y: number) => onMove(x, y), [onMove]),
    onStart: () => setIsDragging(true),
    onEnd: () => setIsDragging(false),
    getZoom,
    getPan,
  });

  const { handleMouseDown: startResize } = useDraggable({
    onMove: useCallback((x, y) => {
      onUpdate({
        width: Math.max(300, x - (card.x || 0)),
        height: Math.max(400, y - (card.y || 0)),
      });
    }, [onUpdate, card.x, card.y]),
    onStart: () => setIsResizing(true),
    onEnd: () => setIsResizing(false),
    getZoom,
    getPan,
  });

  const handleChange = (field: keyof SceneCard, value: any) => {
    onUpdate({ [field]: value });
  };

  const currentAspect = ASPECT_RATIOS.find((a) => a.value === card.aspect_ratio) || ASPECT_RATIOS[0];

  return (
    <div
      className={`absolute select-none overflow-hidden ${isDragging || isResizing ? "" : "transition-all duration-200"} flex flex-col ${
        isSelected ? "ring-2 ring-[#c9a84c] shadow-[0_0_30px_rgba(201,168,76,0.25)]" : 
        isConnectSource ? "ring-2 ring-blue-500 shadow-[0_0_24px_rgba(59,130,246,0.3)]" : "shadow-lg hover:shadow-2xl"
      } bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border ${isSelected ? "border-[#c9a84c]" : "border-zinc-200 dark:border-zinc-800"} rounded-2xl`}
      style={{
        left: card.x || 0,
        top: card.y || 0,
        width: card.width || 320,
        height: card.height || 500,
        zIndex: isSelected || isDragging ? 30 : 10,
        cursor: connectMode ? "crosshair" : (isDragging ? "grabbing" : "default"),
      }}
      onMouseDown={(e) => {
        if (connectMode) {
          e.stopPropagation();
          onConnectClick?.(card.id);
          return;
        }
        
        // Handle selection
        if (!isSelected || e.shiftKey || e.metaKey || e.ctrlKey) {
          onSelect?.(e.shiftKey || e.metaKey || e.ctrlKey);
        }
      }}
    >
      <div
        className="flex items-center gap-2 px-3 bg-zinc-50 dark:bg-zinc-950 border-b border-zinc-200 dark:border-white/10"
        style={{ minHeight: 40 }}
      >
        <div
          className="cursor-grab text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 transition-colors p-1"
          onMouseDown={(e) => {
            if (!connectMode) startDrag(e, card.x || 0, card.y || 0);
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
          className="p-1 rounded text-zinc-400 hover:text-red-500 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(card.id);
          }}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto suite-scrollbar overflow-x-hidden">
        {/* Image Preview Area */}
        <div className={`${currentAspect.css} w-full relative bg-zinc-100 dark:bg-black/40 border-b border-zinc-200 dark:border-white/5 group/img`}>
          {card.image_url ? (
            <img src={card.image_url} alt="Frame" className="w-full h-full object-cover" />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
              <Camera className="w-6 h-6 text-zinc-300 dark:text-zinc-700" />
              <span className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">No Frame Image</span>
            </div>
          )}
          
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              onClick={() => {
                const url = window.prompt("Enter Image URL:", card.image_url || "");
                if (url !== null) handleChange("image_url", url);
              }}
              className="px-3 py-1.5 bg-white text-black text-[10px] font-bold rounded-lg shadow-xl hover:scale-105 transition-transform"
            >
              Set URL
            </button>
            <button
              onClick={() => {
                const input = document.createElement("input");
                input.type = "file";
                input.accept = "image/*";
                input.onchange = (e: any) => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (re) => {
                      handleChange("image_url", re.target?.result);
                    };
                    reader.readAsDataURL(file);
                  }
                };
                input.click();
              }}
              className="px-3 py-1.5 bg-[#c9a84c] text-black text-[10px] font-bold rounded-lg shadow-xl hover:scale-105 transition-transform"
            >
              Upload
            </button>
          </div>
        </div>

        <div className="p-3 space-y-3.5 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
              Scene Heading
            </label>
            <input
              className="w-full bg-zinc-100 dark:bg-black/20 border border-zinc-200 dark:border-white/5 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-zinc-200 outline-none focus:border-[#c9a84c]/50 transition-colors"
              placeholder="INT. ROOM - DAY"
              value={card.scene_heading || ""}
              onChange={(e) => handleChange("scene_heading", e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                Aspect Ratio
              </label>
              <select
                className="w-full bg-zinc-100 dark:bg-black/20 border border-zinc-200 dark:border-white/5 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-zinc-200 outline-none focus:border-[#c9a84c]/50 appearance-none"
                value={card.aspect_ratio || "16:9"}
                onChange={(e) => handleChange("aspect_ratio", e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {ASPECT_RATIOS.map((a) => (
                  <option key={a.value} value={a.value} className="bg-white dark:bg-zinc-900">
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                Lens
              </label>
              <input
                className="w-full bg-zinc-100 dark:bg-black/20 border border-zinc-200 dark:border-white/5 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-zinc-200 outline-none focus:border-[#c9a84c]/50"
                placeholder="50mm"
                value={card.lens || ""}
                onChange={(e) => handleChange("lens", e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
              />
            </div>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                Shot Type
              </label>
              <select
                className="w-full bg-zinc-100 dark:bg-black/20 border border-zinc-200 dark:border-white/5 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-zinc-200 outline-none focus:border-[#c9a84c]/50 appearance-none"
                value={card.shot_type || "MS"}
                onChange={(e) => handleChange("shot_type", e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {Object.entries(SHOT_TYPES).map(([k, v]) => (
                  <option key={k} value={k} className="bg-white dark:bg-zinc-900">
                    {k} - {v}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
                Movement
              </label>
              <select
                className="w-full bg-zinc-100 dark:bg-black/20 border border-zinc-200 dark:border-white/5 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-zinc-200 outline-none focus:border-[#c9a84c]/50 appearance-none"
                value={card.camera_movement || "static"}
                onChange={(e) => handleChange("camera_movement", e.target.value)}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {Object.entries(CAMERA_MOVEMENTS).map(([k, v]) => (
                  <option key={k} value={k} className="bg-white dark:bg-zinc-900">
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
              Image URL
            </label>
            <input
              className="w-full bg-zinc-100 dark:bg-black/20 border border-zinc-200 dark:border-white/5 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-zinc-200 outline-none focus:border-[#c9a84c]/50 transition-colors"
              placeholder="https://..."
              value={card.image_url || ""}
              onChange={(e) => handleChange("image_url", e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>

          <div className="pb-4">
            <label className="block text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-1.5">
              Technical Notes
            </label>
            <textarea
              className="w-full bg-zinc-100 dark:bg-black/20 border border-zinc-200 dark:border-white/5 rounded-lg px-2.5 py-1.5 text-zinc-900 dark:text-zinc-200 outline-none focus:border-[#c9a84c]/50 resize-none min-h-[80px] suite-scrollbar"
              placeholder="Lighting, crew notes..."
              value={card.technical_notes || ""}
              onChange={(e) => handleChange("technical_notes", e.target.value)}
              onMouseDown={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      </div>

      {/* Resize Handle */}
      <div
        className="absolute bottom-0 right-0 w-6 h-6 cursor-nwse-resize z-[30] flex items-center justify-center group"
        onMouseDown={(e) => {
          e.stopPropagation();
          startResize(e, (card.x || 0) + (card.width || 320), (card.y || 0) + (card.height || 500));
        }}
      >
        <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-700 group-hover:bg-[#c9a84c] transition-colors" />
      </div>
    </div>
  );
}
