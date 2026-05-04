"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
} from "./extensions/nodes/ScriptNodes";
import { ScriptKeymap } from "./extensions/KeymapLogic";
import { PageNode } from "./extensions/PageNode";
import { ScriptDocument } from "./extensions/ScriptDocument";
import { updateScript } from "@/lib/storage";
import { useAutocomplete, AutocompleteOption } from "@/hooks/useAutocomplete";
import { AutocompleteOverlay } from "./extensions/nodes/AutocompleteOverlay";
import { ElementMenu } from "./ElementMenu";
import { Underline } from "@tiptap/extension-underline";
import { Color } from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { getFontVar } from "@/lib/fonts";
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
  GripHorizontal,
  FilePlus2,
  FileX2,
  ArrowRightLeft,
  ArrowUpDown
} from "lucide-react";

/* ─── Autocomplete / Suggestions Data ─── */
const SCENE_PREFIXES = ["INT.", "EXT.", "INT./EXT."];
const SCENE_TIMES = ["DAY", "NIGHT", "MORNING", "EVENING", "LATER", "CONTINUOUS", "MOMENTS LATER"];
const TRANSITIONS_LIST = ["CUT TO:", "FADE OUT.", "SMASH CUT:", "MATCH CUT:", "DISSOLVE TO:"];

const ELEMENT_COMMANDS: AutocompleteOption[] = [
  { id: "sceneHeading", label: "Scene Heading", shortcut: "Ctrl+1", type: "command", icon: "🎬", description: "INT./EXT. LOCATION - TIME" },
  { id: "action", label: "Action", shortcut: "Ctrl+2", type: "command", icon: "📝", description: "Describe what we see" },
  { id: "character", label: "Character", shortcut: "Ctrl+3", type: "command", icon: "🎭", description: "Character name (ALL CAPS)" },
  { id: "dialogue", label: "Dialogue", shortcut: "Ctrl+4", type: "command", icon: "💬", description: "Character's spoken lines" },
  { id: "parenthetical", label: "Parenthetical", shortcut: "Ctrl+5", type: "command", icon: "🔄", description: "(how the line is delivered)" },
  { id: "transition", label: "Transition", shortcut: "Ctrl+6", type: "command", icon: "➡️", description: "CUT TO:, FADE OUT." },
  { id: "shot", label: "Shot", shortcut: "Ctrl+7", type: "command", icon: "📷", description: "Camera direction" },
  { id: "extension", label: "Extension (V.O./O.S.)", shortcut: "Ctrl+8", type: "command", icon: "🔊", description: "Voice Over / Off Screen" },
];

