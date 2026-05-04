import jsPDF from "jspdf";

// ─── WGA Standard Screenplay Layout (inches) ──────────────────────────────
const PW = 8.5;
const PH = 11;
const ML = 1.5;
const MR = 1.0;
const MT = 1.0;
const MB = 1.0;
const LINE_H = 1 / 6;          // 6 lines per inch (Courier 12pt)
const WRITING_W = PW - ML - MR; // 6.0"

const LAYOUT: Record<string, { x: number; w: number; align?: "right" }> = {
  "scene-heading": { x: ML, w: WRITING_W },
  action:          { x: ML, w: WRITING_W },
  character:       { x: 3.7, w: 3.8 },
  parenthetical:   { x: 3.0, w: 2.5 },
  dialogue:        { x: 2.5, w: 3.5 },
  transition:      { x: ML, w: WRITING_W, align: "right" },
  shot:            { x: ML, w: WRITING_W },
};

const BLANK_BEFORE: Record<string, number> = {
  "scene-heading": 2,
  action:          1,
  character:       1,
  parenthetical:   0,
  dialogue:        0,
  transition:      1,
  shot:            1,
};

// ─── Inline style segment ──────────────────────────────────────────────────
type Seg = { text: string; bold: boolean; italic: boolean; underline: boolean };

/** Walk a DOM node tree and collect leaf text with inherited font style */
function collectSegments(node: Node, bold: boolean, italic: boolean, underline: boolean, out: Seg[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    const t = node.textContent ?? "";
    if (t) out.push({ text: t, bold, italic, underline });
    return;
  }
  if (node.nodeType !== Node.ELEMENT_NODE) return;
  const tag = (node as Element).tagName.toLowerCase();
  const b = bold   || tag === "strong" || tag === "b";
  const i = italic  || tag === "em"     || tag === "i";
  const u = underline || tag === "u";
  for (const child of Array.from(node.childNodes)) {
    collectSegments(child, b, i, u, out);
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
      if (container.querySelector('[data-type="pageNode"]') && p.closest('[data-type="pageNode"]') !== container) {
        return;
      }
      const type = p.className.split(/\s+/).find((c) => KNOWN.has(c)) ?? "action";
      const plainText = p.textContent?.trim() ?? "";
      if (!plainText) return;
      const segs: Seg[] = [];
      collectSegments(p, false, false, false, segs);
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
        const type = p.className.split(/\s+/).find((c) => KNOWN.has(c)) ?? "action";
        const plainText = p.textContent?.trim() ?? "";
        if (!plainText) return;
        const segs: Seg[] = [];
        collectSegments(p, false, false, false, segs);
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
    collectSegments(p, false, false, false, segs);
    all.push({ type, segs, plainText });
  });
  return [all];
}

// ─── jsPDF helpers ────────────────────────────────────────────────────────
function setStyle(doc: jsPDF, bold: boolean, italic: boolean) {
  const style =
    bold && italic ? "bolditalic"
    : bold   ? "bold"
    : italic ? "italic"
    : "normal";
  doc.setFont("Courier", style);
}

/** Add page if needed; return updated y */
function checkPage(doc: jsPDF, y: number): number {
  if (y > PH - MB) { doc.addPage(); return MT; }
  return y;
}

/** Render a single visual line with mixed-style segments, return new y */
function renderMixedLine(doc: jsPDF, segs: Seg[], x: number, y: number, align: "left" | "right", rightEdge: number): number {
  if (align === "right") {
    // right-aligned: render the full plain text right-justified
    const plain = segs.map((s) => s.text).join("");
    setStyle(doc, segs[0]?.bold ?? false, segs[0]?.italic ?? false);
    doc.text(plain, rightEdge, y, { align: "right" });
    return y + LINE_H;
  }
  let cx = x;
  for (const seg of segs) {
    if (!seg.text) continue;
    setStyle(doc, seg.bold, seg.italic);
    doc.text(seg.text, cx, y);
    if (seg.underline) {
      const w = doc.getTextWidth(seg.text);
      doc.setLineWidth(0.005);
      doc.line(cx, y + 0.02, cx + w, y + 0.02);
    }
    cx += doc.getTextWidth(seg.text);
  }
  return y + LINE_H;
}

// ─── Text wrapping that respects segment boundaries ───────────────────────
/** Split segments into visual lines respecting max column width */
function wrapSegments(doc: jsPDF, segs: Seg[], maxW: number, isUpper: boolean): Seg[][] {
  const lines: Seg[][] = [];
  let currentLine: Seg[] = [];
  let lineW = 0;

  for (const seg of segs) {
    const text = isUpper ? seg.text.toUpperCase() : seg.text;
    const words = text.split(/(\s+)/); // keep whitespace tokens

    for (const word of words) {
      setStyle(doc, seg.bold, seg.italic);
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
function centeredText(doc: jsPDF, text: string, y: number): number {
  if (!text.trim()) return y;
  const lines = doc.splitTextToSize(text.trim(), 6.5) as string[];
  for (const line of lines) {
    doc.text(line, PW / 2, y, { align: "center" });
    y += LINE_H;
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

export function exportToPdf(html: string, meta: TitlePageMeta) {
  const doc = new jsPDF({ unit: "in", format: "letter" });
  doc.setFont("Courier", "normal");
  doc.setFontSize(12);

  // ── Title Page ────────────────────────────────────────────────────────
  let y = 3.5; // title sits ~3.5" down
  doc.setFont("Courier", "bold");
  y = centeredText(doc, (meta.title || "UNTITLED").toUpperCase(), y);
  doc.setFont("Courier", "normal");
  y += LINE_H * 2;
  y = centeredText(doc, meta.writtenByPrefix || "written by", y);
  y += LINE_H * 2;
  y = centeredText(doc, meta.author || "", y);

  // Logline
  if (meta.logline?.trim()) {
    y += LINE_H * 4;
    doc.setFont("Courier", "bold");
    y = centeredText(doc, "LOGLINE", y);
    doc.setFont("Courier", "normal");
    y += LINE_H;
    y = centeredText(doc, meta.logline, y);
  }

  // Synopsis
  if (meta.synopsis?.trim()) {
    y += LINE_H * 4;
    doc.setFont("Courier", "bold");
    y = centeredText(doc, "SYNOPSIS", y);
    doc.setFont("Courier", "normal");
    y += LINE_H;
    y = centeredText(doc, meta.synopsis, y);
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
      const isUpper = ["scene-heading", "character", "transition", "shot"].includes(el.type);

      const wrappedLines = wrapSegments(doc, el.segs, layout.w, isUpper);

      // Spacing before
      const blankBefore = prevType === "" ? 0 : (BLANK_BEFORE[el.type] ?? 1);
      y += blankBefore * LINE_H;
      y = checkPage(doc, y);

      // Pre-flight page break within a logical page
      if (y + wrappedLines.length * LINE_H > PH - MB) {
        doc.addPage();
        y = MT;
      }

      for (const lineSegs of wrappedLines) {
        y = renderMixedLine(doc, lineSegs, layout.x, y, layout.align ?? "left", PW - MR);
        y = checkPage(doc, y);
      }

      prevType = el.type;
    }
  }

  const filename = (meta.title || "screenplay").replace(/[^a-zA-Z0-9 ]/g, "").trim();
  doc.save(`${filename}.pdf`);
}
