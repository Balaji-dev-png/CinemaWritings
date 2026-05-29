/**
 * importScript.ts
 *
 * Universal screenplay import engine — fully client-side, no backend needed.
 *
 * Supported formats:
 *  .fountain   — Fountain markup
 *  .txt        — Plain text screenplay (heuristic parsing)
 *  .docx       — Microsoft Word (via mammoth)
 *  .pdf        — PDF files (via pdfjs-dist text extraction)
 *  .fdx        — Final Draft XML
 *  .celtx      — Celtx (XML screenplay format)
 *  .highland   — Highland 2 (Fountain-based Markdown)
 *  .fadein     — Fade In Pro (XML inside ZIP — falls back to text)
 */

// ── Shared: Fountain/plain-text → TipTap HTML ──────────────────────────────

/**
 * Converts a Fountain / plain-text screenplay string into TipTap HTML.
 * Handles: scene headings, action, character, dialogue, parenthetical,
 * transitions, title-block lines, dual dialogue.
 */
export function fountainToHtml(text: string): string {
  // Normalise line endings
  const raw = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = raw.split("\n");
  const html: string[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // ── Blank line ──
    if (!trimmed) {
      i++;
      continue;
    }

    // ── Scene heading (INT. / EXT. / INT./EXT. / I/E. / forced with .) ──
    if (
      /^(?:[A-Z0-9]+\.?\s*)?\b(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)\s/i.test(trimmed) ||
      (trimmed.startsWith(".") && !trimmed.startsWith(".."))
    ) {
      const text = trimmed.startsWith(".") ? trimmed.slice(1) : trimmed;
      html.push(`<p class="scene-heading">${esc(text.toUpperCase())}</p>`);
      i++;
      continue;
    }

    // ── Transition (> text or UPPERCASE ending with :) ──
    if (
      trimmed.startsWith(">") ||
      (/^[A-Z\s:]+:$/.test(trimmed) && trimmed.length < 30)
    ) {
      html.push(`<p class="transition">${esc(trimmed.replace(/^>\s*/, ""))}</p>`);
      i++;
      continue;
    }

    // ── Parenthetical ──
    if (trimmed.startsWith("(") && trimmed.endsWith(")")) {
      html.push(`<p class="parenthetical">${esc(trimmed)}</p>`);
      i++;
      continue;
    }

    // ── Character + dialogue block ──
    // Character = all-caps, short, not a scene heading
    if (
      trimmed === trimmed.toUpperCase() &&
      trimmed.length < 50 &&
      /^[A-Z0-9]/.test(trimmed) &&
      !/^(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)/i.test(trimmed) &&
      // Next non-blank line must be dialogue / parenthetical
      hasDialogueBelow(lines, i + 1)
    ) {
      // Strip Fountain ^ dual-dialogue marker
      const charName = trimmed.replace(/\s*\^$/, "");
      html.push(`<p class="character">${esc(charName)}</p>`);
      i++;

      while (i < lines.length) {
        const dl = lines[i].trim();
        if (!dl) break;
        if (dl.startsWith("(") && dl.endsWith(")")) {
          html.push(`<p class="parenthetical">${esc(dl)}</p>`);
        } else {
          html.push(`<p class="dialogue">${esc(dl)}</p>`);
        }
        i++;
      }
      continue;
    }

    // ── Action / description ──
    // Strip Fountain forced-action ! prefix
    const actionText = trimmed.startsWith("!") ? trimmed.slice(1) : trimmed;
    html.push(`<p class="action">${esc(actionText)}</p>`);
    i++;
  }

  return chunkToPages(html);
}

function chunkToPages(htmlBlocks: string[]): string {
  if (htmlBlocks.length === 0) {
    return `<div data-type="pageNode"><p class="action"></p></div>`;
  }
  
  const pages: string[] = [];
  let currentPageHtml: string[] = [];
  let currentHeight = 0;
  const MAX_HEIGHT = 820; // 864px is absolute max. 820px leaves a safety buffer to prevent ALL ResizeObserver thrashing.

  for (const html of htmlBlocks) {
    const match = html.match(/class="([^"]+)"(?:[^>]*)>([^<]*)<\/p>/);
    let type = "action";
    let text = "";
    if (match) {
      type = match[1];
      text = match[2];
    }
    
    const lineH = 23; 
    let lines = 1;
    let margins = 0;
    
    if (type === "scene-heading") {
      lines = Math.ceil(text.length / 60) || 1;
      margins = 23; 
    } else if (type === "action") {
      lines = Math.ceil(text.length / 65) || 1;
      margins = 13; 
    } else if (type === "character") {
      lines = 1;
      margins = 13; 
    } else if (type === "dialogue") {
      lines = Math.ceil(text.length / 40) || 1;
      margins = 10; 
    } else if (type === "parenthetical") {
      lines = Math.ceil(text.length / 25) || 1;
      margins = 0;
    } else if (type === "transition") {
      lines = 1;
      margins = 26; 
    } else if (type === "shot") {
      lines = Math.ceil(text.length / 60) || 1;
      margins = 13; 
    }
    
    const blockHeight = (lines * lineH) + margins;
    
    if (currentHeight + blockHeight > MAX_HEIGHT && currentPageHtml.length > 0) {
      pages.push(`<div data-type="pageNode">${currentPageHtml.join("")}</div>`);
      currentPageHtml = [];
      currentHeight = 0;
    }
    
    currentPageHtml.push(html);
    currentHeight += blockHeight;
  }
  
  if (currentPageHtml.length > 0) {
    pages.push(`<div data-type="pageNode">${currentPageHtml.join("")}</div>`);
  }
  
  return pages.join("");
}

