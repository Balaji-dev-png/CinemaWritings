"use client";
import { useState, useCallback, useEffect, useRef } from "react";
import {
  Storyboard,
  SceneCard,
  Connector,
  updateSceneCard,
  deleteSceneCard,
  bulkDeleteSceneCards,
  reorderSceneCards,
  syncStoryboardConnectors,
} from "@/lib/storyboard-api";

export interface StoryboardCanvasState {
  cards: SceneCard[];
  connectors: Connector[];
}

// Per-card debounce timers so rapid edits don't flood the API
const cardTimers: Record<string, ReturnType<typeof setTimeout>> = {};

export function useStoryboardCanvas(scriptId: string, storyboard: Storyboard) {
  const [state, setState] = useState<StoryboardCanvasState>({
    cards: storyboard.cards || [],
    connectors: storyboard.connectors || [],
  });

  // Sync local state when the parent storyboard prop refreshes (e.g. initial load)
  useEffect(() => {
    setState({
      cards: storyboard.cards || [],
      connectors: storyboard.connectors || [],
    });
  }, [storyboard]);

  // ── Debounced connector sync ──
  const connectorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectorsRef = useRef<Connector[]>(storyboard.connectors || []);

  const scheduleConnectorSync = useCallback((connectors: Connector[]) => {
    connectorsRef.current = connectors;
    if (connectorTimerRef.current) clearTimeout(connectorTimerRef.current);
    connectorTimerRef.current = setTimeout(() => {
      syncStoryboardConnectors(storyboard.id, connectorsRef.current).catch(console.error);
    }, 600);
  }, [storyboard.id]);

  // ── addCard: card is already created in Supabase by caller (StoryboardView);
  //    we just insert it into local state.
  const addCard = useCallback((card: SceneCard) => {
    setState((prev) => ({ ...prev, cards: [...(prev.cards || []), card] }));
  }, []);

  // ── updateCard: debounce DB write per card to avoid flooding on rapid typing
  const updateCard = useCallback(
    (id: string, patch: Partial<SceneCard>) => {
      // Update local state immediately for a snappy UI
      setState((prev) => ({
        ...prev,
        cards: (prev.cards || []).map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }));

      // Debounce the actual DB write
      if (cardTimers[id]) clearTimeout(cardTimers[id]);
      cardTimers[id] = setTimeout(() => {
        updateSceneCard(storyboard.id, id, patch).catch(console.error);
      }, 600);
    },
    [storyboard.id]
  );

  // ── removeCard: delete from Supabase and remove from local state
  const removeCard = useCallback(
    (id: string) => {
      setState((prev) => {
        const nextConnectors = prev.connectors.filter(
          (conn) => conn.fromId !== id && conn.toId !== id
        );
        scheduleConnectorSync(nextConnectors);
        return {
          ...prev,
          cards: prev.cards.filter((c) => c.id !== id),
          connectors: nextConnectors,
        };
      });
      deleteSceneCard(storyboard.id, id).catch(console.error);
    },
    [storyboard.id, scheduleConnectorSync]
  );

  // ── moveCard: position is a card field — debounce DB write
  const moveCard = useCallback(
    (id: string, x: number, y: number) => {
      setState((prev) => ({
        ...prev,
        cards: prev.cards.map((c) => (c.id === id ? { ...c, x, y } : c)),
      }));

      if (cardTimers[id]) clearTimeout(cardTimers[id]);
      cardTimers[id] = setTimeout(() => {
        updateSceneCard(storyboard.id, id, { x, y }).catch(console.error);
      }, 600);
    },
    [storyboard.id]
  );

  // ── removeCards: bulk delete
  const removeCards = useCallback(
    (ids: string[]) => {
      setState((prev) => {
        const nextConnectors = prev.connectors.filter(
          (conn) => !ids.includes(conn.fromId) && !ids.includes(conn.toId)
        );
        scheduleConnectorSync(nextConnectors);
        return {
          ...prev,
          cards: prev.cards.filter((c) => !ids.includes(c.id)),
          connectors: nextConnectors,
        };
      });
      bulkDeleteSceneCards(storyboard.id, ids).catch(console.error);
    },
    [storyboard.id, scheduleConnectorSync]
  );

  // ── removeAll: clear everything
  const removeAll = useCallback(() => {
    if (!window.confirm("Are you sure you want to delete all shots? This cannot be undone.")) return;
    setState((prev) => {
      const ids = prev.cards.map((c) => c.id);
      if (ids.length > 0) {
        bulkDeleteSceneCards(storyboard.id, ids).catch(console.error);
      }
      scheduleConnectorSync([]);
      return { ...prev, cards: [], connectors: [] };
    });
  }, [storyboard.id, scheduleConnectorSync]);

  // ── Connectors: persisted to canvas_state via syncStoryboardConnectors ──
  const addConnector = useCallback((conn: Connector) => {
    setState((prev) => {
      const next = [...prev.connectors, conn];
      scheduleConnectorSync(next);
      return { ...prev, connectors: next };
    });
  }, [scheduleConnectorSync]);

  const removeConnector = useCallback((id: string) => {
    setState((prev) => {
      const next = prev.connectors.filter((c) => c.id !== id);
      scheduleConnectorSync(next);
      return { ...prev, connectors: next };
    });
  }, [scheduleConnectorSync]);

  // ── Auto-Layout: reposition cards in a grid and persist new positions
  const autoLayout = useCallback(() => {
    const COLS = 4;
    const GAP_X = 360;
    const GAP_Y = 480;
    const START_X = 100;
    const START_Y = 100;

    setState((prev) => {
      const newCards = [...prev.cards]
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

      // Persist positions for each card
      newCards.forEach((c) => {
        updateSceneCard(storyboard.id, c.id, { x: c.x, y: c.y }).catch(console.error);
      });

      return { ...prev, cards: newCards };
    });
  }, [storyboard.id]);

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
