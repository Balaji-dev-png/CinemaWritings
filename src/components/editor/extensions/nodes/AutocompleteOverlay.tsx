"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { AutocompleteOption } from "@/hooks/useAutocomplete";
import { motion, AnimatePresence } from "framer-motion";

interface AutocompleteOverlayProps {
  isOpen: boolean;
  position: { top: number; left: number };
  options: AutocompleteOption[];
  activeIndex: number;
  onSelect: (option: AutocompleteOption) => void;
  onHover: (index: number) => void;
  onClose: () => void;
}

export const AutocompleteOverlay: React.FC<AutocompleteOverlayProps> = ({
  isOpen,
  position,
  options,
  activeIndex,
  onSelect,
  onHover,
  onClose,
}) => {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({
    top: position.top + 8,
    left: position.left,
    opacity: 0,
  });

  useEffect(() => {
    setMounted(true);
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Recompute position whenever cursor position or open state changes
  useEffect(() => {
    if (!isOpen || isMobile) return;

    // Defer so the menu is rendered and we can measure it
    requestAnimationFrame(() => {
      const menu = menuRef.current;
      if (!menu) return;

      const menuW = menu.offsetWidth || 300;
      const menuH = menu.offsetHeight || 300;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const GAP = 8;

      let top = position.top + GAP;
      let left = position.left;

      // Flip upward if below viewport
      if (top + menuH > vh - 16) {
        top = position.top - menuH - GAP;
      }

      // Clamp horizontally so it doesn't overflow right edge
      if (left + menuW > vw - 16) {
        left = vw - menuW - 16;
      }
      // Don't go off left edge
      if (left < 8) left = 8;

      setMenuStyle({ top, left, opacity: 1 });
    });
  }, [isOpen, position.top, position.left, isMobile]);

  // Ensure scroll into view for active item
  useEffect(() => {
    if (isOpen) {
      const activeEl = document.getElementById(`autocomplete-item-${activeIndex}`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, [activeIndex, isOpen]);

  if (!mounted || !isOpen || options.length === 0) return null;

  const content = (
    <>
      {isMobile ? (
        // Mobile Bottom Sheet
        <div className="fixed inset-0 z-[99999] flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onMouseDown={(e) => {
              e.preventDefault();
              onClose();
            }}
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="relative bg-white dark:bg-zinc-900 rounded-t-3xl shadow-2xl border-t border-zinc-200 dark:border-zinc-800 flex flex-col pb-safe max-h-[80vh]"
          >
            <div className="w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto my-3 shrink-0" />
            <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 shrink-0">
               <span className="text-xs font-bold uppercase tracking-widest text-zinc-400">Suggestions</span>
            </div>
            <div className="overflow-y-auto overscroll-contain no-scrollbar p-2">
              {options.map((item, idx) => (
                <button
                  key={idx}
                  id={`autocomplete-item-${idx}`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    if ("vibrate" in navigator) navigator.vibrate(10);
                    onSelect(item);
                  }}
                  className={`w-full px-4 py-3 text-left rounded-xl transition-colors flex items-center gap-4 ${
                    idx === activeIndex
                      ? "bg-blue-600 text-white"
                      : "text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  {item.icon && <span className="text-xl opacity-80">{item.icon}</span>}
                  <div className="flex-1 flex flex-col">
                    <span className={`font-medium ${idx === activeIndex ? "font-bold" : ""}`}>{item.label || item.id}</span>
                    {item.description && <span className="text-xs opacity-70 mt-0.5">{item.description}</span>}
                  </div>
                </button>
              ))}
            </div>
            <div className="px-4 py-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 shrink-0">
               <span className="text-[10px] text-zinc-500 font-medium">Tap to select · Tap outside to dismiss</span>
            </div>
          </motion.div>
        </div>
      ) : (
        // Desktop — cursor-anchored dropdown
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: 4, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 4, scale: 0.97 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="fixed z-[99999] bg-white dark:bg-[#1a1a1a] shadow-2xl rounded-xl border border-zinc-200 dark:border-zinc-800 flex flex-col min-w-[280px] max-w-[320px] overflow-hidden"
          style={menuStyle}
        >
          {/* Header */}
          <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-b border-zinc-100 dark:border-zinc-800">
             <span className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">Suggestions</span>
          </div>

          {/* Body */}
          <div className="max-h-[300px] overflow-y-auto no-scrollbar py-1">
            {options.map((item, idx) => (
              <button
                key={idx}
                id={`autocomplete-item-${idx}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(item);
                }}
                onMouseEnter={() => onHover(idx)}
                className={`w-full px-3 py-2 text-left flex items-center gap-3 transition-colors ${
                  idx === activeIndex
                    ? "bg-blue-600 text-white"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/80"
                }`}
              >
                {item.icon && <span className={`text-base ${idx === activeIndex ? "grayscale-0" : "grayscale opacity-70"}`}>{item.icon}</span>}
                <div className="flex-1 flex flex-col min-w-0">
                  <span className={`text-sm truncate ${idx === activeIndex ? "font-semibold" : "font-medium"}`}>
                    {item.label || item.id}
                  </span>
                  {item.description && <span className={`text-[10px] truncate ${idx === activeIndex ? "opacity-90" : "opacity-60"}`}>{item.description}</span>}
                </div>
                {item.shortcut && <span className={`text-[10px] font-mono whitespace-nowrap ${idx === activeIndex ? "opacity-80" : "opacity-40"}`}>{item.shortcut}</span>}
              </button>
            ))}
          </div>

          {/* Footer */}
          <div className="px-3 py-2 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[10px] text-zinc-500">
            <span><kbd className="font-mono">↑↓</kbd> navigate</span>
            <span><kbd className="font-mono">↵</kbd> accept</span>
            <span><kbd className="font-mono">Esc</kbd> dismiss</span>
          </div>
        </motion.div>
      )}
    </>
  );

  return createPortal(<AnimatePresence>{content}</AnimatePresence>, document.body);
};

