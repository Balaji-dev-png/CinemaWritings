"use client";

import { useState, useRef, useEffect } from "react";
import { Editor } from "@tiptap/react";
import { GripVertical, X, LayoutGrid, ArrowLeft } from "lucide-react";

interface SceneCard {
  index: number;
  heading: string;
  summary: string;
  pos: number;
  color: string;
}

const CARD_COLORS = [
  "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800",
  "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
  "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800",
  "bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800",
  "bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-800",
  "bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800",
];

export function Corkboard({ editor, onClose }: { editor: Editor | null; onClose: () => void }) {
  const [cards, setCards] = useState<SceneCard[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    if (!editor) return;
    const extract = () => {
      const scenes: SceneCard[] = [];
      let idx = 0;
      let lastScenePos = -1;
      let lastActionText = "";

      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "sceneHeading") {
          if (lastScenePos >= 0) {
            scenes.push({
              index: idx,
              heading: scenes.length > 0 ? scenes[scenes.length - 1].heading : "",
              summary: lastActionText.slice(0, 100),
              pos: lastScenePos,
              color: CARD_COLORS[idx % CARD_COLORS.length],
            });
          }
          idx++;
          lastScenePos = pos;
          lastActionText = "";
          scenes.push({
            index: idx,
            heading: node.textContent || "UNTITLED",
            summary: "",
            pos,
            color: CARD_COLORS[(idx - 1) % CARD_COLORS.length],
          });
        } else if (node.type.name === "action" || node.type.name === "paragraph") {
          if (lastActionText.length < 100) {
            lastActionText += (lastActionText ? " " : "") + node.textContent.trim();
          }
          // Update last card's summary
          if (scenes.length > 0) {
            scenes[scenes.length - 1].summary = lastActionText.slice(0, 120);
          }
        }
      });
      setCards(scenes);
    };
    extract();
  }, [editor]);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (targetIndex: number) => {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }
    // Reorder cards
    const newCards = [...cards];
    const [moved] = newCards.splice(dragIndex, 1);
    newCards.splice(targetIndex, 0, moved);
    // Re-index
    newCards.forEach((c, i) => (c.index = i + 1));
    setCards(newCards);
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const scrollToScene = (pos: number) => {
    if (!editor) return;
    editor.chain().focus().setTextSelection(pos + 1).run();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#f4f5f7] dark:bg-[#0a0a0a] flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200 dark:border-zinc-800 shrink-0">
        <div className="flex items-center gap-3">
          <LayoutGrid className="w-5 h-5 text-zinc-400" />
          <h2 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">Corkboard — {cards.length} Scenes</h2>
        </div>
        <button onClick={onClose} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg transition-all">
          <ArrowLeft className="w-3 h-3" />
          Back to Editor
        </button>
      </header>

      {/* Card Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 max-w-7xl mx-auto">
          {cards.map((card, i) => (
            <div
              key={card.pos}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={() => handleDrop(i)}
              onDragEnd={() => { setDragIndex(null); setDragOverIndex(null); }}
              onClick={() => scrollToScene(card.pos)}
              className={`${card.color} border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5 group relative ${
                dragOverIndex === i ? "ring-2 ring-blue-400 scale-105" : ""
              } ${dragIndex === i ? "opacity-40" : ""}`}
            >
              {/* Drag handle */}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-60 transition-opacity cursor-grab">
                <GripVertical className="w-3.5 h-3.5 text-zinc-400" />
              </div>

              {/* Scene number */}
              <div className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                Scene {card.index}
              </div>

              {/* Heading */}
              <h3 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 font-mono leading-snug mb-2 line-clamp-2">
                {card.heading}
              </h3>

              {/* Summary */}
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-3">
                {card.summary || "No action text yet…"}
              </p>
            </div>
          ))}

          {cards.length === 0 && (
            <div className="col-span-full text-center py-20">
              <LayoutGrid className="w-8 h-8 text-zinc-300 dark:text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-400">No scenes found. Add scene headings (INT./EXT.) to see cards here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
