"use client";
import React from "react";
import { Pen, Pencil, Brush, Eraser, MousePointer2 } from "lucide-react";
import { DrawingOptions } from "@/hooks/useDrawing";

interface Props {
  tool: DrawingOptions["tool"];
  setTool: (tool: DrawingOptions["tool"]) => void;
  color: string;
  setColor: (color: string) => void;
  strokeWidth: number;
  setStrokeWidth: (width: number) => void;
  undo: () => void;
  clearAll: () => void;
}

const TOOLS = [
  { id: "select", icon: MousePointer2, label: "Select" },
  { id: "pen", icon: Pen, label: "Pen" },
  { id: "pencil", icon: Pencil, label: "Pencil" },
  { id: "brush", icon: Brush, label: "Brush" },
  { id: "eraser", icon: Eraser, label: "Eraser" },
] as const;

export function DrawingToolbar({
  tool,
  setTool,
  color,
  setColor,
  strokeWidth,
  setStrokeWidth,
  undo,
  clearAll,
}: Props) {
  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 px-4 py-2 shadow-2xl z-[200] animate-in slide-in-from-bottom-4"
      style={{
        backgroundColor: "#1a1a1a",
        border: "1px solid #2a2a2a",
        borderRadius: "12px",
      }}
    >
      <div className="flex gap-1">
        {(["select", "pen", "pencil", "brush", "eraser"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTool(t)}
            className="px-3 py-1.5 text-xs rounded capitalize transition-all"
            style={{
              backgroundColor: tool === t ? "#c9a84c" : "transparent",
              color: tool === t ? "#0d0d0d" : "#a1a1aa",
              border: tool === t ? "1px solid #c9a84c" : "1px solid transparent",
              fontWeight: tool === t ? "bold" : "normal",
            }}
          >
            {t === "select" && "🖱️ Select"}
            {t === "pen" && "✏️ Pen"}
            {t === "pencil" && "📝 Pencil"}
            {t === "brush" && "🖌️ Brush"}
            {t === "eraser" && "◻️ Eraser"}
          </button>
        ))}
      </div>

      <div className="w-px h-6 bg-[#333]" />

      <div className="flex items-center gap-2">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="cursor-pointer"
          style={{ width: 28, height: 28, border: "none", borderRadius: 4, padding: 0 }}
        />
      </div>

      <div className="w-px h-6 bg-[#333]" />

      <div className="flex items-center gap-2">
        <span className="text-xs text-zinc-500 uppercase">Width</span>
        <input
          type="range"
          min={1}
          max={20}
          value={strokeWidth}
          onChange={(e) => setStrokeWidth(Number(e.target.value))}
          className="w-24 accent-[#c9a84c]"
        />
      </div>

      <div className="w-px h-6 bg-[#333]" />

      <div className="flex items-center gap-2">
        <button
          onClick={undo}
          className="px-3 py-1.5 text-xs rounded text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          ↩ Undo
        </button>
        <button
          onClick={clearAll}
          className="px-3 py-1.5 text-xs rounded text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          🗑 Clear
        </button>
      </div>
    </div>
  );
}
