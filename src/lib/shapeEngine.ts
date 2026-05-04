/**
 * Creative Workspace — Shape Engine
 *
 * Canvas 2D rendering and hit-testing for rectangles,
 * circles, arrows, and lines. All functions are stateless.
 */

import {
  CanvasElement,
  RectangleElement,
  CircleElement,
  ArrowElement,
  LineElement,
  ViewportState,
} from "./canvasTypes";

// ─── Transform Helper ────────────────────────────────────────────────────────

function toScreen(x: number, y: number, vp: ViewportState): [number, number] {
  return [x * vp.zoom + vp.offsetX, y * vp.zoom + vp.offsetY];
}

// ─── Rectangle ───────────────────────────────────────────────────────────────

export function drawRectangle(
  ctx: CanvasRenderingContext2D,
  el: RectangleElement,
  vp: ViewportState,
  isSelected: boolean
): void {
  const [sx, sy] = toScreen(el.x, el.y, vp);
  const sw = el.width * vp.zoom;
  const sh = el.height * vp.zoom;
  const br = el.borderRadius * vp.zoom;

  ctx.save();
  ctx.globalAlpha = el.opacity;

  if (el.rotation) {
    ctx.translate(sx + sw / 2, sy + sh / 2);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.translate(-(sx + sw / 2), -(sy + sh / 2));
  }

  // Fill
  ctx.beginPath();
  ctx.roundRect(sx, sy, sw, sh, br);
  ctx.fillStyle = el.fillColor;
  ctx.fill();

  // Stroke
  if (el.strokeWidth > 0) {
    ctx.strokeStyle = el.strokeColor;
    ctx.lineWidth = el.strokeWidth * vp.zoom;
    ctx.stroke();
  }

  // Selection ring
  if (isSelected) {
    drawSelectionRing(ctx, sx, sy, sw, sh);
    drawResizeHandles(ctx, sx, sy, sw, sh);
  }

  ctx.restore();
}

// ─── Circle / Ellipse ────────────────────────────────────────────────────────

export function drawCircle(
  ctx: CanvasRenderingContext2D,
  el: CircleElement,
  vp: ViewportState,
  isSelected: boolean
): void {
  const [sx, sy] = toScreen(el.x, el.y, vp);
  const sw = el.width * vp.zoom;
  const sh = el.height * vp.zoom;
  const cx = sx + sw / 2;
  const cy = sy + sh / 2;

  ctx.save();
  ctx.globalAlpha = el.opacity;

  if (el.rotation) {
    ctx.translate(cx, cy);
    ctx.rotate((el.rotation * Math.PI) / 180);
    ctx.translate(-cx, -cy);
  }

  ctx.beginPath();
  ctx.ellipse(cx, cy, sw / 2, sh / 2, 0, 0, Math.PI * 2);
  ctx.fillStyle = el.fillColor;
  ctx.fill();

  if (el.strokeWidth > 0) {
    ctx.strokeStyle = el.strokeColor;
    ctx.lineWidth = el.strokeWidth * vp.zoom;
    ctx.stroke();
  }

  if (isSelected) {
    drawSelectionRing(ctx, sx, sy, sw, sh);
    drawResizeHandles(ctx, sx, sy, sw, sh);
  }

  ctx.restore();
}

// ─── Arrow ───────────────────────────────────────────────────────────────────

export function drawArrow(
  ctx: CanvasRenderingContext2D,
  el: ArrowElement,
  vp: ViewportState,
  isSelected: boolean
): void {
  const [sx1, sy1] = toScreen(el.x1, el.y1, vp);
  const [sx2, sy2] = toScreen(el.x2, el.y2, vp);
  const headLen = 14 * vp.zoom;
  const angle = Math.atan2(sy2 - sy1, sx2 - sx1);

  ctx.save();
  ctx.globalAlpha = el.opacity;
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth * vp.zoom;
  ctx.lineCap = "round";

  if (el.dashPattern.length > 0) {
    ctx.setLineDash(el.dashPattern.map((d) => d * vp.zoom));
  }

  // Line
  ctx.beginPath();
  ctx.moveTo(sx1, sy1);
  ctx.lineTo(sx2, sy2);
  ctx.stroke();

  // Arrowhead
  ctx.setLineDash([]);
  ctx.fillStyle = el.strokeColor;
  ctx.beginPath();
  ctx.moveTo(sx2, sy2);
  ctx.lineTo(
    sx2 - headLen * Math.cos(angle - Math.PI / 6),
    sy2 - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    sx2 - headLen * Math.cos(angle + Math.PI / 6),
    sy2 - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();

  // Label
  if (el.label) {
    const mx = (sx1 + sx2) / 2;
    const my = (sy1 + sy2) / 2;
    ctx.font = `${12 * vp.zoom}px Inter, sans-serif`;
    ctx.fillStyle = el.strokeColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(el.label, mx, my - 6 * vp.zoom);
  }

  if (isSelected) {
    // Draw endpoint handles
    drawHandle(ctx, sx1, sy1);
    drawHandle(ctx, sx2, sy2);
  }

  ctx.restore();
}

// ─── Line ────────────────────────────────────────────────────────────────────

export function drawLine(
  ctx: CanvasRenderingContext2D,
  el: LineElement,
  vp: ViewportState,
  isSelected: boolean
): void {
  const [sx1, sy1] = toScreen(el.x1, el.y1, vp);
  const [sx2, sy2] = toScreen(el.x2, el.y2, vp);

  ctx.save();
  ctx.globalAlpha = el.opacity;
  ctx.strokeStyle = el.strokeColor;
  ctx.lineWidth = el.strokeWidth * vp.zoom;
  ctx.lineCap = "round";

  if (el.dashPattern.length > 0) {
    ctx.setLineDash(el.dashPattern.map((d) => d * vp.zoom));
  }

  ctx.beginPath();
  ctx.moveTo(sx1, sy1);
  ctx.lineTo(sx2, sy2);
  ctx.stroke();

  if (isSelected) {
    drawHandle(ctx, sx1, sy1);
    drawHandle(ctx, sx2, sy2);
  }

  ctx.restore();
}

// ─── Selection Helpers ───────────────────────────────────────────────────────

function drawSelectionRing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  ctx.save();
  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 3]);
  ctx.strokeRect(x - 4, y - 4, w + 8, h + 8);
  ctx.restore();
}

