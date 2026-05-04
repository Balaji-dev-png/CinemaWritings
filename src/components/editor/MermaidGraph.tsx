"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { MermaidElement, ViewportState } from "@/lib/canvasTypes";
import { Trash2, ArrowUpToLine, ArrowDownToLine, Play, Code2, Edit2, X, RefreshCw } from "lucide-react";
import { useTheme } from "next-themes";

interface Props {
  element: MermaidElement;
  viewport: ViewportState;
  isSelected: boolean;
  onUpdate: (id: string, updates: Partial<MermaidElement>) => void;
  onSelect: (id: string, additive: boolean) => void;
  onRemove: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
}

export function MermaidGraph({ element, viewport, isSelected, onUpdate, onSelect, onRemove, onBringToFront, onSendToBack }: Props) {
  const [isEditing, setIsEditing] = useState(!element.renderedSvg);
  const [code, setCode] = useState(element.code || "graph TD\n  A[Start] --> B[Middle]\n  B --> C[End]");
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(false);
  const svgRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ dragging: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  const { theme, systemTheme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && systemTheme === "dark");

  const sw = element.width || 300;
  const sh = element.height || 200;

  const renderMermaid = useCallback(async () => {
    setRendering(true);
    setError("");
    try {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({ 
        startOnLoad: false, 
        theme: isDark ? "dark" : "default",
        themeVariables: isDark ? { primaryColor: "#3b82f6", primaryTextColor: "#e2e8f0", primaryBorderColor: "#4b5563", lineColor: "#6b7280", secondaryColor: "#1e293b", tertiaryColor: "#0f172a" } : {} 
      });
      const uniqueId = `mermaid-${element.id.replace(/-/g, "").slice(0, 8)}`;
      const { svg } = await mermaid.render(uniqueId, code);
      onUpdate(element.id, { code, renderedSvg: svg });
      setIsEditing(false);
    } catch (e: any) {
      setError(e.message || "Render failed");
    } finally {
      setRendering(false);
    }
  }, [code, element.id, onUpdate, isDark]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEditing) return;
    onSelect(element.id, e.shiftKey);
    dragRef.current = { dragging: true, startX: e.clientX, startY: e.clientY, origX: element.x, origY: element.y };
    const handleMove = (me: MouseEvent) => {
      if (!dragRef.current.dragging) return;
      onUpdate(element.id, { x: dragRef.current.origX + (me.clientX - dragRef.current.startX) / viewport.zoom, y: dragRef.current.origY + (me.clientY - dragRef.current.startY) / viewport.zoom });
    };
    const handleUp = () => { dragRef.current.dragging = false; window.removeEventListener("mousemove", handleMove); window.removeEventListener("mouseup", handleUp); };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
  }, [element.id, element.x, element.y, isEditing, onSelect, onUpdate, viewport.zoom]);

  return (
    <div className="absolute group w-full h-full" style={{ pointerEvents: "auto" }} onMouseDown={handleMouseDown} onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}>
      <div className={`w-full h-full rounded-3xl overflow-hidden bg-[#1e1e1e]/60 backdrop-blur-[12px] border transition-shadow flex flex-col ${isSelected ? "border-blue-500 shadow-xl shadow-blue-500/20" : "border-white/10 shadow-lg"}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            <span className="text-zinc-300 font-bold uppercase tracking-wider text-[10px]">Mermaid Graph</span>
          </div>
          {!isEditing && <button onMouseDown={(e) => { e.stopPropagation(); setIsEditing(true); }} className="text-zinc-500 hover:text-blue-400 transition-colors text-[10px] uppercase font-bold tracking-widest">Edit</button>}
        </div>

        {isEditing ? (
          <div className="p-3 flex-1 flex flex-col" onClick={(e) => e.stopPropagation()}>
            <textarea value={code} onChange={(e) => setCode(e.target.value)} className="w-full flex-1 bg-black/40 text-green-400 font-mono rounded-lg border border-white/10 outline-none resize-none text-xs p-2 min-h-[100px]" placeholder="graph TD&#10;  A --> B" spellCheck={false} />
            {error && <p className="text-red-400 mt-1 text-[10px]">{error}</p>}
            <div className="flex gap-2 mt-2">
              <button onClick={renderMermaid} disabled={rendering} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium transition-colors disabled:opacity-50 text-xs">
                {rendering ? <RefreshCw className="animate-spin w-3 h-3" /> : <Play className="w-3 h-3" />} {rendering ? "Rendering…" : "Render"}
              </button>
              {element.renderedSvg && <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-zinc-300 rounded-lg font-medium transition-colors text-xs">Cancel</button>}
            </div>
          </div>
        ) : (
          <div ref={svgRef} className="p-3 flex-1 flex items-center justify-center [&_svg]:max-w-full [&_svg]:h-auto mermaid-container overflow-hidden" dangerouslySetInnerHTML={{ __html: element.renderedSvg || '<p style="color:#888;font-size:12px;text-align:center">Double-click to add graph code</p>' }} />
        )}
      </div>

      {isSelected && !isEditing && (
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-1 bg-[#1a1a2e] rounded-lg shadow-xl border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity z-[2000]">
          <button onMouseDown={(e) => { e.stopPropagation(); setIsEditing(true); }} className="p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white" title="Edit Graph"><Edit2 className="w-3 h-3" /></button>
          <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
          <button onMouseDown={(e) => { e.stopPropagation(); onBringToFront(element.id); }} className="p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"><ArrowUpToLine className="w-3 h-3" /></button>
          <button onMouseDown={(e) => { e.stopPropagation(); onSendToBack(element.id); }} className="p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"><ArrowDownToLine className="w-3 h-3" /></button>
          <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
          <button onMouseDown={(e) => { e.stopPropagation(); onRemove(element.id); }} className="p-1 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"><Trash2 className="w-3 h-3" /></button>
        </div>
      )}
    </div>
  );
}
