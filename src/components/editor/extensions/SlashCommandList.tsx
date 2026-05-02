import React, { forwardRef, useEffect, useImperativeHandle, useState } from "react";

export const SLASH_COMMANDS = [
  { id: "sceneHeading", label: "Scene Heading", shortcut: "Ctrl+1" },
  { id: "action", label: "Action", shortcut: "Ctrl+2" },
  { id: "character", label: "Character", shortcut: "Ctrl+3" },
  { id: "dialogue", label: "Dialogue", shortcut: "Ctrl+4" },
  { id: "parenthetical", label: "Parenthetical", shortcut: "Ctrl+5" },
  { id: "transition", label: "Transition", shortcut: "Ctrl+6" },
  { id: "shot", label: "Shot", shortcut: "Ctrl+7" },
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
    <div className="bg-white dark:bg-zinc-800 shadow-2xl rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden flex flex-col py-1 min-w-[200px]">
      {props.items.map((item: any, index: number) => (
        <button
          key={index}
          className={`px-4 py-2 text-sm text-left transition-colors flex items-center justify-between ${
            index === selectedIndex
              ? "bg-blue-500 text-white"
              : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
          }`}
          onClick={() => props.command({ id: item.id })}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <span
            className={`
              ${item.id === "sceneHeading" ? "font-bold uppercase tracking-wider" : ""}
              ${item.id === "character" ? "uppercase tracking-widest text-center w-full" : ""}
              ${item.id === "dialogue" ? "italic" : ""}
              ${item.id === "parenthetical" ? "text-zinc-400" : ""}
            `}
          >
            {item.label}
          </span>
          <span className="text-xs opacity-50 ml-4">{item.shortcut}</span>
        </button>
      ))}
      <div className="px-3 py-1 border-t border-zinc-100 dark:border-zinc-800 mt-1">
        <span className="text-[10px] text-zinc-400">↑↓ navigate · Enter accept</span>
      </div>
    </div>
  );
});

SlashCommandList.displayName = "SlashCommandList";
