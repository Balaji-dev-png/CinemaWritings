"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Camera, Loader2, Workflow, GripHorizontal, LayoutGrid } from "lucide-react";
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
        board.style.cursor = "grab";
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const zoomDelta = e.deltaY * -0.005;
        let newZoom = zoomRef.current + zoomDelta;
        newZoom = Math.min(Math.max(0.2, newZoom), 3);
        
        // Zoom towards mouse pointer
        const rect = board.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        const zoomRatio = newZoom / zoomRef.current;
        panRef.current = {
          x: mouseX - (mouseX - panRef.current.x) * zoomRatio,
          y: mouseY - (mouseY - panRef.current.y) * zoomRatio,
        };
        
        zoomRef.current = newZoom;
      } else {
        // Pan
        panRef.current = {
          x: panRef.current.x - e.deltaX,
          y: panRef.current.y - e.deltaY,
        };
      }
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
      </div>
    </div>
  );
}
