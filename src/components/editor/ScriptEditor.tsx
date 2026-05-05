"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import { motion, useDragControls } from "framer-motion";
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
import { FontSize } from "./extensions/FontSize";
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
  ArrowUpDown,
  Plus,
  Minus,
} from "lucide-react";

/* ─── Autocomplete / Suggestions Data ─── */
const SCENE_PREFIXES = ["INT.", "EXT.", "INT./EXT."];
const SCENE_TIMES = [
  "DAY",
  "NIGHT",
  "MORNING",
  "EVENING",
  "LATER",
  "CONTINUOUS",
  "MOMENTS LATER",
];
const TRANSITIONS_LIST = [
  "CUT TO:",
  "FADE OUT.",
  "SMASH CUT:",
  "MATCH CUT:",
  "DISSOLVE TO:",
];

const ELEMENT_COMMANDS: AutocompleteOption[] = [
  {
    id: "sceneHeading",
    label: "Scene Heading",
    shortcut: "Ctrl+1",
    type: "command",
    icon: "🎬",
    description: "INT./EXT. LOCATION - TIME",
  },
  {
    id: "action",
    label: "Action",
    shortcut: "Ctrl+2",
    type: "command",
    icon: "📝",
    description: "Describe what we see",
  },
  {
    id: "character",
    label: "Character",
    shortcut: "Ctrl+3",
    type: "command",
    icon: "🎭",
    description: "Character name (ALL CAPS)",
  },
  {
    id: "dialogue",
    label: "Dialogue",
    shortcut: "Ctrl+4",
    type: "command",
    icon: "💬",
    description: "Character's spoken lines",
  },
  {
    id: "parenthetical",
    label: "Parenthetical",
    shortcut: "Ctrl+5",
    type: "command",
    icon: "🔄",
    description: "(how the line is delivered)",
  },
  {
    id: "transition",
    label: "Transition",
    shortcut: "Ctrl+6",
    type: "command",
    icon: "➡️",
    description: "CUT TO:, FADE OUT.",
  },
  {
    id: "shot",
    label: "Shot",
    shortcut: "Ctrl+7",
    type: "command",
    icon: "📷",
    description: "Camera direction",
  },
  {
    id: "extension",
    label: "Extension (V.O./O.S.)",
    shortcut: "Ctrl+8",
    type: "command",
    icon: "🔊",
    description: "Voice Over / Off Screen",
  },
];

