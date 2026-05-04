"use client";
import { useState, useRef, useCallback } from "react";
import { IdeaElement, ViewportState, IDEA_COLORS } from "@/lib/canvasTypes";
import { Trash2, ArrowUpToLine, ArrowDownToLine, Palette } from "lucide-react";

interface IdeaBlockProps {
  element: IdeaElement;
  viewport: ViewportState;
  isSelected: boolean;
  onUpdate: (id: string, updates: Partial<IdeaElement>) => void;
  onSelect: (id: string, additive: boolean) => void;
  onRemove: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
}

export function CanvasIdeaBlock({
  element,
  viewport,
  isSelected,
  onUpdate,
  onSelect,
  onRemove,
  onBringToFront,
  onSendToBack,
}: IdeaBlockProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

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
        className="w-full h-full rounded-[1.5rem] overflow-hidden bg-white/90 backdrop-blur-[12px] border border-zinc-200 flex flex-col transition-all duration-500 ease-in-out"
        style={{
          borderColor: isSelected ? "#3b82f6" : "rgba(0, 0, 0, 0.1)",
          boxShadow: isSelected
            ? "0 0 40px rgba(59, 130, 246, 0.15)"
            : "0 8px 32px rgba(0,0,0,0.05)",
        }}
      >
        {/* Header - Simple Accent Line */}
        <div
          className="h-1.5 w-full"
          style={{ backgroundColor: element.color }}
        />

        <div className="flex-1 p-5 flex flex-col gap-3">
          <input
            value={element.title}
            onChange={(e) => onUpdate(element.id, { title: e.target.value })}
            placeholder="Untitled Idea"
            className="bg-transparent text-zinc-900 font-bold text-base outline-none border-none placeholder:text-zinc-400"
            readOnly={!isEditing}
            onClick={(e) => e.stopPropagation()}
          />
          <textarea
            value={element.content}
            onChange={(e) => onUpdate(element.id, { content: e.target.value })}
            placeholder="Start writing..."
            className="flex-1 bg-transparent text-zinc-700 outline-none resize-none no-scrollbar leading-relaxed text-[13px] placeholder:text-zinc-400"
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

      {/* Toolbar */}
      {isSelected && !isEditing && (
        <div
          className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-white rounded-2xl border border-zinc-200 shadow-2xl scale-90 group-hover:scale-100 transition-transform"
          style={{ zIndex: element.zIndex + 2000 }}
        >
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              setShowColors(!showColors);
            }}
            className={`p-2 rounded-xl transition-colors ${showColors ? "text-blue-600 bg-blue-50" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"}`}
          >
            <Palette className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-zinc-200 mx-1" />
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onBringToFront(element.id);
            }}
            className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowUpToLine className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onSendToBack(element.id);
            }}
            className="p-2 text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowDownToLine className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-zinc-200 mx-1" />
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onRemove(element.id);
            }}
            className="p-2 text-zinc-500 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          {showColors && (
            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-white border border-zinc-200 rounded-2xl p-2 flex gap-2 shadow-2xl animate-in fade-in slide-in-from-bottom-2">
              {IDEA_COLORS.map((c) => (
                <button
                  key={c.id}
                  onClick={() => {
                    onUpdate(element.id, { color: c.value });
                    setShowColors(false);
                  }}
                  className="w-6 h-6 rounded-full border border-black/10 hover:scale-125 transition-transform shadow-sm"
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
