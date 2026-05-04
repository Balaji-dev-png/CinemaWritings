/**
 * Creative Workspace — Canvas Engine Hook
 *
 * Core state management for the infinite canvas:
 *   - Elements & strokes CRUD
 *   - Viewport (pan, zoom, pinch)
 *   - Z-index management
 *   - Undo / Redo history
 *   - Selection (single, multi, marquee)
 *   - Debounced persistence
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  CanvasElement,
  CanvasState,
  DrawingStroke,
  ViewportState,
  CanvasHistoryEntry,
  EdgeConnection,
  DEFAULT_CANVAS_STATE,
  DEFAULT_VIEWPORT,
  Tool,
} from "@/lib/canvasTypes";
import { saveCanvasState, loadCanvasState } from "@/lib/canvasStorage";

const MAX_HISTORY = 50;

export function useCanvasEngine(scriptId: string) {
  // ── Core State ──
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [edges, setEdges] = useState<EdgeConnection[]>([]);
  const [strokes, setStrokes] = useState<DrawingStroke[]>([]);
  const [viewport, setViewport] = useState<ViewportState>(DEFAULT_VIEWPORT);
  const [gridVisible, setGridVisible] = useState(true);
  const [nextZIndex, setNextZIndex] = useState(1);

  // ── Selection ──
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeTool, setActiveTool] = useState<Tool>("select");

  // ── History (Undo/Redo) ──
  const historyRef = useRef<CanvasHistoryEntry[]>([]);
  const historyIndexRef = useRef(-1);
  const isLoadedRef = useRef(false);

  // ── Load from persistence ──
  useEffect(() => {
    if (!scriptId || isLoadedRef.current) return;
    isLoadedRef.current = true;

    loadCanvasState(scriptId).then((state) => {
      setElements(state.elements || []);
      setEdges(state.edges || []);
      setStrokes(state.strokes || []);
      setViewport(state.viewport || DEFAULT_VIEWPORT);
      setGridVisible(state.gridVisible !== undefined ? state.gridVisible : true);
      setNextZIndex(state.nextZIndex || 1);

      // Initialize history
      historyRef.current = [
        { elements: state.elements || [], edges: state.edges || [], strokes: state.strokes || [] },
      ];
      historyIndexRef.current = 0;
    });
  }, [scriptId]);

  // ── Save to persistence (called after mutations) ──
  const persistState = useCallback(() => {
    const state: CanvasState = {
      elements,
      edges,
      strokes,
      viewport,
      gridVisible,
      nextZIndex,
    };
    saveCanvasState(scriptId, state);
  }, [elements, edges, strokes, viewport, gridVisible, nextZIndex, scriptId]);

  useEffect(() => {
    if (!isLoadedRef.current) return;
    persistState();
  }, [elements, edges, strokes, persistState]);

  // ── History Push ──
  const pushHistory = useCallback(() => {
    const entry: CanvasHistoryEntry = {
      elements: JSON.parse(JSON.stringify(elements)),
      edges: JSON.parse(JSON.stringify(edges)),
      strokes: JSON.parse(JSON.stringify(strokes)),
    };

    // Trim future if we're not at the end
    const idx = historyIndexRef.current;
    historyRef.current = historyRef.current.slice(0, idx + 1);
    historyRef.current.push(entry);

    // Cap history
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current = historyRef.current.length - 1;
    }
  }, [elements, edges, strokes]);

  // ── Undo ──
  const undo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx <= 0) return;

    historyIndexRef.current = idx - 1;
    const entry = historyRef.current[idx - 1];
    setElements(JSON.parse(JSON.stringify(entry.elements)));
    setEdges(JSON.parse(JSON.stringify(entry.edges || [])));
    setStrokes(JSON.parse(JSON.stringify(entry.strokes)));
  }, []);

  // ── Redo ──
  const redo = useCallback(() => {
    const idx = historyIndexRef.current;
    if (idx >= historyRef.current.length - 1) return;

    historyIndexRef.current = idx + 1;
    const entry = historyRef.current[idx + 1];
    setElements(JSON.parse(JSON.stringify(entry.elements)));
    setEdges(JSON.parse(JSON.stringify(entry.edges || [])));
    setStrokes(JSON.parse(JSON.stringify(entry.strokes)));
  }, []);

  // ── Element CRUD ──
  const addElement = useCallback(
    (el: CanvasElement) => {
      setElements((prev) => [...prev, { ...el, zIndex: nextZIndex }]);
      setNextZIndex((z) => z + 1);
      pushHistory();
    },
    [nextZIndex, pushHistory]
  );

  const updateElement = useCallback(
    (id: string, updates: Partial<CanvasElement>) => {
      setElements((prev) =>
        prev.map((el) => (el.id === id ? { ...el, ...updates } as CanvasElement : el))
      );
    },
    []
  );

  const removeElement = useCallback(
    (id: string) => {
      setElements((prev) => prev.filter((el) => el.id !== id));
      setEdges((prev) => prev.filter((edge) => edge.sourceId !== id && edge.targetId !== id));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      pushHistory();
    },
    [pushHistory]
  );

  const removeSelected = useCallback(() => {
    const toDelete = selectedIds;
    setElements((prev) => prev.filter((el) => !toDelete.has(el.id)));
    setEdges((prev) => prev.filter((edge) => !toDelete.has(edge.id) && !toDelete.has(edge.sourceId) && !toDelete.has(edge.targetId)));
    setSelectedIds(new Set());
    pushHistory();
  }, [selectedIds, pushHistory]);

  // ── Edge CRUD ──
  const addEdge = useCallback((edge: EdgeConnection) => {
    setEdges((prev) => [...prev, edge]);
    pushHistory();
  }, [pushHistory]);

  const updateEdge = useCallback((id: string, updates: Partial<EdgeConnection>) => {
    setEdges((prev) => prev.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  }, []);

  const removeEdge = useCallback((id: string) => {
    setEdges((prev) => prev.filter((e) => e.id !== id));
    pushHistory();
  }, [pushHistory]);

  // ── Stroke CRUD ──
  const addStroke = useCallback(
    (stroke: DrawingStroke) => {
      setStrokes((prev) => [...prev, stroke]);
      pushHistory();
    },
    [pushHistory]
  );

  const removeStrokes = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return;
      const idSet = new Set(ids);
      setStrokes((prev) => prev.filter((s) => !idSet.has(s.id)));
      pushHistory();
    },
    [pushHistory]
  );

  // ── Selection ──
  const select = useCallback((id: string, additive = false) => {
    setSelectedIds((prev) => {
      if (additive) {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }
      return new Set([id]);
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(elements.map((e) => e.id)));
  }, [elements]);

  const deselectAll = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // ── Z-Index Management ──
  const bringToFront = useCallback(
    (id: string) => {
      setElements((prev) => {
        const maxZ = Math.max(...prev.map((e) => e.zIndex), 0);
        return prev.map((el) =>
          el.id === id ? ({ ...el, zIndex: maxZ + 1 } as CanvasElement) : el
        );
      });
      setNextZIndex((z) => z + 1);
    },
    []
  );

  const sendToBack = useCallback((id: string) => {
    setElements((prev) => {
      const minZ = Math.min(...prev.map((e) => e.zIndex), 0);
      return prev.map((el) =>
        el.id === id ? ({ ...el, zIndex: minZ - 1 } as CanvasElement) : el
      );
    });
  }, []);

  // ── Viewport ──
  const pan = useCallback((dx: number, dy: number) => {
    setViewport((v) => ({
      ...v,
      offsetX: v.offsetX + dx,
      offsetY: v.offsetY + dy,
    }));
  }, []);

  const zoomTo = useCallback(
    (newZoom: number, centerX?: number, centerY?: number) => {
      setViewport((v) => {
        const clampedZoom = Math.max(0.1, Math.min(5, newZoom));
        const zoomRatio = clampedZoom / v.zoom;

        const focalX = centerX !== undefined ? centerX : (typeof window !== 'undefined' ? window.innerWidth / 2 : 500);
        const focalY = centerY !== undefined ? centerY : (typeof window !== 'undefined' ? window.innerHeight / 2 : 500);

        return {
          zoom: clampedZoom,
          offsetX: focalX - (focalX - v.offsetX) * zoomRatio,
          offsetY: focalY - (focalY - v.offsetY) * zoomRatio,
        };
      });
    },
    []
  );

  const resetViewport = useCallback(() => {
    setViewport(DEFAULT_VIEWPORT);
  }, []);

  // ── Screen ↔ Canvas coordinate conversion ──
  const screenToCanvas = useCallback(
    (sx: number, sy: number): [number, number] => {
      return [
        (sx - viewport.offsetX) / viewport.zoom,
        (sy - viewport.offsetY) / viewport.zoom,
      ];
    },
    [viewport]
  );

  const toggleGrid = useCallback(() => {
    setGridVisible((v) => !v);
  }, []);

  return {
    // State
    elements,
    edges,
    strokes,
    viewport,
    gridVisible,
    selectedIds,
    activeTool,
    nextZIndex,

    // Setters
    setElements,
    setEdges,
    setStrokes,
    setActiveTool,
    setSelectedIds,

    // Element ops
    addElement,
    updateElement,
    removeElement,
    removeSelected,

    // Edge ops
    addEdge,
    updateEdge,
    removeEdge,

    // Stroke ops
    addStroke,
    removeStrokes,

    // Selection
    select,
    selectAll,
    deselectAll,

    // Z-index
    bringToFront,
    sendToBack,

    // Viewport
    pan,
    zoomTo,
    resetViewport,
    screenToCanvas,
    toggleGrid,

    // History
    undo,
    redo,
    pushHistory,
  };
}
