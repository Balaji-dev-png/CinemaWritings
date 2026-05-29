"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import {
  ReactNodeViewRenderer,
  NodeViewWrapper,
  NodeViewContent,
} from "@tiptap/react";
import { memo, useEffect, useRef, useState, useCallback } from "react";
import { Plus, Trash2, AlertTriangle } from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */
/** Letter page at 96 DPI = 11 × 96 = 1056px total height */
const PAGE_HEIGHT_PX = 1056;
/** Safe zone: 960px leaves ~1in margins for top/bottom padding */
const SAFE_ZONE_PX = 960;
/** Debounce interval for height checks (ms) */
const DEBOUNCE_MS = 200;

/* ═══════════════════════════════════════════════════════════════════════════
   DELETE CONFIRMATION DIALOG
   ═══════════════════════════════════════════════════════════════════════════ */
const DeleteConfirmDialog = ({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void;
  onCancel: () => void;
}) => (
  <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm">
    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-sm w-full mx-4 animate-in">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-red-500" />
        </div>
        <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Delete This Page?
        </h3>
      </div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
        This page contains text. Deleting it will permanently remove all content
        on this page. This action cannot be undone.
      </p>
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-sm"
        >
          Delete Page
        </button>
      </div>
    </div>
  </div>
);

/* ═══════════════════════════════════════════════════════════════════════════
   PAGE COMPONENT (React.memo for performance)
   ═══════════════════════════════════════════════════════════════════════════ */
