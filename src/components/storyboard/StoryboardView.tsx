"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Camera, Loader2, Workflow, GripHorizontal, LayoutGrid, Minus, ChevronDown, Maximize, Home } from "lucide-react";
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
    moveCard,
    addConnector,
    removeConnector,
    autoLayout,
  } = useStoryboardCanvas(storyboard);

  const [adding, setAdding] = useState(false);
  const [connectMode, setConnectMode] = useState(false);
  const [connectSource, setConnectSource] = useState<string | null>(null);

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

  // Pan and Zoom logic
  useEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    let isPanning = false;
    let startX = 0;
    let startY = 0;
    let initialPanX = 0;
    let initialPanY = 0;

    const onMouseDown = (e: MouseEvent) => {
      // Start panning if middle mouse button, or Space + Left click, or dragging on background
      if (e.button === 1 || e.target === board || (e.target as HTMLElement).closest(".suite-bg-pattern")) {
        e.preventDefault();
        isPanning = true;
        startX = e.clientX;
        startY = e.clientY;
        initialPanX = panRef.current.x;
        initialPanY = panRef.current.y;
        board.style.cursor = "grabbing";
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isPanning) return;
      panRef.current = {
        x: initialPanX + (e.clientX - startX),
        y: initialPanY + (e.clientY - startY),
      };
      triggerRender();
    };

    const onMouseUp = () => {
      if (isPanning) {
        isPanning = false;
        if (board) board.style.cursor = "grab";
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

  const handleAddCard = async () => {
    setAdding(true);
    try {
      // Place near center of current viewport
      const cx = -panRef.current.x / zoomRef.current + 200 + Math.random() * 50;
      const cy = -panRef.current.y / zoomRef.current + 200 + Math.random() * 50;
      
      const card = await createSceneCard(storyboard.id, {
        shot_number: `${String(state.cards.length + 1).padStart(2, "0")}`,
        x: cx,
        y: cy,
      });
      addCard(card);
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
    <div className="flex flex-col h-full overflow-hidden relative">
      {/* Toolbar */}
      <div
        className="flex items-center gap-3 px-6 py-3 shrink-0 relative z-50 bg-white/80 dark:bg-[rgba(10,10,20,0.8)] backdrop-blur-xl border-b border-zinc-200 dark:border-white/5"
      >
        <button
          onClick={() => {
            setConnectMode(!connectMode);
            setConnectSource(null);
          }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            connectMode
              ? "bg-[#c9a84c]/20 text-[#c9a84c] border border-[#c9a84c]/30"
              : "bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
          }`}
        >
          <Workflow className="w-3.5 h-3.5" /> Connect Mode
        </button>

        <button
          onClick={autoLayout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors"
        >
          <LayoutGrid className="w-3.5 h-3.5" /> Auto-Layout Grid
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
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all hover:brightness-110 disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#c9a84c,#a8862e)", color: "#0d0d0d" }}
        >
          {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add Shot
        </button>
      </div>

      {/* Infinite Canvas Viewport */}
      <div
        ref={boardRef}
        className="flex-1 w-full h-full relative cursor-grab bg-zinc-50 dark:bg-[#0d0d0d]"
        style={{ overflow: "hidden" }}
      >
        {/* Dot pattern background fixed to viewport, sliding with pan */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-30"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundPosition: `${panRef.current.x}px ${panRef.current.y}px`,
            backgroundSize: `${32 * zoomRef.current}px ${32 * zoomRef.current}px`,
            color: "var(--foreground, #000)" // will automatically tint dark in light mode
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
                onUpdate={updateCard}
                onRemove={removeCard}
                onMove={moveCard}
                onConnectClick={handleConnectClick}
                connectMode={connectMode}
                isConnectSource={connectSource === card.id}
                getZoom={() => zoomRef.current}
                getPan={() => panRef.current}
              />
            ))}
          </div>
        </div>

        {/* Zoom Controls (Mirroring Director's Suite) */}
        <div className="absolute bottom-6 right-6 flex items-center gap-2 z-50">
          <div className="flex items-center gap-1 bg-white dark:bg-[#1a1a1a] border border-zinc-200 dark:border-[#2a2a2a] rounded-lg p-1 shadow-2xl">
            <button
              onClick={() => zoomTowardCenter(zoomRef.current * 0.9)}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            
            <div className="relative px-2 min-w-[50px] text-center" ref={zoomMenuRef}>
              <button 
                onClick={() => setIsZoomMenuOpen(!isZoomMenuOpen)}
                className="text-[11px] font-mono font-bold text-[#c9a84c] flex items-center gap-1 hover:brightness-110 transition-colors"
              >
                {Math.round(zoomRef.current * 100)}%
                <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${isZoomMenuOpen ? "rotate-180" : ""}`} />
              </button>
              
              {isZoomMenuOpen && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col bg-white dark:bg-[#1a1a1a] border border-zinc-200 dark:border-[#2a2a2a] rounded-lg py-1 shadow-2xl min-w-[80px] animate-in fade-in slide-in-from-bottom-2">
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3].map(z => (
                    <button
                      key={z}
                      onClick={() => {
                        zoomTowardCenter(z);
                        setIsZoomMenuOpen(false);
                      }}
                      className="px-3 py-1.5 text-[10px] text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left transition-colors"
                    >
                      {Math.round(z * 100)}%
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => zoomTowardCenter(zoomRef.current * 1.1)}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded transition-colors text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={fitToContent}
            className="p-2 bg-white dark:bg-[#1a1a1a] border border-zinc-200 dark:border-[#2a2a2a] rounded-lg shadow-2xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            title="Fit to Content"
          >
            <Maximize className="w-4 h-4" />
          </button>

          <button
            onClick={resetCanvas}
            className="p-2 bg-white dark:bg-[#1a1a1a] border border-zinc-200 dark:border-[#2a2a2a] rounded-lg shadow-2xl text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors"
            title="Reset View"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
