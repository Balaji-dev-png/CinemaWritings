"use client";
import { forwardRef, useCallback } from "react";
import { SuiteElement, Connector } from "@/hooks/useSuiteState";
import { IdeaCard } from "./IdeaCard";
import { ShotCard } from "./ShotCard";
import { ImageCard } from "./ImageCard";
import { LinkCard } from "./LinkCard";
import { ConnectorLayer } from "./ConnectorLayer";
import { DrawingCanvas } from "./DrawingCanvas";
import { useZoom } from "@/hooks/useZoom";

const BOARD_WIDTH = 4000;
const BOARD_HEIGHT = 3000;

interface Props {
  elements: SuiteElement[];
  connectors: Connector[];
  drawMode: boolean;
  connectMode: boolean;
  drawingCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  onMoveElement: (id: string, x: number, y: number) => void;
  onResizeElement: (id: string, w: number, h: number) => void;
  onUpdateData: (id: string, data: Record<string, unknown>) => void;
  onRemoveElement: (id: string) => void;
  onRemoveConnector: (id: string) => void;
  onConnectClick: (id: string) => void;
  connectSource?: string | null;
}

export const Board = forwardRef<HTMLDivElement, Props>(
  function Board(
    {
      elements, connectors, drawMode, connectMode, connectSource, drawingCanvasRef,
      onMoveElement, onResizeElement, onUpdateData, onRemoveElement,
      onRemoveConnector, onConnectClick,
    },
    ref
  ) {
    const containerRef = ref as React.RefObject<HTMLDivElement | null>;
    const { scale, origin, resetZoom } = useZoom({ containerRef });

    const handlePanStart = useCallback((e: React.MouseEvent) => {
      // Only pan on middle click, right click, or left click directly on the board
      if (e.target !== e.currentTarget && (e.target as HTMLElement).closest('.director-suite-card')) {
        return;
      }
      
      const container = typeof ref === 'function' ? null : ref?.current;
      if (!container) return;
      
      const startX = e.clientX;
      const startY = e.clientY;
      const startScrollLeft = container.scrollLeft;
      const startScrollTop = container.scrollTop;

      container.style.cursor = "grabbing";

      const handlePanMove = (me: MouseEvent) => {
        container.scrollLeft = startScrollLeft - (me.clientX - startX);
        container.scrollTop = startScrollTop - (me.clientY - startY);
      };

      const handlePanEnd = () => {
        container.style.cursor = "";
        window.removeEventListener("mousemove", handlePanMove);
        window.removeEventListener("mouseup", handlePanEnd);
      };

      window.addEventListener("mousemove", handlePanMove);
      window.addEventListener("mouseup", handlePanEnd);
    }, [ref]);

    const getZoom = useCallback(() => scale, [scale]);

    return (
      <div
        ref={ref}
        className="flex-1 overflow-hidden relative director-suite-board select-none"
        style={{ minWidth: 0, minHeight: 0 }}
        onMouseDown={handlePanStart}
      >
        <div
          className="relative"
          style={{
            width: BOARD_WIDTH,
            height: BOARD_HEIGHT,
            transform: `scale(${scale})`,
            transformOrigin: `0 0`,
            transition: "transform 0.05s ease-out",
          }}
        >
          <div style={{ width: BOARD_WIDTH, height: BOARD_HEIGHT, position: "relative" }}>
            {/* Connector SVG layer */}
            <ConnectorLayer
              elements={elements}
              connectors={connectors}
              boardWidth={BOARD_WIDTH}
              boardHeight={BOARD_HEIGHT}
              onRemoveConnector={onRemoveConnector}
            />

            {/* Drawing overlay */}
            <DrawingCanvas
              ref={drawingCanvasRef}
              width={BOARD_WIDTH}
              height={BOARD_HEIGHT}
              active={drawMode}
            />

            {/* Render all elements */}
            {elements.map((el) => {
              const boardRefObj = ref as React.RefObject<HTMLDivElement | null>;
              const isConnectSource = connectSource === el.id;
              const commonProps = {
                element: el,
                boardRef: boardRefObj,
                onMove: onMoveElement,
                onResize: onResizeElement,
                onUpdate: onUpdateData,
                onRemove: onRemoveElement,
                onConnectClick,
                connectMode,
                isConnectSource,
                getZoom,
              };

              switch (el.type) {
                case "idea":
                  return <IdeaCard key={el.id} {...commonProps} />;
                case "shot":
                  return <ShotCard key={el.id} {...commonProps} />;
                case "image":
                  return <ImageCard key={el.id} {...commonProps} />;
                case "link":
                  return (
                    <LinkCard
                      key={el.id}
                      element={el}
                      boardRef={boardRefObj}
                      onMove={onMoveElement}
                      onResize={onResizeElement}
                      onUpdate={onUpdateData}
                      onRemove={onRemoveElement}
                      onConnectClick={onConnectClick}
                      connectMode={connectMode}
                      isConnectSource={isConnectSource}
                      getZoom={getZoom}
                    />
                  );
                default:
                  return null;
              }
            })}
          </div>
        </div>

        {/* Zoom Indicator */}
        <div
          className="absolute bottom-5 left-5 px-3 py-1.5 rounded cursor-pointer select-none transition-colors"
          style={{
            backgroundColor: "#1a1a1a",
            color: "#c9a84c",
            fontFamily: "monospace",
            fontSize: "12px",
            border: "1px solid #333",
            zIndex: 50,
          }}
          onDoubleClick={resetZoom}
          title="Double-click to reset zoom"
        >
          {Math.round(scale * 100)}%
        </div>
      </div>
    );
  }
);
