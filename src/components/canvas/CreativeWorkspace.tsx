import { useState, useRef, useEffect, useCallback } from "react";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
import { v4 as uuidv4 } from "uuid";
import { useCanvasEngine } from "@/hooks/useCanvasEngine";
import { CanvasToolbar } from "./CanvasToolbar";
import { ShotListBridge, CanvasShotCard } from "./ShotListBridge";
import { CanvasImageCard, CanvasLinkCard } from "./CanvasMediaCard";
import { CanvasTextBlock } from "./CanvasTextBlock";
import { CanvasStickyNote } from "./CanvasStickyNote";
import { CanvasIdeaBlock } from "./CanvasIdeaBlock";
import { MermaidGraph } from "../editor/MermaidGraph";
import { ConnectionEdge } from "./ConnectionEdge";
import { hitTestElement, hitTestResizeHandle } from "@/lib/shapeEngine";
import { exportCanvasAsPng } from "@/lib/canvasStorage";
import { motion, useAnimation } from "framer-motion";
import {
  Tool,
  TextElement,
  StickyNoteElement,
  ImageElement,
  LinkCardElement,
  ShotElement,
  MermaidElement,
  SHOT_TYPES,
  IdeaElement,
} from "@/lib/canvasTypes";
import { ArrowLeft, Sparkles } from "lucide-react";

interface Props {
  scriptId: string;
  scriptTitle: string;
  onClose: () => void;
}

