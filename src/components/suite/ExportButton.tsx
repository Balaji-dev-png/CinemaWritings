"use client";
import { useState, useCallback, useRef } from "react";
import { SuiteElement } from "@/hooks/useSuiteState";

interface Props {
  boardRef: React.RefObject<HTMLDivElement | null>;
  drawingCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  elements: SuiteElement[];
  scriptTitle: string;
  scriptId: string;
}

export function ExportButton({
  boardRef, drawingCanvasRef, elements, scriptTitle, scriptId,
}: Props) {
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const handleExport = useCallback(async () => {
    const board = boardRef.current;
    if (!board) return;
    setExporting(true);
    setExportError("");

    // We no longer use scrollLeft/scrollTop in the new architecture
    let innerDiv: HTMLDivElement | null = board.querySelector(".director-suite-canvas");
    let originalTransform = "";
    let originalWidth = "";
    let originalHeight = "";

    try {
      // Temporarily remove scale transform from the inner board so capture is 1:1
      if (innerDiv) {
        originalTransform = innerDiv.style.transform;
        originalWidth = innerDiv.style.width;
        originalHeight = innerDiv.style.height;
        innerDiv.style.transform = "none";
        innerDiv.style.width = "10000px";
        innerDiv.style.height = "10000px";
      }

      // Dynamic import dom-to-image-more
      const domToImage = (await import("dom-to-image-more")).default;

      let boardDataUrl;
      try {
        boardDataUrl = await domToImage.toPng(innerDiv || board, {
          bgcolor: "#0d0d0d",
          width: 10000,
          height: 10000,
          style: {
            transform: "scale(2)",
            transformOrigin: "top left"
          }
        });
      } catch (err) {
        throw new Error(`domToImage failed: ${err}`);
      }

      const boardCanvas = document.createElement("img");
      await new Promise((resolve) => {
        boardCanvas.onload = resolve;
        boardCanvas.src = boardDataUrl;
      });

      // Composite drawing canvas on top
      const compositeCanvas = document.createElement("canvas");
      compositeCanvas.width = boardCanvas.width;
      compositeCanvas.height = boardCanvas.height;
      const ctx = compositeCanvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context failed");

      ctx.drawImage(boardCanvas, 0, 0);

      if (drawingCanvasRef.current) {
        ctx.drawImage(
          drawingCanvasRef.current,
          0, 0,
          drawingCanvasRef.current.width,
          drawingCanvasRef.current.height,
          -3000, -3000,
          compositeCanvas.width,
          compositeCanvas.height
        );
      }

      // Compute bounding box of all elements + 60px padding
      const scale = 2; // matches html2canvas scale
      let minX = 0, minY = 0, maxX = 1920 * scale, maxY = 1080 * scale;

      if (elements.length > 0) {
        const pad = 60 * scale;
        minX = Infinity; minY = Infinity; maxX = 0; maxY = 0;
        for (const el of elements) {
          minX = Math.min(minX, el.x * scale);
          minY = Math.min(minY, el.y * scale);
          maxX = Math.max(maxX, (el.x + el.width) * scale);
          maxY = Math.max(maxY, (el.y + el.height) * scale);
        }
        minX = Math.max(0, minX - pad);
        minY = Math.max(0, minY - pad);
        maxX = Math.min(compositeCanvas.width, maxX + pad);
        maxY = Math.min(compositeCanvas.height, maxY + pad);
      }

      const cropW = maxX - minX;
      const cropH = maxY - minY;
      const croppedCanvas = document.createElement("canvas");
      croppedCanvas.width = cropW;
      croppedCanvas.height = cropH;
      const cropCtx = croppedCanvas.getContext("2d");
      
      if (cropCtx) {
        cropCtx.drawImage(compositeCanvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
        const base64 = croppedCanvas.toDataURL("image/png");

        // Try server-side export
        try {
          const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://127.0.0.1:8000/api";
          const res = await fetch(`${API_BASE}/export/workspace-pdf/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              image_base64: base64,
              title: scriptTitle,
              script_id: scriptId,
            }),
          });
          if (res.ok) {
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${(scriptTitle || "workspace").replace(/ /g, "_")}_workspace.pdf`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            return;
          }
        } catch {
          // Server unavailable — fall through to jsPDF
        }

        // Fallback: client-side jsPDF
        const { default: jsPDF } = await import("jspdf");
        const imgW = cropW;
        const imgH = cropH;
        const pdfW = 842; // A4 landscape width in pts
        const pdfH = 595;
        const ratio = Math.min(pdfW / imgW, pdfH / imgH);
        const pdf = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });

        // Title page
        pdf.setFillColor(13, 13, 13);
        pdf.rect(0, 0, pdfW, pdfH, "F");
        pdf.setTextColor(201, 168, 76);
        pdf.setFontSize(28);
        pdf.text(scriptTitle || "Director's Suite", pdfW / 2, pdfH / 2 - 20, { align: "center" });
        pdf.setTextColor(150, 150, 150);
        pdf.setFontSize(12);
        pdf.text(new Date().toLocaleDateString(), pdfW / 2, pdfH / 2 + 20, { align: "center" });

        pdf.addPage();
        pdf.setFillColor(13, 13, 13);
        pdf.rect(0, 0, pdfW, pdfH, "F");
        const scaledW = imgW * ratio;
        const scaledH = imgH * ratio;
        pdf.addImage(base64, "PNG", (pdfW - scaledW) / 2, (pdfH - scaledH) / 2, scaledW, scaledH);

        pdf.save(`${(scriptTitle || "workspace").replace(/ /g, "_")}_workspace.pdf`);
      }
    } catch (err) {
      console.error("Export error:", err);
      setExportError("Export failed. Please try again.");
    } finally {
      if (innerDiv) {
        innerDiv.style.transform = originalTransform;
        innerDiv.style.width = originalWidth;
        innerDiv.style.height = originalHeight;
      }
      setExporting(false);
    }
  }, [boardRef, drawingCanvasRef, elements, scriptTitle, scriptId]);

  return (
    <>
      <button
        onClick={handleExport}
        disabled={exporting}
        className="px-4 py-1.5 text-xs font-bold rounded transition-colors"
        style={{
          backgroundColor: exporting ? "#333" : "#c9a84c",
          color: "#0d0d0d",
          cursor: exporting ? "wait" : "pointer",
        }}
      >
        {exporting ? "Exporting..." : "📤 Export PDF"}
      </button>

      {exportError && (
        <div
          className="text-xs font-medium rounded px-3 py-1.5 max-w-[200px] text-center"
          style={{ backgroundColor: "#3b0000", color: "#ff6b6b", border: "1px solid #5a0000" }}
        >
          {exportError}
          <button
            onClick={() => setExportError("")}
            className="ml-2 underline opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Full-screen loading overlay */}
      {exporting && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}>
          <div className="text-center">
            <div className="text-4xl mb-4 animate-pulse">🎬</div>
            <div className="text-lg font-bold gold-accent">Preparing your workspace PDF...</div>
            <div className="text-xs text-zinc-500 mt-2">This may take a moment</div>
          </div>
        </div>
      )}
    </>
  );
}
