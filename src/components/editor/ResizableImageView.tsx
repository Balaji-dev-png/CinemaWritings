"use client";
import { NodeViewWrapper } from "@tiptap/react";
import { useState, useRef, useCallback } from "react";
import { AlignLeft, AlignCenter, AlignRight } from "lucide-react";

export default function ResizableImageView({ node, updateAttributes, selected }: any) {
  const { src, alt, width, height, align } = node.attrs;
  const [isResizing, setIsResizing] = useState(false);
  const startX = useRef(0);
  const startWidth = useRef(0);
  const startHeight = useRef(0);
  const imgRef = useRef<HTMLImageElement>(null);

  const numWidth = parseInt(width) || 400;
  const numHeight = height === "auto" ? "auto" : parseInt(height);

  /* ── Resize from bottom-right corner handle ── */
  const onResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsResizing(true);
      startX.current = e.clientX;
      startWidth.current = imgRef.current?.offsetWidth || numWidth;
      startHeight.current = imgRef.current?.offsetHeight || 0;

      const onMove = (ev: PointerEvent) => {
        const deltaX = ev.clientX - startX.current;
        const newWidth = Math.max(80, Math.min(800, startWidth.current + deltaX));
        const ratio =
          startWidth.current > 0 ? startHeight.current / startWidth.current : 0;
        const newHeight =
          ratio > 0 ? Math.round(newWidth * ratio) : "auto";
        updateAttributes({
          width: String(Math.round(newWidth)),
          height: newHeight === "auto" ? "auto" : String(newHeight),
        });
      };

      const onUp = () => {
        setIsResizing(false);
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [numWidth, updateAttributes]
  );

  const justifyMap: Record<string, string> = {
    left: "flex-start",
    center: "center",
    right: "flex-end",
  };

  return (
    <NodeViewWrapper
      data-drag-handle
      style={{
        display: "flex",
        justifyContent: justifyMap[align] || "flex-start",
        position: "relative",
        margin: "12px 0",
        userSelect: "none",
        cursor: isResizing ? "se-resize" : "default",
      }}
    >
      <div
        style={{
          position: "relative",
          display: "inline-block",
          outline: selected ? "2px solid #c9a84c" : "2px solid transparent",
          outlineOffset: "2px",
          borderRadius: 4,
          transition: "outline 0.1s",
          cursor: "move",
        }}
      >
        {/* ── Image ── */}
        <img
          ref={imgRef}
          src={src}
          alt={alt || ""}
          draggable={false}
          style={{
            width: numWidth,
            height: numHeight === "auto" ? "auto" : numHeight,
            display: "block",
            maxWidth: "100%",
            borderRadius: 2,
          }}
        />

        {/* ── Resize handle — bottom right ── */}
        {selected && (
          <div
            onPointerDown={onResizePointerDown}
            title="Drag to resize"
            style={{
              position: "absolute",
              bottom: -7,
              right: -7,
              width: 14,
              height: 14,
              background: "#c9a84c",
              border: "2px solid #0d0d0d",
              borderRadius: 3,
              cursor: "se-resize",
              zIndex: 20,
            }}
          />
        )}

        {/* ── Floating controls (alignment + width) — shown when selected ── */}
        {selected && (
          <div
            style={{
              position: "absolute",
              top: -42,
              left: "50%",
              transform: "translateX(-50%)",
              background: "#1c1c2a",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "4px 8px",
              zIndex: 30,
              boxShadow: "0 4px 16px rgba(0,0,0,0.5)",
              whiteSpace: "nowrap",
            }}
          >
            {/* Alignment buttons */}
            {(["left", "center", "right"] as const).map((a) => (
              <button
                key={a}
                title={`Align ${a}`}
                onPointerDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  updateAttributes({ align: a });
                }}
                style={{
                  background: align === a ? "#c9a84c" : "transparent",
                  color: align === a ? "#0d0d0d" : "#888",
                  border: "none",
                  borderRadius: 4,
                  padding: "3px 6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "background 0.15s",
                }}
              >
                {a === "left" && <AlignLeft size={12} />}
                {a === "center" && <AlignCenter size={12} />}
                {a === "right" && <AlignRight size={12} />}
              </button>
            ))}

            {/* Divider */}
            <div
              style={{
                width: 1,
                height: 16,
                background: "rgba(255,255,255,0.1)",
                margin: "0 2px",
              }}
            />

            {/* Width input */}
            <input
              type="number"
              value={numWidth}
              min={80}
              max={800}
              onPointerDown={(e) => e.stopPropagation()}
              onChange={(e) =>
                updateAttributes({ width: String(Math.max(80, Math.min(800, parseInt(e.target.value) || 80))) })
              }
              style={{
                width: 52,
                background: "rgba(255,255,255,0.06)",
                color: "#e2e8f0",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 4,
                padding: "2px 6px",
                fontSize: 11,
                fontFamily: "monospace",
                textAlign: "center",
                outline: "none",
              }}
            />
            <span style={{ color: "#555", fontSize: 11 }}>px</span>
          </div>
        )}
      </div>
    </NodeViewWrapper>
  );
}
