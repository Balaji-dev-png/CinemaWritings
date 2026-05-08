"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import {
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Plus, Trash2, Download, CheckSquare, Square, GripVertical,
  Camera, Film, Maximize2, ChevronDown, ArrowLeft, Loader2
} from "lucide-react";
import {
  SceneCard as SceneCardType,
  Storyboard,
  SHOT_TYPES,
  CAMERA_MOVEMENTS,
  createSceneCard,
  updateSceneCard,
  deleteSceneCard,
  reorderSceneCards,
  bulkDeleteSceneCards,
  updateStoryboard,
} from "@/lib/storyboard-api";

// ─── Aspect ratio display values ──────────────────────────────────────────
const ASPECT_RATIOS: { value: Storyboard["aspect_ratio"]; label: string; css: string }[] = [
  { value: "16:9",    label: "16:9",    css: "aspect-video" },
  { value: "2.39:1",  label: "2.39:1",  css: "aspect-[2.39/1]" },
  { value: "4:3",     label: "4:3",     css: "aspect-[4/3]" },
  { value: "1.85:1",  label: "1.85:1",  css: "aspect-[1.85/1]" },
];

// ─── SortableSceneCard ─────────────────────────────────────────────────────
function SortableCard({
  card,
  storyboardId,
  aspectClass,
  selected,
  bulkMode,
  onSelect,
  onUpdate,
  onDelete,
}: {
  card: SceneCardType;
  storyboardId: string;
  aspectClass: string;
  selected: boolean;
  bulkMode: boolean;
  onSelect: (id: string) => void;
  onUpdate: (id: string, data: Partial<SceneCardType>) => void;
  onDelete: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id });
  const [editing, setEditing] = useState(false);
  const [localCard, setLocalCard] = useState(card);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 50 : "auto",
  };

  const handleChange = useCallback(<K extends keyof SceneCardType>(field: K, value: SceneCardType[K]) => {
    const updated = { ...localCard, [field]: value };
    setLocalCard(updated);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      onUpdate(card.id, { [field]: value });
    }, 600);
  }, [localCard, card.id, onUpdate]);

  return (
    <motion.div
      ref={setNodeRef}
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={`relative rounded-2xl overflow-hidden select-none group transition-all ${
        selected ? "ring-2 ring-[#c9a84c]" : "ring-1 ring-white/8"
      }`}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        zIndex: isDragging ? 50 : "auto" as React.CSSProperties["zIndex"],
        background: "linear-gradient(145deg,rgba(24,24,36,0.98),rgba(14,14,24,0.99))",
      }}
    >
      {/* Frame image area */}
      <div
        className={`${aspectClass} w-full relative overflow-hidden`}
        style={{ background: "#0a0a14", cursor: editing ? "default" : "pointer" }}
        onClick={() => !bulkMode && setEditing(true)}
      >
        {card.image_url ? (
          <img src={card.image_url} alt="Frame" className="w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            {/* Sketch placeholder */}
            <svg width="48" height="36" viewBox="0 0 48 36" fill="none" className="opacity-20">
              <rect width="48" height="36" rx="3" fill="#c9a84c" fillOpacity="0.15" stroke="#c9a84c" strokeWidth="1.5" />
              <path d="M8 28L16 18L22 24L30 14L40 28" stroke="#c9a84c" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="14" cy="12" r="4" stroke="#c9a84c" strokeWidth="1.5" />
            </svg>
            <span className="text-[10px] text-zinc-600 font-medium">Click to edit</span>
          </div>
        )}

        {/* Cinematic overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        {/* Shot number badge */}
        <div className="absolute top-2 left-2 px-1.5 py-0.5 rounded-md text-[10px] font-bold tracking-wider" style={{ background: "rgba(0,0,0,0.7)", color: "#c9a84c" }}>
          {localCard.shot_number || "SHOT"}
        </div>

        {/* Shot type badge */}
        {localCard.shot_type && (
          <div className="absolute top-2 right-8 px-1.5 py-0.5 rounded-md text-[9px] font-bold" style={{ background: "rgba(201,168,76,0.2)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.3)" }}>
            {localCard.shot_type}
          </div>
        )}

        {/* Drag handle */}
        <div
          className="absolute top-2 right-2 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing"
          style={{ background: "rgba(0,0,0,0.6)" }}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="w-3 h-3 text-zinc-400" />
        </div>
      </div>

      {/* Card footer */}
      <div className="px-3 py-2 flex items-center justify-between gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-zinc-200 truncate">
            {localCard.scene_heading || "Scene Heading"}
          </p>
          {localCard.camera_movement && (
            <p className="text-[10px] text-zinc-500 truncate mt-0.5">
              {CAMERA_MOVEMENTS[localCard.camera_movement] || localCard.camera_movement}
              {localCard.lens && ` · ${localCard.lens}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {bulkMode ? (
            <button onClick={() => onSelect(card.id)} className="p-1">
              {selected
                ? <CheckSquare className="w-4 h-4" style={{ color: "#c9a84c" }} />
                : <Square className="w-4 h-4 text-zinc-600" />}
            </button>
          ) : (
            <button
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color: "#f87171" }}
              onClick={() => onDelete(card.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Edit panel overlay */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex flex-col overflow-y-auto"
            style={{ background: "rgba(10,10,20,0.97)", backdropFilter: "blur(8px)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <span className="text-xs font-bold gold-accent flex items-center gap-1.5"><Camera className="w-3.5 h-3.5" /> Edit Shot</span>
              <button onClick={() => setEditing(false)} className="text-zinc-500 hover:text-white text-xs px-2 py-1 rounded-md" style={{ background: "rgba(255,255,255,0.06)" }}>Done</button>
            </div>
            <div className="p-3 space-y-2.5 flex-1 overflow-y-auto suite-scrollbar text-xs">
              {[
                { label: "Shot Number", field: "shot_number" as const, placeholder: "01" },
                { label: "Scene Heading", field: "scene_heading" as const, placeholder: "INT. ROOM - DAY" },
                { label: "Lens", field: "lens" as const, placeholder: "50mm" },
                { label: "Image URL", field: "image_url" as const, placeholder: "https://..." },
              ].map(({ label, field, placeholder }) => (
                <div key={field}>
                  <label className="suite-label">{label}</label>
                  <input
                    className="suite-input w-full"
                    placeholder={placeholder}
                    value={localCard[field] as string}
                    onChange={(e) => handleChange(field, e.target.value)}
                  />
                </div>
              ))}
              <div>
                <label className="suite-label">Shot Type</label>
                <select className="suite-select w-full" value={localCard.shot_type} onChange={(e) => handleChange("shot_type", e.target.value)}>
                  {Object.entries(SHOT_TYPES).map(([k, v]) => <option key={k} value={k}>{k} — {v}</option>)}
                </select>
              </div>
              <div>
                <label className="suite-label">Camera Movement</label>
                <select className="suite-select w-full" value={localCard.camera_movement} onChange={(e) => handleChange("camera_movement", e.target.value)}>
                  {Object.entries(CAMERA_MOVEMENTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="suite-label">Technical Notes</label>
                <textarea className="suite-input suite-scrollbar w-full" rows={3} placeholder="Crew notes, lighting setup, lens filters..."
                  value={localCard.technical_notes}
                  onChange={(e) => handleChange("technical_notes", e.target.value)} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Main StoryboardView ───────────────────────────────────────────────────
interface Props {
  storyboard: Storyboard;
  onStoryboardChange: (updated: Storyboard) => void;
}

export function StoryboardView({ storyboard, onStoryboardChange }: Props) {
  const [cards, setCards] = useState<SceneCardType[]>(storyboard.cards);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [adding, setAdding] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(storyboard.aspect_ratio);
  const [showAspectMenu, setShowAspectMenu] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const currentAspect = ASPECT_RATIOS.find(a => a.value === aspectRatio) || ASPECT_RATIOS[0];

  const handleAddCard = async () => {
    setAdding(true);
    try {
      const card = await createSceneCard(storyboard.id, {
        shot_number: `${String(cards.length + 1).padStart(2, "0")}`,
        scene_heading: "",
      });
      setCards(prev => [...prev, card]);
    } finally {
      setAdding(false);
    }
  };

  const handleUpdate = useCallback(async (id: string, data: Partial<SceneCardType>) => {
    try {
      await updateSceneCard(storyboard.id, id, data);
      setCards(prev => prev.map(c => c.id === id ? { ...c, ...data } : c));
    } catch { /* silent — data already updated optimistically */ }
  }, [storyboard.id]);

  const handleDelete = useCallback(async (id: string) => {
    setCards(prev => prev.filter(c => c.id !== id));
    await deleteSceneCard(storyboard.id, id);
  }, [storyboard.id]);

  const handleBulkDelete = async () => {
    const ids = [...selectedIds];
    setCards(prev => prev.filter(c => !selectedIds.has(c.id)));
    setSelectedIds(new Set());
    setBulkMode(false);
    await bulkDeleteSceneCards(storyboard.id, ids);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = cards.findIndex(c => c.id === active.id);
    const newIndex = cards.findIndex(c => c.id === over.id);
    const reordered = arrayMove(cards, oldIndex, newIndex);
    setCards(reordered);
    await reorderSceneCards(storyboard.id, reordered.map(c => c.id));
  };

  const handleAspectChange = async (ratio: Storyboard["aspect_ratio"]) => {
    setAspectRatio(ratio);
    setShowAspectMenu(false);
    const updated = await updateStoryboard(storyboard.id, { aspect_ratio: ratio });
    onStoryboardChange(updated);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-3 shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", background: "rgba(10,10,20,0.8)", backdropFilter: "blur(12px)" }}>
        {/* Aspect ratio selector */}
        <div className="relative">
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#c9a84c" }}
            onClick={() => setShowAspectMenu(v => !v)}
          >
            <Maximize2 className="w-3.5 h-3.5" />
            {currentAspect.label}
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
          <AnimatePresence>
            {showAspectMenu && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                className="absolute top-full left-0 mt-1 rounded-xl overflow-hidden z-50"
                style={{ background: "rgba(18,18,28,0.98)", border: "1px solid rgba(255,255,255,0.1)", minWidth: 120 }}
              >
                {ASPECT_RATIOS.map(a => (
                  <button key={a.value} onClick={() => handleAspectChange(a.value)}
                    className="w-full text-left px-4 py-2 text-xs font-medium transition-colors hover:bg-white/5"
                    style={{ color: a.value === aspectRatio ? "#c9a84c" : "#a1a1aa" }}>
                    {a.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex-1" />

        {/* Bulk mode toggle */}
        {bulkMode ? (
          <>
            <span className="text-xs text-zinc-500">{selectedIds.size} selected</span>
            {selectedIds.size > 0 && (
              <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 transition-colors" style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
                <Trash2 className="w-3.5 h-3.5" /> Delete Selected
              </button>
            )}
            <button onClick={() => { setBulkMode(false); setSelectedIds(new Set()); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400" style={{ background: "rgba(255,255,255,0.06)" }}>
              Cancel
            </button>
          </>
        ) : (
          <button onClick={() => setBulkMode(true)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-400 transition-colors hover:text-zinc-200" style={{ background: "rgba(255,255,255,0.06)" }}>
            <CheckSquare className="w-3.5 h-3.5" /> Select
          </button>
        )}

        <button
          onClick={handleAddCard}
          disabled={adding}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all hover:brightness-110 disabled:opacity-60"
          style={{ background: "linear-gradient(135deg,#c9a84c,#a8862e)", color: "#0d0d0d" }}
        >
          {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add Shot
        </button>
      </div>

      {/* Cards Grid */}
      <div className="flex-1 overflow-y-auto suite-scrollbar p-6">
        {cards.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 opacity-60">
            <Film className="w-12 h-12 text-zinc-700" />
            <p className="text-sm text-zinc-500 font-medium">No shots yet</p>
            <button onClick={handleAddCard} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold" style={{ background: "linear-gradient(135deg,#c9a84c,#a8862e)", color: "#0d0d0d" }}>
              <Plus className="w-4 h-4" /> Add First Shot
            </button>
          </div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={cards.map(c => c.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <AnimatePresence>
                  {cards.map(card => (
                    <SortableCard
                      key={card.id}
                      card={card}
                      storyboardId={storyboard.id}
                      aspectClass={currentAspect.css}
                      selected={selectedIds.has(card.id)}
                      bulkMode={bulkMode}
                      onSelect={toggleSelect}
                      onUpdate={handleUpdate}
                      onDelete={handleDelete}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}
