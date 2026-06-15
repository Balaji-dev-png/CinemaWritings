"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home, Plus, Trash2, Pin, PinOff, BookOpen,
  Search, X, Check, Palette,
} from "lucide-react";
import {
  ApiNote,
  apiGetNotes,
  apiCreateNote,
  apiUpdateNote,
  apiDeleteNote,
} from "@/lib/api";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

const NOTE_COLORS = [
  { label: "Ink",    value: "#1a1a1a" },
  { label: "Forest", value: "#0d2b1e" },
  { label: "Navy",   value: "#0d1b2b" },
  { label: "Wine",   value: "#2b0d1a" },
  { label: "Amber",  value: "#2b1f0d" },
  { label: "Slate",  value: "#1a1f2b" },
];

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function GlobalNotesPage() {
  const router = useRouter();
  const [notes, setNotes] = useState<ApiNote[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [isNavigating, setIsNavigating] = useState(false);
  const [navMessage, setNavMessage] = useState("");
  const navigateTo = (path: string, msg = "Loading...") => {
    setNavMessage(msg);
    setIsNavigating(true);
    router.push(path);
  };

  useEffect(() => {
    // Load ALL notes (global + script-linked) for the global page
    apiGetNotes()
      .then((data) => {
        setNotes(data);
        if (data.length > 0) setActiveId(data[0].id);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const activeNote = notes.find((n) => n.id === activeId) ?? null;
  const filtered = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async () => {
    const note = await apiCreateNote({
      title: "New Note",
      content: "",
      color: NOTE_COLORS[0].value,
      script_id: null,
    });
    setNotes((prev) => [note, ...prev]);
    setActiveId(note.id);
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const scheduleSave = useCallback((id: string, patch: Partial<ApiNote>) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        const updated = await apiUpdateNote(id, patch);
        setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      } finally {
        setSaving(false);
      }
    }, 800);
  }, []);

  const handleTitleChange = (val: string) => {
    if (!activeId) return;
    setNotes((prev) => prev.map((n) => (n.id === activeId ? { ...n, title: val } : n)));
    scheduleSave(activeId, { title: val });
  };

  const handleContentChange = (val: string) => {
    if (!activeId) return;
    setNotes((prev) => prev.map((n) => (n.id === activeId ? { ...n, content: val } : n)));
    scheduleSave(activeId, { content: val });
  };

  const handleColorChange = async (color: string) => {
    if (!activeId) return;
    setNotes((prev) => prev.map((n) => (n.id === activeId ? { ...n, color } : n)));
    setShowColorPicker(false);
    await apiUpdateNote(activeId, { color });
  };

  const handlePin = async (note: ApiNote) => {
    const updated = await apiUpdateNote(note.id, { pinned: !note.pinned });
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === updated.id ? updated : n));
      return [...next].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
    });
  };

  const handleDelete = async (id: string) => {
    await apiDeleteNote(id);
    const remaining = notes.filter((n) => n.id !== id);
    setNotes(remaining);
    if (activeId === id) setActiveId(remaining[0]?.id ?? null);
  };

  return (
    <div className="h-screen flex flex-col bg-[#0d0d0d] text-white overflow-hidden" style={{ fontFamily: "'Inter', sans-serif" }}>
      <LoadingOverlay isVisible={isNavigating} message={navMessage} />

      {/* Top Bar */}
      <header className="flex items-center gap-3 px-5 py-3 shrink-0 border-b border-white/8 bg-[#111]/80 backdrop-blur-xl z-30">
        <button onClick={() => navigateTo("/", "Going Home...")} className="flex items-center gap-1 text-xs text-zinc-500 hover:text-white transition-colors">
          <Home className="w-3.5 h-3.5" /> Home
        </button>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <BookOpen className="w-4 h-4" style={{ color: "#c9a84c" }} />
          <span className="text-sm font-bold tracking-wide" style={{ color: "#c9a84c" }}>My Notes</span>
          <span className="text-zinc-600 text-xs">— All Notes</span>
        </div>
        {saving && <span className="text-[10px] text-zinc-500 animate-pulse">Saving…</span>}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-64 shrink-0 flex flex-col border-r border-white/8 bg-[#111]">
          <div className="p-3 flex flex-col gap-2 border-b border-white/8">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-600" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search notes…"
                className="w-full bg-white/5 border border-white/8 rounded-lg pl-8 pr-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-600 outline-none focus:border-[#c9a84c]/40 transition-colors"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                  <X className="w-3 h-3 text-zinc-600" />
                </button>
              )}
            </div>
            <button
              onClick={handleCreate}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-black transition-all hover:opacity-90 active:scale-95"
              style={{ background: "linear-gradient(135deg,#c9a84c,#a8862e)" }}
            >
              <Plus className="w-3.5 h-3.5" /> New Note
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
            {loading ? (
              <p className="text-xs text-zinc-600 text-center pt-8">Loading…</p>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-zinc-600 text-center pt-8">No notes yet.<br />Click &quot;New Note&quot; to start.</p>
            ) : (
              filtered.map((note) => (
                <motion.button
                  key={note.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  onClick={() => setActiveId(note.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl transition-all group relative ${
                    activeId === note.id ? "bg-white/10 ring-1 ring-white/15" : "hover:bg-white/5"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ background: note.color }} />
                        <p className="text-xs font-semibold text-zinc-200 truncate">{note.title || "Untitled"}</p>
                        {note.pinned && <Pin className="w-2.5 h-2.5 shrink-0" style={{ color: "#c9a84c" }} />}
                      </div>
                      <p className="text-[10px] text-zinc-600 mt-0.5 truncate">
                        {note.content.replace(/<[^>]*>/g, "").slice(0, 50) || "No content"}
                      </p>
                      <p className="text-[10px] text-zinc-700 mt-0.5">{timeAgo(note.updated_at)}</p>
                    </div>
                    <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); handlePin(note); }} className="text-zinc-600 hover:text-[#c9a84c] transition-colors">
                        {note.pinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }} className="text-zinc-600 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.button>
              ))
            )}
          </div>
        </aside>

        {/* Editor */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <AnimatePresence mode="wait">
            {activeNote ? (
              <motion.div
                key={activeNote.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex-1 flex flex-col overflow-hidden"
                style={{ background: activeNote.color }}
              >
                <div className="flex items-center gap-3 px-8 pt-8 pb-4 shrink-0">
                  <input
                    type="text"
                    value={activeNote.title}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="Note title…"
                    className="flex-1 bg-transparent text-2xl font-bold text-white/90 outline-none placeholder:text-white/30 border-b border-transparent focus:border-white/20 transition-colors pb-1"
                  />
                  <div className="relative">
                    <button onClick={() => setShowColorPicker((v) => !v)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors" title="Note color">
                      <Palette className="w-4 h-4 text-white/60" />
                    </button>
                    <AnimatePresence>
                      {showColorPicker && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                          className="absolute right-0 top-10 bg-[#1a1a1a] border border-white/15 rounded-xl p-3 shadow-2xl z-20 flex flex-col gap-2 w-36">
                          {NOTE_COLORS.map((c) => (
                            <button key={c.value} onClick={() => handleColorChange(c.value)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors">
                              <div className="w-4 h-4 rounded-full border border-white/20" style={{ background: c.value }} />
                              <span className="text-xs text-zinc-400">{c.label}</span>
                              {activeNote.color === c.value && <Check className="w-3 h-3 text-[#c9a84c] ml-auto" />}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                  <button onClick={() => handlePin(activeNote)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors" title={activeNote.pinned ? "Unpin" : "Pin"}>
                    {activeNote.pinned ? <PinOff className="w-4 h-4" style={{ color: "#c9a84c" }} /> : <Pin className="w-4 h-4 text-white/60" />}
                  </button>
                </div>
                <textarea
                  ref={textareaRef}
                  value={activeNote.content}
                  onChange={(e) => handleContentChange(e.target.value)}
                  placeholder="Start writing your note…"
                  className="flex-1 bg-transparent text-white/80 text-sm leading-relaxed px-8 pb-8 outline-none resize-none placeholder:text-white/20"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                />
              </motion.div>
            ) : (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(201,168,76,0.1)" }}>
                  <BookOpen className="w-8 h-8" style={{ color: "#c9a84c" }} />
                </div>
                <div>
                  <p className="text-white font-semibold">Your notepad is empty</p>
                  <p className="text-zinc-500 text-sm mt-1">Create your first note to get started</p>
                </div>
                <button onClick={handleCreate} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-black" style={{ background: "linear-gradient(135deg,#c9a84c,#a8862e)" }}>
                  <Plus className="w-4 h-4" /> New Note
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
