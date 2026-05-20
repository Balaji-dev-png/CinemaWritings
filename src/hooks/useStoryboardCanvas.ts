"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import { Storyboard, SceneCard, Connector, updateStoryboard } from "@/lib/storyboard-api";

export interface StoryboardCanvasState {
  cards: SceneCard[];
  connectors: Connector[];
}

export function useStoryboardCanvas(scriptId: string, storyboard: Storyboard) {
  const [state, setState] = useState<StoryboardCanvasState>({
    cards: storyboard.cards || [],
    connectors: storyboard.connectors || [],
  });

  // Sync when storyboard prop changes (e.g. from parent load)
  useEffect(() => {
    setState({
      cards: storyboard.cards || [],
      connectors: storyboard.connectors || [],
    });
  }, [storyboard]);

  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);

  const update = useCallback(
    (updater: (prev: StoryboardCanvasState) => StoryboardCanvasState) => {
      setState((prev) => {
        const next = updater(prev);
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(() => {
          updateStoryboard(scriptId, {
            cards: next.cards,
            connectors: next.connectors,
          }).catch(console.error);
        }, 500);
        return next;
      });
    },
    [scriptId]
  );

  const addCard = useCallback(
    (card: SceneCard) => {
      update((s) => ({ ...s, cards: [...(s.cards || []), card] }));
    },
    [update]
  );

  const updateCard = useCallback(
    (id: string, patch: Partial<SceneCard>) => {
      update((s) => ({
        ...s,
        cards: (s.cards || []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }));
    },
    [update]
  );

  const removeCard = useCallback(
    (id: string) => {
      update((s) => ({
        ...s,
        cards: s.cards.filter((c) => c.id !== id),
        connectors: s.connectors.filter(
          (conn) => conn.fromId !== id && conn.toId !== id
        ),
      }));
    },
    [update]
  );

  const moveCard = useCallback(
    (id: string, x: number, y: number) => {
      update((s) => ({
        ...s,
        cards: s.cards.map((c) => (c.id === id ? { ...c, x, y } : c)),
      }));
    },
    [update]
  );

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

  const removeCards = useCallback(
    (ids: string[]) => {
      update((s) => ({
        ...s,
        cards: s.cards.filter((c) => !ids.includes(c.id)),
        connectors: s.connectors.filter(
          (conn) => !ids.includes(conn.fromId) && !ids.includes(conn.toId)
        ),
      }));
    },
    [update]
  );

  const removeAll = useCallback(() => {
    if (!window.confirm("Are you sure you want to delete all shots? This cannot be undone.")) return;
    update((s) => ({
      ...s,
      cards: [],
      connectors: [],
    }));
  }, [update]);

  const autoLayout = useCallback(() => {
    update((s) => {
      const COLS = 4;
      const GAP_X = 360;
      const GAP_Y = 480; // increased for the larger cards
      const START_X = 100;
      const START_Y = 100;
      
      const newCards = [...s.cards]
        .sort((a, b) => a.order - b.order)
        .map((c, i) => {
          const row = Math.floor(i / COLS);
          const col = i % COLS;
          return {
            ...c,
            x: START_X + col * GAP_X,
            y: START_Y + row * GAP_Y,
          };
        });
      
      return { ...s, cards: newCards };
    });
  }, [update]);

  return {
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
  };
}
