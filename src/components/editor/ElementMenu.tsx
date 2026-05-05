"use client";

import React, { useState, useEffect } from "react";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  useDismiss,
  useRole,
  useClick,
  useInteractions,
  FloatingFocusManager,
  FloatingPortal,
} from "@floating-ui/react";
import { motion, AnimatePresence } from "framer-motion";

const ELEMENT_TYPES = [
  { id: "sceneHeading", label: "Scene Heading", icon: "🎬", short: "Scene" },
  { id: "action", label: "Action", icon: "📝", short: "Action" },
  { id: "character", label: "Character", icon: "🎭", short: "Char" },
  { id: "dialogue", label: "Dialogue", icon: "💬", short: "Diag" },
  { id: "parenthetical", label: "Parenthetical", icon: "🔄", short: "Par" },
  { id: "transition", label: "Transition", icon: "➡️", short: "Trans" },
  { id: "shot", label: "Shot", icon: "📷", short: "Shot" },
];

export const ElementMenu = ({
  activeId,
  onSelect,
  isVertical = false,
}: {
  activeId: string;
  onSelect: (id: string) => void;
  isVertical?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: isVertical ? "left-start" : "bottom-start",
    whileElementsMounted: autoUpdate,
    middleware: [
      shift({ padding: 16 }),
      offset(16),
    ],
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context);

  const { getReferenceProps, getFloatingProps } = useInteractions([
    click,
    dismiss,
    role,
  ]);

  const activeElement = ELEMENT_TYPES.find((e) => e.id === activeId) || ELEMENT_TYPES[1]; // default Action

  return (
    <>
      <button
        ref={refs.setReference}
        {...getReferenceProps({
          onMouseDown: (e: React.MouseEvent) => {
            // Prevent default to preserve focus in the editor when clicking the trigger
            e.preventDefault();
          },
        })}
        className={`px-3 py-1.5 text-[10px] font-bold tracking-widest text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors uppercase text-center select-none cursor-pointer flex items-center justify-center toolbar-item ${isVertical ? 'flex-col gap-2 w-full py-4' : 'gap-1 min-w-[90px]'}`}
        title="Change Element Type"
      >
        <span
          style={isVertical ? { writingMode: "vertical-rl", transform: "rotate(180deg)" } : {}}
          className="whitespace-nowrap"
        >
          {activeElement.label}
        </span>
        <span className={`text-[8px] opacity-50 ${isVertical ? 'mt-1' : ''}`}>▼</span>
      </button>

      <FloatingPortal>
        <AnimatePresence>
          {isOpen && (
            <FloatingFocusManager context={context} modal={false}>
              <div
                // eslint-disable-next-line react-hooks/refs
                ref={refs.setFloating}
                style={floatingStyles}
                {...getFloatingProps()}
                className="z-[100000]"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: isMobile ? 10 : 0, x: isMobile ? 0 : 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: isMobile ? 5 : 0, x: isMobile ? 0 : 5 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="outline-none flex flex-col py-1 min-w-[220px] bg-white dark:bg-[#1a1a1a] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] rounded-2xl"
                >
                  <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-800/80">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Element Type</span>
                  </div>
                  <div className="flex flex-col p-1.5 max-h-[60vh] overflow-y-auto no-scrollbar">
                    {ELEMENT_TYPES.map((item) => (
                      <button
                        key={item.id}
                        onMouseDown={(e) => {
                           e.preventDefault(); // Critical to not blur the editor
                           onSelect(item.id);
                           setIsOpen(false);
                        }}
                        className={`px-3 py-2.5 text-sm text-left rounded-xl flex items-center gap-3 transition-colors ${
                          activeId === item.id
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-semibold"
                            : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                        }`}
                      >
                        <span className={`text-base ${activeId === item.id ? "grayscale-0" : "grayscale opacity-80"}`}>{item.icon}</span>
                        <span>{item.label}</span>
                      </button>
                    ))}
                  </div>
                </motion.div>
              </div>
            </FloatingFocusManager>
          )}
        </AnimatePresence>
      </FloatingPortal>
    </>
  );
};
