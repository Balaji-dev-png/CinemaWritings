"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Camera, Loader2, Workflow, GripHorizontal, LayoutGrid, Minus, ChevronDown, Maximize, Home, Trash2, Square } from "lucide-react";
import { Storyboard, createSceneCard } from "@/lib/storyboard-api";
import { useStoryboardCanvas } from "@/hooks/useStoryboardCanvas";
import { InlineSceneCard } from "./InlineSceneCard";
import { StoryboardConnectorLayer } from "./StoryboardConnectorLayer";

interface Props {
  storyboard: Storyboard;
  onStoryboardChange: (updated: Storyboard) => void;
}

export function StoryboardView({ storyboard, onStoryboardChange }: Props) {
  const {
    state,
    addCard,
    updateCard,
    removeCard,
    removeCards,
    removeAll,
    moveCard,
    addConnector,
    removeConnector,
    autoLayout,
  } = useStoryboardCanvas(storyboard);

  const [adding, setAdding] = useState(false);
  const [connectMode, setConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectionRect, setSelectionRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  // Viewport State
  const boardRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const [forceRender, setForceRender] = useState(0);

  const triggerRender = useCallback(() => setForceRender((v) => v + 1), []);

  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const zoomMenuRef = useRef<HTMLDivElement>(null);

  // Close zoom menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (zoomMenuRef.current && !zoomMenuRef.current.contains(e.target as Node)) {
        setIsZoomMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard listeners for Pan (Space) and Delete
  const isSpaceDown = useRef(false);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") isSpaceDown.current = true;
      if (e.key === "Delete" || e.key === "Backspace") {
        const activeEl = document.activeElement;
        const isInput = activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA";
        if (!isInput && selectedIds.length > 0) {
          if (window.confirm(`Delete ${selectedIds.length} shots?`)) {
            removeCards(selectedIds);
            setSelectedIds([]);
          }
        }
      }
      if (e.key === "Escape") {
        setConnectMode(false);
        setConnectSource(null);
        setSelectedIds([]);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") isSpaceDown.current = false;
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [selectedIds, removeCards]);

  // Pan and Zoom and Selection logic
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    let isPanning = false;
    let isSelecting = false;
    let startX = 0;
    let startY = 0;
    let initialPanX = 0;
    let initialPanY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement).closest('.suite-scrollbar')) return;
      
      startX = e.clientX;
      startY = e.clientY;

      // Pan Mode: Space + Left Click OR Middle Click
      if (e.button === 1 || (e.button === 0 && isSpaceDown.current)) {
        e.preventDefault();
        isPanning = true;
        initialPanX = panRef.current.x;
        initialPanY = panRef.current.y;
        board.style.cursor = "grabbing";
        return;
      }

      // Selection Mode: Left Click on background
      if (e.button === 0 && (e.target === board || (e.target as HTMLElement).closest(".suite-bg-pattern"))) {
        isSelecting = true;
        if (!e.shiftKey && !e.metaKey && !e.ctrlKey) {
          setSelectedIds([]);
        }
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (isPanning) {
        panRef.current = {
          x: initialPanX + (e.clientX - startX),
          y: initialPanY + (e.clientY - startY),
        };
        triggerRender();
      } else if (isSelecting) {
        const rect = board.getBoundingClientRect();
        const curX = e.clientX - rect.left;
        const curY = e.clientY - rect.top;
        const originX = startX - rect.left;
        const originY = startY - rect.top;

        const x = Math.min(originX, curX);
        const y = Math.min(originY, curY);
        const w = Math.abs(curX - originX);
        const h = Math.abs(curY - originY);

        setSelectionRect({ x, y, w, h });

        const zoom = zoomRef.current;
        const pan = panRef.current;
        
        const canvasX = (x - pan.x) / zoom;
        const canvasY = (y - pan.y) / zoom;
        const canvasW = w / zoom;
        const canvasH = h / zoom;

        const ids = state.cards.filter(card => {
          const cx = card.x || 0;
          const cy = card.y || 0;
          const cw = card.width || 320;
          const ch = card.height || 450;
          return (
            cx + cw > canvasX &&
            cx < canvasX + canvasW &&
            cy + ch > canvasY &&
            cy < canvasY + canvasH
          );
        }).map(c => c.id);

        if (e.shiftKey || e.metaKey || e.ctrlKey) {
          setSelectedIds(prev => Array.from(new Set([...prev, ...ids])));
        } else {
          setSelectedIds(ids);
        }
      }
    };

    const onMouseUp = () => {
      if (isPanning) {
        isPanning = false;
        if (board) board.style.cursor = "grab";
      }
      if (isSelecting) {
        isSelecting = false;
        setSelectionRect(null);
      }
    };

    const onWheel = (e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('.suite-scrollbar')) return;
      e.preventDefault();

      const ZOOM_SENSITIVITY = 0.001;
      const MIN_ZOOM = 0.1;
      const MAX_ZOOM = 3.0;

      const rect = board.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      let delta = -e.deltaY * ZOOM_SENSITIVITY;
      if (delta > 0.05) delta = 0.05;
      if (delta < -0.05) delta = -0.05;

      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current * (1 + delta)));

      const canvasPointX = (mouseX - panRef.current.x) / zoomRef.current;
      const canvasPointY = (mouseY - panRef.current.y) / zoomRef.current;

      panRef.current = {
        x: mouseX - canvasPointX * newZoom,
        y: mouseY - canvasPointY * newZoom,
      };
      
      zoomRef.current = newZoom;
      triggerRender();
    };

    board.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    board.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      board.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      board.removeEventListener("wheel", onWheel);
    };
  }, [triggerRender]);

  const zoomTowardCenter = useCallback((targetZoom: number) => {
    const board = boardRef.current;
    if (!board) return;
    
    const MIN_ZOOM = 0.1;
    const MAX_ZOOM = 3.0;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, targetZoom));
    
    const rect = board.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const canvasPointX = (centerX - panRef.current.x) / zoomRef.current;
    const canvasPointY = (centerY - panRef.current.y) / zoomRef.current;

    panRef.current = {
      x: centerX - canvasPointX * newZoom,
      y: centerY - canvasPointY * newZoom,
    };
    zoomRef.current = newZoom;
    triggerRender();
  }, [triggerRender]);

  const fitToContent = useCallback(() => {
    if (state.cards.length === 0) {
      zoomRef.current = 1;
      panRef.current = { x: 0, y: 0 };
      triggerRender();
      return;
    }

    const minX = Math.min(...state.cards.map(c => c.x || 0));
    const minY = Math.min(...state.cards.map(c => c.y || 0));
    const maxX = Math.max(...state.cards.map(c => (c.x || 0) + (c.width || 320)));
    const maxY = Math.max(...state.cards.map(c => (c.y || 0) + (c.height || 180)));

    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    const padding = 80;

    const board = boardRef.current;
    if (!board) return;

    const scaleX = (board.clientWidth - padding * 2) / contentWidth;
    const scaleY = (board.clientHeight - padding * 2) / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 1.0);

    panRef.current = {
      x: (board.clientWidth / 2) - ((minX + contentWidth / 2) * newZoom),
      y: (board.clientHeight / 2) - ((minY + contentHeight / 2) * newZoom),
    };
    zoomRef.current = newZoom;
    triggerRender();
  }, [state.cards, triggerRender]);

  const resetCanvas = useCallback(() => {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    triggerRender();
  }, [triggerRender]);

  // Center canvas initially
  useEffect(() => {
    if (boardRef.current && panRef.current.x === 0 && panRef.current.y === 0 && state.cards.length === 0) {
      panRef.current = {
        x: boardRef.current.clientWidth / 2 - 200,
        y: boardRef.current.clientHeight / 2 - 200
      };
      triggerRender();
    }
  }, [state.cards.length, triggerRender]);

  const handleAddCard = async () => {
    setAdding(true);
    try {
      // Default to grid-based placement for "Auto Grid" feel
      const COLS = 4;
      const GAP_X = 380;
      const GAP_Y = 580; 
      const START_X = 100;
      const START_Y = 100;
      
      const index = state.cards.length;
      const row = Math.floor(index / COLS);
      const col = index % COLS;
      
      const cx = START_X + col * GAP_X;
      const cy = START_Y + row * GAP_Y;
      
      const card = await createSceneCard(storyboard.id, {
        shot_number: `${String(index + 1).padStart(2, "0")}`,
        x: cx,
        y: cy,
        width: 320,
        height: 500,
        aspect_ratio: "1.78:1",
        shot_type: "MS",
        camera_movement: "static"
      });
      addCard(card);

      // If it's the first card, center the view on it
      if (index === 0) {
        zoomRef.current = 0.8;
        panRef.current = { 
          x: 100, 
          y: 100 
        };
        triggerRender();
      }
    } catch (err) {
      console.error("Failed to add shot:", err);
    } finally {
      setAdding(false);
    }
  };

  const handleConnectClick = (id: string) => {
    if (!connectMode) return;
    if (!connectSource) {
      setConnectSource(id);
    } else {
      if (connectSource !== id) {
        addConnector({
          id: crypto.randomUUID(),
          fromId: connectSource,
          toId: id,
        });
      }
      setConnectSource(null);
    }
  };

  // Turn off connect mode with Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setConnectMode(false);
        setConnectSource(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden relative bg-zinc-50 dark:bg-[#0d0d0d]">
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-6 py-3 shrink-0 relative z-50 bg-white dark:bg-[#111] border-b border-zinc-200 dark:border-[#222]"
      >
        <button
          onClick={() => {
            setConnectMode(!connectMode);
            setConnectSource(null);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            connectMode
              ? "bg-[#c9a84c] text-white shadow-sm"
              : "bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
          }`}
        >
          <Workflow className="w-3.5 h-3.5" /> Connect Mode
        </button>

        <button
          onClick={autoLayout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <LayoutGrid className="w-3.5 h-3.5" /> Auto-Layout Grid
        </button>

        <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 mx-1" />

        {selectedIds.length > 0 && (
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete ${selectedIds.length} shots?`)) {
                removeCards(selectedIds);
                setSelectedIds([]);
              }
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all animate-in zoom-in-95 duration-200"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete Selected ({selectedIds.length})
          </button>
        )}

        <button
          onClick={() => {
            removeAll();
            setSelectedIds([]);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-500 hover:text-red-500 hover:bg-red-500/5 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete All
        </button>

        <div className="flex-1" />

        {/* Temporary visual feedback if connect mode is active */}
        {connectMode && (
          <div className="text-xs text-[#c9a84c] animate-pulse mr-4">
            {connectSource ? "Select target card to connect..." : "Select source card..."}
          </div>
        )}

        <button
          onClick={handleAddCard}
          disabled={adding}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all hover:brightness-110 disabled:opacity-60 bg-[#c9a84c] text-black shadow-sm"
        >
          {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add Shot
        </button>
      </div>

      {/* Infinite Canvas Viewport */}
      <div
        ref={boardRef}
        className="flex-1 w-full relative cursor-grab bg-zinc-50 dark:bg-[#0d0d0d] overflow-hidden"
      >
        {/* Selection Marquee */}
        {selectionRect && (
          <div
            className="absolute border border-[#c9a84c] bg-[#c9a84c]/5 z-[100] pointer-events-none"
            style={{
              left: selectionRect.x,
              top: selectionRect.y,
              width: selectionRect.w,
              height: selectionRect.h,
            }}
          />
        )}

        {/* Dot pattern background fixed to viewport, sliding with pan */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.15] dark:opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1.5px, transparent 1.5px)',
            backgroundPosition: `${panRef.current.x}px ${panRef.current.y}px`,
            backgroundSize: `${40 * zoomRef.current}px ${40 * zoomRef.current}px`,
            color: "var(--foreground, #888)"
          }}
        />

        {/* Transform Layer for Pan & Zoom */}
        <div
          className="absolute top-0 left-0 origin-top-left pointer-events-none"
          style={{
            transform: `translate(${panRef.current.x}px, ${panRef.current.y}px) scale(${zoomRef.current})`,
            width: "10000px",
            height: "10000px",
          }}
        >
          <StoryboardConnectorLayer
            cards={state.cards}
            connectors={state.connectors}
            onRemoveConnector={removeConnector}
          />
          
          <div className="pointer-events-auto">
            {state.cards.map((card) => (
              <InlineSceneCard
                key={card.id}
                card={card}
                onUpdate={(patch) => updateCard(card.id, patch)}
                onRemove={(id) => {
                  removeCard(id);
                  setSelectedIds(prev => prev.filter(p => p !== id));
                }}
                onMove={(x, y) => moveCard(card.id, x, y)}
                onConnectClick={handleConnectClick}
                connectMode={connectMode}
                isConnectSource={connectSource === card.id}
                isSelected={selectedIds.includes(card.id)}
                onSelect={(multi) => {
                  if (multi) {
                    setSelectedIds(prev => 
                      prev.includes(card.id) ? prev.filter(id => id !== card.id) : [...prev, card.id]
                    );
                  } else {
                    setSelectedIds([card.id]);
                  }
                }}
                getZoom={() => zoomRef.current}
                getPan={() => panRef.current}
              />
            ))}
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="absolute bottom-6 right-6 flex items-center gap-3 z-50">
          <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-1.5 shadow-xl">
            <button
              onClick={() => zoomTowardCenter(zoomRef.current * 0.9)}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 dark:text-zinc-400"
            >
              <Minus className="w-4 h-4" />
            </button>
            
            <div className="relative px-3 min-w-[60px] text-center" ref={zoomMenuRef}>
              <button 
                onClick={() => setIsZoomMenuOpen(!isZoomMenuOpen)}
                className="text-xs font-bold text-[#c9a84c] flex items-center gap-1 hover:brightness-110"
              >
                {Math.round(zoomRef.current * 100)}%
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isZoomMenuOpen ? "rotate-180" : ""}`} />
              </button>
              
              {isZoomMenuOpen && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 flex flex-col bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 shadow-2xl min-w-[100px] overflow-hidden">
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3].map(z => (
                    <button
                      key={z}
                      onClick={() => {
                        zoomTowardCenter(z);
                        setIsZoomMenuOpen(false);
                      }}
                      className="px-4 py-2 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 text-left transition-colors"
                    >
                      {Math.round(z * 100)}%
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => zoomTowardCenter(zoomRef.current * 1.1)}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-500 dark:text-zinc-400"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={fitToContent}
            className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            title="Fit to Content"
          >
            <Maximize className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={resetCanvas}
            className="p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            title="Reset View"
          >
            <Home className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
