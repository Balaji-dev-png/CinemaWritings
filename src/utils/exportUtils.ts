"use client";

/**
 * exportUtils.ts
 *
 * Milanote-style canvas PDF export utility.
 *
 * How it works:
 *  1. Compute tight bounding box of all canvas elements (canvas-space coords)
 *  2. Temporarily reset the canvas transform to translate(0,0) scale(1)
 *  3. Capture via html2canvas at scale:2 (retina quality)
 *  4. Restore original transform
 *  5. Composite any drawing canvas on top
 *  6. Crop the captured image to the bounding box
 *  7. Build a jsPDF whose page size EXACTLY matches the content — no fixed A4
 */

// ── Types ────────────────────────────────────────────────────────────────────

export interface ElementBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

export const EXPORT_PADDING = 60; // px on each side

// ── Step 1: Bounding Box ─────────────────────────────────────────────────────

export function getContentBoundingBox(elements: ElementBounds[]) {
  if (elements.length === 0) {
    return {
      minX: 0,
      minY: 0,
      maxX: 1200,
      maxY: 800,
      contentWidth: 1200,
      contentHeight: 800,
    };
  }

  const minX = Math.min(...elements.map((el) => el.x));
  const minY = Math.min(...elements.map((el) => el.y));
  const maxX = Math.max(...elements.map((el) => el.x + el.width));
  const maxY = Math.max(...elements.map((el) => el.y + el.height));

  return {
    minX: minX - EXPORT_PADDING,
    minY: minY - EXPORT_PADDING,
    maxX: maxX + EXPORT_PADDING,
    maxY: maxY + EXPORT_PADDING,
    contentWidth: maxX + EXPORT_PADDING - (minX - EXPORT_PADDING),
    contentHeight: maxY + EXPORT_PADDING - (minY - EXPORT_PADDING),
  };
}

// ── Step 2: Capture Only the Content Region ──────────────────────────────────

export async function captureCanvasRegion(
  canvasElement: HTMLElement,
  elements: ElementBounds[],
  bgColor = "#0d0d0d",
  drawingCanvasRef?: React.RefObject<HTMLCanvasElement | null>
): Promise<HTMLCanvasElement> {
  const bounds = getContentBoundingBox(elements);

  // ⓪ Patch getComputedStyle to prevent html2canvas crashing on lab() / oklch() colors (Tailwind v4)
  const originalGetComputedStyle = window.getComputedStyle;
  window.getComputedStyle = function (elt, pseudoElt) {
    const style = originalGetComputedStyle(elt, pseudoElt);
    return new Proxy(style, {
      get(target, prop, receiver) {
        // Use target[prop] instead of Reflect.get(target, prop, receiver) 
        // to avoid "illegal invocation" errors on CSSStyleDeclaration getters.
        const val = (target as any)[prop];
        if (typeof val === "function") {
          return val.bind(target);
        }
        if (typeof val === "string" && (val.includes("lab(") || val.includes("oklch("))) {
          // html2canvas-pro throws "Attempting to parse an unsupported color function" for these.
          // Fallback to a neutral valid color format to prevent crashes.
          return "rgb(128, 128, 128)"; 
        }
        return val;
      },
    });
  };

  // ① Temporarily reset the canvas transform so html2canvas sees 1:1 pixels
  const originalTransform = canvasElement.style.transform;
  const originalTransition = canvasElement.style.transition;
  const originalWidth = canvasElement.style.width;
  const originalHeight = canvasElement.style.height;

  canvasElement.style.transition = "none";
  canvasElement.style.transform = "translate(0px, 0px) scale(1)";
  // Ensure the element is tall/wide enough to contain all content
  const requiredW = bounds.maxX;
  const requiredH = bounds.maxY;
  if (parseFloat(canvasElement.style.width) < requiredW) {
    canvasElement.style.width = `${requiredW + 200}px`;
  }
  if (parseFloat(canvasElement.style.height) < requiredH) {
    canvasElement.style.height = `${requiredH + 200}px`;
  }

  // Wait two animation frames for the browser to repaint at 1:1
  await new Promise((r) => requestAnimationFrame(r));
  await new Promise((r) => requestAnimationFrame(r));

  let fullCapture: HTMLCanvasElement;

  try {
    // ② Capture the full canvas at 2× retina scale
    const html2canvas = (await import("html2canvas")).default;
    fullCapture = await html2canvas(canvasElement, {
      scale: 2,
      useCORS: true,
      allowTaint: false,
      backgroundColor: bgColor,
      logging: false,
      x: 0,
      y: 0,
      width: canvasElement.scrollWidth,
      height: canvasElement.scrollHeight,
      windowWidth: canvasElement.scrollWidth,
      windowHeight: canvasElement.scrollHeight,
    });
  } finally {
    // ③ Always restore original transform, dimensions, and global overrides
    canvasElement.style.transform = originalTransform;
    canvasElement.style.transition = originalTransition;
    canvasElement.style.width = originalWidth;
    canvasElement.style.height = originalHeight;
    window.getComputedStyle = originalGetComputedStyle;
  }

  // ④ Composite drawing canvas on top (html2canvas may miss <canvas> content)
  if (drawingCanvasRef?.current) {
    const dc = drawingCanvasRef.current;
    const ctx = fullCapture.getContext("2d")!;
    ctx.drawImage(
      dc,
      0, 0, dc.width, dc.height,
      0, 0, dc.width * 2, dc.height * 2
    );
  }

  // ⑤ Crop to content bounding box (all coords × 2 because scale:2)
  const SCALE = 2;
  const cropX = Math.max(0, bounds.minX * SCALE);
  const cropY = Math.max(0, bounds.minY * SCALE);
  const cropW = bounds.contentWidth * SCALE;
  const cropH = bounds.contentHeight * SCALE;

  const croppedCanvas = document.createElement("canvas");
  croppedCanvas.width = Math.max(cropW, 1);
  croppedCanvas.height = Math.max(cropH, 1);

  const croppedCtx = croppedCanvas.getContext("2d")!;
  croppedCtx.fillStyle = bgColor;
  croppedCtx.fillRect(0, 0, croppedCanvas.width, croppedCanvas.height);
  croppedCtx.drawImage(
    fullCapture,
    cropX, cropY,   // source origin
    cropW, cropH,   // source size
    0, 0,           // dest origin
    cropW, cropH    // dest size
  );

  return croppedCanvas;
}

