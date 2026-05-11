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
import { FontSizeControl } from "@/components/ui/FontSizeControl";
import { useLoadingState } from "@/hooks/useLoadingState";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import {
  getScriptById,
  updateScript,
  exportToFountain,
  Script,
} from "@/lib/storage";
import { useTheme } from "next-themes";
import { getAccessToken } from "@/lib/auth";
import { exportToPdf } from "@/lib/exportPdf";
import { exportToDocx } from "@/lib/exportDocx";
import mammoth from "mammoth";

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
  Sparkles,
  ZoomIn,
  ZoomOut,
  Minus,
  Plus,
  Eraser,
  Layers,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const [script, setScript] = useState<Script | null>(null);
  const [title, setTitle] = useState("");
  const [editorInstance, setEditorInstance] = useState<Editor | null>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  const { isLoading, message, startLoading, stopLoading } = useLoadingState();
  const [progress, setProgress] = useState(0);

  // Instant navigation overlay
  const [isNavigating, setIsNavigating] = useState(false);
  const [navMessage, setNavMessage] = useState("");

  const navigateTo = (path: string, msg = "Loading...") => {
    setNavMessage(msg);
    setIsNavigating(true);
    router.push(path);
  };

  useEffect(() => {
    startLoading([
      "Opening your script...",
      "Loading scenes...",
      "Preparing the editor...",
    ], 800);
    // Set progress asynchronously to avoid cascading renders
    setTimeout(() => setProgress(85), 0);
  }, [startLoading]);

  useEffect(() => {
    if (script && editorInstance) {
      const timer = setTimeout(() => {
        setProgress(100);
        stopLoading();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [script, editorInstance, stopLoading]);

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
  const [docBgColor, setDocBgColor] = useState("");
  const [docFont, setDocFont] = useState("Courier Prime");
  const [docTextColor, setDocTextColor] = useState("");
  const [docFontSize, setDocFontSize] = useState(12);
  const [localFontSize, setLocalFontSize] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState("");
  const [zoom, setZoom] = useState(1);
  const [showPgPopover, setShowPgPopover] = useState(false);
  const pgPopoverRef = useRef<HTMLDivElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const mainScrollRef = useRef<HTMLElement>(null);

  const printRef = useRef<HTMLDivElement>(null);

  // Zoom to cursor on scale change
  useEffect(() => {
    if (editorInstance && editorInstance.isFocused) {
      editorInstance.commands.scrollIntoView();
    }
  }, [zoom, editorInstance]);

  // Metadata state for sync
  const [metadata, setMetadata] = useState<{
    author: string;
    contact: string;
    logline: string;
    synopsis: string;
    writtenByPrefix: string;
    copyright?: string;
    personalInfo?: {
      phone: string;
      email: string;
      address: string;
      website: string;
      agency: string;
    };
  }>({
    author: "",
    contact: "",
    logline: "",
    synopsis: "",
    writtenByPrefix: "written by",
    copyright: "",
    personalInfo: { phone: "", email: "", address: "", website: "", agency: "" },
  });

  // Stats from editor
  const [stats, setStats] = useState({
    words: 0,
    pages: 0,
    scenes: 0,
    currentElement: "ACTION",
  });

  useEffect(() => {
    if (params.id && params.id !== "new") {
      getScriptById(params.id as string)
        .then((found) => {
          if (found) {
            setScript(found);
            setTitle(found.title);
            if (found.meta) {
              setMetadata({
                author: found.meta.author || "",
                contact: found.meta.contact || "",
                logline: found.meta.logline || "",
                synopsis: found.meta.synopsis || "",
                writtenByPrefix: found.meta.writtenByPrefix || "written by",
                copyright: (found.meta as any).copyright || "",
                personalInfo: (found.meta as any).personalInfo || { phone: "", email: "", address: "", website: "", agency: "" },
              });
            }
            if (found.paperColor) setDocBgColor(found.paperColor);
            if (found.fontFamily) setDocFont(found.fontFamily);
            if (found.textColor) setDocTextColor(found.textColor);
            if (found.fontSize) setDocFontSize(found.fontSize);
          } else {
            // Script not found
            stopLoading();
            router.push("/");
          }
        })
        .catch((err) => {
          console.error("Failed to fetch script:", err);
          stopLoading();
          router.push("/");
        });
    }
  }, [params.id, router, stopLoading]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "/" || e.key === "?") {
          e.preventDefault();
          setShowShortcuts((v) => !v);
        }
        if (e.key === "s") {
          e.preventDefault();
          setShowVersions(true);
        }
        if (e.key === "\\") {
          e.preventDefault();
          setShowNav((v) => !v);
        }
        if (e.shiftKey && e.key === "F") {
          e.preventDefault();
          setFocusMode((v) => !v);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        setZoom((z) => {
          const delta = e.deltaY < 0 ? 0.05 : -0.05;
          return Math.max(0.3, Math.min(3, z + delta));
        });
      }
    };

    // Use passive: false to allow preventDefault
    window.addEventListener("wheel", handleWheel, { passive: false });
    return () => window.removeEventListener("wheel", handleWheel);
  }, []);

  useEffect(() => {
    if (!editorInstance) return;
    const handleSelectionUpdate = () => {
      const { from, to } = editorInstance.state.selection;
      const attrs = editorInstance.getAttributes("textStyle");
      if (from !== to && !attrs.fontSize) {
        setLocalFontSize("-");
      } else {
        setLocalFontSize(attrs.fontSize || "");
      }
    };
    editorInstance.on("selectionUpdate", handleSelectionUpdate);
    return () => {
      editorInstance.off("selectionUpdate", handleSelectionUpdate);
    };
  }, [editorInstance]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pgPopoverRef.current &&
        !pgPopoverRef.current.contains(event.target as Node)
      ) {
        setShowPgPopover(false);
      }
    };
    if (showPgPopover) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPgPopover]);

  // Close export dropdown on outside click
  useEffect(() => {
    if (!showExportMenu) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showExportMenu]);

  const applyFontSize = useCallback((size: number) => {
    if (!editorInstance) return;
    const { from, to } = editorInstance.state.selection;
    const clampedSize = Math.max(6, Math.min(72, size));

    if (from === to) {
      const { $from } = editorInstance.state.selection;
      const start = $from.start();
      const end = $from.end();
      editorInstance
        .chain()
        .focus()
        .setTextSelection({ from: start, to: end })
        .setFontSize(`${clampedSize}`)
        .run();
    } else {
      editorInstance.chain().focus().setFontSize(`${clampedSize}`).run();
    }
  }, [editorInstance]);

  const applyGlobalFontSize = useCallback((size: number) => {
    if (!editorInstance) return;
    const clampedSize = Math.max(6, Math.min(72, size));
    editorInstance.chain().focus().selectAll().setFontSize(`${clampedSize}`).run();
    setDocFontSize(clampedSize);
    if (script) updateScript(script.id, { fontSize: clampedSize });
    setShowPgPopover(false);
  }, [editorInstance, script]);

  const handleUppercase = useCallback(() => {
    if (!editorInstance) return;
    const { from, to, empty } = editorInstance.state.selection;
    
    if (empty) {
      const { $from } = editorInstance.state.selection;
      const start = $from.start();
      const end = $from.end();
      const text = editorInstance.state.doc.textBetween(start, end);
      editorInstance.chain().focus().insertContentAt({ from: start, to: end }, text.toUpperCase()).run();
    } else {
      const text = editorInstance.state.doc.textBetween(from, to);
      editorInstance
        .chain()
        .focus()
        .insertContentAt({ from, to }, text.toUpperCase())
        .run();
    }
  }, [editorInstance]);

  const handleLowercase = useCallback(() => {
    if (!editorInstance) return;
    const { from, to, empty } = editorInstance.state.selection;
    
    if (empty) {
      const { $from } = editorInstance.state.selection;
      const start = $from.start();
      const end = $from.end();
      const text = editorInstance.state.doc.textBetween(start, end);
      editorInstance.chain().focus().insertContentAt({ from: start, to: end }, text.toLowerCase()).run();
    } else {
      const text = editorInstance.state.doc.textBetween(from, to);
      editorInstance
        .chain()
        .focus()
        .insertContentAt({ from, to }, text.toLowerCase())
        .run();
    }
  }, [editorInstance]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (script) {
      updateScript(script.id, { title: newTitle });
    }
  };

  const handleTitleBlur = () => {
    if (script && title !== script.title) {
      import("@/lib/storage").then(({ recordHistory }) => {
        recordHistory(script.id, "TITLE_CHANGED", `Changed title to "${title}"`);
      });
    }
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  const handleMetaChange = useCallback(
    (newMeta: any) => {
      setMetadata((prev) => {
        const updated = { ...prev, ...newMeta };
        if (script) {
          updateScript(script.id, { meta: updated });
        }
        return updated;
      });
    },
    [script],
  );

  const handleVersionRestore = async (newContent: string) => {
    setShowVersions(false);
    // Reload script data
    if (params.id) {
      const updated = await getScriptById(params.id as string);
      if (updated) setScript(updated);
    }
    // Update editor programmatically to avoid page flash
    if (editorInstance) {
      editorInstance.commands.setContent(newContent);
    }
  };

  const handleExportFountain = () => {
    if (!script) return;
    const content = editorInstance?.getHTML() || script.content;
    const fountain = exportToFountain(content, metadata, title);
    const blob = new Blob([fountain], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "script"}.fountain`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  const handleExportDocx = async () => {
    if (!script) return;
    setIsExporting(true);
    setExportError("");
    try {
      const content = editorInstance?.getHTML() || script.content;
      await exportToDocx(content, title, metadata);
    } catch (err: any) {
      console.error("[DOCX Export Error]:", err);
      setExportError(err.message || "Export failed. Please try again.");
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const handleExportPdf = async () => {
    if (!script) return;
    setIsExporting(true);
    setExportError("");

    try {
      await exportToPdf(script.title);
    } catch (err: any) {
      console.error("[PDF Export Error]:", err);
      setExportError(err.message || "Export failed. Please try again.");
    } finally {
      setIsExporting(false);
      setShowExportMenu(false);
    }
  };

  const handlePrint = () => {
    setShowExportMenu(false);
    window.print();
  };


  if (!script) {
    return (
      <LoadingOverlay 
        isVisible={isLoading} 
        message={message} 
        showProgressBar 
        progressPercent={progress} 
      />
    );
  }

  return (
    <div
      className={`h-screen flex flex-col bg-[#f4f5f7] dark:bg-[#0a0a0a] font-sans transition-colors duration-300 overflow-hidden ${focusMode ? "focus-mode" : ""}`}
    >
      <LoadingOverlay 
        isVisible={isLoading || isNavigating} 
        message={isNavigating ? navMessage : message} 
        showProgressBar={!isNavigating}
        progressPercent={progress} 
      />
      {/* ─── Top Bar (Sticky) ─── */}
      {!focusMode && (
        <header className="anim-slide-1 sticky top-0 flex items-center justify-start gap-8 px-4 py-3 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800 z-50 shrink-0 overflow-visible no-scrollbar">
          {/* 1. Dashboard Link */}
          <button
            onClick={() => navigateTo("/", "Going back to dashboard...")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="font-medium">Dashboard</span>
          </button>

          {/* 2. View Switchers */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowNav((v) => !v)}
              className={`p-1.5 rounded-lg transition-all ${showNav ? "bg-zinc-900 dark:bg-white text-white dark:text-black" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              title="Scene Navigator"
            >
              <PanelLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowAnalytics((v) => !v)}
              className={`p-1.5 rounded-lg transition-all ${showAnalytics ? "bg-zinc-900 dark:bg-white text-white dark:text-black" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              title="Analytics"
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowCorkboard(true)}
              className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              title="Corkboard"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => navigateTo(`/directors-suite/${params.id}`, "Opening Director's Suite...")}
              className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group"
              title="Director's Suite"
            >
              <Sparkles className="w-3.5 h-3.5 group-hover:text-blue-400 transition-colors" />
            </button>
            <button
              onClick={() => navigateTo(`/storyboard/${params.id}`, "Opening Storyboard...")}
              className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all group"
              title="Storyboard"
            >
              <Layers className="w-3.5 h-3.5 group-hover:text-purple-400 transition-colors" />
            </button>
          </div>

          {/* 3. Project Title */}
          <div className="flex items-center shrink-0 min-w-[150px]">
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              onBlur={handleTitleBlur}
              onKeyDown={handleTitleKeyDown}
              className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-widest bg-transparent border-none outline-none hover:bg-zinc-100 dark:hover:bg-zinc-800/50 focus:bg-zinc-100 dark:focus:bg-zinc-800/50 px-2 py-1 rounded transition-colors w-full truncate placeholder:text-zinc-400 dark:placeholder:text-zinc-600"
              placeholder="UNTITLED SCRIPT"
            />
          </div>

          {/* Right actions (Export, Users, etc) pinned to far right */}
          <div className="flex items-center gap-0.5 sm:gap-1 shrink-0 ml-auto">
            {/* Font Size Group */}
            <div className="hidden md:flex items-center gap-1 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-xl px-1 mr-2 relative">
              <FontSizeControl editor={editorInstance} defaultSize={docFontSize} />

              <div className="w-px h-4 bg-zinc-200 dark:bg-zinc-700 mx-0.5" />

              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleUppercase();
                }}
                className="p-1.5 rounded-lg font-bold text-[10px] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                title="Uppercase"
              >
                AB
              </button>

              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleLowercase();
                }}
                className="p-1.5 rounded-lg font-medium text-[10px] text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                title="Lowercase"
              >
                ab
              </button>

              <button
                onMouseDown={(e) => {
                  e.preventDefault();
                  editorInstance?.chain().focus().unsetAllMarks().unsetFontSize().run();
                }}
                className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                title="Clear Formatting"
              >
                <Eraser className="w-3.5 h-3.5" />
              </button>


            </div>
            {/* Zoom Controls */}
            <div className="hidden md:flex items-center gap-1 bg-zinc-100/50 dark:bg-zinc-800/50 rounded-xl px-1 mr-2">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setZoom((z) => Math.max(0.3, z - 0.1));
                }}
                className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                title="Zoom Out (Ctrl + Scroll)"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setZoom(1)}
                className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400 min-w-[3ch] text-center select-none hover:text-zinc-900 dark:hover:text-white transition-colors px-1 rounded"
                title="Reset zoom to 100%"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  setZoom((z) => Math.min(3, z + 0.1));
                }}
                className="p-1.5 rounded-lg text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all"
                title="Zoom In (Ctrl + Scroll)"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              onClick={() => setFocusMode(true)}
              className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              title="Focus Mode"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowVersions(true)}
              className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              title="Versions"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
            <div className="relative" ref={exportDropdownRef}>
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className={`p-1.5 rounded-lg transition-all ${showExportMenu ? "bg-zinc-900 dark:bg-white text-white dark:text-black" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
                title="Download Options"
              >
                {isExporting ? (
                  <Minus className="w-3.5 h-3.5 animate-pulse" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
              </button>
              {exportError && (
                <div className="absolute top-10 right-0 z-50 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-xs rounded-xl p-3 w-56 shadow-lg">
                  {exportError}
                  <button
                    onClick={() => setExportError("")}
                    className="block mt-1 text-[10px] underline opacity-70 hover:opacity-100"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Export Dropdown */}
              {showExportMenu && (
                <div className="absolute top-10 right-0 z-50 bg-white dark:bg-[#1a1a1a] p-2 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-52 flex flex-col gap-1">
                  <button
                    onClick={handleExportPdf}
                    disabled={isExporting}
                    className="text-left px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    <span className="text-base">📄</span>{" "}
                    {isExporting ? "Exporting..." : "Download PDF"}
                  </button>
                  <button
                    onClick={handleExportFountain}
                    className="text-left px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all flex items-center gap-2"
                  >
                    <span className="text-base">🖋</span> Fountain (.fountain)
                  </button>
                  <button
                    onClick={handleExportDocx}
                    className="text-left px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-all flex items-center gap-2"
                  >
                    <span className="text-base">📝</span> Microsoft Word (.docx)
                  </button>
                  <div className="h-px bg-zinc-100 dark:bg-zinc-800 my-1" />
                  <button
                    onClick={() => {
                      setShowShortcuts(true);
                      setShowExportMenu(false);
                    }}
                    className="text-left px-3 py-2 text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors flex items-center gap-2"
                  >
                    <Keyboard className="w-3 h-3" /> Shortcuts
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`p-1.5 rounded-lg transition-all ${showSettings ? "bg-zinc-900 dark:bg-white text-white dark:text-black" : "text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"}`}
              title="Style Settings"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setShowShortcuts(true)}
              className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
              title="Shortcuts"
            >
              <Keyboard className="w-3.5 h-3.5" />
            </button>
            {mounted && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all"
                title={theme === "dark" ? "Light Mode" : "Dark Mode"}
              >
                {theme === "dark" ? (
                  <Sun className="w-3.5 h-3.5" />
                ) : (
                  <Moon className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>

          {/* Settings Dropdown (Moved inside) */}
          {showSettings && (
            <div className="absolute top-12 right-4 z-50 bg-white dark:bg-[#1a1a1a] p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl w-64 space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Font
                  </label>
                  <button
                    onClick={() => {
                      setDocFont("Courier Prime");
                      updateScript(script.id, {
                        fontFamily: "Courier Prime",
                      });
                    }}
                    className="text-[10px] text-zinc-400 hover:text-black dark:hover:text-white"
                  >
                    Reset
                  </button>
                </div>
                <select
                  value={docFont}
                  onChange={(e) => {
                    setDocFont(e.target.value);
                    updateScript(script.id, { fontFamily: e.target.value });
                  }}
                  className="w-full h-8 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black text-black dark:text-white px-2 text-xs focus:outline-none focus:ring-2 focus:ring-zinc-400"
                >
                  <option value="Courier Prime">Courier Prime (Default)</option>
                  <option value="Poppins">Poppins</option>
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Lato">Lato</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Playfair Display">Playfair Display</option>
                  <option value="Lora">Lora</option>
                  <option value="Comic Neue">Comic Neue</option>
                </select>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Font Size
                  </label>
                  <button
                    onClick={() => {
                      setDocFontSize(12);
                      updateScript(script.id, { fontSize: 12 });
                    }}
                    className="text-[10px] text-zinc-400 hover:text-black dark:hover:text-white"
                  >
                    Reset
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="8"
                    max="24"
                    value={docFontSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      setDocFontSize(val);
                      updateScript(script.id, { fontSize: val });
                    }}
                    className="flex-1 h-1 bg-zinc-200 dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-zinc-900 dark:accent-white"
                  />
                  <span className="text-xs font-mono text-zinc-600 dark:text-zinc-400 min-w-[3ch]">
                    {docFontSize}pt
                  </span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                    Page Color
                  </label>{" "}
                  <button
                    onClick={() => {
                      setDocBgColor("");
                      updateScript(script.id, { paperColor: "" });
                    }}
                    className="text-[10px] text-zinc-400 hover:text-black dark:hover:text-white"
                  >
                    Reset
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={docBgColor || "#ffffff"}
                    onChange={(e) => {
                      setDocBgColor(e.target.value);
                      updateScript(script.id, {
                        paperColor: e.target.value,
                      });
                    }}
                    className="w-full h-8 rounded-lg cursor-pointer bg-transparent border-0 p-0 focus:outline-none focus:ring-2 focus:ring-zinc-400"
                  />
                </div>
              </div>
            </div>
          )}
        </header>
      )}

      {/* ─── Main Area ─── */}
      <div className="anim-slide-2 flex-1 flex overflow-hidden relative">
        {/* Left: Scene Navigator */}
        {showNav && !focusMode && (
          <aside className="absolute inset-y-0 left-0 z-40 w-64 md:relative md:w-56 shrink-0 bg-white/95 dark:bg-zinc-900/95 md:bg-white md:dark:bg-zinc-900/60 backdrop-blur-xl md:backdrop-blur-none border-r border-zinc-200/60 dark:border-zinc-800 overflow-hidden flex flex-col shadow-2xl md:shadow-none transition-transform">
            <SceneNavigator editor={editorInstance} />
          </aside>
        )}

        {/* Center: Editor — isolation:isolate prevents Director's Suite cards bleeding in (Bug 4) */}
        <main ref={mainScrollRef} className="flex-1 overflow-y-auto no-scrollbar pb-32 relative pt-2 scroll-smooth" style={{ isolation: "isolate" }}>
          <div
            className="max-w-4xl mx-auto px-4 sm:px-8 py-8 w-full transition-transform duration-100 origin-top"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
            }}
          >
            <div
              ref={printRef}
              className="w-full flex flex-col items-center printable-content"
            >
              <TitlePage
                scriptId={script.id}
                title={title}
                metadata={metadata}
                onTitleChange={(val) => {
                  setTitle(val);
                  if (script) updateScript(script.id, { title: val });
                }}
                onMetaChange={handleMetaChange}
                docBgColor={docBgColor}
                docFont={docFont}
                docTextColor={docTextColor}
              />
              <ScriptEditor
                scriptId={script.id}
                initialContent={script.content}
                docBgColor={docBgColor}
                docFont={docFont}
                docTextColor={docTextColor}
                docFontSize={docFontSize}
                onFontSizeChange={(newSize) => {
                  setDocFontSize(newSize);
                  updateScript(script.id, { fontSize: newSize });
                }}
                onStatsUpdate={setStats}
                onEditorReady={setEditorInstance}
              />
            </div>
          </div>
        </main>

        {/* Floating Scroll Controls */}
        {!focusMode && (
          <div className="absolute right-6 bottom-6 flex flex-col gap-2 z-50">
            <button
              onClick={() => mainScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })}
              className="p-2.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-700/50 rounded-full shadow-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 transition-all hover:scale-105 active:scale-95"
              title="Scroll to Top"
            >
              <ChevronUp className="w-5 h-5" />
            </button>
            <button
              onClick={() => mainScrollRef.current?.scrollTo({ top: mainScrollRef.current.scrollHeight, behavior: 'smooth' })}
              className="p-2.5 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-md border border-zinc-200/50 dark:border-zinc-700/50 rounded-full shadow-xl text-zinc-500 hover:text-zinc-900 dark:hover:text-white hover:bg-white dark:hover:bg-zinc-800 transition-all hover:scale-105 active:scale-95"
              title="Scroll to Bottom"
            >
              <ChevronDown className="w-5 h-5" />
            </button>
          </div>
        )}

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
            <span className="flex items-center gap-1">
              <Film className="w-3 h-3" />{" "}
              <span className="hidden sm:inline">{stats.scenes} scenes</span>
              <span className="sm:hidden">{stats.scenes} scn</span>
            </span>
            <span className="flex items-center gap-1">
              <BookOpen className="w-3 h-3" />{" "}
              <span className="hidden sm:inline">
                {stats.words.toLocaleString()} words
              </span>
              <span className="sm:hidden">{stats.words.toLocaleString()}</span>
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" /> ~{stats.pages}{" "}
              <span className="hidden sm:inline">pages</span>
              <span className="sm:hidden">pg</span>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" /> ~{stats.pages}{" "}
              <span className="hidden sm:inline">min</span>
              <span className="sm:hidden">m</span>
            </span>
          </div>
          <div className="flex items-center gap-3 shrink-0 ml-4">
            <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-500 dark:text-zinc-400 normal-case tracking-normal font-mono">
              {stats.currentElement}
            </span>
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
      {showVersions && (
        <VersionManager
          scriptId={script.id}
          currentContent={editorInstance?.getHTML() || ""}
          onRestore={handleVersionRestore}
          onClose={() => setShowVersions(false)}
        />
      )}
      {/* Shortcuts Panel */}
      {showShortcuts && (
        <ShortcutsPanel onClose={() => setShowShortcuts(false)} />
      )}
      {showCorkboard && (
        <Corkboard
          editor={editorInstance}
          onClose={() => setShowCorkboard(false)}
        />
      )}
    </div>
  );
}
