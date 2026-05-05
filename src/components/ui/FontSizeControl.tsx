"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Editor } from "@tiptap/react";

interface FontSizeControlProps {
  editor: Editor | null;
  defaultSize?: number;
}

const DRAG_THRESHOLD = 3;

export const FontSizeControl = ({ editor, defaultSize = 12 }: FontSizeControlProps) => {
  const [displayValue, setDisplayValue] = useState<string>(String(defaultSize));
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Refs for drag logic (avoid state to prevent re-render lag)
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startValueRef = useRef(0);

  // Sync with TipTap selection
  const handleSelectionUpdate = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const attrs = editor.getAttributes("textStyle");
    
    // If there's a selection but no explicit font size attribute across the entire selection,
    // we use '-' for mixed or default
    if (from !== to && attrs.fontSize === undefined) {
      // Try to get attribute from the start of selection if uniform check fails
      const startAttrs = editor.getAttributes("textStyle");
      setDisplayValue(startAttrs.fontSize || "-");
    } else {
      setDisplayValue(attrs.fontSize || String(defaultSize));
    }
  }, [editor, defaultSize]);

  useEffect(() => {
    if (!editor) return;
    
    editor.on("selectionUpdate", handleSelectionUpdate);
    // Initial sync
    handleSelectionUpdate();
    
    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editor, handleSelectionUpdate]);

  // Apply font size logic (Level 1 & 2)
  const applyFontSize = useCallback((size: string) => {
    if (!editor) return;
    
    // Ensure size is a valid number, ignore "-" or invalid strings
    const numSize = parseFloat(size);
    if (isNaN(numSize)) return;
    
    const clampedSize = Math.max(6, Math.min(72, numSize));
    const sizeStr = String(clampedSize);
    
    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;

    if (hasSelection) {
      // Level 1: apply to selected text only
      editor.chain().focus().setFontSize(sizeStr).run();
    } else {
      // Level 2: apply to whole current block
      const { $from } = editor.state.selection;
      editor
        .chain()
        .setTextSelection({ from: $from.start(), to: $from.end() })
        .setFontSize(sizeStr)
        // restore cursor position
        .setTextSelection({ from, to })
        .run();
    }
  }, [editor]);

  // Handle Drag / Click
  const onPointerDown = (e: React.PointerEvent<HTMLInputElement>) => {
    startXRef.current = e.clientX;
    const currentVal = parseFloat(displayValue);
    startValueRef.current = isNaN(currentVal) ? defaultSize : currentVal;
    isDraggingRef.current = false;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLInputElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    
    const deltaX = e.clientX - startXRef.current;
    
    if (!isDraggingRef.current && Math.abs(deltaX) > DRAG_THRESHOLD) {
      isDraggingRef.current = true;
      // blur to prevent text selection interference during drag
      inputRef.current?.blur();
    }
    
    if (isDraggingRef.current) {
      const speed = e.shiftKey ? 2.5 : 0.5;
      const newSize = Math.round(startValueRef.current + deltaX * speed);
      const clamped = Math.min(72, Math.max(6, newSize));
      
      applyFontSize(String(clamped));
      setDisplayValue(String(clamped));
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLInputElement>) => {
    e.currentTarget.releasePointerCapture(e.pointerId);
    if (!isDraggingRef.current) {
      // Treat as click - focus and select all text
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    isDraggingRef.current = false;
  };

  // Wheel listener
  useEffect(() => {
    const inputEl = inputRef.current;
    if (!inputEl) return;

    const handleWheel = (e: WheelEvent) => {
      // Only handle wheel if input is focused
      if (document.activeElement !== inputEl) return;
      
      e.preventDefault();
      const currentVal = parseFloat(displayValue);
      const startVal = isNaN(currentVal) ? defaultSize : currentVal;
      
      const delta = e.deltaY > 0 ? -1 : 1;
      const step = e.shiftKey ? 10 : 1;
      const newSize = startVal + (delta * step);
      const clamped = Math.min(72, Math.max(6, newSize));
      
      applyFontSize(String(clamped));
      setDisplayValue(String(clamped));
    };

    inputEl.addEventListener('wheel', handleWheel, { passive: false });
    return () => inputEl.removeEventListener('wheel', handleWheel);
  }, [displayValue, defaultSize, applyFontSize]);

  // Keyboard controls
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const currentVal = parseFloat(displayValue);
    const startVal = isNaN(currentVal) ? defaultSize : currentVal;

    if (e.key === "Enter") {
      e.preventDefault();
      applyFontSize(displayValue);
      inputRef.current?.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      // Revert to actual selection size or default
      handleSelectionUpdate();
      inputRef.current?.blur();
    } else if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      e.preventDefault();
      const delta = e.key === "ArrowUp" ? 1 : -1;
      
      let step = 1;
      if (e.shiftKey) step = 10;
      if (e.altKey) step = 0.1;
      
      let newSize = startVal + (delta * step);
      if (e.altKey) {
        newSize = Math.round(newSize * 10) / 10; // keep one decimal
      } else {
        newSize = Math.round(newSize);
      }
      
      const clamped = Math.min(72, Math.max(6, newSize));
      applyFontSize(String(clamped));
      setDisplayValue(String(clamped));
      inputRef.current?.select();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDisplayValue(e.target.value);
  };

  const handleBlur = () => {
    const numSize = parseFloat(displayValue);
    if (isNaN(numSize) || numSize < 6 || numSize > 72) {
      handleSelectionUpdate(); // revert if invalid
    } else {
      applyFontSize(displayValue);
    }
  };

  return (
    <input
      ref={inputRef}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{ touchAction: "none" }}
      className="w-[48px] h-[28px] bg-[#2a2a2a] border border-[#3a3a3a] rounded text-[#ffffff] text-[13px] text-center font-mono cursor-ew-resize select-none transition-colors duration-150 focus:cursor-text focus:border-[#c9a84c] focus:outline-none focus:select-text focus:bg-[#1a1a1a] no-arrows"
    />
  );
};
