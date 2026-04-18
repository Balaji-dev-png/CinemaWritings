"use client";

import { X, Keyboard } from "lucide-react";

const SHORTCUT_GROUPS = [
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
    title: "Navigation",
    shortcuts: [
      { keys: ["Ctrl", "S"], desc: "Versions panel (save drafts)" },
      { keys: ["Ctrl", "\\"], desc: "Toggle scene navigator" },
      { keys: ["Ctrl", "Shift", "F"], desc: "Toggle focus mode" },
      { keys: ["Ctrl", "/"], desc: "This shortcuts panel" },
      { keys: ["Esc"], desc: "Dismiss autocomplete / close panels" },
    ],
  },
  {
    title: "Autocomplete",
    shortcuts: [
      { keys: ["↑", "↓"], desc: "Navigate suggestions" },
      { keys: ["Tab"], desc: "Accept suggestion" },
      { keys: ["Esc"], desc: "Dismiss suggestions" },
    ],
  },
];

export function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#18181b] rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-2xl w-full max-w-xl max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 sticky top-0 bg-white dark:bg-[#18181b] z-10">
          <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-100 flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-zinc-400" />
            Keyboard Shortcuts
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.title}>
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3">{group.title}</h3>
              <div className="space-y-2">
                {group.shortcuts.map((s, i) => (
                  <div key={i} className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-zinc-600 dark:text-zinc-400">{s.desc}</span>
                    <div className="flex items-center gap-1">
                      {s.keys.map((key, ki) => (
                        <kbd key={ki} className="px-2 py-0.5 text-[10px] font-mono font-bold bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 rounded-md shadow-sm">
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
      </div>
    </div>
  );
}
