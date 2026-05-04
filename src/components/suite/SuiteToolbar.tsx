"use client";
import type { Stroke } from "@/hooks/useDrawing";

interface Props {
  onAddIdea: () => void;
  onAddShot: () => void;
  onAddImage: () => void;
  onAddLink: () => void;
  onClearBoard: () => void;
  connectMode: boolean;
  onToggleConnect: () => void;
  drawMode: boolean;
  onToggleDraw: () => void;
  // Drawing sub-tools
  drawTool: Stroke["tool"];
  onSetDrawTool: (t: Stroke["tool"]) => void;
  drawColor: string;
  onSetDrawColor: (c: string) => void;
  drawWidth: number;
  onSetDrawWidth: (w: number) => void;
  onDrawUndo: () => void;
  onDrawClear: () => void;
  scriptTitle: string;
  isOpen?: boolean;
}

export function SuiteToolbar({
  onAddIdea, onAddShot, onAddImage, onAddLink, onClearBoard,
  connectMode, onToggleConnect,
  drawMode, onToggleDraw,
  drawTool, onSetDrawTool, drawColor, onSetDrawColor,
  drawWidth, onSetDrawWidth, onDrawUndo, onDrawClear,
  scriptTitle,
  isOpen = true,
}: Props) {
  return (
    <aside
      className="h-full flex flex-col overflow-y-auto suite-scrollbar transition-all duration-300"
      style={{
        width: isOpen ? 280 : 0,
        opacity: isOpen ? 1 : 0,
        backgroundColor: "#111",
        borderRight: isOpen ? "1px solid #222" : "none",
        flexShrink: 0,
      }}
    >
      {/* Logo / Title */}
      <div className="px-5 py-4" style={{ borderBottom: "1px solid #222" }}>
        <div className="text-[10px] uppercase tracking-[0.2em] text-zinc-500 mb-1">Director&apos;s Suite</div>
        <div className="text-sm font-bold text-white truncate">{scriptTitle || "Untitled"}</div>
      </div>

      {/* Add Elements */}
      <div className="px-4 py-4 space-y-2" style={{ borderBottom: "1px solid #222" }}>
        <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-2">Add Elements</div>
        <button onClick={onAddIdea}
          className="w-full text-left px-3 py-2 text-xs rounded transition-all hover:bg-white/5 hover:scale-[1.02] active:scale-95 text-zinc-300">
          📝 Idea Card
        </button>
        <button onClick={onAddShot}
          className="w-full text-left px-3 py-2 text-xs rounded transition-all hover:bg-white/5 hover:scale-[1.02] active:scale-95 text-zinc-300">
          🎬 Shot Card
        </button>
        <button onClick={onAddImage}
          className="w-full text-left px-3 py-2 text-xs rounded transition-all hover:bg-white/5 hover:scale-[1.02] active:scale-95 text-zinc-300">
          🖼️ Image Card
        </button>
        <button onClick={onAddLink}
          className="w-full text-left px-3 py-2 text-xs rounded transition-all hover:bg-white/5 hover:scale-[1.02] active:scale-95 text-zinc-300">
          🔗 Link Card
        </button>
      </div>

      {/* Tools */}
      <div className="px-4 py-4 space-y-2" style={{ borderBottom: "1px solid #222" }}>
        <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-2">Tools</div>
        <button
          onClick={onToggleConnect}
          className="w-full text-left px-3 py-2 text-xs rounded transition-all hover:scale-[1.02] active:scale-95"
          style={{
            backgroundColor: connectMode ? "rgba(201,168,76,0.15)" : "transparent",
            color: connectMode ? "#c9a84c" : "#a1a1aa",
            border: connectMode ? "1px solid #c9a84c" : "1px solid transparent",
          }}
        >
          🔌 Connect Mode {connectMode && "ON"}
        </button>
        <button
          onClick={onToggleDraw}
          className="w-full text-left px-3 py-2 text-xs rounded transition-all hover:scale-[1.02] active:scale-95"
          style={{
            backgroundColor: drawMode ? "rgba(201,168,76,0.15)" : "transparent",
            color: drawMode ? "#c9a84c" : "#a1a1aa",
            border: drawMode ? "1px solid #c9a84c" : "1px solid transparent",
          }}
        >
          ✏️ Draw Mode {drawMode && "ON"}
        </button>
      </div>

      {/* Drawing sub-tools (only visible when draw mode active) */}
      {drawMode && (
        <div className="px-4 py-4 space-y-3" style={{ borderBottom: "1px solid #222" }}>
          <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-1">Drawing Tools</div>

          {/* Tool selector */}
          <div className="flex gap-1 flex-wrap">
            {(["pen", "pencil", "brush", "eraser"] as const).map((t) => (
              <button
                key={t}
                onClick={() => onSetDrawTool(t)}
                className="px-2 py-1 text-[10px] rounded capitalize transition-colors"
                style={{
                  backgroundColor: drawTool === t ? "#c9a84c" : "#1a1a1a",
                  color: drawTool === t ? "#0d0d0d" : "#a1a1aa",
                  border: "1px solid #333",
                }}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Color */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">Color</span>
            <input
              type="color"
              value={drawColor}
              onChange={(e) => onSetDrawColor(e.target.value)}
              className="w-6 h-6 rounded cursor-pointer border border-zinc-700"
              style={{ backgroundColor: drawColor }}
            />
          </div>

          {/* Width */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider shrink-0">Width</span>
            <input
              type="range"
              min={1}
              max={20}
              value={drawWidth}
              onChange={(e) => onSetDrawWidth(Number(e.target.value))}
              className="flex-1"
            />
            <span className="text-[10px] text-zinc-400 w-4 text-right">{drawWidth}</span>
          </div>

          {/* Undo / Clear */}
          <div className="flex gap-2">
            <button
              onClick={onDrawUndo}
              className="flex-1 px-2 py-1 text-[10px] rounded bg-zinc-800 text-zinc-300 transition-all hover:bg-zinc-700 hover:scale-[1.02] active:scale-95"
            >
              ↩ Undo
            </button>
            <button
              onClick={onDrawClear}
              className="flex-1 px-2 py-1 text-[10px] rounded bg-zinc-800 text-zinc-300 transition-all hover:bg-zinc-700 hover:scale-[1.02] active:scale-95"
            >
              🗑 Clear All
            </button>
          </div>
        </div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Clear Board */}
      <div className="px-4 py-4">
        <button
          onClick={() => {
            if (confirm("Clear the entire board? This cannot be undone.")) {
              onClearBoard();
            }
          }}
          className="w-full px-3 py-2 text-xs rounded border border-red-900/50 text-red-400 transition-all hover:bg-red-900/20 hover:scale-[1.02] active:scale-95"
        >
          🗑 Clear Board
        </button>
      </div>
    </aside>
  );
}
