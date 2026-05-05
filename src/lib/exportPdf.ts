import jsPDF from "jspdf";

// ─── WGA Standard Screenplay Layout (inches) ──────────────────────────────
const PW = 8.5;
const PH = 11;
const ML = 1.5;
const MR = 1.0;
const MT = 1.0;
const MB = 1.0;
const WRITING_W = PW - ML - MR; // 6.0"

const LAYOUT: Record<string, { x: number; w: number; align?: "right" }> = {
  "scene-heading": { x: ML, w: WRITING_W },
  action: { x: ML, w: WRITING_W },
  character: { x: 3.7, w: 3.8 },
  parenthetical: { x: 3.0, w: 2.5 },
  dialogue: { x: 2.5, w: 3.5 },
  transition: { x: ML, w: WRITING_W, align: "right" },
  shot: { x: ML, w: WRITING_W },
};

const BLANK_BEFORE: Record<string, number> = {
  "scene-heading": 2,
  action: 1,
  character: 1,
  parenthetical: 0,
  dialogue: 0,
  transition: 1,
  shot: 1,
};

// ─── Inline style segment ──────────────────────────────────────────────────
type Seg = {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  fontSize?: number;
};

/** Walk a DOM node tree and collect leaf text with inherited font style */
function collectSegments(
  node: Node,
  bold: boolean,
  italic: boolean,
  underline: boolean,
  fontSize: number | undefined,
  out: Seg[],
) {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node.textContent ?? "";
    if (t) out.push({ text: t, bold, italic, underline, fontSize });
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const el = node as HTMLElement;
  const tag = el.tagName.toLowerCase();
  const b = bold || tag === "strong" || tag === "b";
  const i = italic || tag === "em" || tag === "i";
  const u = underline || tag === "u";

  let fs = fontSize;
  if (el.style.fontSize) {
    const matched = el.style.fontSize.match(/(\d+)(?:pt|px)?/);
    if (matched) fs = parseInt(matched[1]);
  }

  for (const child of Array.from(node.childNodes)) {
    collectSegments(child, b, i, u, fs, out);
  }
}

type ParsedEl = { type: string; segs: Seg[]; plainText: string };
type ParsedPage = ParsedEl[];

/**
 * Parse TipTap HTML into pages of elements.
 * Detects <div data-type="pageNode"> wrappers for pagination.
 * If no wrappers found, returns all elements as a single page.
 */
function parseScriptHTML(html: string): ParsedPage[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, "text/html");
  const KNOWN = new Set(Object.keys(LAYOUT));

  const extractElements = (container: Element): ParsedEl[] => {
    const out: ParsedEl[] = [];
    container.querySelectorAll(":scope > p, p").forEach((p) => {
      // Skip paragraphs inside nested pageNode divs if we're at root level
      if (
        container.querySelector('[data-type="pageNode"]') &&
        p.closest('[data-type="pageNode"]') !== container
      ) {
        return;
      }
      const type =
        p.className.split(/\s+/).find((c) => KNOWN.has(c)) ?? "action";
      const plainText = p.textContent?.trim() ?? "";
      if (!plainText) return;
      const segs: Seg[] = [];
      collectSegments(p, false, false, false, undefined, segs);
      out.push({ type, segs, plainText });
    });
    return out;
  };

  // Check for pageNode wrappers
  const pageNodes = doc.querySelectorAll('[data-type="pageNode"]');
  if (pageNodes.length > 0) {
    const pages: ParsedPage[] = [];
    pageNodes.forEach((pageDiv) => {
      const elements: ParsedEl[] = [];
      pageDiv.querySelectorAll("p").forEach((p) => {
        const type =
          p.className.split(/\s+/).find((c) => KNOWN.has(c)) ?? "action";
        const plainText = p.textContent?.trim() ?? "";
        if (!plainText) return;
        const segs: Seg[] = [];
        collectSegments(p, false, false, false, undefined, segs);
        elements.push({ type, segs, plainText });
      });
      if (elements.length > 0) pages.push(elements);
    });
    return pages.length > 0 ? pages : [[]];
  }

  // Fallback: no pageNode wrappers, treat everything as one page
  const all: ParsedEl[] = [];
  doc.querySelectorAll("p").forEach((p) => {
    const type = p.className.split(/\s+/).find((c) => KNOWN.has(c)) ?? "action";
    const plainText = p.textContent?.trim() ?? "";
    if (!plainText) return;
    const segs: Seg[] = [];
    collectSegments(p, false, false, false, undefined, segs);
    all.push({ type, segs, plainText });
  });
  return [all];
}

// ─── jsPDF helpers ────────────────────────────────────────────────────────
function setStyle(
  doc: jsPDF,
  bold: boolean,
  italic: boolean,
  fontSize: number,
) {
  const style =
    bold && italic
      ? "bolditalic"
      : bold
        ? "bold"
        : italic
          ? "italic"
          : "normal";
  doc.setFont("Courier", style);
  doc.setFontSize(fontSize);
}

/** Add page if needed; return updated y */
function checkPage(doc: jsPDF, y: number): number {
  if (y > PH - MB) {
    doc.addPage();
    return MT;
  }
  return y;
}

