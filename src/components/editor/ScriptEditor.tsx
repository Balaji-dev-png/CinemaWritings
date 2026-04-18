"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Action,
  SceneHeading,
  Character,
  Dialogue,
  Parenthetical,
  Transition,
  Shot,
} from "./nodes/ScriptNodes";
import { ScriptKeymap } from "./extensions/KeymapLogic";
import { updateScript } from "@/lib/storage";
import { Underline } from "@tiptap/extension-underline";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  Eraser,
  Strikethrough,
  CaseUpper,
  Type,
  FileText,
} from "lucide-react";

/* ─── Autocomplete Dictionaries ─── */
const SCENE_PREFIXES = ["INT. ", "EXT. ", "INT./EXT. "];
const SCENE_TIMES = ["DAY", "NIGHT", "CONTINUOUS", "LATER", "MOMENTS LATER", "MORNING", "EVENING", "DAWN", "DUSK"];
const TRANSITIONS_LIST = [
  "CUT TO:", "FADE IN:", "FADE OUT.", "FADE TO BLACK.",
  "DISSOLVE TO:", "SMASH CUT TO:", "MATCH CUT TO:",
  "JUMP CUT TO:", "WIPE TO:", "TIME CUT:",
];

/* ─── Completion Engine (pure function — no hooks) ─── */
function getCompletions(query: string, nodeType: string, ed: Editor): { id: string; label?: string }[] {
  if (!query || query.trim() === "") return [];
  const upper = query.toUpperCase().trim();

  // ── Characters: dynamically learned from document ──
  if (nodeType === "character") {
    const names = new Set<string>();
    ed.state.doc.descendants((node) => {
      if (node.type.name === "character" && node.textContent.trim().length > 1) {
        names.add(node.textContent.trim().toUpperCase());
      }
    });
    return Array.from(names)
      .filter((n) => n.startsWith(upper) && n !== upper)
      .slice(0, 6)
      .map((id) => ({ id }));
  }

  // ── Transitions ──
  if (nodeType === "transition") {
    return TRANSITIONS_LIST
      .filter((t) => t.toUpperCase().startsWith(upper) && t.toUpperCase() !== upper)
      .map((id) => ({ id }));
  }

  // ── Scene Headings & Action/Paragraph ──
  if (nodeType === "sceneHeading" || nodeType === "action" || nodeType === "paragraph") {

    // 1) Short text without spaces: suggest INT./EXT. prefixes
    if (upper.length >= 1 && upper.length <= 5 && !upper.includes(" ")) {
      const prefixHits = SCENE_PREFIXES
        .filter((p) => p.toUpperCase().startsWith(upper) && p.toUpperCase().trim() !== upper);
      if (prefixHits.length > 0) return prefixHits.map((id) => ({ id }));
    }

    // 2) Has a scene prefix
    const prefixMatch = upper.match(/^(INT\.\s*|EXT\.\s*|INT\.\/EXT\.\s*)/);
    if (prefixMatch) {
      const scenePrefix = prefixMatch[0];
      const afterPrefix = upper.slice(scenePrefix.length);

      // 2a) Has " - " → suggest time of day ONLY if not already complete
      if (afterPrefix.includes(" - ")) {
        const dashParts = afterPrefix.split(" - ");
        const locationPart = dashParts[0];
        const timePart = (dashParts[1] || "").trim();
        const exactMatch = SCENE_TIMES.find((t) => t === timePart);
        if (!exactMatch) {
          return SCENE_TIMES
            .filter((t) => t.startsWith(timePart) && t !== timePart)
            .map((t) => ({ id: `${scenePrefix}${locationPart} - ${t}` }));
        }
        return [];
      }

      // 2b) Location text but no dash → suggest locations + dash
      if (afterPrefix.length > 0) {
        const locations = new Set<string>();
        ed.state.doc.descendants((node) => {
          if (node.type.name === "sceneHeading") {
            const m = node.textContent.trim().toUpperCase().match(/^(?:INT\.|EXT\.|INT\.\/EXT\.)\s*(.+?)(?:\s+-\s+|$)/);
            if (m?.[1] && m[1].length > 1) locations.add(m[1]);
          }
        });
        const locHits = Array.from(locations)
          .filter((l) => l.startsWith(afterPrefix) && l !== afterPrefix)
          .slice(0, 5)
          .map((l) => ({ id: `${scenePrefix}${l} - ` }));
        if (locHits.length > 0) return locHits;
        return [{ id: `${upper} - ` }];
      }
    }
  }

  // ── Inline vocabulary prediction ──
  if ((nodeType === "action" || nodeType === "dialogue" || nodeType === "paragraph") && query.length >= 4) {
    const lastWord = (query.split(/\s+/).pop() || "").toLowerCase();
    if (lastWord.length >= 3) {
      const vocab = new Set<string>();
      ed.state.doc.descendants((node) => {
        if (node.isText && node.text) {
          node.text.split(/\s+/).forEach((w) => {
            const clean = w.replace(/[^\w']/g, "");
            if (clean.length > 4) vocab.add(clean);
          });
        }
      });
      const prefixStr = query.substring(0, query.length - lastWord.length);
      return Array.from(vocab)
        .filter((w) => w.toLowerCase().startsWith(lastWord) && w.toLowerCase() !== lastWord)
        .slice(0, 4)
        .map((w) => ({ id: prefixStr + w }));
    }
  }

  return [];
}

/* ─── Element Type Labels ─── */
const ELEMENT_LABELS: Record<string, string> = {
  sceneHeading: "SCENE HEADING",
  action: "ACTION",
  paragraph: "ACTION",
  character: "CHARACTER",
  dialogue: "DIALOGUE",
  parenthetical: "PAREN",
  transition: "TRANSITION",
  shot: "SHOT",
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*                  COMPONENT                       */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const ScriptEditor = ({
  scriptId,
  initialContent,
  docBgColor,
  docFont,
  onStatsUpdate,
  onEditorReady,
}: {
  scriptId: string;
  initialContent: string;
  docBgColor?: string;
  docFont?: string;
  onStatsUpdate?: (stats: { words: number; pages: number; scenes: number; currentElement: string }) => void;
  onEditorReady?: (editor: Editor) => void;
}) => {
  const editorRef = useRef<Editor | null>(null);
  const [popup, setPopup] = useState<{
    top: number;
    left: number;
    items: { id: string }[];
    selected: number;
  } | null>(null);
  const popupItemsRef = useRef<{ id: string }[]>([]);

  /* ── Apply a completion ── */
  const applyCompletion = useCallback((completionId: string) => {
    const ed = editorRef.current;
    if (!ed) return;

    const { from } = ed.state.selection;
    const $pos = ed.state.doc.resolve(from);
    const blockStart = from - $pos.parentOffset;

    // Replace entire block content with completion
    ed.chain().focus().deleteRange({ from: blockStart, to: from }).insertContent(completionId).run();

    // Auto-convert block type
    if (/^(INT\.|EXT\.|INT\.\/EXT\.)\s/i.test(completionId)) {
      ed.chain().focus().setNode("sceneHeading").run();
    } else if (TRANSITIONS_LIST.includes(completionId)) {
      ed.chain().focus().setNode("transition").run();
    }

    setPopup(null);
    popupItemsRef.current = [];
  }, []);

  /* ── Editor ── */
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      TextStyle,
      Color,
      FontFamily,
      Action,
      SceneHeading,
      Character,
      Dialogue,
      Parenthetical,
      Transition,
      Shot,
      ScriptKeymap,
      Placeholder.configure({
        placeholder: ({ node }) => {
          const type = node.type.name;
          if (type === "sceneHeading") return "INT. LOCATION - DAY";
          if (type === "character") return "CHARACTER NAME";
          if (type === "dialogue") return "Dialogue…";
          if (type === "parenthetical") return "(beat)";
          if (type === "transition") return "CUT TO:";
          if (type === "action" || type === "paragraph") return "Action description…";
          return "Start typing…";
        },
      }),
    ],
    content: initialContent,

    onUpdate: ({ editor: ed }) => {
      editorRef.current = ed;
      updateScript(scriptId, { content: ed.getHTML() });

      // ── Autocomplete tick ──
      try {
        const { from } = ed.state.selection;
        const $pos = ed.state.doc.resolve(from);
        const text = $pos.parent.textContent;
        const nodeType = $pos.parent.type.name;
        const items = getCompletions(text, nodeType, ed);

        if (items.length > 0) {
          const coords = ed.view.coordsAtPos(from);
          popupItemsRef.current = items;
          setPopup({ top: coords.bottom + 4, left: coords.left, items, selected: 0 });
        } else {
          popupItemsRef.current = [];
          setPopup(null);
        }
      } catch {
        popupItemsRef.current = [];
        setPopup(null);
      }

      // ── Stats callback ──
      if (onStatsUpdate) {
        const text = ed.state.doc.textContent;
        const words = text.split(/\s+/).filter(Boolean).length;
        const pages = Math.max(1, Math.ceil(words / 250));
        let scenes = 0;
        ed.state.doc.descendants((n) => { if (n.type.name === "sceneHeading") scenes++; });
        const { $head } = ed.state.selection;
        onStatsUpdate({ words, pages, scenes, currentElement: ELEMENT_LABELS[$head.parent.type.name] || "ACTION" });
      }
    },

    editorProps: {
      attributes: {
        class: "prose-none focus:outline-none w-full max-w-full min-h-[11in]",
        spellcheck: "true",
      },
      handleKeyDown: (_view, event) => {
        if (popupItemsRef.current.length === 0) return false;

        if (event.key === "ArrowDown") {
          event.preventDefault();
          setPopup((p) =>
            p ? { ...p, selected: (p.selected + 1) % p.items.length } : null
          );
          return true;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          setPopup((p) =>
            p ? { ...p, selected: (p.selected - 1 + p.items.length) % p.items.length } : null
          );
          return true;
        }
        if (event.key === "Tab" || (event.key === "Enter" && popupItemsRef.current.length > 0)) {
          event.preventDefault();
          const current = popupItemsRef.current;
          setPopup((p) => {
            if (p && current[p.selected]) {
              setTimeout(() => applyCompletion(current[p.selected].id), 0);
            }
            return null;
          });
          popupItemsRef.current = [];
          return true;
        }
        if (event.key === "Escape") {
          setPopup(null);
          popupItemsRef.current = [];
          return true;
        }
        return false;
      },
    },
    immediatelyRender: false,
  });

  // Sync ref on mount and notify parent
  useEffect(() => {
    if (editor) {
      editorRef.current = editor;
      onEditorReady?.(editor);
    }
  }, [editor, onEditorReady]);

  if (!editor) return null;

  /* ── Toolbar helpers ── */
  const handleUppercase = () => {
    const { from, to, empty } = editor.state.selection;
    if (empty) return;
    const text = editor.state.doc.textBetween(from, to, " ");
    editor.chain().focus().insertContentAt({ from, to }, text.toUpperCase()).run();
  };

  const currentElement = ELEMENT_LABELS[editor.state.selection.$head.parent.type.name] || "ACTION";

  return (
    <div className="w-full flex flex-col items-center gap-4">
      {/* ─── Formatting Toolbar ─── */}
      <div className="sticky top-4 z-40 flex items-center gap-1 p-1.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-lg shadow-black/5 dark:shadow-black/30 transition-colors duration-300">
        {/* Element Type Indicator */}
        <div className="px-3 py-1.5 text-[10px] font-bold tracking-widest text-zinc-400 dark:text-zinc-500 border-r border-zinc-200 dark:border-zinc-700 uppercase min-w-[90px] text-center select-none">
          {currentElement}
        </div>

        {/* Text Color */}
        <div className="px-2 flex items-center" title="Text Color">
          <input
            type="color"
            onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
            value={editor.getAttributes("textStyle").color || "#000000"}
            className="w-5 h-5 p-0 border-0 rounded-full cursor-pointer bg-transparent"
          />
        </div>

        <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700" />

        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 rounded-xl transition-all ${editor.isActive("bold") ? "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          title="Bold"
        >
          <BoldIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 rounded-xl transition-all ${editor.isActive("italic") ? "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          title="Italic"
        >
          <ItalicIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`p-2 rounded-xl transition-all ${editor.isActive("underline") ? "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          title="Underline"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 rounded-xl transition-all ${editor.isActive("strike") ? "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          title="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700" />

        <button
          onClick={handleUppercase}
          className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          title="Force Uppercase"
        >
          <CaseUpper className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => Object.keys(editor.schema.marks).forEach((m) => editor.chain().focus().unsetMark(m).run())}
          className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          title="Clear Formatting"
        >
          <Eraser className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ─── Paper ─── */}
      <div
        className="script-page transition-all duration-300 relative"
        style={{
          ...(docBgColor && docBgColor !== "default" ? { backgroundColor: docBgColor } : {}),
          ...(docFont && docFont !== "default" ? { fontFamily: docFont } : {}),
        }}
      >
        <EditorContent editor={editor} />

        {/* ─── Autocomplete Popup ─── */}
        {popup && popup.items.length > 0 && (
          <div
            className="fixed z-[100] bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl shadow-2xl shadow-black/10 dark:shadow-black/50 border border-zinc-200 dark:border-zinc-700 rounded-xl overflow-hidden py-1 min-w-[180px] max-w-[300px] text-sm animate-in fade-in slide-in-from-top-1 duration-150"
            style={{ top: popup.top, left: popup.left }}
          >
            {popup.items.map((item, i) => (
              <button
                key={i}
                className={`w-full text-left px-3 py-2 flex items-center gap-2 transition-colors ${
                  i === popup.selected
                    ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  applyCompletion(item.id);
                }}
                onMouseEnter={() => setPopup((p) => (p ? { ...p, selected: i } : null))}
              >
                <Type className="w-3 h-3 opacity-40 shrink-0" />
                <span className="truncate font-mono text-xs">{item.id}</span>
              </button>
            ))}
            <div className="px-3 py-1 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-400">↑↓ navigate · Tab accept · Esc dismiss</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
