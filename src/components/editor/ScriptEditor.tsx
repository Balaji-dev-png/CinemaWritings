"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import { motion } from "framer-motion";
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
  Extension,
} from "./nodes/ScriptNodes";
import { ScriptKeymap } from "./extensions/KeymapLogic";
import { SlashCommandsExtension } from "./extensions/SlashCommands";
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
  GripVertical,
} from "lucide-react";

/* ─── Autocomplete / Suggestions Data ─── */
const SCENE_PREFIXES = ["INT.", "EXT.", "INT./EXT."];
const SCENE_TIMES = ["DAY", "NIGHT", "MORNING", "EVENING", "LATER", "CONTINUOUS", "MOMENTS LATER"];
const TRANSITIONS_LIST = ["CUT TO:", "FADE OUT.", "SMASH CUT:", "MATCH CUT:", "DISSOLVE TO:"];

const ELEMENT_COMMANDS = [
  { id: "sceneHeading", label: "Scene Heading", shortcut: "Ctrl+1", type: "command" },
  { id: "action", label: "Action", shortcut: "Ctrl+2", type: "command" },
  { id: "character", label: "Character", shortcut: "Ctrl+3", type: "command" },
  { id: "dialogue", label: "Dialogue", shortcut: "Ctrl+4", type: "command" },
  { id: "parenthetical", label: "Parenthetical", shortcut: "Ctrl+5", type: "command" },
  { id: "transition", label: "Transition", shortcut: "Ctrl+6", type: "command" },
  { id: "shot", label: "Shot", shortcut: "Ctrl+7", type: "command" },
  { id: "extension", label: "Extension (V.O./O.S.)", shortcut: "Ctrl+8", type: "command" },
];

