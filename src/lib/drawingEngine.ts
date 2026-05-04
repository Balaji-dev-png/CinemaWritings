/**
 * Creative Workspace — Drawing Engine
 *
 * Pure Canvas 2D rendering functions for pencil strokes,
 * highlighter strokes, eraser, and dot grid background.
 * All functions are stateless — they just draw.
 */

import {
  DrawingStroke,
  StrokePoint,
  ViewportState,
} from "./canvasTypes";

// ─── Dot Grid ────────────────────────────────────────────────────────────────

export function renderDotGrid(
  ctx: CanvasRenderingContext2D,
  viewport: ViewportState,
  canvasWidth: number,
  canvasHeight: number,
  darkMode: boolean
): void {
  const spacing = 24;
  const dotRadius = 1;
  const color = darkMode
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.08)";

  const { offsetX, offsetY, zoom } = viewport;
  const scaledSpacing = spacing * zoom;

  // Only draw dots visible in the viewport
  const startX = -(offsetX % scaledSpacing);
  const startY = -(offsetY % scaledSpacing);

  ctx.fillStyle = color;
  ctx.beginPath();

  for (let x = startX; x < canvasWidth; x += scaledSpacing) {
    for (let y = startY; y < canvasHeight; y += scaledSpacing) {
      ctx.moveTo(x + dotRadius, y);
      ctx.arc(x, y, dotRadius * zoom, 0, Math.PI * 2);
    }
  }

  ctx.fill();
}

// ─── Pencil Stroke ───────────────────────────────────────────────────────────

export function drawPencilStroke(
  ctx: CanvasRenderingContext2D,
  stroke: DrawingStroke,
  viewport: ViewportState
): void {
  const { points, color, width } = stroke;
  if (points.length < 2) return;

  const { offsetX, offsetY, zoom } = viewport;

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.globalAlpha = stroke.opacity;

  // Draw with variable width based on pressure
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1];
    const p1 = points[i];
    const pressure = (p0.pressure + p1.pressure) / 2;

    ctx.beginPath();
    ctx.lineWidth = width * pressure * zoom;
    ctx.moveTo(
      p0.x * zoom + offsetX,
      p0.y * zoom + offsetY
    );
    ctx.lineTo(
      p1.x * zoom + offsetX,
      p1.y * zoom + offsetY
    );
    ctx.stroke();
  }

  ctx.restore();
}

// ─── Highlighter Stroke ──────────────────────────────────────────────────────

export function drawHighlighterStroke(
  ctx: CanvasRenderingContext2D,
  stroke: DrawingStroke,
  viewport: ViewportState
): void {
  const { points, color, width } = stroke;
  if (points.length < 2) return;

  const { offsetX, offsetY, zoom } = viewport;

  ctx.save();
  ctx.lineCap = "square";
  ctx.lineJoin = "round";
  ctx.strokeStyle = color;
  ctx.lineWidth = width * 3 * zoom; // Wider for highlighter
  ctx.globalAlpha = 0.3; // Semi-transparent
  ctx.globalCompositeOperation = "multiply";

  ctx.beginPath();
  ctx.moveTo(
    points[0].x * zoom + offsetX,
    points[0].y * zoom + offsetY
  );

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(
      points[i].x * zoom + offsetX,
      points[i].y * zoom + offsetY
    );
  }

  ctx.stroke();
  ctx.restore();
}

// ─── Eraser ──────────────────────────────────────────────────────────────────

/** Returns IDs of strokes that should be removed (intersect with eraser path) */
export function getErasedStrokeIds(
  eraserPoints: StrokePoint[],
  strokes: DrawingStroke[],
  eraserRadius: number
): string[] {
  const erasedIds: string[] = [];

  for (const stroke of strokes) {
    let erased = false;
    for (const ep of eraserPoints) {
      for (const sp of stroke.points) {
        const dx = ep.x - sp.x;
        const dy = ep.y - sp.y;
        if (dx * dx + dy * dy < eraserRadius * eraserRadius) {
          erased = true;
          break;
        }
      }
      if (erased) break;
    }
    if (erased) erasedIds.push(stroke.id);
  }

  return erasedIds;
}

/** Draw eraser cursor circle */
export function drawEraserCursor(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  viewport: ViewportState
): void {
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.arc(
    x * viewport.zoom + viewport.offsetX,
    y * viewport.zoom + viewport.offsetY,
    radius * viewport.zoom,
    0,
    Math.PI * 2
  );
  ctx.stroke();
  ctx.restore();
}

// ─── Render All Strokes ──────────────────────────────────────────────────────

export function renderAllStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: DrawingStroke[],
  viewport: ViewportState
): void {
  for (const stroke of strokes) {
    if (stroke.type === "pencil") {
      drawPencilStroke(ctx, stroke, viewport);
    } else if (stroke.type === "highlighter") {
      drawHighlighterStroke(ctx, stroke, viewport);
    }
  }
}
