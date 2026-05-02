"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Editor } from "@tiptap/react";
import { motion } from "framer-motion";
import { ScriptEditor } from "@/components/editor/ScriptEditor";
import { TitlePage } from "@/components/editor/TitlePage";
import { SceneNavigator } from "@/components/editor/SceneNavigator";
import { ScriptAnalytics } from "@/components/editor/ScriptAnalytics";
import { VersionManager } from "@/components/editor/VersionManager";
import { ShortcutsPanel } from "@/components/ui/ShortcutsPanel";
import { Corkboard } from "@/components/editor/Corkboard";
import { getScriptById, updateScript, exportToFountain, importFromFountain, Script } from "@/lib/storage";
import { exportToPdf } from "@/lib/exportPdf";
import { useTheme } from "next-themes";
import {
  ArrowLeft,
  Settings2,
  PanelLeft,
  BarChart3,
  Save,
  Keyboard,
  Eye,
  FileText,
  PenTool,
  Printer,
  Download,
  BookOpen,
  Film,
  Clock,
  X,
  Sun,
  Moon,
  LayoutGrid,
  Upload,
} from "lucide-react";

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const [script, setScript] = useState<Script | null>(null);
  const [title, setTitle] = useState("");
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Panel states
  const [showNav, setShowNav] = useState(true);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [showCorkboard, setShowCorkboard] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Style states
  const [docBgColor, setDocBgColor] = useState("default");
  const [docFont, setDocFont] = useState("default");

  // Stats from editor
  const [stats, setStats] = useState({ words: 0, pages: 0, scenes: 0, currentElement: "ACTION" });

  useEffect(() => {
    if (params.id) {
      const found = getScriptById(params.id as string);
      if (found) {
        setScript(found);
        setTitle(found.title);
      } else {
        router.push("/");
      }
    }
  }, [params.id, router]);

  useEffect(() => { setMounted(true); }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "/" || e.key === "?") { e.preventDefault(); setShowShortcuts((v) => !v); }
        if (e.key === "s") { e.preventDefault(); setShowVersions(true); }
        if (e.key === "\\") { e.preventDefault(); setShowNav((v) => !v); }
        if (e.shiftKey && e.key === "F") { e.preventDefault(); setFocusMode((v) => !v); }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  };

  const handleTitleBlur = () => {
    if (script && title !== script.title) {
      updateScript(script.id, { title });
      setScript(getScriptById(script.id) || null);
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const handleVersionRestore = (newContent: string) => {
    setShowVersions(false);
    // Reload script data
    if (params.id) {
      const updated = getScriptById(params.id as string);
      if (updated) setScript(updated);
    }
    // Update editor programmatically to avoid page flash
    if (editorInstance) {
      editorInstance.commands.setContent(newContent);
    }
  };

  const handleExportFountain = () => {
    if (!script) return;
    const freshScript = getScriptById(script.id)!;
    const content = editorInstance?.getHTML() || freshScript.content;
    const fountain = exportToFountain(content, freshScript.meta, freshScript.title);
    const blob = new Blob([fountain], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${freshScript.title || "script"}.fountain`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleExportText = () => {
    if (!script) return;
    const freshScript = getScriptById(script.id)!;
    const content = editorInstance?.getHTML() || freshScript.content;
    const text = exportToFountain(content, freshScript.meta, freshScript.title);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${freshScript.title || "script"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleExportPdf = () => {
    if (!script) return;
    const freshScript = getScriptById(script.id)!;
    const content = editorInstance?.getHTML() || freshScript.content;
    exportToPdf(content, {
      title: freshScript.title || "Untitled",
      writtenByPrefix: freshScript.meta?.writtenByPrefix || "written by",
      author: freshScript.meta?.author || "",
      contact: freshScript.meta?.contact || "",
      logline: freshScript.meta?.logline || "",
      synopsis: freshScript.meta?.synopsis || "",
    });
    setShowExportMenu(false);
  };

  const handlePrint = () => {
    setShowExportMenu(false);
    window.print();
  };

  const handleImportFountain = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".fountain,.txt";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const text = reader.result as string;
        const html = importFromFountain(text);
        updateScript(script!.id, { content: html });
        if (editorInstance) {
          editorInstance.commands.setContent(html);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  if (!script) return null;

  return (
    <div 
      className={`h-screen flex flex-col bg-[#f4f5f7] dark:bg-[#0a0a0a] font-sans transition-colors duration-300 overflow-hidden ${focusMode ? "focus-mode" : ""}`}
    >

      {/* ─── Top Bar ─── */}
      {!focusMode && (
        <header className="anim-slide-1 flex items-center justify-between px-2 sm:px-4 py-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800 z-30 shrink-0 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <button onClick={() => router.push("/")} className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </button>
            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1 sm:mx-0" />
            <button onClick={() => setShowNav((v) => !v)} className={`p-1.5 rounded-lg transition-all ${showNav ? "bg-zinc-900 dark:bg-white text-white dark:text-black" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`} title="Scene Navigator">
              <PanelLeft className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setShowAnalytics((v) => !v)} className={`p-1.5 rounded-lg transition-all ${showAnalytics ? "bg-zinc-900 dark:bg-white text-white dark:text-black" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`} title="Analytics">
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setShowCorkboard(true)} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all" title="Corkboard">
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Center: Script Title */}
          <div className="flex items-center gap-2 mx-4 shrink-0 max-w-[150px] sm:max-w-[300px]">
            <PenTool className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="text-xs font-medium text-zinc-800 dark:text-zinc-200 bg-transparent border-none outline-none hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:bg-zinc-100 dark:focus:bg-zinc-800 px-2 py-1 rounded transition-colors w-full truncate placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
              placeholder="Untitled Script"
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-auto">
            <button onClick={() => setFocusMode(true)} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all" title="Focus Mode">
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setShowVersions(true)} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all" title="Versions">
              <Save className="w-3.5 h-3.5" />
            </button>
            <div className="relative">
              <button onClick={() => setShowExportMenu(!showExportMenu)} className={`p-1.5 rounded-lg transition-all ${showExportMenu ? "bg-zinc-900 dark:bg-white text-white dark:text-black" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`} title="Download Options">
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
            <button onClick={handleImportFountain} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all" title="Import Fountain">
              <Upload className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-1" />
            <button onClick={() => setShowSettings(!showSettings)} className={`p-1.5 rounded-lg transition-all ${showSettings ? "bg-zinc-900 dark:bg-white text-white dark:text-black" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`} title="Style Settings">
              <Settings2 className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setShowShortcuts(true)} className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all" title="Shortcuts">
              <Keyboard className="w-3.5 h-3.5" />
            </button>
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                title={theme === "dark" ? "Light Mode" : "Dark Mode"}
              >
                {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>
        </header>
      )}

      {/* Export Dropdown */}
      {showExportMenu && !focusMode && (
        <div className="absolute top-12 right-12 z-50 bg-white dark:bg-[#1a1a1a] p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-52 flex flex-col gap-1">
          <button onClick={handleExportPdf} className="text-left px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2">
            <span className="text-base">📄</span> Download PDF
          </button>
          <button onClick={handleExportFountain} className="text-left px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2">
            <span className="text-base">🖋</span> Fountain (.fountain)
          </button>
          <button onClick={handleExportText} className="text-left px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2">
            <span className="text-base">📝</span> Plain Text (.txt)
          </button>
        </div>
      )}

      {/* Settings Dropdown */}
      {showSettings && !focusMode && (
        <div className="absolute top-12 right-4 z-50 bg-white dark:bg-[#1a1a1a] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-64 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Paper Color</label>
              <button onClick={() => setDocBgColor("default")} className="text-[10px] text-zinc-400 hover:text-black dark:hover:text-white">Reset</button>
            </div>
            <input type="color" value={docBgColor === "default" ? "#ffffff" : docBgColor} onChange={(e) => setDocBgColor(e.target.value)} className="w-full h-8 rounded-lg cursor-pointer border-0 p-0 bg-transparent" />
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Font</label>
              <button onClick={() => setDocFont("default")} className="text-[10px] text-zinc-400 hover:text-black dark:hover:text-white">Reset</button>
            </div>
            <select value={docFont} onChange={(e) => setDocFont(e.target.value)} className="w-full h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-black dark:text-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-400">
              <option value="default">Courier Prime (Default)</option>
              <option value="var(--font-poppins)">Poppins</option>
              <option value="var(--font-inter)">Inter</option>
              <option value="var(--font-roboto)">Roboto</option>
              <option value="var(--font-open-sans)">Open Sans</option>
              <option value="var(--font-lato)">Lato</option>
              <option value="var(--font-montserrat)">Montserrat</option>
              <option value="var(--font-playfair)">Playfair Display</option>
              <option value="var(--font-lora)">Lora</option>
              <option value="var(--font-comic-neue)">Comic Neue</option>
            </select>
          </div>
        </div>
      )}

      {/* ─── Main Area ─── */}
      <div className="anim-slide-2 flex-1 flex overflow-hidden relative">
        {/* Left: Scene Navigator */}
        {showNav && !focusMode && (
          <aside className="absolute inset-y-0 left-0 z-40 w-64 md:relative md:w-56 shrink-0 bg-white/95 dark:bg-zinc-900/95 md:bg-white md:dark:bg-zinc-900/60 backdrop-blur-xl md:backdrop-blur-none border-r border-zinc-200/60 dark:border-zinc-800 overflow-hidden flex flex-col shadow-2xl md:shadow-none transition-transform">
            <SceneNavigator editor={editorInstance} />
          </aside>
        )}

        {/* Center: Editor */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-32 relative">
          <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 w-full">
            <TitlePage script={script} docBgColor={docBgColor} docFont={docFont} />
            <ScriptEditor
              scriptId={script.id}
              initialContent={script.content}
              docBgColor={docBgColor}
              docFont={docFont}
              onStatsUpdate={setStats}
              onEditorReady={setEditorInstance}
            />
          </div>
        </main>

        {/* Right: Analytics Panel */}
        {showAnalytics && !focusMode && (
          <aside className="absolute inset-y-0 right-0 z-40 w-72 md:relative md:w-64 shrink-0 bg-white/95 dark:bg-zinc-900/95 md:bg-white md:dark:bg-zinc-900/60 backdrop-blur-xl md:backdrop-blur-none border-l border-zinc-200/60 dark:border-zinc-800 overflow-hidden flex flex-col shadow-2xl md:shadow-none transition-transform">
            <ScriptAnalytics editor={editorInstance} />
          </aside>
        )}
      </div>

      {/* ─── Bottom Status Bar ─── */}
      {!focusMode && (
        <footer className="anim-slide-3 flex items-center justify-between px-2 sm:px-4 py-1.5 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-200/60 dark:border-zinc-800 text-[9px] sm:text-[10px] text-zinc-400 dark:text-zinc-500 uppercase font-bold tracking-widest shrink-0 z-20 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-2 sm:gap-4 shrink-0">
            <span className="flex items-center gap-1"><Film className="w-3 h-3" /> <span className="hidden sm:inline">{stats.scenes} scenes</span><span className="sm:hidden">{stats.scenes} scn</span></span>
            <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> <span className="hidden sm:inline">{stats.words.toLocaleString()} words</span><span className="sm:hidden">{stats.words.toLocaleString()}</span></span>
            <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> ~{stats.pages} <span className="hidden sm:inline">pages</span><span className="sm:hidden">pg</span></span>
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{stats.pages} <span className="hidden sm:inline">min</span><span className="sm:hidden">m</span></span>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-500 dark:text-zinc-400 normal-case tracking-normal font-mono">{stats.currentElement}</span>
          </div>
        </footer>
      )}

      {/* ─── Focus Mode Escape ─── */}
      {focusMode && (
        <button
          onClick={() => setFocusMode(false)}
          className="fixed top-4 right-4 z-50 flex items-center gap-1.5 px-3 py-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-xl rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white text-xs font-medium transition-all hover:shadow-xl"
        >
          <X className="w-3.5 h-3.5" />
          Exit Focus
        </button>
      )}

      {/* ─── Modals ─── */}
      {showVersions && <VersionManager scriptId={script.id} currentContent={editorInstance?.getHTML() || ""} onRestore={handleVersionRestore} onClose={() => setShowVersions(false)} />}
      {showShortcuts && <ShortcutsPanel onClose={() => setShowShortcuts(false)} />}
      {showCorkboard && <Corkboard editor={editorInstance} onClose={() => setShowCorkboard(false)} />}
    </div>
  );
}
