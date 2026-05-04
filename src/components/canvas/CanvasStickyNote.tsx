"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { StickyNoteElement, STICKY_COLORS, ViewportState } from "@/lib/canvasTypes";
import { Trash2, ArrowUpToLine, ArrowDownToLine, Palette } from "lucide-react";

interface Props {
  element: StickyNoteElement;
  viewport: ViewportState;
  isSelected: boolean;
  onUpdate: (id: string, updates: Partial<StickyNoteElement>) => void;
  onSelect: (id: string, additive: boolean) => void;
  onRemove: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
}

function getStickyRotation(id: string): number {
  return (id.charCodeAt(0) % 7) - 3;
}

export function CanvasStickyNote({ element, viewport, isSelected, onUpdate, onSelect, onRemove, onBringToFront, onSendToBack }: Props) {
  const editRef = useRef<HTMLDivElement>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });
  const colors = STICKY_COLORS[element.color];
  const rotation = getStickyRotation(element.id);
  useEffect(() => { if (isEditing && editRef.current) editRef.current.focus(); }, [isEditing]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) return;
    onSelect(element.id, e.shiftKey);
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, origX: element.x, origY: element.y };
    const handleMove = (me: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      onUpdate(element.id, { x: dragRef.current.origX + (me.clientX - dragRef.current.startX) / viewport.zoom, y: dragRef.current.origY + (me.clientY - dragRef.current.startY) / viewport.zoom });
    };
    const handleUp = () => { dragRef.current.dragging = false; window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }, [element.id, element.x, element.y, isEditing, onSelect, onUpdate, viewport.zoom]);

  return (
    <div className="absolute group w-full h-full" style={{ transform: `rotate(${rotation}deg)`, pointerEvents: "auto" }} onMouseDown={handleMouseDown} onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
      <div className="w-full h-full rounded-sm relative" style={{ backgroundColor: colors.bg, borderLeft: `4px solid ${colors.border}`, color: colors.text, padding: "12px", boxShadow: "2px 4px 12px rgba(0,0,0,0.15)", cursor: isEditing ? "text" : "move", border: isSelected ? "2px solid #60a5fa" : `1px solid ${colors.border}`, opacity: element.opacity }}>
        <div className="absolute top-0 right-0 w-5 h-5" style={{ background: `linear-gradient(135deg, ${colors.border}40 50%, ${colors.bg} 50%)` }} />
        <div ref={editRef} contentEditable={isEditing} suppressContentEditableWarning onBlur={() => { setIsEditing(false); if (editRef.current) onUpdate(element.id, { content: editRef.current.innerText }); }} className="outline-none break-words font-sans min-h-[40px]" style={{ fontSize: element.fontSize || 14, lineHeight: 1.5 }}>
          {element.content || (isEditing ? "" : "Type your idea…")}
        </div>
      </div>
      {isSelected && !isEditing && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-1 bg-[#1a1a2e] rounded-lg shadow-xl border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity" style={{ zIndex: element.zIndex + 2000 }}>
          <div className="relative">
            <button onMouseDown={(e) => { e.stopPropagation(); setShowColors(!showColors); }} className="p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors" title="Color"><Palette className="w-3 h-3" /></button>
            {showColors && (
              <div className="absolute top-full left-0 mt-1 flex gap-1 p-1.5 bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-700 shadow-xl z-50">
                {(Object.keys(STICKY_COLORS) as Array<keyof typeof STICKY_COLORS>).map((c) => (
                  <button key={c} onMouseDown={(e) => { e.stopPropagation(); onUpdate(element.id, { color: c }); setShowColors(false); }} className="w-5 h-5 rounded-full border-2 hover:scale-125 transition-transform" style={{ backgroundColor: STICKY_COLORS[c].bg, borderColor: STICKY_COLORS[c].border }} />
                ))}
              </div>
            )}
          </div>
          <button onMouseDown={(e) => { e.stopPropagation(); onBringToFront(element.id); }} className="p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"><ArrowUpToLine className="w-3 h-3" /></button>
          <button onMouseDown={(e) => { e.stopPropagation(); onSendToBack(element.id); }} className="p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"><ArrowDownToLine className="w-3 h-3" /></button>
          <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
          <button onMouseDown={(e) => { e.stopPropagation(); onRemove(element.id); }} className="p-1 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400 transition-colors"><Trash2 className="w-3 h-3" /></button>
        </div>
      )}
    </div>
  );
}
