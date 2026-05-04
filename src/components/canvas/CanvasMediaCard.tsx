"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  ImageElement,
  LinkCardElement,
  ViewportState,
} from "@/lib/canvasTypes";
import {
  Trash2,
  ArrowUpToLine,
  ArrowDownToLine,
  Upload,
  Link2,
  ExternalLink,
} from "lucide-react";

interface ImageProps {
  element: ImageElement;
  viewport: ViewportState;
  isSelected: boolean;
  onUpdate: (id: string, updates: Partial<ImageElement>) => void;
  onSelect: (id: string, additive: boolean) => void;
  onRemove: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
}

export function CanvasImageCard({
  element,
  viewport,
  isSelected,
  onUpdate,
  onSelect,
  onRemove,
  onBringToFront,
  onSendToBack,
}: ImageProps) {
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(element.id, e.shiftKey);
      dragRef.current = {
        dragging: true,
        startX: e.clientX,
        startY: e.clientY,
        origX: element.x,
        origY: element.y,
      };
      const handleMove = (me: MouseEvent) => {
        if (!dragRef.current.dragging) return;
        onUpdate(element.id, {
          x:
            dragRef.current.origX +
            (me.clientX - dragRef.current.startX) / viewport.zoom,
          y:
            dragRef.current.origY +
            (me.clientY - dragRef.current.startY) / viewport.zoom,
        });
      };
      const handleUp = () => {
        dragRef.current.dragging = false;
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [element.id, element.x, element.y, onSelect, onUpdate, viewport.zoom],
  );

  return (
    <div
      className="absolute group w-full h-full"
      style={{ pointerEvents: "auto" }}
      onMouseDown={handleMouseDown}
    >
      <div
        className="w-full h-full rounded-3xl overflow-hidden bg-[#1e1e1e]/60 backdrop-blur-[12px]"
        style={{
          border: isSelected
            ? "2px solid #3b82f6"
            : "1px solid rgba(255, 255, 255, 0.1)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
        }}
      >
        {element.src ? (
          <img
            src={element.src}
            alt={element.alt || "Canvas image"}
            className="w-full h-full"
            style={{ objectFit: element.objectFit || "cover" }}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-zinc-800/80 text-zinc-400">
            <Upload className="w-6 h-6" />
          </div>
        )}
      </div>
      {isSelected && (
        <div
          className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 px-1.5 py-1 bg-[#1a1a2e] rounded-lg shadow-xl border border-zinc-800 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ zIndex: element.zIndex + 2000 }}
        >
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onBringToFront(element.id);
            }}
            className="p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowUpToLine className="w-3 h-3" />
          </button>
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onSendToBack(element.id);
            }}
            className="p-1 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white"
          >
            <ArrowDownToLine className="w-3 h-3" />
          </button>
          <div className="w-px h-3 bg-zinc-200 dark:bg-zinc-700" />
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onRemove(element.id);
            }}
            className="p-1 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-400"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

interface LinkProps {
  element: LinkCardElement;
  viewport: ViewportState;
  isSelected: boolean;
  onUpdate: (id: string, updates: Partial<LinkCardElement>) => void;
  onSelect: (id: string, additive: boolean) => void;
  onRemove: (id: string) => void;
  onBringToFront: (id: string) => void;
  onSendToBack: (id: string) => void;
}

