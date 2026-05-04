"use client";

/**
 * Export Print View — Workspace Asset Canvas
 * 
 * A dedicated, headless-friendly route that renders all workspace
 * assets at 1:1 scale on a dark background. No toolbars, menus,
 * or interactive elements. Designed for Puppeteer/Playwright capture.
 * 
 * Usage: /export/workspace/{scriptId}
 * 
 * The page:
 *   1. Fetches workspace assets from the Django API
 *   2. Loads edges from localStorage
 *   3. Renders all assets into a bounding-box-fitted container
 *   4. Applies CSS transform to scale into landscape letter (11" × 8.5")
 */

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import { SHOT_TYPES, IDEA_COLORS, STICKY_COLORS } from "@/lib/canvasTypes";
import type { CanvasElement, ShotElement, IdeaElement, StickyNoteElement, TextElement, ImageElement, LinkCardElement, EdgeConnection } from "@/lib/canvasTypes";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// Landscape Letter dimensions in px at 96 DPI
const PAGE_W = 1056; // 11in × 96
const PAGE_H = 816;  // 8.5in × 96
const PADDING = 48;  // Edge padding in canvas units

interface WorkspaceAssetRow {
  id: string;
  asset_id: string;
  asset_type: string;
  x: number;
  y: number;
  width: number;
  height: number;
  z_index: number;
  content: Record<string, any>;
}

