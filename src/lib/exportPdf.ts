import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Pure Client-Side WYSIWYG PDF Export
 *
 * Strategy:
 *  1. Patch getComputedStyle to prevent html2canvas crashing on lab()/oklch() colors (Tailwind v4).
 *  2. Clone each page element and strip all [data-no-print] / .no-print nodes BEFORE capture.
 *  3. Inject a B&W stylesheet into each clone — black text on white, except <img> tags.
 *  4. Render each clone off-screen and capture with html2canvas.
 *  5. Compile all canvases into a letter-size jsPDF document.
 */

const BW_STYLE = `
  /* ── Black & White Override ── */
  * {
    color: #000000 !important;
    background-color: #ffffff !important;
    border-color: #cccccc !important;
    box-shadow: none !important;
    text-shadow: none !important;
  }
  /* Preserve images — never B&W */
  img {
    filter: none !important;
    background-color: transparent !important;
  }
  /* Standard screenplay underlines stay */
  .script-title {
    color: #000000 !important;
    text-decoration: underline !important;
    text-transform: uppercase !important;
  }
  /* Page background must be white */
  .script-page, [data-title-page] {
    background-color: #ffffff !important;
    color: #000000 !important;
  }
  /* Remove the dashed hover border from the copyright field */
  .copyright-block {
    border: none !important;
    outline: none !important;
  }
`;

export async function exportToPdf(title: string) {
  // 1. Identify all pages to export
  const titlePageWrapper = document.querySelector(".title-page-editor") as HTMLElement | null;
  const titlePageEl = titlePageWrapper?.querySelector(".script-page") as HTMLElement | null;
  const scriptPages = Array.from(document.querySelectorAll(".script-page")) as HTMLElement[];

  // Remove the title page from the scriptPages list (handled separately)
  const bodyPages = scriptPages.filter((el) => !titlePageWrapper?.contains(el));

  if (!titlePageEl && bodyPages.length === 0) {
    throw new Error("No script content found to export.");
  }

  // ⓪ Patch getComputedStyle to prevent html2canvas crashing on lab()/oklch() (Tailwind v4)
  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function (elt, pseudoElt) {
    const style = originalGetComputedStyle(elt, pseudoElt);
    return new Proxy(style, {
      get(target, prop) {
        const val = (target as any)[prop];
        if (typeof val === "function") return val.bind(target);
        if (typeof val === "string" && (val.includes("lab(") || val.includes("oklch("))) {
          return "rgb(128, 128, 128)";
        }
        return val;
      },
    });
  };

  /**
   * Capture one page element as a B&W canvas.
   *  - Clones the DOM (never mutates the original)
   *  - Strips all [data-no-print] and .no-print children
   *  - Injects a B&W stylesheet into the clone
   *  - Renders off-screen at the exact same pixel dimensions
   */
  async function capturePage(el: HTMLElement): Promise<HTMLCanvasElement> {
    // ① Clone
    const clone = el.cloneNode(true) as HTMLElement;

    // ② Strip all UI-only / no-print elements
    clone.querySelectorAll(
      "[data-no-print], .no-print, .show-logline-btn, .logline-toggle, .page-break-indicator, .page-number-label"
    ).forEach((node) => node.remove());

    // ③ Remove image selection outlines from cloned DOM
    clone.querySelectorAll("[style*='outline']").forEach((el) => {
      (el as HTMLElement).style.outline = "none";
      (el as HTMLElement).style.outlineOffset = "0";
    });

    // ③ Inject B&W stylesheet into the clone
    const styleEl = document.createElement("style");
    styleEl.textContent = BW_STYLE;
    clone.appendChild(styleEl);

    // ④ Mount off-screen at the exact same size
    clone.style.position = "fixed";
    clone.style.top = "-9999px";
    clone.style.left = "-9999px";
    clone.style.margin = "0";
    clone.style.zIndex = "-1";
    clone.style.width = el.offsetWidth + "px";
    clone.style.height = el.offsetHeight + "px";
    clone.style.overflow = "hidden";
    document.body.appendChild(clone);

    // Wait a frame for layout/fonts to settle
    await new Promise((r) => requestAnimationFrame(r));

    const canvas = await html2canvas(clone, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff", // Always white for both title page and body pages
      width: el.offsetWidth,
      height: el.offsetHeight,
    });

    document.body.removeChild(clone);
    return canvas;
  }

  try {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "in",
      format: "letter",
    });

    let pageIndex = 0;

    // ── Title Page ──────────────────────────────────────────────────────────
    if (titlePageEl) {
      const canvas = await capturePage(titlePageEl);
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, 0, 8.5, 11, undefined, "FAST");
      pageIndex++;
    }

    // ── Script Body Pages ───────────────────────────────────────────────────
    for (const pageEl of bodyPages) {
      if (pageIndex > 0) pdf.addPage();
      const canvas = await capturePage(pageEl);
      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      pdf.addImage(imgData, "JPEG", 0, 0, 8.5, 11, undefined, "FAST");
      pageIndex++;
    }

    const fileName = `${title.replace(/[^a-zA-Z0-9 ]/g, "").trim() || "script"}.pdf`;
    pdf.save(fileName);
  } finally {
    window.getComputedStyle = originalGetComputedStyle;
  }
}
