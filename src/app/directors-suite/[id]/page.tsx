"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSuiteState, SuiteElement, ViewportState } from "@/hooks/useSuiteState";
import { Stroke } from "@/hooks/useDrawing";
import { useDrawing } from "@/hooks/useDrawing";
import { SuiteToolbar } from "@/components/suite/SuiteToolbar";
import { Board } from "@/components/suite/Board";
import { getScriptById } from "@/lib/storage";
import { useLoadingState } from "@/hooks/useLoadingState";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import "@/styles/suite.css";

import { Layers, Home, BookOpen, FileCode } from "lucide-react";
import { DrawingToolbar } from "@/components/suite/DrawingToolbar";

function uid() {
  return crypto.randomUUID();
}

export default function DirectorsSuitePage() {
  const params = useParams();
  const router = useRouter();
  const scriptId = params.id as string;

  const [scriptTitle, setScriptTitle] = useState("Untitled");
  const [connectMode, setConnectMode] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [connectSource, setConnectSource] = useState<string | null>(null);

  // Clipboard for copy-paste
  const [clipboard, setClipboard] = useState<SuiteElement | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  // Instant navigation overlay
  const [isNavigating, setIsNavigating] = useState(false);
  const [navMessage, setNavMessage] = useState("");
  const navigateTo = (path: string, msg = "Loading...") => {
    setNavMessage(msg);
    setIsNavigating(true);
    router.push(path);
  };

  const boardRef = useRef<HTMLDivElement>(null);
  const innerCanvasRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });

  const suite = useSuiteState(scriptId);

  // View state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load script title (from Supabase, independent of suite workspace)
  const [scriptLoaded, setScriptLoaded] = useState(false);
  useEffect(() => {
    if (!scriptId) return;
    getScriptById(scriptId).then((s) => {
      if (s) setScriptTitle(s.title || "Untitled");
      setScriptLoaded(true);
    }).catch(() => {
      setScriptLoaded(true);
    });
  }, [scriptId]);

  const { isLoading, message, startLoading, stopLoading } = useLoadingState();
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    startLoading([
      "Opening Director's Suite...",
      "Loading your board...",
      "Preparing workspace...",
      "Almost there..."
    ], 800);
    setProgress(85);
  }, [startLoading]);

  // Gate the loading overlay on BOTH script metadata AND workspace data
  useEffect(() => {
    if (scriptLoaded && !suite.isLoading) {
      setProgress(100);
      const timer = setTimeout(() => {
        stopLoading();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [scriptLoaded, suite.isLoading, stopLoading]);

  // ── Viewport change handler (from Board → suite → backend) ──
  const handleViewportChange = useCallback(
    (vp: ViewportState) => {
      suite.updateViewport(vp);
    },
    [suite]
  );

  // ── Drawing hook ──
  // initialStrokes is available after suite load completes
  const drawing = useDrawing({
    canvasRef: drawingCanvasRef,
    viewportRef: boardRef,
    zoomRef,
    panRef,
    isDrawMode: drawMode,
    initialDataUrl: suite.state.drawingDataUrl,
    initialStrokes: suite.initialStrokes as Stroke[],
    onStrokeComplete: suite.setDrawingDataUrl,
    onStrokesChange: suite.updateStrokes,
  });

  // ── Global Mouse & Keyboard for Copy/Paste ──
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleGlobalMouseMove);
    return () => window.removeEventListener("mousemove", handleGlobalMouseMove);
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      if (activeEl?.tagName === "INPUT" || activeEl?.tagName === "TEXTAREA") return;
      
      if (e.key === "c" && (e.ctrlKey || e.metaKey)) {
        const hoveredEl = document.elementFromPoint(mouseRef.current.x, mouseRef.current.y);
        const cardEl = hoveredEl?.closest('[data-element-id]');
        if (cardEl) {
          const id = cardEl.getAttribute('data-element-id');
          const elementToCopy = suite.state.elements.find(el => el.id === id);
          if (elementToCopy) {
            setClipboard(elementToCopy);
          }
        }
      }

      if (e.key === "v" && (e.ctrlKey || e.metaKey)) {
        if (clipboard) {
          suite.addElement({
            ...clipboard,
            id: uid(),
            x: clipboard.x + 40,
            y: clipboard.y + 40,
          });
        }
      }
    };
    
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [clipboard, suite.state.elements, suite]);

  // ── Add element helpers ──
  const addIdea = useCallback(() => {
    const x = -panRef.current.x / zoomRef.current + 100 + Math.random() * 200;
    const y = -panRef.current.y / zoomRef.current + 100 + Math.random() * 100;
    const el: SuiteElement = {
      id: uid(), type: "idea",
      x, y, width: 240, height: 180,
      data: { title: "Idea", content: "", bgColor: "#1a1a1a" },
    };
    suite.addElement(el);
  }, [suite]);

  const addShot = useCallback(() => {
    const x = -panRef.current.x / zoomRef.current + 100 + Math.random() * 200;
    const y = -panRef.current.y / zoomRef.current + 100 + Math.random() * 100;
    const num = suite.nextShotNumber();
    const el: SuiteElement = {
      id: uid(), type: "shot",
      x, y, width: 300, height: 460,
      data: {
        shotNumber: `Shot ${String(num).padStart(2, "0")}`,
        shotType: "", cameraMovement: "", lens: "",
        description: "", notes: "",
        imageBase64: "", refLink: "",
      },
    };
    suite.addElement(el);
  }, [suite]);

  const addImage = useCallback(() => {
    const x = -panRef.current.x / zoomRef.current + 100 + Math.random() * 200;
    const y = -panRef.current.y / zoomRef.current + 100 + Math.random() * 100;
    const el: SuiteElement = {
      id: uid(), type: "image",
      x, y, width: 260, height: 220,
      data: { src: "", caption: "" },
    };
    suite.addElement(el);
  }, [suite]);

  const addLink = useCallback(() => {
    const x = -panRef.current.x / zoomRef.current + 100 + Math.random() * 200;
    const y = -panRef.current.y / zoomRef.current + 100 + Math.random() * 100;
    const el: SuiteElement = {
      id: uid(), type: "link",
      x, y, width: 260, height: 200,
      data: { label: "", url: "" },
    };
    suite.addElement(el);
  }, [suite]);

  // ── Connect mode ──
  const handleConnectClick = useCallback(
    (id: string) => {
      if (!connectMode) return;
      if (!connectSource) {
        setConnectSource(id);
      } else {
        if (connectSource !== id) {
          suite.addConnector({
            id: uid(),
            fromId: connectSource,
            toId: id,
          });
        }
        setConnectSource(null);
      }
    },
    [connectMode, suite, connectSource]
  );

  return (
    <div className="h-screen flex flex-col bg-zinc-50 dark:bg-[#0d0d0d] text-zinc-900 dark:text-white">
      <LoadingOverlay
        isVisible={isLoading || isNavigating}
        message={isNavigating ? navMessage : message}
        showProgressBar={!isNavigating}
        progressPercent={progress}
      />
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-5 py-3 shrink-0 bg-white dark:bg-[#111] border-b border-zinc-200 dark:border-[#222]"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigateTo(`/`, "Going Home...")}
            className="text-xs text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1"
          >
            <Home className="w-3 h-3" /> Home
          </button>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
          <button
            onClick={() => navigateTo(`/editor/${scriptId}`, "Back to Editor...")}
            className="text-xs text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
          >
            ← Editor
          </button>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
          <button
            onClick={() => navigateTo(`/storyboard/${scriptId}`, "Opening Storyboard...")}
            className="text-xs text-zinc-500 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1"
          >
            <Layers className="w-3 h-3" /> Storyboard
          </button>


          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1"
          >
            {sidebarOpen ? "◀ Hide Tools" : "▶ Show Tools"}
          </button>
          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800" />
          <span className="text-sm font-bold text-zinc-900 dark:text-white truncate max-w-[300px]">
            {scriptTitle}
          </span>
        </div>
      </header>

      {/* Main workspace */}
      <div className="flex flex-1 overflow-hidden relative">
        <SuiteToolbar
          onAddIdea={addIdea}
          onAddShot={addShot}
          onAddImage={addImage}
          onAddLink={addLink}
          onClearBoard={suite.clearBoard}
          connectMode={connectMode}
          onToggleConnect={() => {
            setConnectMode((v) => !v);
            setConnectSource(null);
            if (drawMode) setDrawMode(false);
          }}
          drawMode={drawMode}
          onToggleDraw={() => {
            setDrawMode((v) => !v);
            if (connectMode) setConnectMode(false);
          }}
          scriptTitle={scriptTitle}
          isOpen={sidebarOpen}
          drawTool={"pen"}
          onSetDrawTool={() => {}}
          drawColor={"#000"}
          onSetDrawColor={() => {}}
          drawWidth={2}
          onSetDrawWidth={() => {}}
          onDrawUndo={() => {}}
          onDrawClear={() => {}}
        />

        <Board
          ref={boardRef}
          canvasRef={innerCanvasRef}
          elements={suite.state.elements}
          connectors={suite.state.connectors}
          drawMode={drawMode}
          connectMode={connectMode}
          connectSource={connectSource}
          drawingCanvasRef={drawingCanvasRef}
          zoomRef={zoomRef}
          panRef={panRef}
          onMoveElement={suite.moveElement}
          onResizeElement={suite.resizeElement}
          onUpdateData={suite.updateElementData}
          onRemoveElement={suite.removeElement}
          onRemoveConnector={suite.removeConnector}
          onConnectClick={handleConnectClick}
          scriptId={scriptId}
          initialViewport={suite.initialViewport}
          onViewportChange={handleViewportChange}
        />

        {/* Floating Drawing Toolbar */}
        {drawMode && (
          <DrawingToolbar
            tool={drawing.tool}
            setTool={drawing.setTool}
            color={drawing.color}
            setColor={drawing.setColor}
            strokeWidth={drawing.strokeWidth}
            setStrokeWidth={drawing.setStrokeWidth}
            undo={drawing.undo}
            clearAll={drawing.clearAll}
          />
        )}
      </div>
    </div>
  );
}
