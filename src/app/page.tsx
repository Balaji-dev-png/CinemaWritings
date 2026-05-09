"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { History as HistoryIcon, X, Plus, PenTool, Layers } from "lucide-react";
import { getScripts, createScript, deleteScript, Script, HistoryEvent } from "@/lib/storage";
import { isAuthenticated, logout } from "@/lib/auth";
import { motion, AnimatePresence } from "framer-motion";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { AccountMenu } from "@/components/ui/AccountMenu";
import { useLoadingState } from "@/hooks/useLoadingState";
import { Loader2 } from "lucide-react";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";

// Pastel gradient arrays matching the image's vibrant but soft card styles
const PASTEL_GRADIENTS = [
  "bg-gradient-to-br from-[#f8f5ff] to-[#eaddff] border-[#eaddff] text-zinc-800 dark:from-purple-900/30 dark:to-purple-900/10 dark:text-zinc-200 dark:border-purple-800",
  "bg-gradient-to-br from-[#f0f7ff] to-[#d6e8ff] border-[#d6e8ff] text-zinc-800 dark:from-blue-900/30 dark:to-blue-900/10 dark:text-zinc-200 dark:border-blue-800",
  "bg-gradient-to-br from-[#fff7f0] to-[#ffe5cc] border-[#ffe5cc] text-zinc-800 dark:from-orange-900/30 dark:to-orange-900/10 dark:text-zinc-200 dark:border-orange-800",
  "bg-gradient-to-br from-[#f2fcf5] to-[#dcfce7] border-[#dcfce7] text-zinc-800 dark:from-green-900/30 dark:to-green-900/10 dark:text-zinc-200 dark:border-green-800",
];

