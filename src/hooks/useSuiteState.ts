"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { supabaseGetWorkspace, supabaseSyncWorkspace } from "@/lib/suite-supabase";

// ─── Types ─────────────────────────────────────────────────────────────────

export interface SuiteElement {
  id: string;
  type: "idea" | "shot" | "image" | "link";
  x: number;
  y: number;
  width: number;
  height: number;
  data: Record<string, unknown>;
}

export interface Connector {
  id: string;
  fromId: string;
  toId: string;
}

export interface SuiteState {
  elements: SuiteElement[];
  connectors: Connector[];
  drawingDataUrl: string;
  shotCounter: number;
}

export interface ViewportState {
  zoom: number;
  pan: { x: number; y: number };
}

const EMPTY_STATE: SuiteState = {
  elements: [],
  connectors: [],
  drawingDataUrl: "",
  shotCounter: 0,
};

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useSuiteState(scriptId: string) {
  const [state, setState] = useState<SuiteState>(EMPTY_STATE);
  const [isLoading, setIsLoading] = useState(true);

  // These refs let the sync function always see the latest values without
  // being a dependency of the debounced timer callback.
  const stateRef = useRef<SuiteState>(EMPTY_STATE);
  const viewportRef = useRef<ViewportState | null>(null);
  const strokesRef = useRef<any[]>([]);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  // ── Load from backend on mount ──
  useEffect(() => {
    mountedRef.current = true;
    setIsLoading(true);

    supabaseGetWorkspace(scriptId)
      .then(({ assets, edges, viewport, drawing_strokes }) => {
        if (!mountedRef.current) return;

        // Reconstruct SuiteElements from WorkspaceAsset rows
        const elements: SuiteElement[] = assets.map((a: any) => ({
          id: a.asset_id || a.id,
          type: (a.asset_type || "idea") as SuiteElement["type"],
          x: a.x ?? 0,
          y: a.y ?? 0,
          width: a.width ?? 240,
          height: a.height ?? 180,
          data: a.content ?? {},
        }));

        const nextState: SuiteState = {
          elements,
          connectors: edges as any[],
          drawingDataUrl: "",
          shotCounter: elements.filter((e) => e.type === "shot").length,
        };

        stateRef.current = nextState;
        viewportRef.current = viewport;
        strokesRef.current = drawing_strokes as any[];
        setState(nextState);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("[useSuiteState] Failed to load workspace:", err);
        if (mountedRef.current) {
          setIsLoading(false);
        }
      });

    return () => { mountedRef.current = false; };
  }, [scriptId]);

  // ── Debounced backend sync (1.5s) ──
  const scheduleSync = useCallback(() => {
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(async () => {
      try {
        const elements = stateRef.current.elements.map((el) => ({
          id: el.id,
          asset_id: el.id,
          type: el.type,
          asset_type: el.type,
          x: el.x,
          y: el.y,
          width: el.width,
          height: el.height,
          content: el.data,
        }));

        await supabaseSyncWorkspace(scriptId, {
          assets: elements as any,
          edges: stateRef.current.connectors,
          viewport: (viewportRef.current as Record<string, unknown> | null) || null,
          drawing_strokes: strokesRef.current,
        });
      } catch (err) {
        console.error("[useSuiteState] Sync failed:", err);
      }
    }, 1500);
  }, [scriptId]);

  // ── Unified update helper ──
  const update = useCallback(
    (updater: (prev: SuiteState) => SuiteState) => {
      setState((prev) => {
        const next = updater(prev);
        stateRef.current = next;
        scheduleSync();
        return next;
      });
    },
    [scheduleSync]
  );

  // ── Viewport update (called from Board) ──
  const updateViewport = useCallback(
    (vp: ViewportState) => {
      viewportRef.current = vp;
      scheduleSync();
    },
    [scheduleSync]
  );

  // ── Strokes update (called from useDrawing) ──
  const updateStrokes = useCallback(
    (strokes: any[]) => {
      strokesRef.current = strokes;
      scheduleSync();
    },
    [scheduleSync]
  );

  // ── Element CRUD ──
  const addElement = useCallback(
    (el: SuiteElement) => {
      update((s) => ({ ...s, elements: [...s.elements, el] }));
    },
    [update]
  );

  const updateElement = useCallback(
    (id: string, patch: Partial<SuiteElement>) => {
      update((s) => ({
        ...s,
        elements: s.elements.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      }));
    },
    [update]
  );

  const updateElementData = useCallback(
    (id: string, dataPatch: Record<string, unknown>) => {
      update((s) => ({
        ...s,
        elements: s.elements.map((e) =>
          e.id === id ? { ...e, data: { ...e.data, ...dataPatch } } : e
        ),
      }));
    },
    [update]
  );

  const removeElement = useCallback(
    (id: string) => {
      update((s) => ({
        ...s,
        elements: s.elements.filter((e) => e.id !== id),
        connectors: s.connectors.filter(
          (c) => c.fromId !== id && c.toId !== id
        ),
      }));
    },
    [update]
  );

  const moveElement = useCallback(
    (id: string, x: number, y: number) => {
      update((s) => ({
        ...s,
        elements: s.elements.map((e) => (e.id === id ? { ...e, x, y } : e)),
      }));
    },
    [update]
  );

  const resizeElement = useCallback(
    (id: string, width: number, height: number) => {
      update((s) => ({
        ...s,
        elements: s.elements.map((e) =>
          e.id === id ? { ...e, width, height } : e
        ),
      }));
    },
    [update]
  );

  // ── Connector CRUD ──
  const addConnector = useCallback(
    (conn: Connector) => {
      update((s) => ({ ...s, connectors: [...s.connectors, conn] }));
    },
    [update]
  );

  const removeConnector = useCallback(
    (id: string) => {
      update((s) => ({
        ...s,
        connectors: s.connectors.filter((c) => c.id !== id),
      }));
    },
    [update]
  );

  // ── Shot counter ──
  const nextShotNumber = useCallback(() => {
    let num = 0;
    update((s) => {
      num = s.shotCounter + 1;
      return { ...s, shotCounter: num };
    });
    return num;
  }, [update]);

  // ── Drawing ──
  const setDrawingDataUrl = useCallback(
    (url: string) => {
      update((s) => ({ ...s, drawingDataUrl: url }));
    },
    [update]
  );

  // ── Clear board ──
  const clearBoard = useCallback(() => {
    update(() => EMPTY_STATE);
  }, [update]);

  return {
    state,
    isLoading,
    initialViewport: viewportRef.current,
    initialStrokes: strokesRef.current,
    addElement,
    updateElement,
    updateElementData,
    removeElement,
    moveElement,
    resizeElement,
    addConnector,
    removeConnector,
    nextShotNumber,
    setDrawingDataUrl,
    clearBoard,
    updateViewport,
    updateStrokes,
  };
}
