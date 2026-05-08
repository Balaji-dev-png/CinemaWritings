"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSuiteState, SuiteElement } from "@/hooks/useSuiteState";
import { useDrawing } from "@/hooks/useDrawing";
import { SuiteToolbar } from "@/components/suite/SuiteToolbar";
import { Board } from "@/components/suite/Board";
import { ExportButton } from "@/components/suite/ExportButton";
import { getScriptById } from "@/lib/storage";
import { useLoadingState } from "@/hooks/useLoadingState";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import "@/styles/suite.css";

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

  const boardRef = useRef<HTMLDivElement>(null);
  const drawingCanvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });

  const suite = useSuiteState(scriptId);

  // View state
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Load script title
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

  useEffect(() => {
    if (scriptLoaded) {
      setProgress(100);
      const timer = setTimeout(() => {
        stopLoading();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [scriptLoaded, stopLoading]);

  // Drawing hook
  const drawing = useDrawing({
    canvasRef: drawingCanvasRef,
    viewportRef: boardRef,
    zoomRef,
    panRef,
    isDrawMode: drawMode,
    initialDataUrl: suite.state.drawingDataUrl,
    onStrokeComplete: suite.setDrawingDataUrl,
    scriptId,
  });

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
    <div className="h-screen flex flex-col" style={{ backgroundColor: "#0d0d0d" }}>
      <LoadingOverlay 
        isVisible={isLoading} 
        message={message} 
        showProgressBar 
        progressPercent={progress} 
      />
      {/* Top bar */}
      <header
        className="flex items-center justify-between px-5 py-3 shrink-0"
        style={{ backgroundColor: "#111", borderBottom: "1px solid #222" }}
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/editor/${scriptId}`)}
            className="text-xs text-zinc-500 hover:text-white transition-colors"
          >
            ← Back to Editor
          </button>
          <div className="h-4 w-px bg-zinc-800" />
          <button
            onClick={() => setSidebarOpen((v) => !v)}
            className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1"
          >
            {sidebarOpen ? "◀ Hide Tools" : "▶ Show Tools"}
          </button>
          <div className="h-4 w-px bg-zinc-800" />
          <span className="text-sm font-bold text-white truncate max-w-[300px]">
            {scriptTitle}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ExportButton
            boardRef={boardRef}
            drawingCanvasRef={drawingCanvasRef}
            elements={suite.state.elements}
            scriptTitle={scriptTitle}
            scriptId={scriptId}
          />
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
          // Obsolete drawing tools from SuiteToolbar were removed
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