export function CreativeWorkspace({ scriptId, scriptTitle, onClose }: Props) {
  const engine = useCanvasEngine(scriptId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);

  // Interaction state
  const [showShotList, setShowShotList] = useState(false);
  const [linkInput, setLinkInput] = useState("");
  const [showLinkDialog, setShowLinkDialog] = useState(false);

  const panRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    origOX: number;
    origOY: number;
  }>({ active: false, startX: 0, startY: 0, origOX: 0, origOY: 0 });
  const dragRef = useRef<{
    active: boolean;
    elementId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({
    active: false,
    elementId: "",
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });
  const groupOriginsRef = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );
  const resizeRef = useRef<{
    active: boolean;
    elementId: string;
    handle: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    origW: number;
    origH: number;
  }>({
    active: false,
    elementId: "",
    handle: "",
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
    origW: 0,
    origH: 0,
  });
  const marqueeRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    x: number;
    y: number;
    w: number;
    h: number;
  }>({ active: false, startX: 0, startY: 0, x: 0, y: 0, w: 0, h: 0 });
  const connectionRef = useRef<{
    active: boolean;
    sourceId: string | null;
    targetId: string | null;
  }>({ active: false, sourceId: null, targetId: null });

  // Spacebar panning state
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        (e.target as HTMLElement)?.tagName === "INPUT" ||
        (e.target as HTMLElement)?.tagName === "TEXTAREA" ||
        (e.target as HTMLElement)?.isContentEditable
      )
        return;

      if (e.ctrlKey || e.metaKey) {
        if (e.key === "z" && !e.shiftKey) {
          e.preventDefault();
          engine.undo();
        }
        if (e.key === "z" && e.shiftKey) {
          e.preventDefault();
          engine.redo();
        }
        if (e.key === "a") {
          e.preventDefault();
          engine.selectAll();
        }
      }

      if (e.key === "Delete" || e.key === "Backspace") {
        engine.removeSelected();
      }
      if (e.key === "Escape") {
        engine.deselectAll();
        engine.setActiveTool("select");
      }

      const toolMap: Record<string, Tool> = {
        v: "select",
        h: "hand",
        t: "text",
        s: "sticky",
        i: "idea",
        c: "connect",
      };
      if (toolMap[e.key.toLowerCase()] && !e.ctrlKey && !e.metaKey) {
        engine.setActiveTool(toolMap[e.key.toLowerCase()]);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") setIsSpacePressed(false);
    };

    window.addEventListener("keydown", handler);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handler);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [engine]);

  // ── Pointer helpers ──
  const getCanvasPoint = useCallback(
    (e: React.MouseEvent): [number, number] => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return [0, 0];
      return engine.screenToCanvas(e.clientX - rect.left, e.clientY - rect.top);
    },
    [engine],
  );

  const getScreenPoint = useCallback(
    (e: React.MouseEvent): [number, number] => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return [0, 0];
      return [e.clientX - rect.left, e.clientY - rect.top];
    },
    [],
  );

  // ── Mouse handlers ──
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const [cx, cy] = getCanvasPoint(e);
      const [sx, sy] = getScreenPoint(e);
      const tool = engine.activeTool;

      // Pan (middle click, hand tool, or spacebar)
      if (e.button === 1 || tool === "hand" || isSpacePressed) {
        panRef.current = {
          active: true,
          startX: e.clientX,
          startY: e.clientY,
          origOX: engine.viewport.offsetX,
          origOY: engine.viewport.offsetY,
        };
        return;
      }

      // Text placement
      if (tool === "text") {
        const id = uuidv4();
        engine.addElement({
          id,
          type: "text",
          x: cx,
          y: cy,
          width: 200,
          height: 40,
          rotation: 0,
          zIndex: engine.nextZIndex,
          opacity: 1,
          locked: false,
          content: "",
          fontSize: 16,
          fontWeight: "400",
          fontFamily: "Inter, sans-serif",
          color: "#e2e8f0",
          backgroundColor: "#1e1e2e",
        } as TextElement);
        engine.select(id);
        engine.setActiveTool("select");
        return;
      }

      // Sticky placement
      if (tool === "sticky") {
        const id = uuidv4();
        engine.addElement({
          id,
          type: "sticky",
          x: cx,
          y: cy,
          width: 200,
          height: 160,
          rotation: 0,
          zIndex: engine.nextZIndex,
          opacity: 1,
          locked: false,
          content: "",
          color: "yellow",
          fontSize: 14,
        } as StickyNoteElement);
        engine.select(id);
        engine.setActiveTool("select");
        return;
      }

      // Idea placement
      if (tool === "idea") {
        const id = uuidv4();
        engine.addElement({
          id,
          type: "idea",
          x: cx,
          y: cy,
          width: 220,
          height: 180,
          rotation: 0,
          zIndex: engine.nextZIndex,
          opacity: 1,
          locked: false,
          title: "",
          content: "",
          color: "#8b5cf6",
        } as IdeaElement);
        engine.select(id);
        engine.setActiveTool("select");
        return;
      }

      // Select tool — check resize handles first, then hit test elements, then start marquee
      if (tool === "select") {
        // 1. Check resize handles on selected elements
        if (engine.selectedIds.size === 1) {
          const selId = Array.from(engine.selectedIds)[0];
          const selEl = engine.elements.find((el) => el.id === selId);
          if (selEl) {
            const handle = hitTestResizeHandle(sx, sy, selEl, engine.viewport);
            if (handle) {
              resizeRef.current = {
                active: true,
                elementId: selEl.id,
                handle,
                startX: cx,
                startY: cy,
                origX: selEl.x,
                origY: selEl.y,
                origW: selEl.width,
                origH: selEl.height,
              };
              return;
            }
          }
        }

        // 2. Hit test elements for selection + drag
        const sorted = [...engine.elements].sort((a, b) => b.zIndex - a.zIndex);
        for (const el of sorted) {
          if (hitTestElement(cx, cy, el)) {
            // If shift is held, toggle selection; otherwise set single selection (unless already in group)
            const alreadySelected = engine.selectedIds.has(el.id);
            if (e.shiftKey) {
              engine.select(el.id, true);
            } else if (!alreadySelected) {
              engine.select(el.id, false);
            }

            // Store group origins for multi-drag
            groupOriginsRef.current = new Map();
            const currentSelected = e.shiftKey
              ? alreadySelected
                ? new Set([...engine.selectedIds].filter((id) => id !== el.id))
                : new Set([...engine.selectedIds, el.id])
              : alreadySelected
                ? engine.selectedIds
                : new Set([el.id]);

            for (const sid of currentSelected) {
              const se = engine.elements.find((x) => x.id === sid);
              if (se) groupOriginsRef.current.set(sid, { x: se.x, y: se.y });
            }

            dragRef.current = {
              active: true,
              elementId: el.id,
              startX: cx,
              startY: cy,
              origX: el.x,
              origY: el.y,
            };
            return;
          }
        }
        // Clicked empty space -> start marquee
        engine.deselectAll();
        marqueeRef.current = {
          active: true,
          startX: sx,
          startY: sy,
          x: sx,
          y: sy,
          w: 0,
          h: 0,
        };
      }

      // Connection tool
      if (tool === "connect") {
        const sorted = [...engine.elements].sort((a, b) => b.zIndex - a.zIndex);
        for (const el of sorted) {
          if (hitTestElement(cx, cy, el)) {
            connectionRef.current = {
              active: true,
              sourceId: el.id,
              targetId: null,
            };
            return;
          }
        }
      }
    },
    [engine, getCanvasPoint, getScreenPoint],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      updateLastMouse(e);
      const [cx, cy] = getCanvasPoint(e);
      const [sx, sy] = getScreenPoint(e);

      // Panning
      if (panRef.current.active) {
        engine.pan(
          e.clientX -
            panRef.current.startX -
            engine.viewport.offsetX +
            panRef.current.origOX,
          e.clientY -
            panRef.current.startY -
            engine.viewport.offsetY +
            panRef.current.origOY,
        );
        panRef.current.startX = e.clientX;
        panRef.current.startY = e.clientY;
        panRef.current.origOX = engine.viewport.offsetX;
        panRef.current.origOY = engine.viewport.offsetY;
        return;
      }

      // Marquee
      if (marqueeRef.current.active) {
        const m = marqueeRef.current;
        m.x = Math.min(m.startX, sx);
        m.y = Math.min(m.startY, sy);
        m.w = Math.abs(sx - m.startX);
        m.h = Math.abs(sy - m.startY);
        return;
      }

      // Element resize
      if (resizeRef.current.active) {
        const r = resizeRef.current;
        const dx = cx - r.startX;
        const dy = cy - r.startY;
        const minSize = 40;
        let newX = r.origX,
          newY = r.origY,
          newW = r.origW,
          newH = r.origH;

        if (r.handle.includes("right")) {
          newW = Math.max(minSize, r.origW + dx);
        }
        if (r.handle.includes("left")) {
          newW = Math.max(minSize, r.origW - dx);
          newX = r.origX + r.origW - newW;
        }
        if (r.handle.includes("bottom")) {
          newH = Math.max(minSize, r.origH + dy);
        }
        if (r.handle.includes("top")) {
          newH = Math.max(minSize, r.origH - dy);
          newY = r.origY + r.origH - newH;
        }

        engine.updateElement(r.elementId, {
          x: newX,
          y: newY,
          width: newW,
          height: newH,
        });
        return;
      }

      // Group element dragging
      if (dragRef.current.active) {
        const dx = cx - dragRef.current.startX;
        const dy = cy - dragRef.current.startY;

        // Move all selected elements (group move)
        if (groupOriginsRef.current.size > 1) {
          for (const [id, orig] of groupOriginsRef.current) {
            engine.updateElement(id, { x: orig.x + dx, y: orig.y + dy });
          }
        } else {
          // Single element move
          engine.updateElement(dragRef.current.elementId, {
            x: dragRef.current.origX + dx,
            y: dragRef.current.origY + dy,
          });
        }
        return;
      }

      // Connection line preview (handled by SVG layer if source exists)
      if (connectionRef.current.active) {
        // Find element under mouse for target highlight
        // (Optional UX: highlight target node on hover during connection)
      }
    },
    [engine, getCanvasPoint, getScreenPoint],
  );

  const handleMouseUp = useCallback(
    (e: React.MouseEvent) => {
      const [cx, cy] = getCanvasPoint(e);

      // Finish marquee
      if (marqueeRef.current.active) {
        const m = marqueeRef.current;
        // Convert marquee rect to canvas coords
        const [cax1, cay1] = engine.screenToCanvas(m.x, m.y);
        const [cax2, cay2] = engine.screenToCanvas(m.x + m.w, m.y + m.h);

        const inside = engine.elements.filter((el) => {
          return (
            el.x >= cax1 &&
            el.x + el.width <= cax2 &&
            el.y >= cay1 &&
            el.y + el.height <= cay2
          );
        });
        if (inside.length > 0) {
          const ids = new Set(inside.map((el) => el.id));
          engine.setSelectedIds(ids);
        }
        marqueeRef.current.active = false;
      }

      // Finish connection
      if (connectionRef.current.active && connectionRef.current.sourceId) {
        const sorted = [...engine.elements].sort((a, b) => b.zIndex - a.zIndex);
        for (const el of sorted) {
          if (
            hitTestElement(cx, cy, el) &&
            el.id !== connectionRef.current.sourceId
          ) {
            engine.addEdge({
              id: uuidv4(),
              sourceId: connectionRef.current.sourceId,
              targetId: el.id,
              label: "",
              color: "#3b82f6",
              style: "solid",
            });
            break;
          }
        }
        connectionRef.current = {
          active: false,
          sourceId: null,
          targetId: null,
        };
      }

      // Finish panning
      panRef.current.active = false;

      // Finish resizing
      if (resizeRef.current.active) {
        engine.pushHistory();
        resizeRef.current = {
          active: false,
          elementId: "",
          handle: "",
          startX: 0,
          startY: 0,
          origX: 0,
          origY: 0,
          origW: 0,
          origH: 0,
        };
      }

      // Finish dragging
      if (dragRef.current.active) {
        engine.pushHistory();
      }
      dragRef.current = {
        active: false,
        elementId: "",
        startX: 0,
        startY: 0,
        origX: 0,
        origY: 0,
      };
      groupOriginsRef.current = new Map();
    },
    [engine, getCanvasPoint],
  );

  const lastMouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // ── Wheel zoom ──
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      lastMouseRef.current = { x: mouseX, y: mouseY };

      const isZoom = e.ctrlKey || engine.activeTool !== "hand";

      if (isZoom) {
        const delta = e.deltaY > 0 ? 0.92 : 1.08;
        engine.zoomTo(engine.viewport.zoom * delta, mouseX, mouseY);
      } else {
        engine.pan(-e.deltaX, -e.deltaY);
      }
    },
    [engine],
  );

  const updateLastMouse = useCallback((e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    lastMouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  // ── Image upload ──
  const handleUploadImage = useCallback(() => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = (ev) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const id = uuidv4();
        engine.addElement({
          id,
          type: "image",
          x: 100,
          y: 100,
          width: 300,
          height: 200,
          rotation: 0,
          zIndex: engine.nextZIndex,
          opacity: 1,
          locked: false,
          src: reader.result as string,
          alt: file.name,
          objectFit: "cover",
        } as ImageElement);
        engine.select(id);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }, [engine]);

  // ── Link paste ──
  const handlePasteLink = useCallback(() => {
    setShowLinkDialog(true);
  }, []);
  const handleAddLink = useCallback(() => {
    if (!linkInput.trim()) return;
    const id = uuidv4();
    let hostname = "";
    try {
      hostname = new URL(linkInput).hostname;
    } catch {
      hostname = linkInput;
    }
    engine.addElement({
      id,
      type: "link-card",
      x: 100,
      y: 100,
      width: 280,
      height: 160,
      rotation: 0,
      zIndex: engine.nextZIndex,
      opacity: 1,
      locked: false,
      url: linkInput,
      title: hostname,
      description: "",
      thumbnail: "",
      favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`,
    } as LinkCardElement);
    engine.select(id);
    setLinkInput("");
    setShowLinkDialog(false);
  }, [linkInput, engine]);

  // ── Add shot from bridge ──
  const handleAddShot = useCallback(
    (shotTypeId: string) => {
      const shotInfo = SHOT_TYPES.find((s) => s.id === shotTypeId);
      if (!shotInfo) return;
      const id = uuidv4();
      const shotCount =
        engine.elements.filter((el) => el.type === "shot").length + 1;

      engine.addElement({
        id,
        type: "shot",
        shotNumber: `#${shotCount}`,
        x: 150 + Math.random() * 200,
        y: 150 + Math.random() * 200,
        width: 280,
        height: 320,
        rotation: 0,
        zIndex: engine.nextZIndex,
        opacity: 1,
        locked: false,
        shotType: shotTypeId,
        sceneRef: "",
        description: "",
        duration: "",
        color: shotInfo.color,
        imageUrl: "",
        lens: "",
        movement: "",
        notes: "",
      } as ShotElement);
      engine.select(id);
    },
    [engine],
  );

  // ── Canvas drop handler (for shot list drag) ──
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const shotTypeId = e.dataTransfer.getData("shot-type");
      if (shotTypeId) {
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const [cx, cy] = engine.screenToCanvas(
          e.clientX - rect.left,
          e.clientY - rect.top,
        );
        const shotInfo = SHOT_TYPES.find((s) => s.id === shotTypeId);
        if (!shotInfo) return;
        const id = uuidv4();
        const shotCount =
          engine.elements.filter((el) => el.type === "shot").length + 1;

        engine.addElement({
          id,
          type: "shot",
          shotNumber: `#${shotCount}`,
          x: cx - 140,
          y: cy - 160,
          width: 280,
          height: 320,
          rotation: 0,
          zIndex: engine.nextZIndex,
          opacity: 1,
          locked: false,
          shotType: shotTypeId,
          sceneRef: "",
          description: "",
          duration: "",
          color: shotInfo.color,
          imageUrl: "",
          lens: "",
          movement: "",
          notes: "",
        } as ShotElement);
        engine.select(id);
      }
    },
    [engine],
  );

  // ── Export handlers ──
  const handleExportPng = useCallback(() => {
    if (canvasRef.current)
      exportCanvasAsPng(canvasRef.current, overlayRef.current, scriptTitle);
  }, [scriptTitle]);

  const handleExportPitchDeck = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE}/scripts/${scriptId}/export/pitchdeck/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            workspace_state: { elements: engine.elements },
          }),
        },
      );
      if (!response.ok) throw new Error("Export failed");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${scriptTitle.replace(/ /g, "_")}_PitchDeck.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export Pitch Deck PDF.");
    }
  }, [scriptId, scriptTitle, engine.elements]);

  // ── Render overlays for HTML-based elements ──
  const overlayElements = engine.elements.filter((el) =>
    [
      "text",
      "sticky",
      "image",
      "link-card",
      "shot",
      "idea",
      "mermaid",
    ].includes(el.type),
  );

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200] flex flex-col overflow-hidden canvas-workspace bg-[#0a0a0a]"
    >
      {/* Top bar */}
      <header className="flex items-center justify-between px-6 py-4 bg-[#1e1e1e]/60 backdrop-blur-xl border-b border-white/10 z-50 shrink-0">
        <div className="flex items-center gap-6">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Editor
          </button>
          <div className="w-px h-6 bg-white/10" />
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl">
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold text-white uppercase tracking-[0.2em]">
                Director's Suite
              </span>
              <span className="text-[10px] text-zinc-500 uppercase tracking-widest">
                {scriptTitle}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-6 text-[10px] text-zinc-500 uppercase tracking-[0.15em] font-bold">
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-blue-500" />
            <span>{engine.elements.length} assets</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-emerald-500" />
            <span>{engine.edges.length} connections</span>
          </div>
          <span className="px-3 py-1 bg-white/5 text-zinc-400 rounded-full border border-white/10">
            {Math.round(engine.viewport.zoom * 100)}%
          </span>
        </div>
      </header>

      {/* Main workspace area */}
      <div
        className="flex-1 relative overflow-hidden"
        style={{
          cursor:
            engine.activeTool === "hand" || isSpacePressed ? "grab" : "default",
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {/* CSS Background Grid */}
        {engine.gridVisible && (
          <div
            className="absolute inset-0 pointer-events-none opacity-20"
            style={{
              backgroundSize: `${20 * engine.viewport.zoom}px ${20 * engine.viewport.zoom}px`,
              backgroundImage: `radial-gradient(circle, #ffffff 1px, transparent 1px)`,
              backgroundPosition: `${engine.viewport.offsetX}px ${engine.viewport.offsetY}px`,
            }}
          />
        )}

        {/* Marquee UI Layer */}
        {marqueeRef.current.active && (
          <div
            className="absolute border border-blue-500 bg-blue-500/10 pointer-events-none z-[100]"
            style={{
              left: marqueeRef.current.x,
              top: marqueeRef.current.y,
              width: marqueeRef.current.w,
              height: marqueeRef.current.h,
            }}
          />
        )}

        {/* Focus Mode Backdrop (Idea Cards) */}
        {engine.selectedIds.size === 1 &&
          engine.elements.find(
            (e) => e.id === Array.from(engine.selectedIds)[0],
          )?.type === "idea" && (
            <div className="absolute inset-0 z-0 bg-black/60 backdrop-blur-md pointer-events-none transition-all duration-500" />
          )}

        {/* The Node Graph Transform Layer */}
        <motion.div
          className="absolute inset-0 origin-top-left"
          style={{
            x: engine.viewport.offsetX,
            y: engine.viewport.offsetY,
            scale: engine.viewport.zoom,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* SVG Connection Layer */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
            style={{ zIndex: 5 }}
          >
            {engine.edges.map((edge) => (
              <ConnectionEdge
                key={edge.id}
                edge={edge}
                elements={engine.elements}
                viewport={{ zoom: 1, offsetX: 0, offsetY: 0 }} // Local coordinates now
                isSelected={engine.selectedIds.has(edge.id)}
                onSelect={engine.select}
                onRemove={engine.removeEdge}
              />
            ))}
            {/* Connection Preview Line */}
            {connectionRef.current.active && connectionRef.current.sourceId && (
              <line
                x1={
                  engine.elements.find(
                    (e) => e.id === connectionRef.current.sourceId,
                  )!.x +
                  engine.elements.find(
                    (e) => e.id === connectionRef.current.sourceId,
                  )!.width /
                    2
                }
                y1={
                  engine.elements.find(
                    (e) => e.id === connectionRef.current.sourceId,
                  )!.y +
                  engine.elements.find(
                    (e) => e.id === connectionRef.current.sourceId,
                  )!.height /
                    2
                }
                x2={
                  (lastMouseRef.current.x - engine.viewport.offsetX) /
                  engine.viewport.zoom
                }
                y2={
                  (lastMouseRef.current.y - engine.viewport.offsetY) /
                  engine.viewport.zoom
                }
                stroke="#3b82f6"
                strokeWidth="2"
                strokeDasharray="4 4"
              />
            )}
          </svg>

          {/* HTML node layer */}
          <div
            ref={overlayRef}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 10 }}
          >
            {overlayElements.map((el) => {
              const isSelected = engine.selectedIds.has(el.id);
              // Pass local viewport (scale 1) so components render exactly at their x,y dimensions
              const localViewport = { zoom: 1, offsetX: 0, offsetY: 0 };
              const commonProps = {
                viewport: localViewport,
                isSelected,
                onUpdate: engine.updateElement as any,
                onSelect: engine.select,
                onRemove: engine.removeElement,
                onBringToFront: engine.bringToFront,
                onSendToBack: engine.sendToBack,
              };

              return (
                <motion.div
                  key={el.id}
                  layout
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  style={{
                    position: "absolute",
                    pointerEvents: "none",
                    zIndex: el.zIndex,
                    left: el.x,
                    top: el.y,
                    width: el.width,
                    height: el.height,
                  }}
                >
                  <div className="w-full h-full relative pointer-events-auto group">
                    {el.type === "text" && (
                      <CanvasTextBlock
                        element={el as TextElement}
                        {...commonProps}
                      />
                    )}
                    {el.type === "sticky" && (
                      <CanvasStickyNote
                        element={el as StickyNoteElement}
                        {...commonProps}
                      />
                    )}
                    {el.type === "image" && (
                      <CanvasImageCard
                        element={el as ImageElement}
                        {...commonProps}
                      />
                    )}
                    {el.type === "link-card" && (
                      <CanvasLinkCard
                        element={el as LinkCardElement}
                        {...commonProps}
                      />
                    )}
                    {el.type === "shot" && (
                      <CanvasShotCard
                        element={el as ShotElement}
                        {...commonProps}
                      />
                    )}
                    {el.type === "idea" && (
                      <CanvasIdeaBlock
                        element={el as IdeaElement}
                        {...commonProps}
                      />
                    )}
                    {el.type === "mermaid" && (
                      <MermaidGraph
                        element={el as MermaidElement}
                        {...commonProps}
                      />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Toolbar */}
        <CanvasToolbar
          activeTool={engine.activeTool}
          onToolChange={engine.setActiveTool}
          gridVisible={engine.gridVisible}
          onToggleGrid={engine.toggleGrid}
          zoom={engine.viewport.zoom}
          onZoomIn={() =>
            engine.zoomTo(
              engine.viewport.zoom * 1.2,
              lastMouseRef.current.x,
              lastMouseRef.current.y,
            )
          }
          onZoomOut={() =>
            engine.zoomTo(
              engine.viewport.zoom * 0.8,
              lastMouseRef.current.x,
              lastMouseRef.current.y,
            )
          }
          onResetView={engine.resetViewport}
          onUndo={engine.undo}
          onRedo={engine.redo}
          onDeleteSelected={engine.removeSelected}
          hasSelection={engine.selectedIds.size > 0}
          onUploadImage={handleUploadImage}
          onPasteLink={handlePasteLink}
          onExportPng={handleExportPng}
          onExportPdf={handleExportPitchDeck} // Replaced with Pitch Deck export
          onToggleShotList={() => setShowShotList(!showShotList)}
          onClose={onClose}
        />

        {/* Shot List Bridge */}
        {showShotList && (
          <ShotListBridge
            onAddShot={handleAddShot}
            onClose={() => setShowShotList(false)}
          />
        )}
      </div>

      {/* Link dialog */}
      {showLinkDialog && (
        <div
          className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setShowLinkDialog(false)}
        >
          <div
            className="bg-[#1a1a2e] border border-zinc-700 rounded-2xl p-6 w-96 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-bold text-zinc-200 mb-3 uppercase tracking-widest">
              Paste Link
            </h3>
            <input
              value={linkInput}
              onChange={(e) => setLinkInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddLink();
              }}
              placeholder="https://example.com"
              autoFocus
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:border-blue-500 mb-3"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowLinkDialog(false)}
                className="px-4 py-1.5 text-xs text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700/50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddLink}
                className="px-4 py-1.5 text-xs text-white bg-blue-600 hover:bg-blue-500 rounded-lg font-medium transition-colors"
              >
                Add Card
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
