"use client";
import { SuiteElement, Connector } from "@/hooks/useSuiteState";

interface Props {
  elements: SuiteElement[];
  connectors: Connector[];
  onRemoveConnector: (id: string) => void;
}

function getCenter(el: SuiteElement): { x: number; y: number } {
  return {
    x: el.x + el.width / 2,
    y: el.y + el.height / 2,
  };
}

export function ConnectorLayer({
  elements, connectors, onRemoveConnector,
}: Props) {
  const toViewport = (canvasX: number, canvasY: number) => ({
    x: canvasX,
    y: canvasY,
  });

  return (
    <svg
      className="absolute top-0 left-0"
      style={{
        width: "100%",
        height: "100%",
        zIndex: 5,
        pointerEvents: "none",
      }}
    >
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#c9a84c" />
        </marker>
      </defs>

      {connectors.map((conn) => {
        const fromEl = elements.find((e) => e.id === conn.fromId);
        const toEl = elements.find((e) => e.id === conn.toId);
        if (!fromEl || !toEl) return null;

        const fromCanvas = getCenter(fromEl);
        const toCanvas = getCenter(toEl);

        const from = toViewport(fromCanvas.x, fromCanvas.y);
        const to = toViewport(toCanvas.x, toCanvas.y);

        // Cubic bezier — use the larger of dx/dy for control point offset
        // so curves look natural both horizontally and vertically
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const offset = Math.min(dist * 0.4, 200);

        const cx1 = from.x + offset * Math.sign(dx || 1);
        const cy1 = from.y;
        const cx2 = to.x - offset * Math.sign(dx || 1);
        const cy2 = to.y;

        // Midpoint for delete button
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;

        return (
          <g key={conn.id}>
            <path
              d={`M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`}
              stroke="#c9a84c"
              strokeWidth={2}
              fill="none"
              markerEnd="url(#arrowhead)"
            />
            {/* Delete button at midpoint */}
            <g
              style={{ pointerEvents: "auto", cursor: "pointer" }}
              onClick={() => onRemoveConnector(conn.id)}
            >
              <circle cx={midX} cy={midY} r={8} fill="#1a1a1a" stroke="#c9a84c" strokeWidth={1} />
              <text
                x={midX}
                y={midY + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#c9a84c"
                fontSize={10}
                fontWeight="bold"
              >
                ✕
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}
