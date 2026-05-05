"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

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

const EMPTY_STATE: SuiteState = {
  elements: [],
  connectors: [],
  drawingDataUrl: "",
  shotCounter: 0,
};

function storageKey(scriptId: string) {
  return `suite_${scriptId}`;
}

// ─── Hook ──────────────────────────────────────────────────────────────────

export function useSuiteState(scriptId: string) {
  const [state, setState] = useState<SuiteState>(EMPTY_STATE);
  const localTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remoteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  // ── Load from localStorage on mount ──
  useEffect(() => {
    mountedRef.current = true;
    try {
      const raw = localStorage.getItem(storageKey(scriptId));
      if (raw) {
        const parsed = JSON.parse(raw) as SuiteState;
        setTimeout(() => setState(parsed), 0);
      }
    } catch {
      // ignore parse errors
    }
    return () => {
      mountedRef.current = false;
    };
  }, [scriptId]);

  // ── Debounced localStorage save (500ms) ──
  const scheduleLocalSave = useCallback(
    (next: SuiteState) => {
      if (localTimerRef.current) clearTimeout(localTimerRef.current);
      localTimerRef.current = setTimeout(() => {
        try {
          localStorage.setItem(storageKey(scriptId), JSON.stringify(next));
        } catch {
          // quota exceeded — silently fail
        }
      }, 500);
    },
    [scriptId]
  );

  // ── Debounced Supabase save (3s) ──
  const scheduleRemoteSave = useCallback(
    (next: SuiteState) => {
      if (remoteTimerRef.current) clearTimeout(remoteTimerRef.current);
      remoteTimerRef.current = setTimeout(async () => {
        try {
          if (!supabase?.from) return;
          await supabase
            .from("suites")
            .upsert(
              { script_id: scriptId, data: next },
              { onConflict: "script_id" }
            );
        } catch {
          // silently fail
        }
      }, 3000);
    },
    [scriptId]
  );

  // ── Unified update helper ──
  const update = useCallback(
    (updater: (prev: SuiteState) => SuiteState) => {
      setState((prev) => {
        const next = updater(prev);
        scheduleLocalSave(next);
        scheduleRemoteSave(next);
        return next;
      });
    },
    [scheduleLocalSave, scheduleRemoteSave]
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
        elements: s.elements.map((e) =>
          e.id === id ? { ...e, ...patch } : e
        ),
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
        elements: s.elements.map((e) =>
          e.id === id ? { ...e, x, y } : e
        ),
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
  };
}
