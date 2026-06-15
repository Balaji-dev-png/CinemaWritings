"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTheme } from "next-themes";
import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { 
  FileText, Plus, X, Command, ArrowLeft, Settings, 
  Search, RefreshCw, AlertCircle, FileCode, Type, Sun, Moon, Notebook, Edit2 
} from "lucide-react";
import { NotebookEditor } from "@/components/editor/NotebookEditor";
import { 
  ApiTextFile, 
  apiGetTextFiles, 
  apiCreateTextFile, 
  apiUpdateTextFile, 
  apiDeleteTextFile 
} from "@/lib/api";

export default function TextEditorPage() {
  const router = useRouter();
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  
  const [files, setFiles] = useState<ApiTextFile[]>([]);
  const [openFiles, setOpenFiles] = useState<string[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showPalette, setShowPalette] = useState(false);
  const paletteInputRef = useRef<HTMLInputElement>(null);
  
  const [fontFamily, setFontFamily] = useState("Arial, sans-serif");
  const [fontSize, setFontSize] = useState("16");
  // Fetch files on load
  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    try {
      const data = await apiGetTextFiles();
      setFiles(data);
    } catch (e) {
      console.error("Failed to load text files:", e);
    }
  };



  const createNewFile = async () => {
    try {
      const newFile = await apiCreateTextFile({
        name: "Untitled",
        content: "",
        language: "plaintext",
      });
      setFiles((prev) => [newFile, ...prev]);
      openFile(newFile.id);
    } catch (e) {
      console.error("Failed to create file:", e);
    }
  };

  const openFile = (id: string) => {
    if (!openFiles.includes(id)) {
      setOpenFiles((prev) => [...prev, id]);
    }
    setActiveFileId(id);
    setShowPalette(false);
  };

  const closeFile = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newOpenFiles = openFiles.filter((fid) => fid !== id);
    setOpenFiles(newOpenFiles);
    if (activeFileId === id) {
      setActiveFileId(newOpenFiles.length > 0 ? newOpenFiles[newOpenFiles.length - 1] : null);
    }
  };

  const deleteFile = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      await apiDeleteTextFile(id);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      closeFile(id);
    } catch (e) {
      console.error("Failed to delete file", e);
    }
  };

  // Debounced save
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const handleEditorChange = (value: string, id: string) => {
    // Optimistic update locally
    setFiles((prev) => prev.map(f => f.id === id ? { ...f, content: value } : f));
    
    // Debounce API update
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await apiUpdateTextFile(id, { content: value });
      } catch (e) {
        console.error("Auto-save failed:", e);
      }
    }, 1000);
  };

  const renameFile = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      const updated = await apiUpdateTextFile(id, { name: newName });
      setFiles((prev) => prev.map(f => f.id === id ? updated : f));
    } catch (e) {
      console.error("Rename failed", e);
    }
  };

  const updateLanguage = async (id: string, language: string) => {
    try {
      const updated = await apiUpdateTextFile(id, { language });
      setFiles((prev) => prev.map(f => f.id === id ? updated : f));
    } catch (e) {
      console.error("Language update failed", e);
    }
  };

  // Handle Ctrl+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === "p") {
        e.preventDefault();
        setShowPalette(true);
        setTimeout(() => paletteInputRef.current?.focus(), 50);
      }
      if (e.key === "Escape" && showPalette) {
        setShowPalette(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showPalette]);

  const activeFile = files.find((f) => f.id === activeFileId);
  const isDark = resolvedTheme === "dark";

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white dark:bg-[#0f111a] text-slate-900 dark:text-slate-200 font-sans">
      
      {/* ─── TOP HEADER ──────────────────────────────────────────────────────── */}
      <header className="flex-none h-12 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#111] flex items-center justify-between px-4 select-none">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push("/")}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 text-sm font-bold tracking-wide uppercase text-slate-900 dark:text-slate-100">
            <Notebook className="w-4 h-4" />
            <span>Notebook</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Notebook Controls */}
          <select 
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 px-1 py-1 rounded cursor-pointer transition-colors"
          >
            <option value="Consolas, monospace" className="text-black">Consolas</option>
            <option value="Arial, sans-serif" className="text-black">Arial</option>
            <option value="'Times New Roman', serif" className="text-black">Times New Roman</option>
            <option value="'Courier New', monospace" className="text-black">Courier New</option>
          </select>
          <select 
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
            className="bg-transparent border-none outline-none text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 px-1 py-1 rounded cursor-pointer transition-colors"
          >
            {[10, 12, 14, 15, 16, 18, 20, 24, 28, 32].map(size => (
              <option key={size} value={size.toString()} className="text-black">{size}pt</option>
            ))}
          </select>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
          <button 
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-md transition-colors"
            title={mounted ? (theme === "dark" ? "Light Mode" : "Dark Mode") : "Toggle Theme"}
          >
            {mounted ? (theme === "dark" ? <Sun className="w-4 h-4 text-white" /> : <Moon className="w-4 h-4 text-black" />) : <div className="w-4 h-4" />}
          </button>
          <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />
          <button 
            onClick={() => setShowPalette(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs bg-black text-white dark:bg-white dark:text-black rounded-md transition-colors"
            title="Command Palette (Ctrl+P)"
          >
            <Search className="w-3.5 h-3.5" />
            <span className="opacity-70 font-mono">Ctrl P</span>
          </button>
        </div>
      </header>

      {/* ─── MAIN WORKSPACE ────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* ─── SIDEBAR ─────────────────────────────────────────────────────────── */}
        {isSidebarOpen && (
          <aside className="w-64 flex-none border-r border-slate-200 dark:border-slate-800/50 bg-slate-50 dark:bg-[#12141c] flex flex-col">
            <div className="px-4 py-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Explorer</span>
              <button 
                onClick={createNewFile}
                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                title="New File"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            <div className="px-3 pb-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1.5 w-3.5 h-3.5 text-slate-400" />
                <input 
                  type="text"
                  placeholder="Search files..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-200/50 dark:bg-slate-800/30 text-xs py-1.5 pl-8 pr-3 rounded border border-transparent focus:border-indigo-500/50 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2">
              {files
                .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((file) => (
                  <div 
                  key={file.id}
                  onClick={() => openFile(file.id)}
                  className={`group flex items-center justify-between px-4 py-1.5 cursor-pointer select-none text-sm border-l-2 ${
                    activeFileId === file.id 
                      ? "border-black bg-slate-200 dark:border-white dark:bg-slate-800 text-black dark:text-white" 
                      : "border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-400"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className={`w-3.5 h-3.5 flex-none ${activeFileId === file.id ? 'text-black dark:text-white' : 'text-slate-400'}`} />
                    <span className="truncate">{file.name}</span>
                  </div>
                  <button 
                    onClick={(e) => deleteFile(file.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-slate-300 dark:hover:bg-slate-700 rounded text-red-500 transition-opacity"
                    title="Delete File"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {files.length === 0 && (
                <div className="px-4 py-6 text-center text-xs text-slate-500">
                  No files found.<br/>Click + to create one.
                </div>
              )}
            </div>
          </aside>
        )}

        {/* ─── EDITOR AREA ─────────────────────────────────────────────────────── */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#fffffe] dark:bg-[#0f111a]">
          
          {/* TABS ROW */}
          {openFiles.length > 0 && (
            <div className="flex-none flex overflow-x-auto border-b border-slate-200 dark:border-slate-800/50 bg-slate-50 dark:bg-[#151822] scrollbar-hide">
              {openFiles.map(id => {
                const f = files.find(f => f.id === id);
                if (!f) return null;
                const isActive = activeFileId === id;
                return (
                  <div 
                    key={id}
                    onClick={() => openFile(id)}
                    className={`group flex items-center gap-2 px-3 py-2 text-sm border-r border-slate-200 dark:border-slate-800 border-t-2 min-w-[120px] max-w-[200px] cursor-pointer select-none transition-colors ${
                      isActive 
                        ? "border-t-black bg-white dark:border-t-white dark:bg-black text-black dark:text-white" 
                        : "border-t-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    {isActive ? (
                       <div className="flex items-center flex-1 min-w-0">
                         <input 
                           type="text" 
                           value={f.name}
                           onChange={(e) => renameFile(f.id, e.target.value)}
                           className="bg-transparent border-none outline-none w-full truncate p-0"
                           spellCheck={false}
                         />
                         <Edit2 className="w-3 h-3 text-slate-400 flex-none opacity-50 ml-1" />
                       </div>
                    ) : (
                      <span className="truncate flex-1">{f.name}</span>
                    )}
                    <button 
                      onClick={(e) => closeFile(id, e)}
                      className={`p-0.5 rounded-md hover:bg-slate-200 dark:hover:bg-slate-800 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}

          {/* MONACO EDITOR */}
          <div className="flex-1 relative">
            {activeFile ? (
              <NotebookEditor
                content={activeFile.content}
                onChange={(html) => handleEditorChange(html, activeFile.id)}
                fontFamily={fontFamily}
                fontSize={fontSize}
                wordWrap={true} // Rich text automatically handles wrapping
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-600 gap-4">
                <FileCode className="w-16 h-16 opacity-20" />
                <p>Select a file or press <kbd className="px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded font-mono text-xs">Ctrl + P</kbd></p>
                <button 
                  onClick={createNewFile}
                  className="px-4 py-2 mt-4 bg-black hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-200 dark:text-black rounded-md transition-colors font-medium text-sm"
                >
                  New File
                </button>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* ─── STATUS BAR ──────────────────────────────────────────────────────── */}
      <footer className="flex-none h-7 bg-slate-100 dark:bg-[#111] border-t border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-between px-3 text-[11px] font-mono select-none">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 px-1 rounded transition-colors" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            <Command className="w-3 h-3" />
            Ready
          </span>
          {activeFile && (
            <span>{activeFile.name.split('.').pop()?.toUpperCase()}</span>
          )}
        </div>
        
        {activeFile && (
          <div className="flex items-center gap-4">
            <span className="hover:bg-slate-200 dark:hover:bg-slate-800 px-1 rounded cursor-pointer transition-colors">Rich Text Mode</span>
            <span className="hover:bg-slate-200 dark:hover:bg-slate-800 px-1 rounded cursor-pointer transition-colors">Spaces: 2</span>
            <span className="hover:bg-slate-200 dark:hover:bg-slate-800 px-1 rounded cursor-pointer transition-colors">UTF-8</span>
            <span className="hover:bg-slate-200 dark:hover:bg-slate-800 px-1 rounded cursor-pointer transition-colors">LF</span>
            <select 
              value={activeFile.language}
              onChange={(e) => updateLanguage(activeFile.id, e.target.value)}
              className="bg-transparent border-none outline-none text-white hover:bg-white/10 px-1 rounded cursor-pointer appearance-none transition-colors"
            >
              <option value="plaintext" className="text-black">Plain Text</option>
              <option value="javascript" className="text-black">JavaScript</option>
              <option value="typescript" className="text-black">TypeScript</option>
              <option value="python" className="text-black">Python</option>
              <option value="html" className="text-black">HTML</option>
              <option value="css" className="text-black">CSS</option>
              <option value="json" className="text-black">JSON</option>
              <option value="markdown" className="text-black">Markdown</option>
            </select>
          </div>
        )}
      </footer>

      {/* ─── COMMAND PALETTE ─────────────────────────────────────────────────── */}
      {showPalette && (
        <div className="absolute inset-0 z-50 bg-black/20 dark:bg-black/50 backdrop-blur-sm flex justify-center pt-[10vh]">
          <div 
            className="w-[600px] max-w-[90vw] bg-white dark:bg-[#1a1d27] rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700/50 overflow-hidden flex flex-col"
            style={{ maxHeight: "60vh" }}
          >
            <div className="p-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3">
              <Search className="w-5 h-5 text-black dark:text-white" />
              <input 
                ref={paletteInputRef}
                type="text"
                placeholder="Search files by name..."
                className="flex-1 bg-transparent border-none outline-none text-lg dark:text-white"
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setShowPalette(false);
                  // We could add arrow key navigation here for the results
                }}
              />
              <button onClick={() => setShowPalette(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-2">
              {files
                .filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((file) => (
                  <div 
                    key={file.id}
                    onClick={() => { openFile(file.id); setShowPalette(false); }}
                    className="flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800/50 border-l-2 border-transparent hover:border-black dark:hover:border-white transition-colors"
                  >
                    <FileText className="w-4 h-4 text-slate-400" />
                    <div>
                      <div className="text-sm font-medium dark:text-slate-200">{file.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2">
                        {file.language} 
                        {file.pinned && <span className="px-1.5 py-0.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-500 rounded text-[10px]">Pinned</span>}
                      </div>
                    </div>
                  </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
