import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export const SLASH_COMMANDS = [
  { id: "sceneHeading", label: "Scene Heading", shortcut: "Ctrl+1", icon: "🎬", description: "INT./EXT. LOCATION - TIME" },
  { id: "action", label: "Action", shortcut: "Ctrl+2", icon: "📝", description: "Describe what we see" },
  { id: "character", label: "Character", shortcut: "Ctrl+3", icon: "🎭", description: "Character name (ALL CAPS)" },
  { id: "dialogue", label: "Dialogue", shortcut: "Ctrl+4", icon: "💬", description: "Character's spoken lines" },
  { id: "parenthetical", label: "Parenthetical", shortcut: "Ctrl+5", icon: "🔄", description: "(how the line is delivered)" },
  { id: "transition", label: "Transition", shortcut: "Ctrl+6", icon: "➡️", description: "CUT TO:, FADE OUT." },
  { id: "shot", label: "Shot", shortcut: "Ctrl+7", icon: "📷", description: "Camera direction" },
  { id: "extension", label: "Extension (V.O./O.S.)", shortcut: "Ctrl+8", icon: "🔊", description: "Voice Over / Off Screen" },
];

export const SlashCommandList = forwardRef((props: any, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: any) => {
      if (event.key === "ArrowUp") {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }
      if (event.key === "ArrowDown") {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        const item = props.items[selectedIndex];
        if (item) {
          props.command({ id: item.id });
        }
        return true;
      }
      return false;
    },
  }));

  if (!props.items || props.items.length === 0) {
    return null;
  }

  return (
    <div className="bg-white dark:bg-zinc-800 shadow-2xl rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden flex flex-col py-1 min-w-[260px] backdrop-blur-xl">
      <div className="px-3 py-1.5 border-b border-zinc-100 dark:border-zinc-700/50">
        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Screenplay Elements</span>
      </div>
      {props.items.map((item: any, index: number) => (
        <button
          key={index}
          className={`px-3 py-2.5 text-sm text-left transition-all flex items-center gap-3 ${
            index === selectedIndex
              ? "bg-blue-500 text-white"
              : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
          }`}
          onClick={() => props.command({ id: item.id })}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <span className="text-base w-6 text-center shrink-0">{item.icon || "📄"}</span>
          <div className="flex-1 min-w-0">
            <span
              className={`block font-medium text-sm ${
                item.id === "sceneHeading" ? "font-bold uppercase tracking-wider" : ""
              } ${item.id === "character" ? "uppercase tracking-widest" : ""}`}
            >
              {item.label}
            </span>
            {item.description && (
              <span className={`block text-[10px] mt-0.5 ${
                index === selectedIndex ? "text-blue-100" : "text-zinc-400 dark:text-zinc-500"
              }`}>
                {item.description}
              </span>
            )}
          </div>
          <span className={`text-[10px] font-mono shrink-0 ${
            index === selectedIndex ? "text-blue-200" : "text-zinc-400"
          }`}>
            {item.shortcut}
          </span>
        </button>
      ))}
      <div className="px-3 py-1.5 border-t border-zinc-100 dark:border-zinc-700/50 mt-0.5">
        <span className="text-[10px] text-zinc-400">↑↓ navigate · Enter accept · Esc dismiss</span>
      </div>
    </div>
  );
});

SlashCommandList.displayName = "SlashCommandList";
