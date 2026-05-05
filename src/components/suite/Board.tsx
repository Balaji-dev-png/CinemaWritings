"use client";
import { forwardRef, useCallback, useEffect, useRef, useState } from "react";
import { SuiteElement, Connector } from "@/hooks/useSuiteState";
import { IdeaCard } from "./IdeaCard";
import { ShotCard } from "./ShotCard";
import { ImageCard } from "./ImageCard";
import { LinkCard } from "./LinkCard";
import { ConnectorLayer } from "./ConnectorLayer";
import { DrawingCanvas } from "./DrawingCanvas";
import { Minus, Plus, Maximize, Home, ChevronDown } from "lucide-react";

interface Props {
  elements: SuiteElement[];
  connectors: Connector[];
  drawMode: boolean;
  connectMode: boolean;
  drawingCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onMoveElement: (id: string, x: number, y: number) => void;
  onResizeElement: (id: string, w: number, h: number) => void;
  onUpdateData: (id: string, data: Record<string, unknown>) => void;
  onRemoveElement: (id: string) => void;
  onRemoveConnector: (id: string) => void;
  onConnectClick: (id: string) => void;
  connectSource?: string | null;
  scriptId: string;
}

interface CanvasState {
  zoom: number;
  pan: { x: number; y: number };
}