export default function Dashboard() {
  const router = useRouter();
  const [scripts, setScripts] = useState<Script[]>([]);
  const [activeHistory, setActiveHistory] = useState<HistoryEvent[] | null>(null);
  const [showNewScriptModal, setShowNewScriptModal] = useState(false);
  const [newScriptTitle, setNewScriptTitle] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [createError, setCreateError] = useState("");
  const [navigating, setNavigating] = useState(false);
  const [navigatingMsg, setNavigatingMsg] = useState("Opening your script...");

  const { isLoading: isCreating, message: createMsg, startLoading: startCreating, stopLoading: stopCreating } = useLoadingState();

  // Floating theme toggle — only on dashboard
  const themeToggle = (
    <div className="fixed top-8 right-8 z-[100] flex items-center gap-4">
      <a 
        href="https://github.com/Balaji-dev-png/CinemaWritings" 
        target="_blank" 
        rel="noopener noreferrer"
        className="p-2 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-black dark:text-white hover:scale-105 transition-transform flex items-center justify-center shadow-sm"
        title="View on GitHub"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
          <path d="M9 18c-4.51 2-5-2-7-2"/>
        </svg>
      </a>
      <ThemeToggle />
      {authenticated && <AccountMenu />}
    </div>
  );

  useEffect(() => {
    const checkAuth = async () => {
      const isAuth = await isAuthenticated();
      setAuthenticated(isAuth);
      setAuthChecked(true);
      if (isAuth) {
        try {
          const fetched = await getScripts();
          setScripts(fetched);
        } catch (err) {
          console.error("Failed to fetch scripts:", err);
          setAuthenticated(false);
        }
      }
    };
    checkAuth();
  }, []);

  const handleCreate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const title = newScriptTitle.trim() || "Untitled Script";
    setCreateError("");

    startCreating([
      "Setting the scene...",
      "Preparing your script...",
      "Lights, camera...",
      "Almost ready..."
    ]);

    try {
      const newScript = await createScript(title);
      router.push(`/editor/${newScript.id}`);
      // Don't stop loading here; let it transition to the new page
    } catch (err) {
      console.error("Failed to create script:", err);
      stopCreating();
      setCreateError("Failed to create script. Please check your connection and try again.");
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteScript(id);
    const updated = await getScripts();
    setScripts(updated);
  };

  const handleShowHistory = (e: React.MouseEvent, script: Script) => {
    e.stopPropagation();
    setActiveHistory(script.historyList || []);
  };

  const navigateTo = (path: string, msg = "Opening...") => {
    setNavigatingMsg(msg);
    setNavigating(true);
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-[#f4f5f7] dark:bg-[#0a0a0a] flex flex-col font-sans transition-colors duration-500 overflow-x-hidden">
      <LoadingOverlay isVisible={navigating} message={navigatingMsg} />
      {themeToggle}
      
      {/* Centered content wrapper */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 w-full z-10">
        {/* Massive floating white pane mimicking the image container */}
        <motion.div 
          initial={{ opacity: 0, y: 40, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-6xl bg-white dark:bg-[#131416] rounded-2xl sm:rounded-[3rem] shadow-[0_30px_80px_-15px_rgba(0,0,0,0.06)] dark:shadow-black/50 overflow-hidden border border-white dark:border-[#222] flex flex-col p-5 sm:p-8 md:p-12 min-h-[85vh] relative transition-colors duration-500"
        >
          
          {/* Top Header Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
          className="flex flex-col items-center mt-6 text-center z-10 relative"
        >
          
          {/* Solution Pill / Logo */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 mb-6 transition-colors duration-500 shadow-sm">
            <PenTool className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
            <span className="text-[10px] font-bold tracking-widest text-zinc-600 dark:text-zinc-400 uppercase">CinemaWritings</span>
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-medium tracking-tight text-[#1c1d20] dark:text-zinc-100 max-w-2xl leading-tight mb-4 transition-colors duration-500">
            Write your masterpiece in a beautiful environment
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm max-w-md mx-auto leading-relaxed transition-colors duration-500">
            Effortlessly organize your scripts, format everything in WGA standards, and manage your entire production process behind the scenes.
          </p>

        </motion.div>

        {/* Action Center (Matching the black pill button in the image) */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5, type: "spring" }}
          className="flex justify-center mt-8 sm:mt-12 mb-8 sm:mb-16 relative z-10"
        >
          {authChecked && authenticated ? (
            <button 
              onClick={() => setShowNewScriptModal(true)}
              className="group flex items-center gap-3 bg-[#1c1d20] dark:bg-zinc-100 hover:bg-black dark:hover:bg-white text-white dark:text-black px-8 py-4 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95"
            >
              <div className="grid grid-cols-2 gap-0.5 opacity-80 group-hover:opacity-100">
                <span className="w-1.5 h-1.5 rounded-sm bg-white dark:bg-black" />
                <span className="w-1.5 h-1.5 rounded-sm bg-white dark:bg-black" />
                <span className="w-1.5 h-1.5 rounded-sm bg-white dark:bg-black" />
                <span className="w-1.5 h-1.5 rounded-sm bg-white dark:bg-black" />
              </div>
              <span className="font-medium mr-2">New Script</span>
            </button>
          ) : authChecked && !authenticated ? (
            <div className="flex gap-4">
              <button 
                onClick={() => router.push("/login")}
                className="bg-white dark:bg-[#1a1a1a] text-black dark:text-white border border-zinc-200 dark:border-zinc-800 px-8 py-4 rounded-full font-medium shadow-sm transition-all hover:scale-105 active:scale-95"
              >
                Sign In
              </button>
              <button 
                onClick={() => router.push("/signup")}
                className="bg-[#1c1d20] dark:bg-zinc-100 text-white dark:text-black px-8 py-4 rounded-full font-medium shadow-2xl transition-all hover:scale-105 active:scale-95"
              >
                Get Started
              </button>
            </div>
          ) : null}
        </motion.div>

        {/* Scripts Grid Matrix (Pastel Cards) */}
        {authenticated && scripts.length === 0 && authChecked && (
          <div className="flex flex-col items-center justify-center flex-1 relative z-10 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center mb-6 shadow-sm">
              <PenTool className="w-7 h-7 text-zinc-400" />
            </div>
            <h2 className="text-xl font-semibold text-zinc-800 dark:text-zinc-200 mb-2">No scripts yet</h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs">
              Click <span className="font-semibold text-zinc-700 dark:text-zinc-300">New Script</span> above to start writing your first screenplay.
            </p>
          </div>
        )}
        {authenticated && scripts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 relative z-10 w-full max-w-5xl mx-auto flex-1">
            {scripts.map((script, index) => {
              const gradient = PASTEL_GRADIENTS[index % PASTEL_GRADIENTS.length];
              return (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + index * 0.1, duration: 0.5 }}
                  key={script.id}
                  onClick={() => navigateTo(`/editor/${script.id}`, "Opening your script...")}
                  className={`${gradient} relative flex flex-col p-5 sm:p-7 rounded-2xl sm:rounded-[2rem] border shadow-sm hover:shadow-md transition-all cursor-pointer group h-56 sm:h-72 hover:-translate-y-1 hover:shadow-xl`}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 bg-white/80 dark:bg-black/50 rounded-md shadow-sm flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-current opacity-50" />
                      </div>
                      <span className="text-sm font-semibold line-clamp-1">{script.title || "Untitled"}</span>
                    </div>
                  </div>

                  <p className="text-xs opacity-70 mb-6 line-clamp-2">
                    Gain real-time insights into your revisions, track scene counts and formatting.
                  </p>

                  <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md rounded-2xl p-4 mt-auto border border-white/50 dark:border-white/10 shadow-sm transition-transform group-hover:-translate-y-1">
                    <div className="flex justify-between items-end">
                      <div>
                        <span className="block text-[10px] uppercase font-bold opacity-50 mb-1">Edited</span>
                        <span className="text-xl font-medium">{new Date(script.updatedAt).toLocaleDateString()}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={(e) => handleShowHistory(e, script)}
                          className="p-2 rounded-full bg-zinc-100/50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                          title="View History"
                        >
                          <HistoryIcon className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleDelete(e, script.id)}
                          className="text-[10px] bg-red-100/80 dark:bg-red-900/50 text-red-600 dark:text-red-400 px-2 py-2 rounded-full font-bold uppercase transition-colors hover:bg-red-200 dark:hover:bg-red-900"
                        >
                          Delete
                        </button>
                      </div>

                    </div>
                  </div>

                </motion.div>
              );
            })}
          </div>
        )}
        
        {/* Ambient aesthetic background lines mapping exactly to image wiring */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30 dark:opacity-10 space-y-4">
           {/* We can just use gradients indicating the tree connections, or leave clean */}
           <div className="absolute top-[40%] left-1/2 w-[80%] h-px bg-zinc-300 dark:bg-zinc-700 -translate-x-1/2 -z-10" />
           <div className="absolute top-[40%] left-1/2 w-px h-[20%] bg-zinc-300 dark:bg-zinc-700 -z-10" />
           <div className="absolute top-[40%] left-[10%] w-px h-[25%] bg-zinc-300 dark:bg-zinc-700 -z-10" />
           <div className="absolute top-[40%] right-[10%] w-px h-[25%] bg-zinc-300 dark:bg-zinc-700 -z-10" />
        </div>

        {/* History Modal Overlay */}
        <AnimatePresence>
          {activeHistory && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 rounded-2xl sm:rounded-[3rem]"
            >
               <motion.div 
                  initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                  className="bg-white dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl sm:rounded-3xl p-5 sm:p-8 w-full max-w-md flex flex-col max-h-[70vh]"
               >
                  <div className="flex justify-between items-center mb-6">
                     <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Document History</h2>
                     <button onClick={() => setActiveHistory(null)} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white">
                       <X className="w-4 h-4" />
                     </button>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-4 space-y-6">
                    {activeHistory.slice().reverse().map((event, idx) => (
                      <div key={idx} className="flex gap-4 relative">
                         {/* Timeline Line */}
                         {idx !== activeHistory.length - 1 && (
                            <div className="absolute left-[11px] top-7 bottom-[-24px] w-px bg-zinc-200 dark:bg-zinc-800" />
                         )}
                         <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                           event.action === 'CREATED' ? 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400' :
                           event.action === 'TITLE_CHANGED' ? 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400' :
                           'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400'
                         }`}>
                           <div className="w-2 h-2 rounded-full bg-current" />
                         </div>
                         <div>
                           <p className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{event.action}</p>
                           <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">{new Date(event.timestamp).toLocaleString()}</p>
                           {event.details && <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 bg-zinc-50 dark:bg-zinc-800/50 p-2 rounded-lg">{event.details}</p>}
                         </div>
                      </div>
                    ))}
                    {activeHistory.length === 0 && (
                       <p className="text-sm text-zinc-500 text-center py-8">No history available yet.</p>
                    )}
                  </div>
               </motion.div>
            </motion.div>
          )}

          {/* New Script Modal */}
          {showNewScriptModal && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-8 rounded-2xl sm:rounded-[3rem]"
            >
               <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }}
                  className="bg-white dark:bg-[#1a1a1a] border border-zinc-200 dark:border-zinc-800 shadow-2xl rounded-2xl sm:rounded-3xl p-6 sm:p-10 w-full max-w-md flex flex-col"
               >
                  <div className="flex justify-between items-center mb-6">
                     <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Create New Script</h2>
                     <button onClick={() => { setShowNewScriptModal(false); setCreateError(""); }} className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-black dark:hover:text-white">
                       <X className="w-4 h-4" />
                     </button>
                  </div>
                  {createError && (
                    <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 rounded-xl text-red-600 dark:text-red-400 text-sm font-medium">
                      {createError}
                    </div>
                  )}
                  <form onSubmit={handleCreate}>
                    <div className="mb-6">
                      <label className="block text-xs font-bold uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-2">Script Name</label>
                      <input 
                        autoFocus
                        type="text" 
                        placeholder="Untitled Script"
                        value={newScriptTitle}
                        onChange={(e) => setNewScriptTitle(e.target.value)}
                        className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all"
                      />
                    </div>
                    <button 
                      type="submit"
                      disabled={isCreating}
                      className="w-full flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black py-3 rounded-xl font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          {createMsg || "Creating script..."}
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
                          Create Script
                        </>
                      )}
                    </button>
                  </form>
               </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </motion.div>
      </div>

      {/* ── Cinematic Footer ── */}
      <footer
        className="w-full mt-auto shrink-0 select-none"
        style={{ background: "#000", borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        {/* Top metadata strip */}
        <div className="flex items-start justify-between px-8 pt-8 pb-4">
          <div>
            <p className="text-[11px] text-zinc-500 leading-relaxed">
              Screenplay Editor · Director&apos;s Suite · Storyboard
            </p>
            <p className="text-[11px] text-zinc-600 leading-relaxed">
              WGA-Standard Formatting · Auto-Save
            </p>
          </div>
          <div className="text-center">
            <p className="text-[11px] text-zinc-500">
              Open source · Built for filmmakers
            </p>
            <a
              href="https://github.com/Balaji-dev-png/CinemaWritings"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-zinc-400 hover:text-white transition-colors underline underline-offset-2"
            >
              View Source
            </a>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-zinc-500">Built for filmmakers by DGARTSWORK</p>
            <p className="text-[11px] text-zinc-600">{new Date().getFullYear()}</p>
          </div>
        </div>

        {/* Big logotype */}
        <div className="px-6 py-2 overflow-hidden">
          <h2
            className="font-black leading-none tracking-tight text-white"
            style={{
              fontSize: "clamp(3.5rem, 14vw, 9rem)",
              letterSpacing: "-0.03em",
              lineHeight: 0.9,
            }}
          >
            CinemaWritings
          </h2>
        </div>

        {/* Bottom links */}
        <div className="flex items-center justify-between px-8 py-5" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-6">
            <a
              href="https://github.com/Balaji-dev-png/CinemaWritings"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-zinc-500 hover:text-white transition-colors underline underline-offset-2"
            >
              GitHub
            </a>
            <a
              href="https://github.com/Balaji-dev-png/CinemaWritings/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] text-zinc-500 hover:text-white transition-colors underline underline-offset-2"
            >
              Report Issue
            </a>
          </div>
          <p className="text-[11px] text-zinc-700">
            © {new Date().getFullYear()} CinemaWritings. Built with ❤️ for storytellers.
          </p>
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-zinc-600">Screenplay · Vision · Story</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