function getCompletions(query: string, nodeType: string, ed: Editor): AutocompleteOption[] {
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
  const autocomplete = useAutocomplete();
  const autocompleteRef = useRef(autocomplete);
  const [isToolbarVertical, setIsToolbarVertical] = useState(true);
  const [activeNodeType, setActiveNodeType] = useState("action");
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Sync ref to avoid stale closures in handleKeyDown
  useEffect(() => {
    autocompleteRef.current = autocomplete;
  }, [autocomplete]);

  /* ── Apply a completion ── */
  const handleSelectOption = useCallback((item: AutocompleteOption) => {
    if (!editorRef.current) return;
    
    const { from, to } = editorRef.current.state.selection;
    const $pos = editorRef.current.state.doc.resolve(from);
    const text = $pos.parent.textContent;
    
    if (item.type === "command") {
      // If triggered by slash, delete the slash
      if (text.trim() === "/") {
         editorRef.current.chain().focus().deleteRange({ from: from - 1, to: from }).setNode(item.id).run();
      } else {
         editorRef.current.chain().focus().setNode(item.id).run();
      }
    } else {
      // If the completion is a transition and we are replacing the trigger text
      if (TRANSITIONS_LIST.includes(item.id) || /^(INT\.|EXT\.|INT\.\/EXT\.)\s/i.test(item.id)) {
          // Find where the trigger starts and replace it
          const match = text.match(/^(INT\.\s*|EXT\.\s*|INT\.\/EXT\.\s*)/i);
          if (match && /^(INT\.|EXT\.|INT\.\/EXT\.)\s/i.test(item.id)) {
              const start = from - text.length; // replace the whole line if it's a scene heading
              editorRef.current.chain()
                .setTextSelection({ from: start, to })
                .deleteSelection()
                .insertContent(item.id)
                .focus()
                .setNode("sceneHeading")
                .run();
          } else {
              const startMatch = text.match(/[\w']+$/);
              if (startMatch) {
                const start = from - startMatch[0].length;
                editorRef.current.chain()
                  .setTextSelection({ from: start, to })
                  .deleteSelection()
                  .insertContent(item.id)
                  .focus()
                  .run();
              } else {
                editorRef.current.chain().focus().insertContent(item.id).run();
              }
              if (TRANSITIONS_LIST.includes(item.id)) {
                 editorRef.current.chain().focus().setNode("transition").run();
              }
          }
      } else {
          // Standard vocabulary insertion
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
            editorRef.current.chain().focus().insertContent(item.id).run();
          }
      }
    }
    autocompleteRef.current.close();
  }, []);

  useEffect(() => {
    const scrollContainer = document.querySelector('.overflow-y-auto');
    const handleScroll = () => {
      autocompleteRef.current.close();
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
        document: false,
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      ScriptDocument,
      PageNode,
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
    content: (initialContent.includes('script-page') || initialContent.includes('pageNode')) ? initialContent : `<div data-type="pageNode">${initialContent}</div>`,

    onUpdate: ({ editor: ed }) => {
      editorRef.current = ed;
      updateScript(scriptId, { content: ed.getHTML() });

      // ── Autocomplete tick ──
      try {
        const { from } = ed.state.selection;
        const $pos = ed.state.doc.resolve(from);
        const text = $pos.parent.textContent;
        const nodeType = $pos.parent.type.name;
        
        let items = getCompletions(text, nodeType, ed);
        
        // Slash commands
        if (text === "/") {
           items = ELEMENT_COMMANDS;
        }

        if (items.length > 0) {
          const coords = ed.view.coordsAtPos(from);
          // coordsAtPos returns top, bottom, left, right relative to the viewport.
          // We can use bottom/left directly with a fixed position Portal.
          autocompleteRef.current.open(items, { 
            top: coords.bottom, 
            left: coords.left 
          });
        } else {
          autocompleteRef.current.close();
        }
      } catch {
        autocompleteRef.current.close();
      }

      // ── Stats callback ──
      if (onStatsUpdate) {
        const text = ed.state.doc.textContent;
        const words = text.split(/\s+/).filter(Boolean).length;
        // Count actual pageNode children for page count
        let pageCount = 0;
        ed.state.doc.forEach((node) => {
          if (node.type.name === "pageNode") pageCount++;
        });
        const pages = Math.max(1, pageCount);
        let scenes = 0;
        ed.state.doc.descendants((n) => { if (n.type.name === "sceneHeading") scenes++; });
        const { $head } = ed.state.selection;
        onStatsUpdate({ words, pages, scenes, currentElement: ELEMENT_LABELS[$head.parent.type.name] || "ACTION" });
      }
    },

    onSelectionUpdate: ({ editor: ed }) => {
      const { $head } = ed.state.selection;
      const typeName = $head.parent.type.name;
      setActiveNodeType(typeName === "paragraph" ? "action" : typeName);
    },

    editorProps: {
      attributes: {
        class: "prose-none focus:outline-none w-full max-w-full screenplay-canvas",
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
          autocompleteRef.current.open(ELEMENT_COMMANDS, { 
            top: coords.bottom, 
            left: coords.left 
          });
          return true;
        }

        if (!autocompleteRef.current.isOpen) return false;

        if (event.key === "ArrowDown") {
          event.preventDefault();
          autocompleteRef.current.selectNext();
          return true;
        }
        if (event.key === "ArrowUp") {
          event.preventDefault();
          autocompleteRef.current.selectPrevious();
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          event.preventDefault();
          const ac = autocompleteRef.current;
          const selectedItem = ac.filteredOptions[ac.activeIndex];
          if (selectedItem) {
             // Let the component do the selection after event loop to avoid ProseMirror conflict
             setTimeout(() => {
               handleSelectOption(selectedItem);
             }, 0);
          }
          return true;
        }
        if (event.key === "Escape") {
          event.preventDefault();
          autocompleteRef.current.close();
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

  const handleAddPage = useCallback(() => {
    if (!editor) return;
    const { state, view } = editor;
    const { $head } = state.selection;
    let depth = $head.depth;
    while (depth > 0) {
      if ($head.node(depth).type.name === "pageNode") break;
      depth--;
    }
    
    // If not in a page, just add to the end
    if (depth === 0) {
      const lastPos = state.doc.content.size;
      editor.commands.insertContentAt(lastPos, {
        type: 'pageNode',
        content: [{ type: 'action' }]
      });
      return;
    }

    const pageNodePos = $head.before(depth);
    const pageNode = $head.node(depth);
    const insertPos = pageNodePos + pageNode.nodeSize;

    const newPage = state.schema.nodes.pageNode.create(null, [
      state.schema.nodes.action.create(),
    ]);

    const tr = state.tr.insert(insertPos, newPage);
    const cursorPos = insertPos + 2;
    view.dispatch(tr);
    try {
      editor.commands.focus();
      editor.commands.setTextSelection(cursorPos);
    } catch {}
  }, [editor]);

  const handleDeletePage = useCallback(() => {
    if (!editor) return;
    const { state, view } = editor;
    const { $head } = state.selection;
    let depth = $head.depth;
    while (depth > 0) {
      if ($head.node(depth).type.name === "pageNode") break;
      depth--;
    }
    if (depth === 0) return;
    
    const pageNode = $head.node(depth);
    const pageNodePos = $head.before(depth);
    
    // check if there's only one page
    let pageCount = 0;
    state.doc.descendants((node) => {
      if (node.type.name === 'pageNode') pageCount++;
    });
    if (pageCount <= 1) return;

    if (pageNode.textContent.trim().length > 0) {
      if (!window.confirm("This page contains text. Deleting it will permanently remove all content on this page. This action cannot be undone.")) return;
    }

    const tr = state.tr.delete(pageNodePos, pageNodePos + pageNode.nodeSize);
    view.dispatch(tr);
    editor.commands.focus();
  }, [editor]);

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
    <div className="w-full flex flex-col items-center gap-4 relative pb-32">
      <style jsx global>{`
        ${docTextColor ? `
        .screenplay-canvas p {
          color: ${docTextColor} !important;
        }
        ` : ""}
        ${docBgColor ? `
        .script-page {
          background-color: ${docBgColor} !important;
        }
        ` : ""}
        .screenplay-canvas {
          font-family: ${docFont ? getFontVar(docFont) : "var(--font-courier-prime)"}, 'Courier Prime', monospace !important;
        }
      `}</style>



      {/* ─── Formatting Toolbar (Draggable) ─── */}
      {mounted && typeof document !== "undefined" && createPortal(
        <motion.div 
          drag 
          dragMomentum={false}
          className={`fixed right-4 md:right-8 top-1/2 -translate-y-1/2 z-50 flex items-center p-1.5 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-2xl border border-zinc-200/80 dark:border-zinc-800 shadow-xl shadow-black/10 dark:shadow-black/30 transition-colors duration-300 cursor-grab active:cursor-grabbing max-w-[95vw] max-h-[90vh] overflow-auto no-scrollbar ${isToolbarVertical ? 'flex-col gap-1.5' : 'flex-row gap-1 max-md:top-auto max-md:bottom-4 max-md:left-1/2 max-md:-translate-x-1/2 max-md:-translate-y-0 max-md:right-auto'}`}
        >
          <div className="p-1 opacity-40 hover:opacity-100 transition-opacity flex items-center justify-center max-md:hidden shrink-0">
            {isToolbarVertical ? <GripHorizontal className="w-3.5 h-3.5 text-zinc-500" /> : <GripVertical className="w-3.5 h-3.5 text-zinc-500" />}
          </div>
          
          <button
            onMouseDown={(e) => { e.preventDefault(); setIsToolbarVertical(!isToolbarVertical); }}
            className="p-1 opacity-40 hover:opacity-100 transition-opacity flex items-center justify-center shrink-0 mb-1"
            title={isToolbarVertical ? "Switch to Horizontal" : "Switch to Vertical"}
          >
            {isToolbarVertical ? <ArrowRightLeft className="w-3.5 h-3.5 text-zinc-500" /> : <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />}
          </button>

          <ElementMenu
            activeId={activeNodeType}
            isVertical={isToolbarVertical}
            onSelect={(id) => editor.chain().focus().setNode(id).run()}
          />

          <div className={`bg-zinc-200 dark:bg-zinc-700 shrink-0 mx-1 ${isToolbarVertical ? 'h-px w-5 my-1' : 'w-px h-5'}`} />

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

            <div className={`bg-zinc-200 dark:bg-zinc-700 shrink-0 mx-1 ${isToolbarVertical ? 'h-px w-5 my-1' : 'w-px h-5'}`} />

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

            <div className={`bg-zinc-200 dark:bg-zinc-700 shrink-0 mx-1 ${isToolbarVertical ? 'h-px w-5 my-1' : 'w-px h-5'}`} />

            <button
              onMouseDown={(e) => { e.preventDefault(); handleAddPage(); }}
              className="p-2 rounded-xl text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
              title="Add Page Break"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
            </button>

            <button
              onMouseDown={(e) => { e.preventDefault(); handleDeletePage(); }}
              className="p-2 rounded-xl text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              title="Delete Current Page"
            >
              <FileX2 className="w-3.5 h-3.5" />
            </button>
          </motion.div>,
        document.body
      )}

      {/* ─── Paper Container ─── */}
      <div className="w-full flex flex-col items-center relative">

        <EditorContent editor={editor} className="w-full flex flex-col items-center" />

        {/* ─── Autocomplete Popup ─── */}
        <AutocompleteOverlay
          isOpen={autocomplete.isOpen}
          position={autocomplete.position}
          options={autocomplete.filteredOptions}
          activeIndex={autocomplete.activeIndex}
          onSelect={handleSelectOption}
          onHover={(idx) => autocomplete.setActiveIndex(idx)}
          onClose={() => autocomplete.close()}
        />
      </div>
    </div>
  );
};
