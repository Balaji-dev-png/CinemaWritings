"use client";
import { useState, useRef, useCallback } from "react";
import { ShotElement, SHOT_TYPES, ViewportState } from "@/lib/canvasTypes";
import {
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  GripVertical,
} from "lucide-react";

/* ── Shot Element Card (on canvas) ── */
interface ShotCardProps {
  element: ShotElement;
  viewport: ViewportState;
  isSelected: boolean;
  onUpdate: (id: string, updates: Partial<ShotElement>) => void;
  onSelect: (id: string, additive: boolean) => void;
  onRemove: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
}

export function CanvasShotCard({
  element,
  viewport,
  isSelected,
  onUpdate,
  onSelect,
  onRemove,
  onBringToFront,
  onSendToBack,
}: ShotCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });
  const shotInfo = SHOT_TYPES.find((s) => s.id === element.shotType);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isEditing) return;
      onSelect(element.id, e.shiftKey);
      dragRef.current = {
        dragging: true,
        startX: e.clientX,
        startY: e.clientY,
        origX: element.x,
        origY: element.y,
      };
      const handleMove = (me: MouseEvent) => {
        if (!dragRef.current.dragging) return;
        onUpdate(element.id, {
          x:
            dragRef.current.origX +
            (me.clientX - dragRef.current.startX) / viewport.zoom,
          y:
            dragRef.current.origY +
            (me.clientY - dragRef.current.startY) / viewport.zoom,
        });
      };
      const handleUp = () => {
        dragRef.current.dragging = false;
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [
      element.id,
      element.x,
      element.y,
      isEditing,
      onSelect,
      onUpdate,
      viewport.zoom,
    ],
  );

  const handleImageUpload = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        onUpdate(element.id, { imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  return (
    <div
      className="absolute group w-full h-full"
      style={{ pointerEvents: "auto" }}
      onMouseDown={handleMouseDown}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(!isEditing);
      }}
    >
      <div
        className="w-full h-full rounded-[1.5rem] overflow-hidden bg-[#1e1e1e]/60 backdrop-blur-[12px] border border-white/10 flex flex-col transition-all duration-300"
        style={{
          borderColor: isSelected ? "#3b82f6" : "rgba(255, 255, 255, 0.1)",
          boxShadow: isSelected
            ? "0 0 30px rgba(59, 130, 246, 0.2)"
            : "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* Header: Shot # and Tag */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-white/5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black text-white/40 uppercase tracking-tighter">
              Shot
            </span>
            <input
              value={element.shotNumber}
              onChange={(e) =>
                onUpdate(element.id, { shotNumber: e.target.value })
              }
              className="bg-transparent text-white font-bold text-sm outline-none w-12"
              placeholder="#1"
              readOnly={!isEditing}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <div className="bg-[#3b82f6] text-white px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest shadow-lg shadow-blue-500/20">
            {shotInfo?.label.split(" (")[0] || element.shotType}
          </div>
        </div>

        {/* Image / Storyboard Area */}
        <div
          className="relative flex-1 bg-black/40 flex items-center justify-center overflow-hidden cursor-pointer group/img"
          onClick={(e) => {
            e.stopPropagation();
            if (isEditing) handleImageUpload();
          }}
        >
          {element.imageUrl ? (
            <img
              src={element.imageUrl}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-zinc-600 group-hover/img:text-zinc-400 transition-colors">
              <span className="text-2xl opacity-50">
                {shotInfo?.icon || "📷"}
              </span>
              <span className="font-bold uppercase tracking-[0.2em] text-[7px] opacity-50">
                Upload Frame
              </span>
            </div>
          )}
        </div>

        {/* Concise Description Area */}
        <div className="px-4 py-3 bg-white/5 border-t border-white/5">
          <textarea
            value={element.description}
            onChange={(e) =>
              onUpdate(element.id, { description: e.target.value })
            }
            placeholder="Describe the shot action..."
            className="w-full bg-transparent text-zinc-300 outline-none resize-none no-scrollbar text-[11px] leading-relaxed h-12"
            readOnly={!isEditing}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      </div>

      {/* Connection Ports */}
      <div className="absolute -left-1 w-2 h-2 bg-blue-500 rounded-full top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all z-10 shadow-[0_0_8px_#3b82f6]" />
      <div className="absolute -right-1 w-2 h-2 bg-blue-500 rounded-full top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all z-10 shadow-[0_0_8px_#3b82f6]" />
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 shadow-[0_0_8px_#3b82f6]" />
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 shadow-[0_0_8px_#3b82f6]" />

      {isSelected && !isEditing && (
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-2xl scale-90 group-hover:scale-100 transition-transform">
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onBringToFront(element.id);
            }}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowUpToLine className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onSendToBack(element.id);
            }}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowDownToLine className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onRemove(element.id);
            }}
            className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Shot List Bridge Panel (sidebar) ── */
interface BridgeProps {
  onAddShot: (shotTypeId: string) => void;
  onClose: () => void;
}

export function ShotListBridge({ onAddShot, onClose }: BridgeProps) {
  return (
    <div className="absolute right-0 top-0 bottom-0 w-72 bg-white/95 dark:bg-[#0f0f1a]/95 backdrop-blur-xl border-l border-zinc-200 dark:border-zinc-800 z-50 flex flex-col shadow-2xl">
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800">
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400">
          Shot List
        </h3>
        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-zinc-800 dark:text-zinc-500 dark:hover:text-white text-xs"
        >
          ✕
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        <p className="text-[10px] text-zinc-500 mb-2 px-1">
          Drag or click to add shot elements to your canvas.
        </p>
        {SHOT_TYPES.map((shot) => (
          <button
            key={shot.id}
            onClick={() => onAddShot(shot.id)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData("shot-type", shot.id);
              e.dataTransfer.effectAllowed = "copy";
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all hover:bg-zinc-100 dark:hover:bg-white/5 group border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700/50"
          >
            <span className="text-lg">{shot.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-zinc-700 group-hover:text-zinc-900 dark:text-zinc-300 dark:group-hover:text-white block truncate">
                {shot.label}
              </span>
            </div>
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: shot.color }}
            />
            <GripVertical className="w-3 h-3 text-zinc-400 dark:text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        ))}
      </div>
    </div>
  );
}