function hasDialogueBelow(lines: string[], start: number): boolean {
  for (let k = start; k < Math.min(start + 4, lines.length); k++) {
    const t = lines[k].trim();
    if (!t) break;
    if (t.startsWith("(") || /[a-zA-Z]/.test(t)) return true;
  }
  return false;
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ── PDF Import (pdfjs-dist) ─────────────────────────────────────────────────

export async function importFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");

  // Use the worker file served from /public — avoids CDN version mismatches and network failures
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const pdf = await pdfjsLib.getDocument({ 
    data: arrayBuffer,
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/standard_fonts/`,
  }).promise;

  let minX = 9999;

  // First pass: find the left margin (minimum X coordinate) across the first 3 pages
  for (let p = 1; p <= Math.min(3, pdf.numPages); p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    for (const item of content.items as any[]) {
      const text = item.str.trim();
      if (!text) continue;
      // Exclude obvious page numbers at the top/bottom from margin calculation
      if (/^\d+\.?$/.test(text)) continue;
      const x = item.transform[4];
      if (x > 30 && x < minX) minX = x;
    }
  }
  // Fallback to standard 1.5 inch margin if detection fails
  if (minX > 200 || minX === 9999) minX = 108;

  // Extract all pages concurrently for massive performance boost
  const pagePromises = Array.from({ length: pdf.numPages }, async (_, i) => {
    const p = i + 1;
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();

    // Group items by Y coordinate
    const buckets = new Map<number, any[]>();
    for (const item of content.items as any[]) {
      if (!item.str.trim()) continue;
      const y = Math.round(item.transform[5] / 4) * 4; 
      if (!buckets.has(y)) buckets.set(y, []);
      buckets.get(y)!.push(item);
    }

    const sorted = [...buckets.entries()].sort((a, b) => b[0] - a[0]);
    const pageHtml: string[] = [];

    for (const [y, items] of sorted) {
      items.sort((a, b) => a.transform[4] - b.transform[4]);
      
      // Filter out isolated page numbers that are far to the right
      const validItems = items.filter(i => {
        const trimmedStr = i.str.trim();
        if (!trimmedStr) return false;
        if (/^\d+\.?$/.test(trimmedStr) && i.transform[4] > minX + 400) {
          return false;
        }
        return true;
      });

      if (validItems.length === 0) continue;

      let lineStr = validItems.map(i => i.str).join(" ").replace(/\s+/g, " ").trim();
      if (!lineStr) continue;

      const x = validItems[0].transform[4];
      const diff = x - minX;

      let type = "action";
      
      // 1. Unambiguous Text Heuristics (Overrides physical placement)
      if (/^(?:[A-Z0-9]+\.?\s*)?\b(INT\.|EXT\.|INT\.\/EXT\.|I\/E\.)/i.test(lineStr)) {
        type = "scene-heading";
      } else if (/(FADE IN|FADE OUT|CUT TO|DISSOLVE TO|SMASH CUT TO|MATCH CUT TO|WIPE TO|FADE TO):?$/i.test(lineStr) || lineStr.startsWith(">")) {
        type = "transition";
      } 
      // 2. Spatial Mapping (Physical placement determines formatting)
      else if (diff > 250) {
        type = "transition"; // far right
      } else if (diff > 120) {
        // Character margin (~158 pt). Must be short and uppercase (or numbers/#)
        if (lineStr.length < 50 && lineStr === lineStr.toUpperCase()) {
          type = "character";
        } else if (lineStr.startsWith("(")) {
          type = "parenthetical";
        } else {
          // Centered Action
          type = "action";
        }
      } else if (diff > 80) {
        // Parenthetical margin (~115 pt)
        if (lineStr.startsWith("(")) {
          type = "parenthetical";
        } else if (lineStr.length < 50 && lineStr === lineStr.toUpperCase()) {
          type = "character";
        } else {
          type = lineStr.length > 55 ? "action" : "dialogue";
        }
      } else if (diff > 30) {
        // Dialogue margin (~72 pt)
        type = lineStr.length > 55 ? "action" : "dialogue";
      } else {
        // At margin.
        if (/^[A-Z0-9\s\-\.\'\#]{2,}$/.test(lineStr) && lineStr === lineStr.toUpperCase() && !lineStr.includes("  ")) {
           if (/(SHOT|ANGLE|POV|P\.O\.V\.|CLOSE UP|CU|FADE|CUT)/i.test(lineStr)) {
             type = "shot";
           }
        }
      }

      pageHtml.push(`<p class="${type}">${esc(lineStr)}</p>`);
    }

    if (pageHtml.length > 0) {
      return pageHtml.join("");
    }
    return null;
  });

  const resolvedPages = await Promise.all(pagePromises);
  const blocksRaw = resolvedPages.filter(Boolean).join("");
  const pTags = blocksRaw.match(/<p class="[^"]+">.*?<\/p>/g) || [];

  if (pTags.length === 0) {
    throw new Error("SCANNED_PDF");
  }

  return chunkToPages(pTags);
}

// ── Final Draft FDX (XML) ──────────────────────────────────────────────────

export function importFromFdx(xmlText: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");

  if (doc.querySelector("parsererror")) {
    throw new Error("CORRUPTED_XML");
  }

  const paragraphs = doc.querySelectorAll("Paragraph");
  const html: string[] = [];

  paragraphs.forEach((para) => {
    const type = para.getAttribute("Type") || "Action";
    const text = para.textContent?.trim() || "";
    if (!text) return;

    switch (type) {
      case "Scene Heading":
        html.push(`<p class="scene-heading">${esc(text)}</p>`);
        break;
      case "Action":
      case "General":
        html.push(`<p class="action">${esc(text)}</p>`);
        break;
      case "Character":
        html.push(`<p class="character">${esc(text)}</p>`);
        break;
      case "Dialogue":
        html.push(`<p class="dialogue">${esc(text)}</p>`);
        break;
      case "Parenthetical":
        html.push(`<p class="parenthetical">${esc(text)}</p>`);
        break;
      case "Transition":
        html.push(`<p class="transition">${esc(text)}</p>`);
        break;
      default:
        html.push(`<p class="action">${esc(text)}</p>`);
    }
  });

  return chunkToPages(html);
}

// ── Celtx Script (XML) ────────────────────────────────────────────────────

export function importFromCeltx(xmlText: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, "application/xml");

  if (doc.querySelector("parsererror")) {
    throw new Error("CORRUPTED_XML");
  }

  // Celtx stores screenplay elements as <para> with a "class" or "style" attribute
  const paras = doc.querySelectorAll("para, p, element");
  const html: string[] = [];

  paras.forEach((para) => {
    const cls =
      para.getAttribute("class") ||
      para.getAttribute("style") ||
      para.getAttribute("type") ||
      "action";
    const text = para.textContent?.trim() || "";
    if (!text) return;

    const normalized = cls.toLowerCase().replace(/[-_\s]/g, "");

    if (normalized.includes("scene") || normalized.includes("slug"))
      html.push(`<p class="scene-heading">${esc(text)}</p>`);
    else if (normalized.includes("character"))
      html.push(`<p class="character">${esc(text)}</p>`);
    else if (normalized.includes("dialog") || normalized.includes("dialogue"))
      html.push(`<p class="dialogue">${esc(text)}</p>`);
    else if (normalized.includes("parent"))
      html.push(`<p class="parenthetical">${esc(text)}</p>`);
    else if (normalized.includes("transition"))
      html.push(`<p class="transition">${esc(text)}</p>`);
    else
      html.push(`<p class="action">${esc(text)}</p>`);
  });

  // If we got nothing from XML parsing, fall back to fountain heuristics
  if (html.length === 0) {
    return fountainToHtml(doc.documentElement.textContent || xmlText);
  }

  return chunkToPages(html);
}

// ── Master import dispatcher ───────────────────────────────────────────────

/**
 * Takes a File object and returns TipTap-compatible HTML.
 * Dispatches to the right parser based on file extension.
 */
export async function importScriptFile(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  // ── PDF ──
  if (name.endsWith(".pdf")) {
    const buf = await file.arrayBuffer();
    return importFromPdf(buf);
  }

  // ── Final Draft ──
  if (name.endsWith(".fdx")) {
    const text = await file.text();
    return importFromFdx(text);
  }

  // ── Celtx ──
  if (name.endsWith(".celtx")) {
    const text = await file.text();
    return importFromCeltx(text);
  }

  // ── Word document ──
  if (name.endsWith(".docx")) {
    const mammoth = (await import("mammoth")).default;
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    return fountainToHtml(result.value);
  }

  // ── Fountain / Highland / plain text — all treated as fountain ──
  // (.fountain, .highland, .txt, .md, .fadein plain text, anything else)
  const text = await file.text();
  return fountainToHtml(text);
}