// ── Step 3: Build Content-Fitted PDF (Milanote style) ────────────────────────

export async function exportWorkspaceToPDF(
  canvasElement: HTMLElement,
  elements: ElementBounds[],
  options: {
    title: string;
    filename: string;
    bgColor?: string;
    drawingCanvasRef?: React.RefObject<HTMLCanvasElement | null>;
    onProgress?: (msg: string) => void;
  }
) {
  const { title, filename, bgColor = "#0d0d0d", drawingCanvasRef, onProgress } = options;

  onProgress?.("Calculating content area...");
  const bounds = getContentBoundingBox(elements);

  onProgress?.("Capturing workspace...");
  const croppedCanvas = await captureCanvasRegion(
    canvasElement,
    elements,
    bgColor,
    drawingCanvasRef
  );

  onProgress?.("Building PDF...");
  const imgData = croppedCanvas.toDataURL("image/png", 1.0);

  // croppedCanvas is at 2× so divide by 2 to get real pixel dimensions
  const realWidth = croppedCanvas.width / 2;
  const realHeight = croppedCanvas.height / 2;

  // PDF page size = EXACT content size — this is the Milanote approach
  const orientation: "landscape" | "portrait" =
    realWidth > realHeight ? "landscape" : "portrait";

  const { default: jsPDF } = await import("jspdf");

  const pdf = new jsPDF({
    orientation,
    unit: "px",
    format: [realWidth, realHeight],
    compress: true,
  });

  // ── Title page (dark, cinematic) ──────────────────────────────────────────
  pdf.setFillColor(13, 13, 13); // #0d0d0d
  pdf.rect(0, 0, realWidth, realHeight, "F");

  pdf.setTextColor(201, 168, 76); // #c9a84c gold
  pdf.setFontSize(Math.min(realWidth / 20, 48));
  pdf.setFont("helvetica", "bold");
  pdf.text(title, realWidth / 2, realHeight / 2 - 20, { align: "center" });

  pdf.setTextColor(180, 180, 180);
  pdf.setFontSize(14);
  pdf.setFont("helvetica", "normal");
  pdf.text(
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    realWidth / 2,
    realHeight / 2 + 10,
    { align: "center" }
  );

  // ── Content page ─────────────────────────────────────────────────────────
  const A4_HEIGHT_PX = 1122; // A4 at 96 dpi

  if (realHeight <= A4_HEIGHT_PX * 1.5) {
    // Single content page — same size as title page
    pdf.addPage([realWidth, realHeight], orientation);
    pdf.addImage(imgData, "PNG", 0, 0, realWidth, realHeight);
  } else {
    // Very tall content: split into A4-height chunks
    onProgress?.("Splitting into pages...");
    const pageHeight = A4_HEIGHT_PX;
    const totalPages = Math.ceil(realHeight / pageHeight);
    const pageOrientation: "landscape" | "portrait" =
      realWidth > pageHeight ? "landscape" : "portrait";

    for (let i = 0; i < totalPages; i++) {
      pdf.addPage([realWidth, pageHeight], pageOrientation);
      // Shift image up by i * pageHeight for each successive chunk
      pdf.addImage(imgData, "PNG", 0, -(i * pageHeight), realWidth, realHeight);

      // Page number
      pdf.setTextColor(100, 100, 100);
      pdf.setFontSize(10);
      pdf.text(`${i + 1} / ${totalPages}`, realWidth - 40, pageHeight - 10);
    }
  }

  onProgress?.("Downloading...");
  pdf.save(`${filename}.pdf`);
}