export const Board = forwardRef<HTMLDivElement, Props>(
  function Board(
    {
      elements, connectors, drawMode, connectMode, connectSource, drawingCanvasRef,
      onMoveElement, onResizeElement, onUpdateData, onRemoveElement,
      onRemoveConnector, onConnectClick, scriptId
    },
    ref
  ) {
    const internalViewportRef = useRef<HTMLDivElement>(null);
    const viewportRef = (ref as React.RefObject<HTMLDivElement | null>) || internalViewportRef;
    const canvasRef = useRef<HTMLDivElement>(null);
    
    // Canvas State
    const [canvas, setCanvas] = useState<CanvasState>({ zoom: 1, pan: { x: 0, y: 0 } });
    const zoomRef = useRef(1);
    const panRef = useRef({ x: 0, y: 0 });

    // Sync refs with state
    useEffect(() => {
      zoomRef.current = canvas.zoom;
      panRef.current = canvas.pan;
    }, [canvas]);

    // Panning State
    const isPanning = useRef(false);
    const panStart = useRef({ x: 0, y: 0 });
    const isSpaceDown = useRef(false);

    // Dropdown state
    const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
    const zoomMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (zoomMenuRef.current && !zoomMenuRef.current.contains(e.target as Node)) {
          setIsZoomMenuOpen(false);
        }
      };
      if (isZoomMenuOpen) {
        window.addEventListener("mousedown", handleClickOutside);
      }
      return () => window.removeEventListener("mousedown", handleClickOutside);
    }, [isZoomMenuOpen]);

    // PERSISTENCE (Feature 7)
    useEffect(() => {
      const saved = localStorage.getItem(`canvas_state_${scriptId}`);
      if (saved) {
        try {
          const { zoom, pan } = JSON.parse(saved);
          zoomRef.current = zoom;
          panRef.current = pan;
          setCanvas({ zoom, pan });
        } catch (e) {
          console.error("Failed to restore canvas state", e);
        }
      }
    }, [scriptId]);

    useEffect(() => {
      const timer = setTimeout(() => {
        localStorage.setItem(`canvas_state_${scriptId}`, JSON.stringify({
          zoom: canvas.zoom,
          pan: canvas.pan
        }));
      }, 300);
      return () => clearTimeout(timer);
    }, [canvas.zoom, canvas.pan, scriptId]);

    // ZOOM TOWARD CURSOR (Feature 1)
    const handleWheel = useCallback((e: WheelEvent) => {
      if ((e.target as HTMLElement).closest('.suite-scrollbar')) {
         return;
      }

      e.preventDefault();

      if (e.ctrlKey) {
        const ZOOM_SENSITIVITY = 0.005;
        const MIN_ZOOM = 0.1;
        const MAX_ZOOM = 3.0;

        const mouseX = e.clientX;
        const mouseY = e.clientY;

        const delta = -e.deltaY * ZOOM_SENSITIVITY;
        const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoomRef.current * (1 + delta)));

        const canvasPointX = (mouseX - panRef.current.x) / zoomRef.current;
        const canvasPointY = (mouseY - panRef.current.y) / zoomRef.current;

        const newPanX = mouseX - canvasPointX * newZoom;
        const newPanY = mouseY - canvasPointY * newZoom;

        setCanvas({ zoom: newZoom, pan: { x: newPanX, y: newPanY } });
      } else {
        const newPan = {
          x: panRef.current.x - e.deltaX,
          y: panRef.current.y - e.deltaY
        };
        setCanvas(prev => ({ ...prev, pan: newPan }));
      }
    }, []);

    useEffect(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      viewport.addEventListener('wheel', handleWheel, { passive: false });
      return () => viewport.removeEventListener('wheel', handleWheel);
    }, [viewportRef, handleWheel]);

    // PANNING LOGIC (Feature 2)
    const handleMouseDown = (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && isSpaceDown.current)) {
        e.preventDefault();
        isPanning.current = true;
        panStart.current = {
          x: e.clientX - panRef.current.x,
          y: e.clientY - panRef.current.y
        };
        if (viewportRef.current) viewportRef.current.style.cursor = 'grabbing';
      }
    };

    useEffect(() => {
      const handleGlobalMouseMove = (e: MouseEvent) => {
        if (isPanning.current) {
          const newPan = {
            x: e.clientX - panStart.current.x,
            y: e.clientY - panStart.current.y
          };
          setCanvas(prev => ({ ...prev, pan: newPan }));
        }
      };

      const handleGlobalMouseUp = (e: MouseEvent) => {
        if (isPanning.current) {
          isPanning.current = false;
          if (viewportRef.current) {
            viewportRef.current.style.cursor = isSpaceDown.current ? 'grab' : 'default';
          }
        }
      };

      window.addEventListener('mousemove', handleGlobalMouseMove);
      window.addEventListener('mouseup', handleGlobalMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleGlobalMouseMove);
        window.removeEventListener('mouseup', handleGlobalMouseUp);
      };
    }, [viewportRef]);

    // KEYBOARD SHORTCUTS (Feature 8 & Method 2)
    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && !e.repeat) {
          if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName || '')) return;
          e.preventDefault();
          isSpaceDown.current = true;
          if (viewportRef.current) viewportRef.current.style.cursor = 'grab';
        }

        if ((e.ctrlKey || e.metaKey)) {
          if (e.key === '=' || e.key === '+') {
            e.preventDefault();
            zoomTowardCenter(zoomRef.current * 1.1);
          } else if (e.key === '-') {
            e.preventDefault();
            zoomTowardCenter(zoomRef.current * 0.9);
          } else if (e.key === '0') {
            e.preventDefault();
            resetCanvas();
          } else if (e.shiftKey && e.key.toUpperCase() === 'H') {
            e.preventDefault();
            fitToContent();
          }
        }
      };

      const onKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') {
          isSpaceDown.current = false;
          if (viewportRef.current) viewportRef.current.style.cursor = 'default';
        }
      };

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
      return () => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      };
    }, [elements, viewportRef]);

    const zoomTowardCenter = (newZoom: number) => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const centerX = viewport.clientWidth / 2;
      const centerY = viewport.clientHeight / 2;

      const canvasPointX = (centerX - panRef.current.x) / zoomRef.current;
      const canvasPointY = (centerY - panRef.current.y) / zoomRef.current;

      const newPanX = centerX - canvasPointX * newZoom;
      const newPanY = centerY - canvasPointY * newZoom;

      setCanvas({ zoom: newZoom, pan: { x: newPanX, y: newPanY } });
    };

    const resetCanvas = () => {
      setCanvas({ zoom: 1, pan: { x: 0, y: 0 } });
    };

    const fitToContent = () => {
      if (elements.length === 0) {
        resetCanvas();
        return;
      }

      const minX = Math.min(...elements.map(el => el.x));
      const minY = Math.min(...elements.map(el => el.y));
      const maxX = Math.max(...elements.map(el => el.x + el.width));
      const maxY = Math.max(...elements.map(el => el.y + el.height));

      const contentWidth = maxX - minX;
      const contentHeight = maxY - minY;
      const padding = 80;

      const viewport = viewportRef.current!;
      const scaleX = (viewport.clientWidth - padding * 2) / contentWidth;
      const scaleY = (viewport.clientHeight - padding * 2) / contentHeight;
      const newZoom = Math.min(scaleX, scaleY, 1.0);

      const newPanX = (viewport.clientWidth / 2) - ((minX + contentWidth / 2) * newZoom);
      const newPanY = (viewport.clientHeight / 2) - ((minY + contentHeight / 2) * newZoom);

      if (canvasRef.current) canvasRef.current.style.transition = 'transform 0.3s ease-out';
      setCanvas({ zoom: newZoom, pan: { x: newPanX, y: newPanY } });
      setTimeout(() => {
        if (canvasRef.current) canvasRef.current.style.transition = '';
      }, 300);
    };

    const getZoom = useCallback(() => zoomRef.current, []);
    const getPan = useCallback(() => panRef.current, []);

    return (
      <div
        ref={viewportRef}
        className="flex-1 relative overflow-hidden select-none"
        style={{
          backgroundColor: '#0d0d0d',
          backgroundImage: 'radial-gradient(circle, #1e1e1e 1px, transparent 1px)',
          backgroundSize: `${28 * canvas.zoom}px ${28 * canvas.zoom}px`,
          backgroundPosition: `${canvas.pan.x}px ${canvas.pan.y}px`,
        }}
        onMouseDown={handleMouseDown}
      >
        <ConnectorLayer
          elements={elements}
          connectors={connectors}
          zoom={canvas.zoom}
          pan={canvas.pan}
          onRemoveConnector={onRemoveConnector}
        />

        <div
          ref={canvasRef}
          className="director-suite-canvas"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '4000px',
            height: '3000px',
            transformOrigin: '0 0',
            transform: `translate(${canvas.pan.x}px, ${canvas.pan.y}px) scale(${canvas.zoom})`,
          }}
        >
          <DrawingCanvas
            ref={drawingCanvasRef}
            width={4000}
            height={3000}
            active={drawMode}
          />

          {elements.map((el) => {
            const isConnectSource = connectSource === el.id;
            const commonProps = {
              element: el,
              onMove: onMoveElement,
              onResize: onResizeElement,
              onUpdate: onUpdateData,
              onRemove: onRemoveElement,
              onConnectClick,
              connectMode,
              isConnectSource,
              getZoom,
              getPan,
            };

            switch (el.type) {
              case "idea": return <IdeaCard key={el.id} {...commonProps} />;
              case "shot": return <ShotCard key={el.id} {...commonProps} />;
              case "image": return <ImageCard key={el.id} {...commonProps} />;
              case "link": return <LinkCard key={el.id} {...commonProps} />;
              default: return null;
            }
          })}
        </div>

        <div className="absolute bottom-6 left-6 flex items-center gap-2 z-50">
          <div className="flex items-center gap-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg p-1 shadow-2xl">
            <button
              onClick={() => zoomTowardCenter(canvas.zoom * 0.9)}
              className="p-1.5 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            
            <div className="relative px-2 min-w-[50px] text-center" ref={zoomMenuRef}>
              <button 
                onClick={() => setIsZoomMenuOpen(!isZoomMenuOpen)}
                className="text-[11px] font-mono font-bold text-[#c9a84c] flex items-center gap-1 hover:text-white transition-colors"
              >
                {Math.round(canvas.zoom * 100)}%
                <ChevronDown className={`w-3 h-3 opacity-50 transition-transform ${isZoomMenuOpen ? "rotate-180" : ""}`} />
              </button>
              
              {isZoomMenuOpen && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg py-1 shadow-2xl min-w-[80px] animate-in fade-in slide-in-from-bottom-2">
                  {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3].map(z => (
                    <button
                      key={z}
                      onClick={() => {
                        zoomTowardCenter(z);
                        setIsZoomMenuOpen(false);
                      }}
                      className="px-3 py-1.5 text-[10px] text-zinc-400 hover:text-white hover:bg-zinc-800 text-left transition-colors"
                    >
                      {Math.round(z * 100)}%
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => zoomTowardCenter(canvas.zoom * 1.1)}
              className="p-1.5 hover:bg-zinc-800 rounded transition-colors text-zinc-400 hover:text-white"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <button
            onClick={fitToContent}
            className="p-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-2xl text-zinc-400 hover:text-white transition-colors"
          >
            <Maximize className="w-4 h-4" />
          </button>

          <button
            onClick={resetCanvas}
            className="p-2 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg shadow-2xl text-zinc-400 hover:text-white transition-colors"
          >
            <Home className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }
);
