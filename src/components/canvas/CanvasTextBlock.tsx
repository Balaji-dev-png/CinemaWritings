/**
 * Canvas Text Block — Free-form editable text on the canvas.
 *
 * Rendered as an absolutely-positioned HTML overlay that
 * scales with the viewport zoom. Contenteditable for inline editing.
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { TextElement, ViewportState } from "@/lib/canvasTypes";
import { Type, Trash2, ArrowUpToLine, ArrowDownToLine } from "lucide-react";

interface Props {
  element: TextElement;
  viewport: ViewportState;
  isSelected: boolean;
  onUpdate: (id: string, updates: Partial<TextElement>) => void;
  onSelect: (id: string, additive: boolean) => void;
  onRemove: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
}

export function CanvasTextBlock({
  element,
  viewport,
  isSelected,
  onUpdate,
  onSelect,
  onRemove,
  onBringToFront,
  onSendToBack,
}: Props) {
  const editRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  useEffect(() => {
    if (isEditing && editRef.current) {
      editRef.current.focus();
      // Move cursor to end
      const range = document.createRange();
      range.selectNodeContents(editRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [isEditing]);

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
        const dx = (me.clientX - dragRef.current.startX) / viewport.zoom;
        const dy = (me.clientY - dragRef.current.startY) / viewport.zoom;
        onUpdate(element.id, {
          x: dragRef.current.origX + dx,
          y: dragRef.current.origY + dy,
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
    [element.id, element.x, element.y, isEditing, onSelect, onUpdate, viewport.zoom]
  );

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsEditing(false);
    if (editRef.current) {
      onUpdate(element.id, { content: editRef.current.innerText });
    }
  }, [element.id, onUpdate]);

  return (
    <div
      className="absolute group w-full h-full"
      style={{ pointerEvents: "auto" }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      {/* Text content */}
      <div
        ref={editRef}
        contentEditable={isEditing}
        suppressContentEditableWarning
        onBlur={handleBlur}
        className="w-full h-full outline-none select-text break-words"
        style={{
          fontSize: element.fontSize,
          fontWeight: element.fontWeight,
          fontFamily: element.fontFamily || "Inter, sans-serif",
          color: element.color,
          backgroundColor: element.backgroundColor || "transparent",
          padding: "8px",
          borderRadius: "6px",
          cursor: isEditing ? "text" : "move",
          border: isSelected
            ? "2px solid #60a5fa"
            : isEditing
            ? "2px solid #60a5fa"
            : "2px solid transparent",
          opacity: element.opacity,
          lineHeight: 1.5,
          transition: "border-color 0.15s ease",
        }}
      >
        {element.content || (isEditing ? "" : "Double-click to edit…")}
      </div>

      {/* Mini action bar */}
      {isSelected && !isEditing && (
        <div
          className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-1 bg-white rounded-lg shadow-xl border border-zinc-200 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ zIndex: element.zIndex + 2000 }}
        >
          <button
            onMouseDown={(e) => { e.stopPropagation(); onBringToFront(element.id); }}
            className="p-1 text-zinc-500 hover:text-zinc-900 transition-colors"
            title="Bring to front"
          >
            <ArrowUpToLine className="w-3 h-3" />
          </button>
          <button
            onMouseDown={(e) => { e.stopPropagation(); onSendToBack(element.id); }}
            className="p-1 text-zinc-500 hover:text-zinc-900 transition-colors"
            title="Send to back"
          >
            <ArrowDownToLine className="w-3 h-3" />
          </button>
          <div className="w-px h-3 bg-zinc-200" />
          <button
            onMouseDown={(e) => { e.stopPropagation(); onRemove(element.id); }}
            className="p-1 text-zinc-500 hover:text-red-600 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}
