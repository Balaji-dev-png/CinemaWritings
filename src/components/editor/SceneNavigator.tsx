"use client";

import { useEffect, useState } from "react";
import { Editor } from "@tiptap/react";
import { List, MapPin, ChevronRight } from "lucide-react";

interface SceneEntry {
  index: number;
  text: string;
  pos: number;
}

export function SceneNavigator({ editor }: { editor: Editor | null }) {
  const [scenes, setScenes] = useState<SceneEntry[]>([]);
  const [activePos, setActivePos] = useState<number>(-1);

  useEffect(() => {
    if (!editor) return;

    const updateScenes = () => {
      const list: SceneEntry[] = [];
      let idx = 0;
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === "sceneHeading") {
          idx++;
          list.push({ index: idx, text: node.textContent || "UNTITLED SCENE", pos });
        }
      });
      setScenes(list);

      // Track active scene
      const { from } = editor.state.selection;
      let closest = -1;
      for (const s of list) {
        if (s.pos <= from) closest = s.pos;
      }
      setActivePos(closest);
    };

    updateScenes();
    editor.on("update", updateScenes);
    editor.on("selectionUpdate", () => {
      const { from } = editor.state.selection;
      let closest = -1;
      for (const s of scenes) {
        if (s.pos <= from) closest = s.pos;
      }
      setActivePos(closest);
    });

    return () => {
      editor.off("update", updateScenes);
    };
  }, [editor]);

  const scrollToScene = (pos: number) => {
    if (!editor) return;
    editor.chain().focus().setTextSelection(pos + 1).run();
    // Scroll the node into view
    const dom = editor.view.domAtPos(pos + 1);
    if (dom.node && (dom.node as HTMLElement).scrollIntoView) {
      (dom.node as HTMLElement).scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
        <List className="w-4 h-4 text-zinc-400" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-500">
          Scenes ({scenes.length})
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto py-2 space-y-0.5">
        {scenes.length === 0 && (
          <p className="text-xs text-zinc-400 dark:text-zinc-600 px-4 py-8 text-center">
            No scenes yet. Start typing a scene heading (INT. / EXT.)
          </p>
        )}
        {scenes.map((scene) => (
          <button
            key={scene.pos}
            onClick={() => scrollToScene(scene.pos)}
            className={`w-full text-left px-4 py-2.5 flex items-start gap-2.5 transition-all group ${
              activePos === scene.pos
                ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-blue-500"
                : "hover:bg-zinc-50 dark:hover:bg-zinc-800/50 border-l-2 border-transparent"
            }`}
          >
            <span className={`text-[10px] font-bold mt-0.5 min-w-[20px] text-right ${
              activePos === scene.pos ? "text-blue-500" : "text-zinc-400 dark:text-zinc-600"
            }`}>
              {scene.index}
            </span>
            <span className={`text-xs leading-snug line-clamp-2 ${
              activePos === scene.pos
                ? "text-blue-700 dark:text-blue-300 font-medium"
                : "text-zinc-600 dark:text-zinc-400"
            }`}>
              {scene.text}
            </span>
            <ChevronRight className={`w-3 h-3 mt-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity ${
              activePos === scene.pos ? "text-blue-400" : "text-zinc-300"
            }`} />
          </button>
        ))}
      </div>

      {/* Page estimate */}
      <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 py-3">
        <div className="flex items-center gap-2 text-[10px] text-zinc-400 dark:text-zinc-600 uppercase font-bold tracking-widest">
          <MapPin className="w-3 h-3" />
          {scenes.length} scene{scenes.length !== 1 ? "s" : ""}
        </div>
      </div>
    </div>
  );
}
