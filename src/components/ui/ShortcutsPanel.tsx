"use client";

import { X, Keyboard } from "lucide-react";

const SHORTCUT_GROUPS = [
  {
    title: "Set Element Type",
    shortcuts: [
      { keys: ["Ctrl", "1"], desc: "Scene Heading" },
      { keys: ["Ctrl", "2"], desc: "Action" },
      { keys: ["Ctrl", "3"], desc: "Character" },
      { keys: ["Ctrl", "4"], desc: "Dialogue" },
      { keys: ["Ctrl", "5"], desc: "Parenthetical" },
      { keys: ["Ctrl", "6"], desc: "Transition" },
      { keys: ["Ctrl", "7"], desc: "Shot" },
      { keys: ["Ctrl", "8"], desc: "Extension (V.O./O.S.)" },
    ],
  },
  {
    title: "Element Flow",
    shortcuts: [
      { keys: ["Enter"], desc: "New line → auto-format next element" },
      { keys: ["Enter"], desc: "On empty block → escape to Action" },
      { keys: ["Tab"], desc: "Cycle element type (empty block)" },
      { keys: ["Tab"], desc: "Action → Character / Character → Paren" },
      { keys: ["Shift", "Tab"], desc: "Reverse cycle element type" },
    ],
  },
  {
    title: "Text Formatting",
    shortcuts: [
      { keys: ["Ctrl", "B"], desc: "Bold" },
      { keys: ["Ctrl", "I"], desc: "Italic" },
      { keys: ["Ctrl", "U"], desc: "Underline" },
      { keys: ["Ctrl", "Shift", "X"], desc: "Strikethrough" },
      { keys: ["Ctrl", "Z"], desc: "Undo" },
      { keys: ["Ctrl", "Shift", "Z"], desc: "Redo" },
    ],
  },
  {
    title: "Autocomplete & Slash Commands",
    shortcuts: [
      { keys: ["/"], desc: "Open element command menu (on empty line)" },
      { keys: ["Ctrl", "Space"], desc: "Force open element command menu" },
      { keys: ["↑", "↓"], desc: "Navigate suggestions" },
      { keys: ["Enter", "Tab"], desc: "Accept suggestion" },
      { keys: ["Esc"], desc: "Dismiss suggestions" },
    ],
  },
  {
    title: "Navigation & Panels",
    shortcuts: [
      { keys: ["Ctrl", "\\"], desc: "Toggle scene navigator (left panel)" },
      { keys: ["Ctrl", "S"], desc: "Versions panel (save named draft)" },
      { keys: ["Ctrl", "Shift", "F"], desc: "Toggle focus mode" },
      { keys: ["Ctrl", "/"], desc: "Open this shortcuts panel" },
      { keys: ["Esc"], desc: "Close open panels" },
    ],
  },
  {
    title: "Zoom",
    shortcuts: [
      { keys: ["Ctrl", "Scroll ↑"], desc: "Zoom in" },
      { keys: ["Ctrl", "Scroll ↓"], desc: "Zoom out" },
      { keys: ["+ button"], desc: "Zoom in (toolbar)" },
      { keys: ["− button"], desc: "Zoom out (toolbar)" },
    ],
  },
  {
    title: "Page Management",
    shortcuts: [
      { keys: ["📄+"], desc: "Add a new page after current (toolbar)" },
      { keys: ["📄✕"], desc: "Delete current page (toolbar)" },
    ],
  },
  {
    title: "Export & Import",
    shortcuts: [
      { keys: ["⬇ button"], desc: "Open export menu (PDF, Fountain, TXT)" },
      { keys: ["⬆ button"], desc: "Import from Fountain (.fountain / .txt)" },
      { keys: ["Print shortcut"], desc: "Browser print dialog (use ⬇ menu)" },
    ],
  },
  {
    title: "Director's Suite (Canvas)",
    shortcuts: [
      { keys: ["✦ button"], desc: "Open Director's Suite workspace" },
      { keys: ["Space", "Drag"], desc: "Pan the canvas" },
      { keys: ["Scroll"], desc: "Pan vertically" },
      { keys: ["Ctrl", "Scroll"], desc: "Zoom canvas in / out" },
      { keys: ["Click"], desc: "Select a node" },
      { keys: ["Drag node"], desc: "Move a node" },
      { keys: ["Drag handle"], desc: "Resize a node" },
      { keys: ["Click edge dot"], desc: "Start drawing a connection" },
      { keys: ["Esc"], desc: "Cancel connection drawing" },
    ],
  },
];

export function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#111113] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-white dark:bg-[#111113] z-10">
          <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-zinc-400" />
            Keyboard Shortcuts
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {SHORTCUT_GROUPS.map((group) => (
              <div key={group.title} className="bg-zinc-50 dark:bg-zinc-900/60 rounded-xl p-4 border border-zinc-100 dark:border-zinc-800">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3 flex items-center gap-1.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-300 dark:bg-zinc-600" />
                  {group.title}
                </h3>
                <div className="space-y-2">
                  {group.shortcuts.map((s, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-1">
                      <span className="text-xs text-zinc-600 dark:text-zinc-400 leading-tight">{s.desc}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {s.keys.map((key, ki) => (
                          <kbd
                            key={ki}
                            className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded shadow-sm whitespace-nowrap"
                          >
                            {key}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <p className="text-center text-[10px] text-zinc-400 dark:text-zinc-600 mt-6">
            Press <kbd className="px-1.5 py-0.5 text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded">Esc</kbd> or click outside to close
          </p>
        </div>
      </div>
    </div>
  );
}