export default function ExportWorkspacePage() {
  const params = useParams();
  const scriptId = params?.id as string;
  const [elements, setElements] = useState<CanvasElement[]>([]);
  const [edges, setEdges] = useState<EdgeConnection[]>([]);
  const [title, setTitle] = useState("UNTITLED");
  const [loading, setLoading] = useState(true);

  // ── Fetch data ──
  useEffect(() => {
    if (!scriptId) return;

    const fetchData = async () => {
      try {
        // Fetch workspace assets
        const res = await fetch(`${API_BASE}/scripts/${scriptId}/workspace/`);
        if (res.ok) {
          const assets: WorkspaceAssetRow[] = await res.json();
          const mapped = (Array.isArray(assets) ? assets : []).map((a: WorkspaceAssetRow) => ({
            ...a.content,
            id: a.asset_id || a.id,
            x: a.x,
            y: a.y,
            width: a.width || a.content?.width || 280,
            height: a.height || a.content?.height || 200,
            zIndex: a.z_index,
          })) as CanvasElement[];
          setElements(mapped);
        }

        // Fetch script title
        const scriptRes = await fetch(`${API_BASE}/scripts/${scriptId}/`);
        if (scriptRes.ok) {
          const script = await scriptRes.json();
          setTitle(script.title || "UNTITLED");
        }

        // Load edges from localStorage
        try {
          const raw = localStorage.getItem(`workspace_meta_${scriptId}`);
          if (raw) {
            const meta = JSON.parse(raw);
            setEdges(meta.edges || []);
          }
        } catch { /* ignore */ }
      } catch (err) {
        console.error("Failed to load workspace data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [scriptId]);

  // ── Calculate bounding box and scale ──
  const { transform, viewBox } = useMemo(() => {
    if (elements.length === 0) {
      return { transform: "", viewBox: { x: 0, y: 0, w: PAGE_W, h: PAGE_H } };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of elements) {
      minX = Math.min(minX, el.x);
      minY = Math.min(minY, el.y);
      maxX = Math.max(maxX, el.x + el.width);
      maxY = Math.max(maxY, el.y + el.height);
    }

    const contentW = maxX - minX + PADDING * 2;
    const contentH = maxY - minY + PADDING * 2;

    const scaleX = PAGE_W / contentW;
    const scaleY = PAGE_H / contentH;
    const scale = Math.min(scaleX, scaleY, 1); // Don't scale up, only down

    const offsetX = (PAGE_W - contentW * scale) / 2 - minX * scale + PADDING * scale;
    const offsetY = (PAGE_H - contentH * scale) / 2 - minY * scale + PADDING * scale;

    return {
      transform: `scale(${scale}) translate(${offsetX / scale}px, ${offsetY / scale}px)`,
      viewBox: { x: minX - PADDING, y: minY - PADDING, w: contentW, h: contentH },
    };
  }, [elements]);

  if (loading) {
    return (
      <div style={{ width: PAGE_W, height: PAGE_H, background: "#0c0c14", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#475569", fontFamily: "Courier Prime, monospace", fontSize: 14 }}>Loading workspace...</span>
      </div>
    );
  }

  return (
    <div
      id="export-root"
      style={{
        width: PAGE_W,
        height: PAGE_H,
        background: "#0c0c14",
        overflow: "hidden",
        position: "relative",
        fontFamily: "'Courier Prime', 'Courier New', Courier, monospace",
      }}
    >
      {/* Header */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0,
        display: "flex", justifyContent: "space-between", alignItems: "center",
        padding: "12px 24px",
        borderBottom: "1px solid #1e293b",
        zIndex: 9999,
      }}>
        <span style={{ fontSize: 10, fontWeight: "bold", color: "#94a3b8", letterSpacing: "0.05em" }}>{title.toUpperCase()}</span>
        <span style={{ fontSize: 8, fontWeight: "bold", color: "#3b82f6", letterSpacing: "0.15em", textTransform: "uppercase" }}>DIRECTOR&apos;S SUITE</span>
      </div>

      {/* Workspace elements container */}
      <div style={{ position: "absolute", inset: 0, transform, transformOrigin: "0 0" }}>
        {/* Edge connections */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", zIndex: 1 }}>
          {edges.map(edge => {
            const source = elements.find(el => el.id === edge.sourceId);
            const target = elements.find(el => el.id === edge.targetId);
            if (!source || !target) return null;
            const x1 = source.x + source.width / 2;
            const y1 = source.y + source.height / 2;
            const x2 = target.x + target.width / 2;
            const y2 = target.y + target.height / 2;
            return (
              <line key={edge.id} x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={edge.color || "#3b82f6"} strokeWidth={2}
                strokeDasharray={edge.style === "dashed" ? "8 4" : edge.style === "dotted" ? "2 4" : "none"}
                opacity={0.6}
              />
            );
          })}
        </svg>

        {/* Elements */}
        {[...elements].sort((a, b) => a.zIndex - b.zIndex).map(el => (
          <ExportElement key={el.id} element={el} />
        ))}
      </div>

      {/* Footer */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0,
        display: "flex", justifyContent: "space-between",
        padding: "8px 24px",
        fontSize: 7, color: "#475569",
        borderTop: "1px solid #1e293b",
        zIndex: 9999,
      }}>
        <span>{title}</span>
        <span>All Rights Reserved.</span>
      </div>
    </div>
  );
}

// ── Render individual elements for export ──

function ExportElement({ element }: { element: CanvasElement }) {
  const baseStyle: React.CSSProperties = {
    position: "absolute",
    left: element.x,
    top: element.y,
    width: element.width,
    height: element.height,
    zIndex: element.zIndex,
  };

  switch (element.type) {
    case "shot": {
      const el = element as ShotElement;
      const shotInfo = SHOT_TYPES.find(s => s.id === el.shotType);
      return (
        <div style={{ ...baseStyle, borderRadius: 12, overflow: "hidden", background: "#121212", border: `2px solid ${el.color}30` }}>
          {/* Image area */}
          <div style={{ aspectRatio: "16/9", background: "#0a0a0a", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {el.imageUrl ? (
              <img src={el.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div style={{ textAlign: "center", color: "#475569" }}>
                <div style={{ fontSize: 28 }}>{shotInfo?.icon || "📷"}</div>
                <div style={{ fontSize: 7, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>Storyboard</div>
              </div>
            )}
          </div>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderTop: `1px solid ${el.color}20`, borderBottom: "1px solid #1e293b" }}>
            <span style={{ fontSize: 9, fontWeight: 900, textTransform: "uppercase", color: el.color, letterSpacing: "-0.02em" }}>{shotInfo?.label || el.shotType}</span>
            <span style={{ marginLeft: "auto", fontSize: 8, color: "#64748b", fontFamily: "monospace" }}>{el.duration || "0:00"}</span>
          </div>
          {/* Fields */}
          <div style={{ padding: "8px 10px", fontSize: 9 }}>
            {el.sceneRef && <div style={{ color: "#94a3b8", marginBottom: 3 }}><span style={{ color: "#475569", fontWeight: "bold", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em" }}>SCENE </span>{el.sceneRef}</div>}
            {el.lens && <div style={{ color: "#94a3b8", marginBottom: 3 }}><span style={{ color: "#475569", fontWeight: "bold", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em" }}>LENS </span>{el.lens}</div>}
            {el.movement && <div style={{ color: "#94a3b8", marginBottom: 3 }}><span style={{ color: "#475569", fontWeight: "bold", fontSize: 7, textTransform: "uppercase", letterSpacing: "0.08em" }}>MOVE </span>{el.movement}</div>}
            {el.notes && <div style={{ color: "#64748b", fontSize: 8, marginTop: 4, lineHeight: 1.3 }}>{el.notes}</div>}
          </div>
        </div>
      );
    }

    case "idea": {
      const el = element as IdeaElement;
      return (
        <div style={{ ...baseStyle, borderRadius: 12, overflow: "hidden", background: "#121212", border: `2px solid ${el.color}40`, display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 10px", borderBottom: "1px solid #1e293b20", background: `${el.color}15` }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: el.color }} />
            <span style={{ fontSize: 9, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.1em", color: "#e2e8f0" }}>{el.title || "Idea"}</span>
          </div>
          <div style={{ flex: 1, padding: "8px 10px", fontSize: 10, color: "#94a3b8", lineHeight: 1.4 }}>{el.content}</div>
        </div>
      );
    }

    case "sticky": {
      const el = element as StickyNoteElement;
      const colors = STICKY_COLORS[el.color] || STICKY_COLORS.yellow;
      return (
        <div style={{ ...baseStyle, background: colors.bg, borderLeft: `4px solid ${colors.border}`, color: colors.text, padding: 12, borderRadius: 3, boxShadow: "2px 4px 12px rgba(0,0,0,0.15)" }}>
          <div style={{ fontSize: el.fontSize || 14, lineHeight: 1.5, wordBreak: "break-word" }}>{el.content || ""}</div>
        </div>
      );
    }

    case "text": {
      const el = element as TextElement;
      return (
        <div style={{ ...baseStyle, background: el.backgroundColor || "#1e1e2e", color: el.color || "#e2e8f0", padding: 10, borderRadius: 6, fontSize: el.fontSize || 14, fontWeight: el.fontWeight || "400", fontFamily: el.fontFamily || "Inter, sans-serif" }}>
          {el.content}
        </div>
      );
    }

    case "image": {
      const el = element as ImageElement;
      return (
        <div style={{ ...baseStyle, borderRadius: 8, overflow: "hidden", background: "#0a0a0a", border: "1px solid #1e293b" }}>
          {el.src ? (
            <img src={el.src} alt={el.alt || ""} style={{ width: "100%", height: "100%", objectFit: el.objectFit || "cover" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#475569", fontSize: 12 }}>🖼 {el.alt || "Image"}</div>
          )}
        </div>
      );
    }

    case "link-card": {
      const el = element as LinkCardElement;
      return (
        <div style={{ ...baseStyle, borderRadius: 8, overflow: "hidden", background: "#121212", border: "1px solid #1e293b", padding: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
            {el.favicon && <img src={el.favicon} alt="" style={{ width: 14, height: 14, borderRadius: 2 }} />}
            <span style={{ fontSize: 10, fontWeight: "bold", color: "#e2e8f0" }}>{el.title || el.url}</span>
          </div>
          {el.description && <div style={{ fontSize: 9, color: "#64748b", lineHeight: 1.3 }}>{el.description}</div>}
          <div style={{ fontSize: 8, color: "#3b82f6", marginTop: 4, wordBreak: "break-all" }}>{el.url}</div>
        </div>
      );
    }

    default:
      return null;
  }
}
