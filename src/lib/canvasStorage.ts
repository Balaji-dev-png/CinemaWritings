/**
 * Creative Workspace — Canvas Persistence
 *
 * Debounced save (2 seconds) to Django backend,
 * load, and export (PNG / PDF) functions.
 *
 * Persists:
 *   - Elements → WorkspaceAsset model rows
 *   - Edges + Viewport → stored in localStorage as fallback
 */

import {
  CanvasState,
  DEFAULT_CANVAS_STATE,
  EdgeConnection,
  ViewportState,
} from "./canvasTypes";
import { getAccessToken, logout } from "./auth";
import jsPDF from "jspdf";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ─── Debounced Save (Django Sync + localStorage for edges/viewport) ──────────

let saveTimeout: NodeJS.Timeout | null = null;

export const saveCanvasState = (scriptId: string, state: CanvasState): void => {
  if (saveTimeout) clearTimeout(saveTimeout);

  saveTimeout = setTimeout(async () => {
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // Sync assets and edges to Django
      const response = await fetch(
        `${API_BASE}/scripts/${scriptId}/workspace/sync/`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            assets: state.elements.map((el) => ({
              ...el,
              asset_id: el.id,
            })),
            edges: state.edges,
          }),
        },
      );

      if (response.status === 401) {
        console.warn("Workspace save unauthorized (401). Check authentication.");
        // We do not logout() here to prevent unexpected redirects.
      } else if (!response.ok) {
        console.error("Workspace sync failed with status:", response.status);
      }

      // Persist viewport, grid state in localStorage (lightweight metadata)
      if (typeof window !== "undefined") {
        const meta = {
          viewport: state.viewport,
          gridVisible: state.gridVisible,
          nextZIndex: state.nextZIndex,
        };
        localStorage.setItem(
          `workspace_meta_${scriptId}`,
          JSON.stringify(meta),
        );
      }
    } catch (e) {
      console.error("Workspace sync error:", e);
    }
  }, 2000);
};

// ─── Load (Django + localStorage) ────────────────────────────────────────────

export const loadCanvasState = async (
  scriptId: string,
): Promise<CanvasState> => {
  try {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE}/scripts/${scriptId}/workspace/`, {
      headers,
    });
    if (response.status === 401) {
      console.warn("Workspace load unauthorized (401). Falling back to local state.");
      // We do not logout() here to prevent unexpected redirects.
    }

    let elements = DEFAULT_CANVAS_STATE.elements;
    let edges: EdgeConnection[] = [];

    if (response.ok) {
      const assets = await response.json();
      const assetList = Array.isArray(assets) ? assets : assets.results || [];

      elements = assetList.map((a: any) => ({
        ...a.content,
        id: a.asset_id || a.id,
        x: a.x,
        y: a.y,
        width: a.width || a.content?.width || 280,
        height: a.height || a.content?.height || 200,
        zIndex: a.z_index,
      }));

      // Also fetch the script to get edges
      const scriptRes = await fetch(`${API_BASE}/scripts/${scriptId}/`, {
        headers,
      });
      if (scriptRes.ok) {
        const scriptData = await scriptRes.json();
        if (
          scriptData.workspace_edges &&
          Array.isArray(scriptData.workspace_edges)
        ) {
          edges = scriptData.workspace_edges;
        }
      }
    }

    // Load viewport from localStorage
    let viewport = DEFAULT_CANVAS_STATE.viewport;
    let gridVisible = true;
    let nextZIndex = 1;

    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem(`workspace_meta_${scriptId}`);
        if (raw) {
          const meta = JSON.parse(raw);
          viewport = meta.viewport || DEFAULT_CANVAS_STATE.viewport;
          gridVisible =
            meta.gridVisible !== undefined ? meta.gridVisible : true;
          nextZIndex = meta.nextZIndex || 1;
        }
      } catch {
        // Ignore localStorage errors
      }
    }

    // Ensure nextZIndex is above all loaded elements
    const maxZ = elements.reduce(
      (max: number, el: any) => Math.max(max, el.zIndex || 0),
      0,
    );
    if (nextZIndex <= maxZ) nextZIndex = maxZ + 1;

    return {
      elements,
      edges,
      strokes: [],
      viewport,
      gridVisible,
      nextZIndex,
    };
  } catch {
    return DEFAULT_CANVAS_STATE;
  }
};

// ─── Export as PNG ────────────────────────────────────────────────────────────

export const exportCanvasAsPng = (
  canvas: HTMLCanvasElement,
  overlayEl: HTMLElement | null,
  title: string,
): void => {
  // Create a composite canvas that includes the main canvas + overlay
  const exportCanvas = document.createElement("canvas");
  const ctx = exportCanvas.getContext("2d");
  if (!ctx) return;

  exportCanvas.width = canvas.width;
  exportCanvas.height = canvas.height;

  // Draw the main canvas
  ctx.drawImage(canvas, 0, 0);

  // Convert to blob and download
  exportCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "canvas"}-workspace.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
};

// ─── Export as PDF ────────────────────────────────────────────────────────────

export const exportCanvasAsPdf = (
  canvas: HTMLCanvasElement,
  title: string,
): void => {
  const imgData = canvas.toDataURL("image/jpeg", 0.92);

  // Calculate aspect ratio for PDF
  const ratio = canvas.height / canvas.width;
  const pdfWidth = 11; // Landscape letter width in inches
  const pdfHeight = pdfWidth * ratio;

  const pdf = new jsPDF({
    orientation: ratio > 1 ? "portrait" : "landscape",
    unit: "in",
    format: [pdfWidth, pdfHeight],
  });

  pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
  pdf.save(`${title || "canvas"}-workspace.pdf`);
};