function drawResizeHandles(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const size = 8;
  const positions = [
    [x - size / 2, y - size / 2],
    [x + w - size / 2, y - size / 2],
    [x - size / 2, y + h - size / 2],
    [x + w - size / 2, y + h - size / 2],
    // Mid-points
    [x + w / 2 - size / 2, y - size / 2],
    [x + w / 2 - size / 2, y + h - size / 2],
    [x - size / 2, y + h / 2 - size / 2],
    [x + w - size / 2, y + h / 2 - size / 2],
  ];

  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 2;

  for (const [hx, hy] of positions) {
    ctx.fillRect(hx, hy, size, size);
    ctx.strokeRect(hx, hy, size, size);
  }
  ctx.restore();
}

function drawHandle(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#60a5fa";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ─── Hit Testing ─────────────────────────────────────────────────────────────

export function hitTestElement(
  px: number,
  py: number,
  el: CanvasElement
): boolean {
  switch (el.type) {
    case "rectangle":
    case "text":
    case "sticky":
    case "image":
    case "link-card":
    case "shot":
    case "mermaid":
      return (
        px >= el.x &&
        px <= el.x + el.width &&
        py >= el.y &&
        py <= el.y + el.height
      );

    case "circle": {
      const cx = el.x + el.width / 2;
      const cy = el.y + el.height / 2;
      const rx = el.width / 2;
      const ry = el.height / 2;
      const dx = (px - cx) / rx;
      const dy = (py - cy) / ry;
      return dx * dx + dy * dy <= 1;
    }

    case "arrow":
    case "line": {
      const lineEl = el as ArrowElement | LineElement;
      return distToSegment(px, py, lineEl.x1, lineEl.y1, lineEl.x2, lineEl.y2) < 8;
    }

    default:
      return false;
  }
}

function distToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - x1, py - y1);

  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;
  return Math.hypot(px - projX, py - projY);
}

// ─── Render All Shapes ───────────────────────────────────────────────────────

export function renderAllShapes(
  ctx: CanvasRenderingContext2D,
  elements: CanvasElement[],
  vp: ViewportState,
  selectedIds: Set<string>
): void {
  // Sort by zIndex for proper layering
  const sorted = [...elements].sort((a, b) => a.zIndex - b.zIndex);

  for (const el of sorted) {
    const isSelected = selectedIds.has(el.id);
    switch (el.type) {
      case "rectangle":
        drawRectangle(ctx, el, vp, isSelected);
        break;
      case "circle":
        drawCircle(ctx, el, vp, isSelected);
        break;
      case "arrow":
        drawArrow(ctx, el, vp, isSelected);
        break;
      case "line":
        drawLine(ctx, el, vp, isSelected);
        break;
      // text, sticky, image, link-card, shot, mermaid
      // are rendered as HTML overlays — but we draw a placeholder rect
      // so the canvas shows bounding boxes for export
      case "text":
      case "sticky":
      case "image":
      case "link-card":
      case "shot":
      case "mermaid":
        if (isSelected) {
          const [sx, sy] = toScreen(el.x, el.y, vp);
          drawSelectionRing(ctx, sx, sy, el.width * vp.zoom, el.height * vp.zoom);
          drawResizeHandles(ctx, sx, sy, el.width * vp.zoom, el.height * vp.zoom);
        }
        break;
    }
  }
}

// ─── Resize Handle Hit Test ──────────────────────────────────────────────────

export type HandlePosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | null;

export function hitTestResizeHandle(
  px: number,
  py: number,
  el: CanvasElement,
  vp: ViewportState
): HandlePosition {
  const [sx, sy] = toScreen(el.x, el.y, vp);
  const sw = el.width * vp.zoom;
  const sh = el.height * vp.zoom;
  const size = 10;

  const handles: [HandlePosition, number, number][] = [
    ["top-left", sx, sy],
    ["top-right", sx + sw, sy],
    ["bottom-left", sx, sy + sh],
    ["bottom-right", sx + sw, sy + sh],
    ["top", sx + sw / 2, sy],
    ["bottom", sx + sw / 2, sy + sh],
    ["left", sx, sy + sh / 2],
    ["right", sx + sw, sy + sh / 2],
  ];

  for (const [pos, hx, hy] of handles) {
    if (
      px >= hx - size &&
      px <= hx + size &&
      py >= hy - size &&
      py <= hy + size
    ) {
      return pos;
    }
  }

  return null;
}