function getCompletions(
  query: string,
  nodeType: string,
  ed: Editor,
): AutocompleteOption[] {
  if (!query) return [];

  const upper = query.toUpperCase().trim();
  if (upper.length === 0) return [];

  // ── Characters: dynamically learned from document ──
  if (nodeType === "character") {
    const names = new Set<string>();
    ed.state.doc.descendants((node) => {
      if (
        node.type.name === "character" &&
        node.textContent.trim().length > 1
      ) {
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
    return TRANSITIONS_LIST.filter(
      (t) => t.toUpperCase().startsWith(upper) && t.toUpperCase() !== upper,
    ).map((id) => ({ id }));
  }

  // ── Scene Headings & Action/Paragraph ──
  if (
    nodeType === "sceneHeading" ||
    nodeType === "action" ||
    nodeType === "paragraph"
  ) {
    // 1) Short text without spaces: suggest INT./EXT. prefixes
    if (upper.length >= 1 && upper.length <= 5 && !upper.includes(" ")) {
      const prefixHits = SCENE_PREFIXES.filter(
        (p) =>
          p.toUpperCase().startsWith(upper) && p.toUpperCase().trim() !== upper,
      );
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
          return SCENE_TIMES.filter(
            (t) => t.startsWith(timePart) && t !== timePart,
          ).map((t) => ({ id: `${scenePrefix}${locationPart} - ${t}` }));
        }
        return [];
      }

      // 2b) Location text but no dash → suggest locations + dash
      if (afterPrefix.length > 0) {
        const locations = new Set<string>();
        ed.state.doc.descendants((node) => {
          if (node.type.name === "sceneHeading") {
            const m = node.textContent
              .trim()
              .toUpperCase()
              .match(/^(?:INT\.|EXT\.|INT\.\/EXT\.)\s*(.+?)(?:\s+-\s+|$)/);
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
  if (
    (nodeType === "action" ||
      nodeType === "dialogue" ||
      nodeType === "paragraph") &&
    query.length >= 4
  ) {
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
        .filter(
          (w) =>
            w.toLowerCase().startsWith(lastWord) &&
            w.toLowerCase() !== lastWord,
        )
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
  docFontSize = 12,
  onStatsUpdate,
  onEditorReady,
  onFontSizeChange,
}: {
  scriptId: string;
  initialContent: string;
  docBgColor?: string;
  docFont?: string;
  docTextColor?: string;
  docFontSize?: number;
  onStatsUpdate?: (stats: {
    words: number;
    pages: number;
    scenes: number;
    currentElement: string;
  }) => void;
  onEditorReady?: (editor: Editor) => void;
  onFontSizeChange?: (newSize: number) => void;
}) => {
  const editorRef = useRef<Editor | null>(null);
  const autocomplete = useAutocomplete();
  const autocompleteRef = useRef(autocomplete);
  const dragControls = useDragControls();

  useEffect(() => {
    autocompleteRef.current = autocomplete;
  }, [autocomplete]);

  const [activeNodeType, setActiveNodeType] = useState("sceneHeading");
  const [mounted, setMounted] = useState(false);
  const [toolbarOrientation, setToolbarOrientation] = useState<
    "horizontal" | "vertical"
  >("horizontal");
  const [toolbarPos, setToolbarPos] = useState({ x: -1, y: -1 });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const editorCanvasRef = useRef<HTMLDivElement>(null);

  // Position calculation logic
  const calculateDefaultPosition = useCallback(() => {
    if (typeof window === "undefined") return;
    
    const pageWidth = 816; // WGA Standard Width
    const canvasWidth = window.innerWidth;
    const pageRightEdge = (canvasWidth / 2) + (pageWidth / 2);
    
    const toolbarWidth = toolbarOrientation === "horizontal" ? 300 : 60;
    
    // Default: 24px gap from page edge
    let x = pageRightEdge + 24;
    const y = 80;

    // Boundary check: if it goes off-screen, pin to right edge
    if (x + toolbarWidth > canvasWidth - 16) {
      x = canvasWidth - toolbarWidth - 16;
    }

    return { x, y };
  }, [toolbarOrientation]);

  // Initial Position Sync & Restore
  useEffect(() => {
    if (!mounted) return;

    const savedPos = localStorage.getItem("toolbar_position");
    if (savedPos) {
      try {
        const pos = JSON.parse(savedPos);
        setTimeout(() => setToolbarPos(pos), 0);
      } catch (e) {
        const def = calculateDefaultPosition();
        if (def) setTimeout(() => setToolbarPos(def), 0);
      }
    } else {
      const def = calculateDefaultPosition();
      if (def) setTimeout(() => setToolbarPos(def), 0);
    }
  }, [mounted, calculateDefaultPosition]);

  // Persistence
  useEffect(() => {
    if (toolbarPos.x !== -1 && mounted) {
      localStorage.setItem("toolbar_position", JSON.stringify(toolbarPos));
    }
  }, [toolbarPos, mounted]);

  // Resize Handling
  useEffect(() => {
    if (!editorCanvasRef.current || !mounted) return;

    const observer = new ResizeObserver(() => {
      // If user hasn't manually moved it yet (or we want to keep it relative), 
      // we could re-calculate. But per requirements, only set default if not moved.
      // However, if the window shrinks, we should keep it on-screen.
      setToolbarPos(current => {
        const toolbarWidth = toolbarOrientation === "horizontal" ? 300 : 60;
        if (current.x + toolbarWidth > window.innerWidth - 16) {
          return { ...current, x: Math.max(16, window.innerWidth - toolbarWidth - 16) };
        }
        return current;
      });
    });

    observer.observe(editorCanvasRef.current);
    return () => observer.disconnect();
  }, [mounted, toolbarOrientation]);

  useEffect(() => {
    setTimeout(() => setMounted(true), 0);
    // Restore orientation
    const savedOrientation = localStorage.getItem("toolbar_orientation") as
      | "horizontal"
      | "vertical";
    if (savedOrientation) setToolbarOrientation(savedOrientation);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("toolbar_orientation", toolbarOrientation);
  }, [toolbarOrientation, mounted]);

  /* ── Apply a completion ── */
  const handleSelectOption = useCallback((item: AutocompleteOption) => {
    if (!editorRef.current) return;

    const { from, to } = editorRef.current.state.selection;
    const $pos = editorRef.current.state.doc.resolve(from);
    // Use textBefore to ensure we only measure text strictly behind the cursor
    const textBefore = $pos.parent.textContent.slice(0, $pos.parentOffset);

    if (item.type === "command") {
      // If triggered by slash, delete the slash
      if (textBefore.trim() === "/") {
        const start = from - textBefore.length;
        editorRef.current
          .chain()
          .focus()
          .deleteRange({ from: start, to: from })
          .setNode(item.id)
          .run();
      } else {
        editorRef.current.chain().focus().setNode(item.id).run();
      }
    } else {
      // If the completion is a transition and we are replacing the trigger text
      if (
        TRANSITIONS_LIST.includes(item.id) ||
        /^(INT\.|EXT\.|INT\.\/EXT\.)\s/i.test(item.id)
      ) {
        // Find where the trigger starts and replace it
        const match = textBefore.match(/^(INT\.\s*|EXT\.\s*|INT\.\/EXT\.\s*)/i);
        if (match && /^(INT\.|EXT\.|INT\.\/EXT\.)\s/i.test(item.id)) {
          const start = from - textBefore.length; // replace from the start of the block
          editorRef.current
            .chain()
            .setTextSelection({ from: start, to })
            .deleteSelection()
            .insertContent(item.id)
            .focus()
            .setNode("sceneHeading")
            .run();
        } else {
          const startMatch = textBefore.match(/[\w']+$/);
          if (startMatch) {
            const start = from - startMatch[0].length;
            editorRef.current
              .chain()
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
        const match = textBefore.match(/[\w']+$/);
        if (match) {
          const start = from - match[0].length;
          editorRef.current
            .chain()
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
    const scrollContainer = document.querySelector(".overflow-y-auto");
    const handleScroll = () => {
      autocompleteRef.current.close();
    };
    if (scrollContainer) {
      scrollContainer.addEventListener("scroll", handleScroll, {
        passive: true,
      });
    }
    return () => {
      if (scrollContainer)
        scrollContainer.removeEventListener("scroll", handleScroll);
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
      FontSize,
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
          if (type === "action" || type === "paragraph")
            return "Action description…";
          return "Start typing… (type / for elements)";
        },
      }),
    ],
    content:
      initialContent.includes("script-page") ||
      initialContent.includes("pageNode")
        ? initialContent
        : `<div data-type="pageNode"><p class="scene-heading" data-type="sceneHeading"></p></div>`,

    onUpdate: ({ editor: ed }) => {
      editorRef.current = ed;
      updateScript(scriptId, { content: ed.getHTML() });

      // Sync active node type (catches changes like setNode that don't move the cursor)
      const { $head } = ed.state.selection;
      const typeName = $head.parent.type.name;
      setActiveNodeType(typeName === "paragraph" ? "action" : typeName);

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
            left: coords.left,
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
        ed.state.doc.descendants((n) => {
          if (n.type.name === "sceneHeading") scenes++;
        });
        const { $head } = ed.state.selection;
        onStatsUpdate({
          words,
          pages,
          scenes,
          currentElement: ELEMENT_LABELS[$head.parent.type.name] || "ACTION",
        });
      }
    },

    onSelectionUpdate: ({ editor: ed }) => {
      const { $head, from, to } = ed.state.selection;
      const typeName = $head.parent.type.name;
      setActiveNodeType(typeName === "paragraph" ? "action" : typeName);
    },

    editorProps: {
      attributes: {
        class:
          "prose-none focus:outline-none w-full max-w-full screenplay-canvas",
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
            left: coords.left,
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
        type: "pageNode",
        content: [{ type: "action" }],
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

    // check if there's only one page — never delete the last page
    let pageCount = 0;
    state.doc.descendants((node) => {
      if (node.type.name === "pageNode") pageCount++;
    });
    if (pageCount <= 1) return;

    // Delete immediately — user can Ctrl+Z to undo
    const tr = state.tr.delete(pageNodePos, pageNodePos + pageNode.nodeSize);
    view.dispatch(tr);
    editor.commands.focus();
  }, [editor]);

  if (!editor) return null;

  /* ── Toolbar helpers ── */
  const handleUppercase = () => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    
    if (empty) {
      // Uppercase the current block
      const { $from } = editor.state.selection;
      const start = $from.start();
      const end = $from.end();
      const text = editor.state.doc.textBetween(start, end);
      editor.chain().focus().insertContentAt({ from: start, to: end }, text.toUpperCase()).run();
    } else {
      const text = editor.state.doc.textBetween(from, to);
      editor.chain().focus().insertContentAt({ from, to }, text.toUpperCase()).run();
    }
  };



  const handleLowercase = () => {
    if (!editor) return;
    const { from, to, empty } = editor.state.selection;
    if (empty) {
      const { $from } = editor.state.selection;
      const start = $from.start();
      const end = $from.end();
      const text = editor.state.doc.textBetween(start, end);
      editor.chain().focus().insertContentAt({ from: start, to: end }, text.toLowerCase()).run();
    } else {
      const text = editor.state.doc.textBetween(from, to);
      editor.chain().focus().insertContentAt({ from, to }, text.toLowerCase()).run();
    }
  };

  const currentElement =
    ELEMENT_LABELS[editor.state.selection.$head.parent.type.name] || "ACTION";

  return (
    <div className="w-full flex flex-col items-center gap-4 relative pb-32">
      <style jsx global>{`
        ${docTextColor
          ? `
        .screenplay-canvas p {
          color: ${docTextColor} !important;
        }
        `
          : ""}
        ${docBgColor
          ? `
        .script-page {
          background-color: ${docBgColor} !important;
        }
        `
          : ""}
        .screenplay-canvas {
          font-family:
            ${docFont ? getFontVar(docFont) : "var(--font-courier-prime)"},
            "Courier Prime", monospace !important;
          font-size: ${docFontSize}pt !important;
        }
        .screenplay-canvas p {
          font-size: ${docFontSize}pt !important;
        }
        .toolbar-item {
          font-size: calc(13px * var(--toolbar-scale, 1));
          padding: calc(6px * var(--toolbar-scale, 1));
        }
        .toolbar-icon {
          width: calc(18px * var(--toolbar-scale, 1));
          height: calc(18px * var(--toolbar-scale, 1));
        }

        /* Remove any border/outline from TipTap textStyle spans */
        .tiptap span,
        .tiptap span[style],
        .ProseMirror span,
        .ProseMirror span[style] {
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          background: transparent !important;
          text-decoration-color: inherit;
        }
      `}</style>

      {/* ─── Formatting Toolbar (Draggable) ─── */}
      {mounted &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={toolbarRef}
            style={{
              position: "fixed",
              left: 0,
              top: 0,
              transform: `translate(${toolbarPos.x}px, ${toolbarPos.y}px)`,
              willChange: "transform",
              zIndex: 100,
              display: "flex",
              flexDirection: toolbarOrientation === "vertical" ? "column" : "row",
              alignItems: "center",
              padding: "4px",
              gap: "2px",
            }}
            className={`bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xl rounded-xl border border-zinc-200/80 dark:border-zinc-800 shadow-xl shadow-black/10 dark:shadow-black/30 transition-colors duration-300 no-scrollbar`}
          >
            <div
              className={`flex flex-1 ${toolbarOrientation === "vertical" ? "flex-col overflow-y-auto w-full" : "flex-row overflow-x-auto h-full"} items-center gap-2 p-1 no-scrollbar`}
            >
              <div
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.currentTarget.setPointerCapture(e.pointerId);
                  const rect = toolbarRef.current?.getBoundingClientRect();
                  if (rect) {
                    e.currentTarget.dataset.offsetX = String(e.clientX - rect.left);
                    e.currentTarget.dataset.offsetY = String(e.clientY - rect.top);
                  }
                  document.body.classList.add("select-none");
                  document.body.style.userSelect = "none";
                }}
                onPointerMove={(e) => {
                  if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                    const offsetX = parseFloat(e.currentTarget.dataset.offsetX || "0");
                    const offsetY = parseFloat(e.currentTarget.dataset.offsetY || "0");
                    setToolbarPos({
                      x: e.clientX - offsetX,
                      y: e.clientY - offsetY,
                    });
                  }
                }}
                onPointerUp={(e) => {
                  e.currentTarget.releasePointerCapture(e.pointerId);
                  document.body.classList.remove("select-none");
                  document.body.style.userSelect = "";
                }}
                style={{ touchAction: "none" }}
                className="p-1 opacity-40 hover:opacity-100 transition-opacity flex items-center justify-center shrink-0 cursor-grab active:cursor-grabbing toolbar-item"
              >
                {toolbarOrientation === "vertical" ? (
                  <GripHorizontal className="toolbar-icon text-zinc-500" />
                ) : (
                  <GripVertical className="toolbar-icon text-zinc-500" />
                )}
              </div>

              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  const nextOrientation =
                    toolbarOrientation === "horizontal"
                      ? "vertical"
                      : "horizontal";
                  setToolbarOrientation(nextOrientation);
                }}
                className="opacity-40 hover:opacity-100 transition-opacity flex items-center justify-center shrink-0 toolbar-item"
                title={
                  toolbarOrientation === "vertical"
                    ? "Switch to Horizontal"
                    : "Switch to Vertical"
                }
              >
                <ArrowUpDown className="w-4 h-4 text-zinc-500" />
              </button>

              <div
                className={`bg-zinc-200 dark:bg-zinc-700 shrink-0`}
                style={{
                  width: toolbarOrientation === "vertical" ? "40px" : "1px",
                  height: toolbarOrientation === "vertical" ? "1px" : "16px",
                  margin: toolbarOrientation === "vertical" ? "8px auto" : "0 8px",
                }}
              />

              <ElementMenu
                activeId={activeNodeType}
                isVertical={toolbarOrientation === "vertical"}
                onSelect={(id) => editor.chain().focus().setNode(id).run()}
              />

              <div
                className={`bg-zinc-200 dark:bg-zinc-700 shrink-0`}
                style={{
                  width: toolbarOrientation === "vertical" ? "40px" : "1px",
                  height: toolbarOrientation === "vertical" ? "1px" : "16px",
                  margin: toolbarOrientation === "vertical" ? "8px auto" : "0 8px",
                }}
              />

              <div
                className={`flex ${toolbarOrientation === "vertical" ? "flex-col w-full" : "flex-row"} items-center justify-center gap-1 shrink-0`}
              >
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor.chain().focus().toggleBold().run();
                  }}
                  className={`p-1.5 rounded-lg transition-all ${editor.isActive("bold") ? "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                  title="Bold"
                >
                  <BoldIcon className="w-4 h-4" />
                </button>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor.chain().focus().toggleItalic().run();
                  }}
                  className={`p-1.5 rounded-lg transition-all ${editor.isActive("italic") ? "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                  title="Italic"
                >
                  <ItalicIcon className="w-4 h-4" />
                </button>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    editor.chain().focus().toggleUnderline().run();
                  }}
                  className={`p-1.5 rounded-lg transition-all ${editor.isActive("underline") ? "bg-zinc-900 dark:bg-white text-white dark:text-black shadow-sm" : "text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                  title="Underline"
                >
                  <UnderlineIcon className="w-4 h-4" />
                </button>
              </div>

              <div
                className={`bg-zinc-200 dark:bg-zinc-700 shrink-0`}
                style={{
                  width: toolbarOrientation === "vertical" ? "40px" : "1px",
                  height: toolbarOrientation === "vertical" ? "1px" : "16px",
                  margin: toolbarOrientation === "vertical" ? "8px auto" : "0 8px",
                }}
              />





              <div
                className={`flex ${toolbarOrientation === "vertical" ? "flex-col w-full" : "flex-row"} items-center justify-center gap-1 shrink-0`}
              >
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleAddPage();
                  }}
                  className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all"
                  title="Add Page Break"
                >
                  <FilePlus2 className="w-4 h-4" />
                </button>

                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleDeletePage();
                  }}
                  className="p-1.5 rounded-lg text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                  title="Delete Current Page"
                >
                  <FileX2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      {/* ─── Paper Container ─── */}
      <div 
        ref={editorCanvasRef}
        className="w-full flex flex-col items-center relative"
      >
        <EditorContent
          editor={editor}
          className="w-full flex flex-col items-center"
        />

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