/** Render a single visual line with mixed-style segments, return new y */
function renderMixedLine(
  doc: jsPDF,
  segs: Seg[],
  x: number,
  y: number,
  align: "left" | "right",
  rightEdge: number,
  globalFontSize: number,
): number {
  const lineFontSize = Math.max(
    globalFontSize,
    ...segs.map((s) => s.fontSize || 0),
  );
  const lineH = lineFontSize / 72;

  if (align === "right") {
    // right-aligned: render the full plain text right-justified
    const plain = segs.map((s) => s.text).join("");
    setStyle(
      doc,
      segs[0]?.bold ?? false,
      segs[0]?.italic ?? false,
      segs[0]?.fontSize || globalFontSize,
    );
    doc.text(plain, rightEdge, y, { align: "right" });
    return y + lineH;
  }
  let cx = x;
  for (const seg of segs) {
    if (!seg.text) continue;
    setStyle(doc, seg.bold, seg.italic, seg.fontSize || globalFontSize);
    doc.text(seg.text, cx, y);
    if (seg.underline) {
      const w = doc.getTextWidth(seg.text);
      doc.setLineWidth(0.005);
      doc.line(cx, y + 0.02, cx + w, y + 0.02);
    }
    cx += doc.getTextWidth(seg.text);
  }
  return y + lineH;
}

// ─── Text wrapping that respects segment boundaries ───────────────────────
/** Split segments into visual lines respecting max column width */
function wrapSegments(
  doc: jsPDF,
  segs: Seg[],
  maxW: number,
  isUpper: boolean,
  globalFontSize: number,
): Seg[][] {
  const lines: Seg[][] = [];
  let currentLine: Seg[] = [];
  let lineW = 0;

  for (const seg of segs) {
    const text = isUpper ? seg.text.toUpperCase() : seg.text;
    const words = text.split(/(\s+)/); // keep whitespace tokens

    for (const word of words) {
      setStyle(doc, seg.bold, seg.italic, seg.fontSize || globalFontSize);
      const ww = doc.getTextWidth(word);

      if (lineW + ww > maxW && lineW > 0 && word.trim()) {
        lines.push(currentLine);
        currentLine = [];
        lineW = 0;
      }
      if (word) {
        currentLine.push({ ...seg, text: word });
        lineW += ww;
      }
    }
  }
  if (currentLine.length) lines.push(currentLine);
  return lines;
}

// ─── Title page text helper ───────────────────────────────────────────────
function centeredText(
  doc: jsPDF,
  text: string,
  y: number,
  fontSize: number,
): number {
  if (!text.trim()) return y;
  doc.setFontSize(fontSize);
  const lineH = fontSize / 72;
  const lines = doc.splitTextToSize(text.trim(), 6.5) as string[];
  for (const line of lines) {
    doc.text(line, PW / 2, y, { align: "center" });
    y += lineH;
  }
  return y;
}

// ─── Public export function ───────────────────────────────────────────────
export interface TitlePageMeta {
  title: string;
  writtenByPrefix?: string;
  author?: string;
  contact?: string;
  logline?: string;
  synopsis?: string;
}

export function exportToPdf(
  html: string,
  meta: TitlePageMeta,
  globalFontSize: number = 12,
) {
  const doc = new jsPDF({ unit: "in", format: "letter" });
  doc.setFont("Courier", "normal");
  doc.setFontSize(globalFontSize);

  const LINE_H = globalFontSize / 72; // Adjusted line height
  let y = 3.5; // title sits ~3.5" down
  doc.setFont("Courier", "bold");
  y = centeredText(
    doc,
    (meta.title || "UNTITLED").toUpperCase(),
    y,
    globalFontSize,
  );
  doc.setFont("Courier", "normal");
  y += LINE_H * 2;
  y = centeredText(
    doc,
    meta.writtenByPrefix || "written by",
    y,
    globalFontSize,
  );
  y += LINE_H * 2;
  y = centeredText(doc, meta.author || "", y, globalFontSize);

  // Logline
  if (meta.logline?.trim()) {
    y += LINE_H * 4;
    doc.setFont("Courier", "bold");
    y = centeredText(doc, "LOGLINE", y, globalFontSize);
    doc.setFont("Courier", "normal");
    y += LINE_H;
    y = centeredText(doc, meta.logline, y, globalFontSize);
  }

  // Synopsis
  if (meta.synopsis?.trim()) {
    y += LINE_H * 4;
    doc.setFont("Courier", "bold");
    y = centeredText(doc, "SYNOPSIS", y, globalFontSize);
    doc.setFont("Courier", "normal");
    y += LINE_H;
    y = centeredText(doc, meta.synopsis, y, globalFontSize);
  }

  // Contact info — bottom left corner
  if (meta.contact?.trim()) {
    doc.setFont("Courier", "normal");
    const contactLines = meta.contact.split("\n");
    let cy = PH - MB - contactLines.length * LINE_H;
    for (const cl of contactLines) {
      doc.text(cl, ML, cy);
      cy += LINE_H;
    }
  }

  // ── Script Pages ──────────────────────────────────────────────────────
  const pages = parseScriptHTML(html);

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    doc.addPage();
    y = MT;
    let prevType = "";

    const elements = pages[pageIdx];
    for (const el of elements) {
      const layout = LAYOUT[el.type] ?? LAYOUT["action"];
      const isUpper = [
        "scene-heading",
        "character",
        "transition",
        "shot",
      ].includes(el.type);

      const wrappedLines = wrapSegments(
        doc,
        el.segs,
        layout.w,
        isUpper,
        globalFontSize,
      );

      // Spacing before
      const blankBefore = prevType === "" ? 0 : (BLANK_BEFORE[el.type] ?? 1);
      y += blankBefore * (globalFontSize / 72);
      y = checkPage(doc, y);

      // Pre-flight page break within a logical page
      if (y + wrappedLines.length * (globalFontSize / 72) > PH - MB) {
        doc.addPage();
        y = MT;
      }

      for (const lineSegs of wrappedLines) {
        y = renderMixedLine(
          doc,
          lineSegs,
          layout.x,
          y,
          layout.align ?? "left",
          PW - MR,
          globalFontSize,
        );
        y = checkPage(doc, y);
      }

      prevType = el.type;
    }
  }

  const filename = (meta.title || "screenplay")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .trim();
  doc.save(`${filename}.pdf`);
}