const PageComponent = memo(function PageComponent(props: any) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const overflowLock = useRef(false);

  // ── Compute page number (1-indexed) ──
  const getPageNumber = useCallback((): number => {
    try {
      const pos = props.getPos();
      const doc = props.editor.state.doc;
      let pageIndex = 0;
      doc.forEach((node: any, offset: number) => {
        if (offset < pos) pageIndex++;
      });
      return pageIndex + 1;
    } catch {
      return 1;
    }
  }, [props]);

  const getTotalPages = useCallback((): number => {
    try {
      return props.editor.state.doc.childCount;
    } catch {
      return 1;
    }
  }, [props]);

  // ── Overflow detection with ResizeObserver (debounced) ──
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    const DEBOUNCE_MS = 250; // Delay to prevent mid-typing tearing

    const checkOverflow = () => {
      if (overflowLock.current) return;
      if (!props.editor || props.editor.isDestroyed) return;

      // Only split if the scrollHeight genuinely exceeds the physical height (clientHeight)
      const scrollHeight = el.scrollHeight;
      const clientHeight = el.clientHeight;
      
      // If mobile (height: auto), clientHeight will match scrollHeight and it won't trigger. 
      // This correctly disables automatic pagination on mobile viewports.
      // We also add a 2px safety margin to prevent subpixel zooming infinite loops.
      if (scrollHeight <= clientHeight + 2) return;

      try {
        const pos = props.getPos();
        const resolvedPos = props.editor.state.doc.resolve(pos);
        const pageNode = resolvedPos.nodeAfter;
        if (!pageNode || pageNode.type.name !== "pageNode") return;
        if (pageNode.childCount <= 1) return; // Can't move the only block

        overflowLock.current = true;

        const { state } = props.editor;
        const { tr } = state;

        // Get the last child block of this page
        const lastChild = pageNode.lastChild;
        if (!lastChild) {
          overflowLock.current = false;
          return;
        }

        // Calculate positions
        const pageStart = pos + 1;
        let childOffset = 0;
        for (let i = 0; i < pageNode.childCount - 1; i++) {
          childOffset += pageNode.child(i).nodeSize;
        }
        const lastChildStart = pageStart + childOffset;
        const lastChildEnd = lastChildStart + lastChild.nodeSize;

        // Find the next pageNode sibling
        const pageEnd = pos + pageNode.nodeSize;
        const nextNodePos = pageEnd;
        let nextPageExists = false;

        try {
          const nextResolved = state.doc.resolve(nextNodePos);
          const nextNode = nextResolved.nodeAfter;
          if (nextNode && nextNode.type.name === "pageNode") {
            nextPageExists = true;
          }
        } catch {
          // No next node
        }

        // Slice the last child content
        const lastChildSlice = state.doc.slice(lastChildStart, lastChildEnd);
        const lastChildContent = lastChildSlice.content;

        if (nextPageExists) {
          // Insert the block at the start of the next page
          const nextPageContentStart = nextNodePos + 1;
          const tr2 = tr.delete(lastChildStart, lastChildEnd);
          const insertPos = nextPageContentStart - lastChild.nodeSize;
          tr2.insert(insertPos, lastChildContent);
          
          // Move cursor to the inserted block seamlessly
          const newCursorPos = insertPos + 1;
          tr2.setSelection(
            props.editor.state.selection.constructor.near(tr2.doc.resolve(newCursorPos))
          );
          props.editor.view.dispatch(tr2);
        } else {
          // Create a new pageNode after this one with the overflow block
          const newPageNode = state.schema.nodes.pageNode.create(null, lastChildContent);
          const tr2 = tr.delete(lastChildStart, lastChildEnd);
          const insertPagePos = pageEnd - lastChild.nodeSize;
          tr2.insert(insertPagePos, newPageNode);
          
          // Move cursor to the start of the new page's first block
          const newCursorPos = insertPagePos + 2;
          try {
            tr2.setSelection(
              props.editor.state.selection.constructor.near(tr2.doc.resolve(newCursorPos))
            );
          } catch {
            // Selection adjustment fallback
          }
          props.editor.view.dispatch(tr2);
        }

        // Release lock
        requestAnimationFrame(() => {
          setTimeout(() => { overflowLock.current = false; }, 50);
        });
      } catch (err) {
        console.error("PageNode overflow error:", err);
        overflowLock.current = false;
      }
    };

    const debouncedCheck = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(checkOverflow, DEBOUNCE_MS);
    };

    const observer = new ResizeObserver(debouncedCheck);
    observer.observe(el);

    return () => {
      observer.disconnect();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
  }, [props]);

  // ── Add page after this one ──
  const handleAddPage = useCallback(() => {
    try {
      const pos = props.getPos() + props.node.nodeSize;
      props.editor.commands.insertContentAt(pos, {
        type: "pageNode",
        content: [{ type: "action" }],
      });
    } catch (err) {
      console.error("Add page error:", err);
    }
  }, [props]);

  // ── Delete this page ──
  const handleDeletePage = useCallback(() => {
    const totalPages = getTotalPages();
    if (totalPages <= 1) return; // Can't delete the only page

    // Check if page has meaningful content
    const hasContent = props.node.textContent.trim().length > 0;
    if (hasContent) {
      setShowDeleteConfirm(true);
    } else {
      props.deleteNode();
    }
  }, [props, getTotalPages]);

  const confirmDelete = useCallback(() => {
    setShowDeleteConfirm(false);
    props.deleteNode();
  }, [props]);

  const pageNum = getPageNumber();
  const totalPages = getTotalPages();

  return (
    <NodeViewWrapper className="relative group w-full flex flex-col items-center">
      {/* ─── Page Break Indicator (above page, except first) ─── */}
      {pageNum > 1 && (
        <div className="page-break-indicator w-full max-w-[8.5in] flex items-center gap-3 py-2 select-none">
          <div className="flex-1 border-t-2 border-dashed border-zinc-300 dark:border-zinc-700" />
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600 whitespace-nowrap">
            Page Break
          </span>
          <div className="flex-1 border-t-2 border-dashed border-zinc-300 dark:border-zinc-700" />
        </div>
      )}

      {/* ─── Page Container ─── */}
      <div className="relative w-full flex justify-center">
        <div
          ref={contentRef}
          className="script-page relative transition-all duration-300 shrink-0"
        >
          <NodeViewContent className="outline-none min-h-[2em]" />

          {/* ─── Page Number (bottom right) ─── */}
          <div className="page-number-label">
            {pageNum}.
          </div>
        </div>
      </div>

      {/* ─── Delete Confirmation Modal ─── */}
      {showDeleteConfirm && (
        <DeleteConfirmDialog
          onConfirm={confirmDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </NodeViewWrapper>
  );
});

/* ═══════════════════════════════════════════════════════════════════════════
   PAGENODE TIPTAP EXTENSION
   ═══════════════════════════════════════════════════════════════════════════ */
export const PageNode = Node.create({
  name: "pageNode",
  group: "block",
  content: "block+",
  defining: true,
  isolating: true,

  parseHTML() {
    return [
      { tag: 'div[data-type="pageNode"]' },
      { tag: "div.script-page" },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-type": "pageNode",
        class: "script-page",
      }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PageComponent);
  },

  addKeyboardShortcuts() {
    return {
      // ── Ctrl/Cmd+Enter: Force new page after current ──
      "Mod-Enter": () => {
        const { state } = this.editor;
        const { $head } = state.selection;

        // Walk up to find the pageNode ancestor
        let depth = $head.depth;
        while (depth > 0) {
          if ($head.node(depth).type.name === "pageNode") break;
          depth--;
        }
        if (depth === 0) return false;

        const pageNodePos = $head.before(depth);
        const pageNode = $head.node(depth);
        const insertPos = pageNodePos + pageNode.nodeSize;

        const newPage = state.schema.nodes.pageNode.create(null, [
          state.schema.nodes.action.create(),
        ]);

        const tr = state.tr.insert(insertPos, newPage);
        // Place cursor in the new page
        const cursorPos = insertPos + 2;
        try {
          tr.setSelection(
            TextSelection.near(tr.doc.resolve(cursorPos))
          );
        } catch {
          // fallback
        }
        this.editor.view.dispatch(tr);
        return true;
      },

      // ── Backspace: Merge with previous page when at start ──
      Backspace: () => {
        const { state } = this.editor;
        const { $head, empty } = state.selection;

        // Only handle when selection is collapsed (cursor, not range)
        if (!empty) return false;

        // Must be at offset 0 within the parent block
        if ($head.parentOffset !== 0) return false;

        // Walk up to find the pageNode ancestor
        let depth = $head.depth;
        while (depth > 0) {
          if ($head.node(depth).type.name === "pageNode") break;
          depth--;
        }
        if (depth === 0) return false;

        const pageNode = $head.node(depth);
        const pageNodePos = $head.before(depth);

        // If this is the first page, don't merge
        if (pageNodePos === 0) return false;

        // Check we're in the first block of this page
        // The cursor's position relative to pageNode start
        const relativePos = $head.pos - pageNodePos - 1; // -1 for pageNode open tag
        let firstChildSize = 0;
        if (pageNode.childCount > 0) {
          firstChildSize = pageNode.child(0).nodeSize;
        }
        // Cursor must be within the first child block
        if (relativePos >= firstChildSize) return false;

        // Find the previous pageNode sibling
        const resolvedBefore = state.doc.resolve(pageNodePos);
        const prevPageIndex = resolvedBefore.index(0) - 1;
        if (prevPageIndex < 0) return false;

        const prevPageNode = state.doc.child(prevPageIndex);
        if (prevPageNode.type.name !== "pageNode") return false;

        // Save scroll position
        const scrollY = window.scrollY;
        const pageEl = this.editor.view.domAtPos(pageNodePos).node as HTMLElement;
        const pageHeight = pageEl?.getBoundingClientRect?.()?.height || 0;

        // Calculate positions
        let prevPagePos = 0;
        for (let i = 0; i < prevPageIndex; i++) {
          prevPagePos += state.doc.child(i).nodeSize;
        }
        const prevPageEnd = prevPagePos + prevPageNode.nodeSize; // end of prev page node
        const prevPageContentEnd = prevPageEnd - 1; // before closing tag

        // Build the transaction
        const { tr } = state;

        // The merge point: end of the last block in the previous page
        const prevLastChild = prevPageNode.lastChild;
        const mergePos = prevPageContentEnd; // we'll set cursor here after move

        // Collect all children from current page
        const currentPageContentStart = pageNodePos + 1;
        const currentPageContentEnd = pageNodePos + pageNode.nodeSize - 1;
        const childrenSlice = state.doc.slice(
          currentPageContentStart,
          currentPageContentEnd
        );

        // Delete the entire current pageNode
        tr.delete(pageNodePos, pageNodePos + pageNode.nodeSize);

        // Insert all children at end of previous page's content
        // After deletion, prevPageContentEnd position shifts
        const adjustedInsertPos = prevPageContentEnd;
        tr.insert(adjustedInsertPos, childrenSlice.content);

        // Set cursor at the merge point
        try {
          tr.setSelection(
            TextSelection.near(
              tr.doc.resolve(adjustedInsertPos)
            )
          );
        } catch {
          // Fallback: just place cursor at the start of inserted content
        }

        this.editor.view.dispatch(tr);

        // Restore scroll position so user doesn't lose their place
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollY - pageHeight);
        });

        return true;
      },
    };
  },
});
