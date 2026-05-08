"use client";

import { X } from "lucide-react";
import { motion } from "framer-motion";
import DOMPurify from "dompurify";

// Allowed tags for screenplay HTML content rendering in compare view.
// Matches the elements TipTap outputs for screenplay element types.
const SCREENPLAY_ALLOWED_TAGS = [
  "p", "span", "strong", "em", "u", "br", "div",
  "h1", "h2", "h3", "b", "i", "s",
];
const SCREENPLAY_ALLOWED_ATTR = ["class", "style", "data-type"];

function sanitizeScreenplayHtml(html: string): string {
  if (typeof window === "undefined") return ""; // SSR guard
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: SCREENPLAY_ALLOWED_TAGS,
    ALLOWED_ATTR: SCREENPLAY_ALLOWED_ATTR,
  });
}

export function CompareModal({
  currentContent,
  savedContent,
  versionName,
  onClose,
}: {
  currentContent: string;
  savedContent: string;
  versionName: string;
  onClose: () => void;
}) {
  const safeSavedContent = sanitizeScreenplayHtml(
    savedContent || "<p class='action'>Empty script.</p>"
  );
  const safeCurrentContent = sanitizeScreenplayHtml(
    currentContent || "<p class='action'>Empty script.</p>"
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] bg-black/50 backdrop-blur-md flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 shadow-sm z-10 shrink-0">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
          Comparing Drafts
          <span className="text-xs font-normal text-zinc-500 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-md">
            {versionName} vs Current
          </span>
        </h2>
        <button
          onClick={onClose}
          className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 hover:text-black dark:hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Split View */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-zinc-100 dark:bg-black">
        {/* Saved Draft Pane */}
        <div className="flex-1 flex flex-col border-r border-zinc-200 dark:border-zinc-800 overflow-hidden relative">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-300 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm z-10">
            {versionName} (Saved)
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">
            <div className="script-page mx-auto shadow-xl">
              <div
                className="ProseMirror"
                dangerouslySetInnerHTML={{ __html: safeSavedContent }}
              />
            </div>
          </div>
        </div>

        {/* Current Draft Pane */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-300 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full shadow-sm z-10">
            Current Draft
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar">
            <div className="script-page mx-auto shadow-xl">
              <div
                className="ProseMirror"
                dangerouslySetInnerHTML={{ __html: safeCurrentContent }}
              />
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