export function CanvasLinkCard({
  element,
  viewport,
  isSelected,
  onUpdate,
  onSelect,
  onRemove,
  onBringToFront,
  onSendToBack,
}: LinkProps) {
  const dragRef = useRef({
    dragging: false,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });
  const [isFetching, setIsFetching] = useState(false);

  // Auto-fetch OG metadata if missing
  useEffect(() => {
    if (
      element.url &&
      (!element.title || element.title === new URL(element.url).hostname) &&
      !element.thumbnail &&
      !isFetching
    ) {
      setIsFetching(true);
      fetch(`/api/og?url=${encodeURIComponent(element.url)}`)
        .then((res) => res.json())
        .then((data) => {
          if (!data.error) {
            onUpdate(element.id, {
              title: data.title,
              description: data.description,
              thumbnail: data.image,
              favicon: data.favicon,
            });
          }
        })
        .catch((err) => console.warn("Failed to fetch OG metadata:", err))
        .finally(() => setIsFetching(false));
    }
  }, [
    element.url,
    element.title,
    element.thumbnail,
    element.id,
    onUpdate,
    isFetching,
  ]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSelect(element.id, e.shiftKey);
      dragRef.current = {
        dragging: true,
        startX: e.clientX,
        startY: e.clientY,
        origX: element.x,
        origY: element.y,
      };
      const handleMove = (me: MouseEvent) => {
        if (!dragRef.current.dragging) return;
        onUpdate(element.id, {
          x:
            dragRef.current.origX +
            (me.clientX - dragRef.current.startX) / viewport.zoom,
          y:
            dragRef.current.origY +
            (me.clientY - dragRef.current.startY) / viewport.zoom,
        });
      };
      const handleUp = () => {
        dragRef.current.dragging = false;
        window.removeEventListener("mousemove", handleMove);
        window.removeEventListener("mouseup", handleUp);
      };
      window.addEventListener("mousemove", handleMove);
      window.addEventListener("mouseup", handleUp);
    },
    [element.id, element.x, element.y, onSelect, onUpdate, viewport.zoom],
  );

  return (
    <div
      className="absolute group w-full h-full"
      style={{ pointerEvents: "auto" }}
      onMouseDown={handleMouseDown}
    >
      <div
        className="w-full h-full rounded-[1.5rem] overflow-hidden bg-[#1e1e1e]/60 backdrop-blur-[12px] flex flex-col transition-all duration-300"
        style={{
          borderColor: isSelected ? "#3b82f6" : "rgba(255, 255, 255, 0.1)",
          boxShadow: isSelected
            ? "0 0 30px rgba(59, 130, 246, 0.2)"
            : "0 8px 32px rgba(0,0,0,0.4)",
        }}
      >
        {element.thumbnail && (
          <div className="w-full h-36 relative overflow-hidden">
            <img
              src={element.thumbnail}
              alt=""
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              draggable={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1e1e1e]/80 to-transparent" />
          </div>
        )}
        <div className="p-4 flex-1 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            {element.favicon && (
              <img
                src={element.favicon}
                alt=""
                className="w-4 h-4 rounded-md shadow-sm"
              />
            )}
            <span className="text-zinc-500 font-bold uppercase tracking-widest text-[8px] truncate">
              {new URL(element.url).hostname}
            </span>
          </div>
          <h4 className="text-white font-bold text-sm leading-tight line-clamp-2">
            {element.title || element.url}
          </h4>
          {element.description && (
            <p className="text-zinc-400 line-clamp-2 text-[10px] leading-relaxed">
              {element.description}
            </p>
          )}
          <a
            href={element.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 mt-auto pt-2 text-[9px] font-bold uppercase tracking-wider group/link"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ExternalLink className="w-3 h-3 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />{" "}
            View Source
          </a>
        </div>
      </div>

      {/* Connection Ports */}
      <div className="absolute -left-1 w-2 h-2 bg-blue-500 rounded-full top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all z-10 shadow-[0_0_8px_#3b82f6]" />
      <div className="absolute -right-1 w-2 h-2 bg-blue-500 rounded-full top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all z-10 shadow-[0_0_8px_#3b82f6]" />
      <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 shadow-[0_0_8px_#3b82f6]" />
      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-blue-500 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10 shadow-[0_0_8px_#3b82f6]" />

      {isSelected && (
        <div
          className="absolute -bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-1 p-1 bg-[#1e1e1e] rounded-2xl border border-white/10 shadow-2xl scale-90 group-hover:scale-100 transition-transform"
          style={{ zIndex: element.zIndex + 2000 }}
        >
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onBringToFront(element.id);
            }}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowUpToLine className="w-4 h-4" />
          </button>
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onSendToBack(element.id);
            }}
            className="p-2 text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowDownToLine className="w-4 h-4" />
          </button>
          <div className="w-px h-4 bg-white/10 mx-1" />
          <button
            onMouseDown={(e) => {
              e.stopPropagation();
              onRemove(element.id);
            }}
            className="p-2 text-zinc-400 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
