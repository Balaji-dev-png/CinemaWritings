"use client";
import type { Stroke } from "@/hooks/useDrawing";

const FaceWithCap = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Baseball Cap */}
    <path d="M5 10h14v2H5z" />
    <path d="M7 10V8a5 5 0 0 1 10 0v2" />
    <path d="M19 10h3" /> {/* Brim */}
    {/* Face */}
    <path d="M7 12v2a5 5 0 0 0 10 0v-2" />
    {/* Eyes */}
    <circle cx="10" cy="14" r="1" fill="currentColor" stroke="none" />
    <circle cx="14" cy="14" r="1" fill="currentColor" stroke="none" />
    {/* Mouth */}
    <path d="M11 17h2" />
  </svg>
);

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
      className="h-full flex flex-col overflow-y-auto suite-scrollbar transition-all duration-300 bg-zinc-50 dark:bg-[#111] border-r border-zinc-200 dark:border-[#222]"
      style={{
        width: isOpen ? 280 : 0,
        opacity: isOpen ? 1 : 0,
        flexShrink: 0,
      }}
    >
      {/* Logo / Title */}
      <div className="px-5 py-4 border-b border-zinc-200 dark:border-[#222]">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 bg-black dark:bg-[#c9a84c] rounded flex items-center justify-center shrink-0">
             <FaceWithCap className="w-4 h-4 text-white dark:text-black" />
          </div>
          <span className="font-bold text-sm tracking-widest uppercase text-zinc-900 dark:text-white">Director&apos;s Suite</span>
        </div>
        <div className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{scriptTitle || "Untitled"}</div>
      </div>

      {/* Add Elements */}
      <div className="px-4 py-4 space-y-2 border-b border-zinc-200 dark:border-[#222]">
        <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-2">Add Elements</div>
        <button onClick={onAddIdea}
          className="w-full text-left px-3 py-2 text-xs rounded transition-all hover:bg-zinc-200 dark:hover:bg-white/5 hover:scale-[1.02] active:scale-95 text-zinc-700 dark:text-zinc-300">
          📝 Idea Card
        </button>
        <button onClick={onAddShot}
          className="w-full text-left px-3 py-2 text-xs rounded transition-all hover:bg-zinc-200 dark:hover:bg-white/5 hover:scale-[1.02] active:scale-95 text-zinc-700 dark:text-zinc-300">
          🎬 Shot Card
        </button>
        <button onClick={onAddImage}
          className="w-full text-left px-3 py-2 text-xs rounded transition-all hover:bg-zinc-200 dark:hover:bg-white/5 hover:scale-[1.02] active:scale-95 text-zinc-700 dark:text-zinc-300">
          🖼️ Image Card
        </button>
        <button onClick={onAddLink}
          className="w-full text-left px-3 py-2 text-xs rounded transition-all hover:bg-zinc-200 dark:hover:bg-white/5 hover:scale-[1.02] active:scale-95 text-zinc-700 dark:text-zinc-300">
          🔗 Link Card
        </button>
      </div>

      {/* Tools */}
      <div className="px-4 py-4 space-y-2 border-b border-zinc-200 dark:border-[#222]">
        <div className="text-[10px] uppercase tracking-[0.15em] text-zinc-500 mb-2">Tools</div>
        <button
          onClick={onToggleConnect}
          className="w-full text-left px-3 py-2 text-xs rounded transition-all hover:scale-[1.02] active:scale-95"
          style={{
            backgroundColor: connectMode ? "rgba(201,168,76,0.15)" : "transparent",
            color: connectMode ? "#c9a84c" : "inherit",
            border: connectMode ? "1px solid #c9a84c" : "1px solid transparent",
          }}
        >
          <span className={!connectMode ? "text-zinc-500 dark:text-zinc-400" : ""}>🔌 Connect Mode {connectMode && "ON"}</span>
        </button>
        <button
          onClick={onToggleDraw}
          className="w-full text-left px-3 py-2 text-xs rounded transition-all hover:scale-[1.02] active:scale-95"
          style={{
            backgroundColor: drawMode ? "rgba(201,168,76,0.15)" : "transparent",
            color: drawMode ? "#c9a84c" : "inherit",
            border: drawMode ? "1px solid #c9a84c" : "1px solid transparent",
          }}
        >
          <span className={!drawMode ? "text-zinc-500 dark:text-zinc-400" : ""}>✏️ Draw Mode {drawMode && "ON"}</span>
        </button>
      </div>



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
          className="w-full px-3 py-2 text-xs rounded border border-red-500/50 dark:border-red-900/50 text-red-500 dark:text-red-400 transition-all hover:bg-red-50 dark:hover:bg-red-900/20 hover:scale-[1.02] active:scale-95"
        >
          🗑 Clear Board
        </button>
      </div>
    </aside>
  );
}