function getCompletions(query: string, nodeType: string, ed: Editor): Array<{ id: string; label?: string; shortcut?: string; type?: string }> {
  if (!query) return [];
  
  const upper = query.toUpperCase().trim();
  if (upper.length === 0) return [];

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
  extension: "EXTENSION",
};

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*                  COMPONENT                       */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export const ScriptEditor = ({
  scriptId,
  initialContent,
  docBgColor,
  docFont,
  docTextColor,
  onStatsUpdate,
  onEditorReady,
}: {
  scriptId: string;
  initialContent: string;
  docBgColor?: string;
  docFont?: string;
  docTextColor?: string;
  onStatsUpdate?: (stats: { words: number; pages: number; scenes: number; currentElement: string }) => void;
  onEditorReady?: (editor: Editor) => void;
}) => {
  const editorRef = useRef<Editor | null>(null);
  const [popup, setPopup] = useState<{
    top: number;
    left: number;
    items: Array<{ id: string; label?: string; shortcut?: string; type?: string }>;
    selected: number;
  } | null>(null);
  const popupItemsRef = useRef<Array<{ id: string; label?: string; shortcut?: string; type?: string }>>([]);
  const [showElementMenu, setShowElementMenu] = useState(false);

  /* ── Apply a completion ── */
  const applyCompletion = useCallback((completionId: string) => {
    if (!editorRef.current) return;
    const { from, to } = editorRef.current.state.selection;
    const $pos = editorRef.current.state.doc.resolve(from);
    const text = $pos.parent.textContent;
    const match = text.match(/[\w']+$/);
    if (match) {
      const start = from - match[0].length;
      editorRef.current.chain().focus().deleteRange({ from: start, to }).insertContent(completionId).run();
    } else {
      editorRef.current.chain().focus().insertContent(completionId).run();
    }
    
    // Auto-convert block type
    if (/^(INT\.|EXT\.|INT\.\/EXT\.)\s/i.test(completionId)) {
      editorRef.current.chain().focus().setNode("sceneHeading").run();
    } else if (TRANSITIONS_LIST.includes(completionId)) {
      editorRef.current.chain().focus().setNode("transition").run();
    }
    
    setPopup(null);
    popupItemsRef.current = [];
  }, []);

  useEffect(() => {
    const scrollContainer = document.querySelector('.overflow-y-auto');
    const handleScroll = () => {
      setPopup(null);
      popupItemsRef.current = [];
    };
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll, { passive: true });
    }
    return () => {
      if (scrollContainer) scrollContainer.removeEventListener("scroll", handleScroll);
    };
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
      Extension,
      ScriptKeymap,
      SlashCommandsExtension,
      Placeholder.configure({
        placeholder: ({ node }) => {
          const type = node.type.name;
          if (type === "sceneHeading") return "INT. LOCATION - DAY";
          if (type === "character") return "CHARACTER NAME";
          if (type === "dialogue") return "Dialogue…";
          if (type === "parenthetical") return "(beat)";
          if (type === "transition") return "CUT TO:";
          if (type === "extension") return "(V.O.)";
          if (type === "action" || type === "paragraph") return "Action description…";
          return "Start typing… (type / for elements)";
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
          const editorElement = ed.view.dom.parentElement;
          if (editorElement) {
            const rect = editorElement.getBoundingClientRect();
            popupItemsRef.current = items;
            setPopup({ 
              top: (coords.bottom - rect.top) + 4, 
              left: (coords.left - rect.left), 
              items, 
              selected: 0 
            });
          }
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
        class: "prose-none focus:outline-none w-full max-w-full min-h-[11in] screenplay-canvas",
        spellcheck: "true",
      },
      handleKeyDown: (_view, event) => {
        // ── Ctrl+1 through Ctrl+8: Set element type ──
        if (event.ctrlKey && !event.shiftKey && !event.altKey) {
          const keyMap: Record<string, string> = {
            "1": "sceneHeading",
            "2": "action",
            "3": "character",
            "4": "dialogue",
            "5": "parenthetical",
            "6": "transition",
            "7": "shot",
            "8": "extension",
          };
          if (keyMap[event.key]) {
            event.preventDefault();
            editorRef.current?.chain().focus().setNode(keyMap[event.key]).run();
            return true;
          }
        }

        if (event.ctrlKey && event.code === "Space") {
          event.preventDefault();
          const { from } = editorRef.current!.state.selection;
          const coords = _view.coordsAtPos(from);
          const editorElement = _view.dom.parentElement;
          if (editorElement) {
            const rect = editorElement.getBoundingClientRect();
            popupItemsRef.current = ELEMENT_COMMANDS;
            setPopup({ 
              top: (coords.bottom - rect.top) + 4, 
              left: (coords.left - rect.left), 
              items: ELEMENT_COMMANDS, 
              selected: 0 
            });
          }
          return true;
        }

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
        if (event.key === "Enter" || event.key === "Tab") {
          event.preventDefault();
          setPopup((p) => {
            if (p && editorRef.current) {
              const selectedItem = popupItemsRef.current[p.selected];
              if (!selectedItem) return null;
              
              const { from, to } = editorRef.current.state.selection;
              const $pos = editorRef.current.state.doc.resolve(from);
              const text = $pos.parent.textContent;

              setTimeout(() => {
                if (selectedItem.type === "command") {
                  editorRef.current?.chain()
                    .focus()
                    .setNode(selectedItem.id)
                    .run();
                } else {
                  const match = text.match(/[\w']+$/);
                  if (match) {
                    const start = from - match[0].length;
                    editorRef.current?.chain()
                      .setTextSelection({ from: start, to })
                      .deleteSelection()
                      .insertContent(selectedItem.id)
                      .focus()
                      .run();
                  } else {
                    applyCompletion(selectedItem.id);
                  }
                }
              }, 0);
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
    <div className="w-full flex flex-col items-center gap-4 relative">
      <style jsx global>{`
        ${docTextColor ? `
        .screenplay-canvas p {
          color: ${docTextColor} !important;
        }
        ` : ""}
        .screenplay-canvas {
          font-family: '${docFont}', 'Courier Prime', monospace !important;
        }
      `}</style>

      {/* ─── Formatting Toolbar ─── */}
      <motion.div 
        drag 
        dragMomentum={false}
        className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 max-md:top-auto max-md:bottom-4 max-md:left-1/2 max-md:-translate-x-1/2 max-md:-translate-y-0 z-40 flex flex-col max-md:flex-row items-center gap-1.5 max-md:gap-3 p-1.5 max-md:p-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-2xl max-md:rounded-[20px] border border-zinc-200/80 dark:border-zinc-800 shadow-xl shadow-black/10 dark:shadow-black/40 transition-opacity duration-300 opacity-60 hover:opacity-100 focus-within:opacity-100 group cursor-grab active:cursor-grabbing max-md:w-[90vw] max-md:max-w-md max-md:overflow-x-auto max-md:no-scrollbar"
      >
        {/* Drag Handle */}
        <div className="p-1 opacity-40 hover:opacity-100 transition-opacity flex items-center justify-center max-md:hidden">
           <GripVertical className="w-3.5 h-3.5 text-zinc-500" />
        </div>

        {/* Element Type Dropdown */}
        <div className="relative">
          <button 
            onMouseDown={(e) => { e.preventDefault(); setShowElementMenu(!showElementMenu); }}
            className="py-2 max-md:py-1 px-1.5 max-md:px-3 text-[10px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors border-b max-md:border-b-0 max-md:border-r border-zinc-200 dark:border-zinc-700 uppercase [writing-mode:vertical-lr] max-md:[writing-mode:horizontal-tb] rotate-180 max-md:rotate-0 select-none cursor-pointer"
            title="Change Element Type"
          >
            {currentElement}
          </button>
          
          {showElementMenu && (
            <div className="absolute right-full mr-4 max-md:right-auto max-md:mr-0 max-md:left-0 top-0 max-md:top-auto max-md:bottom-full max-md:mb-4 bg-white dark:bg-zinc-800 shadow-xl rounded-xl border border-zinc-200 dark:border-zinc-700 flex flex-col py-1 min-w-[180px]">
              {ELEMENT_COMMANDS.map((cmd) => (
                <button
                  key={cmd.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor.chain().focus().setNode(cmd.id).run();
                    setShowElementMenu(false);
                  }}
                  className={`px-4 py-2 text-sm text-left hover:bg-zinc-100 dark:hover:bg-zinc-700 flex items-center justify-between ${editor.isActive(cmd.id) ? "text-blue-500 font-medium" : "text-zinc-700 dark:text-zinc-300"}`}
                >
                  <span>{cmd.label}</span>
                  <span className="text-[10px] text-zinc-400 ml-3">{cmd.shortcut}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="h-px w-5 max-md:w-px max-md:h-5 bg-zinc-200 dark:bg-zinc-700 shrink-0" />

        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
          className={`p-2 rounded-xl transition-all ${editor.isActive("bold") ? "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          title="Bold"
        >
          <BoldIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
          className={`p-2 rounded-xl transition-all ${editor.isActive("italic") ? "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          title="Italic"
        >
          <ItalicIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleUnderline().run(); }}
          className={`p-2 rounded-xl transition-all ${editor.isActive("underline") ? "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          title="Underline"
        >
          <UnderlineIcon className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
          className={`p-2 rounded-xl transition-all ${editor.isActive("strike") ? "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
          title="Strikethrough"
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <div className="h-px w-5 bg-zinc-200 dark:bg-zinc-700" />

        <button
          onMouseDown={(e) => { e.preventDefault(); handleUppercase(); }}
          className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          title="Force Uppercase"
        >
          <CaseUpper className="w-3.5 h-3.5" />
        </button>
        <button
          onMouseDown={(e) => { e.preventDefault(); Object.keys(editor.schema.marks).forEach((m) => editor.chain().focus().unsetMark(m).run()); }}
          className="p-2 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
          title="Clear Formatting"
        >
          <Eraser className="w-3.5 h-3.5" />
        </button>
      </motion.div>

      {/* ─── Paper ─── */}
      <div
        className="script-page transition-all duration-300 relative"
        style={{
          ...(docBgColor ? { backgroundColor: docBgColor } : {}),
        }}
      >
        <EditorContent editor={editor} />

        {/* ─── Autocomplete Popup ─── */}
        {popup && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute z-50 bg-white dark:bg-zinc-800 shadow-2xl rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden flex flex-col py-1 min-w-[200px]"
            style={{ top: popup.top, left: popup.left }}
          >
            {popup.items.map((item, idx) => (
              <div
                key={idx}
                className={`px-4 py-2 text-sm cursor-pointer transition-colors flex items-center justify-between ${
                  idx === popup.selected
                    ? "bg-blue-500 text-white"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-700"
                }`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  if (editorRef.current) {
                    if (item.type === "command") {
                      editorRef.current.chain().focus().setNode(item.id).run();
                    } else {
                      const { from, to } = editorRef.current.state.selection;
                      const $pos = editorRef.current.state.doc.resolve(from);
                      const text = $pos.parent.textContent;
                      const match = text.match(/[\w']+$/);
                      if (match) {
                        const start = from - match[0].length;
                        editorRef.current.chain()
                          .setTextSelection({ from: start, to })
                          .deleteSelection()
                          .insertContent(item.id)
                          .focus()
                          .run();
                      } else {
                        applyCompletion(item.id);
                      }
                    }
                    setPopup(null);
                    popupItemsRef.current = [];
                  }
                }}
                onMouseEnter={() => setPopup((p) => (p ? { ...p, selected: idx } : null))}
              >
                <div className="flex flex-col">
                  <span className="font-medium">{item.label || item.id}</span>
                  {item.shortcut && <span className="text-[10px] opacity-60">{item.shortcut}</span>}
                </div>
                {editor.isActive(item.id) && <span className="text-[10px] font-bold">ACTIVE</span>}
              </div>
            ))}
            <div className="px-3 py-1 border-t border-zinc-100 dark:border-zinc-800">
              <span className="text-[10px] text-zinc-400">↑↓ navigate · Enter accept · Esc dismiss</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
