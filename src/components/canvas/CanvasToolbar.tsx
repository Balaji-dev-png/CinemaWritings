"use client";
import { Tool } from "@/lib/canvasTypes";
import {
  MousePointer2, Hand, Pencil, Highlighter, Eraser, Square, Circle,
  MoveRight, Minus, Type, StickyNote, Upload, Link2, Film, Code2,
  Undo2, Redo2, Trash2, Grid3X3, ZoomIn, ZoomOut, Maximize2,
  Download, FileImage, FileText as FilePdf, ChevronDown, X, Sparkles
} from "lucide-react";
import { useState } from "react";

interface Props {
  activeTool: Tool;
  onToolChange: (tool: Tool) => void;
  gridVisible: boolean;
  onToggleGrid: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDeleteSelected: () => void;
  hasSelection: boolean;
  onUploadImage: () => void;
  onPasteLink: () => void;
  onExportPng: () => void;
  onExportPdf: () => void;
  onToggleShotList: () => void;
  onClose: () => void;
}

interface ToolBtn { id: Tool; icon: React.ReactNode; label: string; shortcut?: string; }

const TOOL_GROUPS: { label: string; tools: ToolBtn[] }[] = [
  { label: "Navigation", tools: [
    { id: "select", icon: <MousePointer2 className="w-4 h-4" />, label: "Select (V)", shortcut: "V" },
    { id: "hand", icon: <Hand className="w-4 h-4" />, label: "Pan (H)", shortcut: "H" },
    { id: "connect", icon: <MoveRight className="w-4 h-4" />, label: "Connect (C)", shortcut: "C" },
  ]},
  { label: "Creation", tools: [
    { id: "text", icon: <Type className="w-4 h-4" />, label: "Text Block", shortcut: "T" },
    { id: "sticky", icon: <StickyNote className="w-4 h-4" />, label: "Sticky Note", shortcut: "S" },
    { id: "idea", icon: <Sparkles className="w-4 h-4" />, label: "Idea Block", shortcut: "I" },
  ]},
];

export function CanvasToolbar({
  activeTool, onToolChange, gridVisible, onToggleGrid, zoom,
  onZoomIn, onZoomOut, onResetView, onUndo, onRedo, onDeleteSelected,
  hasSelection, onUploadImage, onPasteLink, onExportPng, onExportPdf,
  onToggleShotList, onClose,
}: Props) {
  const [showExport, setShowExport] = useState(false);

  return (
    <div className="absolute left-4 top-1/2 -translate-y-1/2 z-50 flex flex-col gap-2 max-h-[90vh] overflow-y-auto no-scrollbar">
      {/* Tool groups */}
      <div className="canvas-toolbar rounded-2xl p-1.5 shadow-xl flex flex-col gap-0.5">
        {TOOL_GROUPS.map((group, gi) => (
          <div key={group.label}>
            {gi > 0 && <div className="h-px bg-zinc-200 dark:bg-zinc-800/60 my-1 mx-1" />}
            {group.tools.map((tool) => (
              <button
                key={tool.id}
                onClick={() => onToolChange(tool.id)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all relative group ${
                  activeTool === tool.id
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-600/90 dark:text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5"
                }`}
                title={`${tool.label}${tool.shortcut ? ` (${tool.shortcut})` : ""}`}
              >
                {tool.icon}
                <span className="absolute left-full ml-2 px-2 py-1 bg-white dark:bg-zinc-900 text-[10px] font-medium text-zinc-700 dark:text-zinc-300 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-zinc-200 dark:border-zinc-700/50 shadow-lg">
                  {tool.label} {tool.shortcut && <span className="text-zinc-400 dark:text-zinc-500 ml-1">{tool.shortcut}</span>}
                </span>
              </button>
            ))}
          </div>
        ))}

        <div className="h-px bg-zinc-200 dark:bg-zinc-800/60 my-1 mx-1" />

        {/* Media buttons */}
        <button onClick={onUploadImage} className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5 transition-all group relative" title="Upload Image">
          <Upload className="w-4 h-4" />
          <span className="absolute left-full ml-2 px-2 py-1 bg-white dark:bg-zinc-900 text-[10px] font-medium text-zinc-700 dark:text-zinc-300 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-zinc-200 dark:border-zinc-700/50 shadow-lg">Upload Image</span>
        </button>
        <button onClick={onPasteLink} className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5 transition-all group relative" title="Paste Link">
          <Link2 className="w-4 h-4" />
          <span className="absolute left-full ml-2 px-2 py-1 bg-white dark:bg-zinc-900 text-[10px] font-medium text-zinc-700 dark:text-zinc-300 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-zinc-200 dark:border-zinc-700/50 shadow-lg">Paste Link</span>
        </button>
        <button onClick={onToggleShotList} className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5 transition-all group relative" title="Shot List">
          <Film className="w-4 h-4" />
          <span className="absolute left-full ml-2 px-2 py-1 bg-white dark:bg-zinc-900 text-[10px] font-medium text-zinc-700 dark:text-zinc-300 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity border border-zinc-200 dark:border-zinc-700/50 shadow-lg">Shot List</span>
        </button>
      </div>

      {/* Actions */}
      <div className="canvas-toolbar rounded-2xl p-1.5 shadow-xl flex flex-col gap-0.5">
        <button onClick={onUndo} className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5 transition-all" title="Undo (Ctrl+Z)"><Undo2 className="w-4 h-4" /></button>
        <button onClick={onRedo} className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5 transition-all" title="Redo (Ctrl+Shift+Z)"><Redo2 className="w-4 h-4" /></button>
        {hasSelection && <button onClick={onDeleteSelected} className="w-9 h-9 flex items-center justify-center rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-500/10 transition-all" title="Delete"><Trash2 className="w-4 h-4" /></button>}
      </div>

      {/* View controls */}
      <div className="canvas-toolbar rounded-2xl p-1.5 shadow-xl flex flex-col gap-0.5">
        <button onClick={onToggleGrid} className={`w-9 h-9 flex items-center justify-center rounded-xl transition-all ${gridVisible ? "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10" : "text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5"}`} title="Toggle Grid"><Grid3X3 className="w-4 h-4" /></button>
        <button onClick={onZoomIn} className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5 transition-all" title="Zoom In"><ZoomIn className="w-4 h-4" /></button>
        <div className="text-[9px] font-mono text-zinc-500 text-center py-0.5">{Math.round(zoom * 100)}%</div>
        <button onClick={onZoomOut} className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5 transition-all" title="Zoom Out"><ZoomOut className="w-4 h-4" /></button>
        <button onClick={onResetView} className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5 transition-all" title="Reset View"><Maximize2 className="w-4 h-4" /></button>
      </div>

      {/* Export */}
      <div className="canvas-toolbar rounded-2xl p-1.5 shadow-xl relative">
        <button onClick={() => setShowExport(!showExport)} className="w-9 h-9 flex items-center justify-center rounded-xl text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-white dark:hover:bg-white/5 transition-all" title="Export">
          <Download className="w-4 h-4" />
        </button>
        {showExport && (
          <div className="absolute left-full ml-2 bottom-0 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl p-1.5 shadow-2xl min-w-[160px]">
            <button onClick={() => { onExportPng(); setShowExport(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg transition-colors"><FileImage className="w-3.5 h-3.5" /> Export PNG</button>
            <button onClick={() => { onExportPdf(); setShowExport(false); }} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 rounded-lg transition-colors"><FilePdf className="w-3.5 h-3.5" /> Export Pitch Deck</button>
          </div>
        )}
      </div>
    </div>
  );
}
